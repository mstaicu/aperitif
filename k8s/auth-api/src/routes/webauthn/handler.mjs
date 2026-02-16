// @ts-check
// import { jetstream } from "@nats-io/jetstream";
import { server } from "@passwordless-id/webauthn";
import nconf from "nconf";
import {
  createHmac,
  randomBytes,
  randomUUID,
  timingSafeEqual,
} from "node:crypto";

// jetstream(nc).publish("auth.challenge.created");

/**
 * Raw HMAC key used to sign challenge payloads.
 * Must be base64-encoded 32+ random bytes.
 * @type {Buffer}
 */
var SECRET = Buffer.from(nconf.get("CHALLENGE_SECRET"), "base64");

if (SECRET.length < 32) {
  throw new Error(
    "CHALLENGE_SECRET must be at least 32 bytes (base64 encoded)",
  );
}

/**
 * Computes HMAC-SHA256 over provided data.
 *
 * @param {Buffer} data - Serialized payload buffer
 * @returns {Buffer} 32-byte HMAC digest
 */
var sign = (data) => createHmac("sha256", SECRET).update(data).digest();

/**
 * Serializes and signs a challenge payload.
 *
 * Output format:
 *   base64url(JSON(payload)) + "." + base64url(HMAC)
 *
 * @param {object} payload - Plain JSON-serializable object
 * @returns {string} Signed challenge string
 */
var encode = (payload) => {
  var body = Buffer.from(JSON.stringify(payload));
  var mac = sign(body);
  return body.toString("base64url") + "." + mac.toString("base64url");
};

/**
 * Verifies and parses a signed challenge token.
 *
 * Validates:
 * - Correct format (body.mac)
 * - HMAC signature (timing-safe)
 * - exp timestamp has not expired
 *
 * @param {string} token - Signed challenge string
 * @returns {{ exp: number, rnd: string, uid?: string }}
 * @throws {Error} If format invalid, signature invalid, or expired
 */

function decode(token) {
  var parts = token.split(".");
  if (parts.length !== 2) throw new Error("invalid token format");

  var body = Buffer.from(parts[0], "base64url");
  var mac = Buffer.from(parts[1], "base64url");

  var expected = sign(body);

  if (mac.length !== expected.length || !timingSafeEqual(mac, expected)) {
    throw new Error("invalid signature");
  }

  var payload = JSON.parse(body.toString());

  if (typeof payload.exp !== "number" || payload.exp < Date.now()) {
    throw new Error("expired");
  }

  return payload;
}

/**
 * Creates a signed registration challenge.
 *
 * Payload includes:
 * - exp (absolute expiry in ms)
 * - rnd (32 bytes entropy)
 * - uid (generated userId for userless registration)
 *
 * @param {string} userId - UUID for the new user
 * @param {number} [ttlMs=60000] - Time-to-live in milliseconds
 * @returns {string} Signed challenge string
 */
var createRegistrationChallenge = (userId, ttlMs = 60_000) =>
  encode({
    exp: Date.now() + ttlMs,
    rnd: randomBytes(32).toString("base64url"),
    uid: userId,
  });

/**
 * Creates a signed authentication challenge.
 *
 * Payload includes:
 * - exp (absolute expiry in ms)
 * - rnd (32 bytes entropy)
 *
 * @param {number} [ttlMs=60000] - Time-to-live in milliseconds
 * @returns {string} Signed challenge string
 */
var createAuthenticationChallenge = (ttlMs = 60_000) =>
  encode({
    exp: Date.now() + ttlMs,
    rnd: randomBytes(32).toString("base64url"),
  });

/**
 * Verifies a registration challenge token.
 *
 * Ensures:
 * - Signature valid
 * - Not expired
 * - uid present and string
 *
 * @param {string} token
 * @returns {{ exp: number, rnd: string, uid: string }}
 * @throws {Error} If invalid or malformed
 */
var verifyRegistrationChallenge = (token) => {
  var payload = decode(token);

  if (typeof payload.uid !== "string") {
    throw new Error("missing uid");
  }

  return /** @type {{ exp: number; rnd: string; uid: string }} */ (payload);
};

/**
 * Verifies an authentication challenge token.
 *
 * Ensures:
 * - Signature valid
 * - Not expired
 * - uid NOT present
 *
 * @param {string} token
 * @returns {{ exp: number, rnd: string }}
 * @throws {Error} If invalid or malformed
 */
var verifyAuthenticationChallenge = (token) => {
  var payload = decode(token);

  if ("uid" in payload) {
    throw new Error("unexpected uid");
  }

  return payload;
};

var { hostname, origin } = new URL(nconf.get("ORIGIN"));

/**
 * @returns {import("express").RequestHandler}
 */
export var getRegistrationChallengeHandler = () => async (req, res) => {
  var userId = randomUUID();

  var response = {
    publicKey: {
      attestation: "none",
      authenticatorSelection: {
        residentKey: "required",
        userVerification: "required",
      },
      challenge: createRegistrationChallenge(userId),
      pubKeyCredParams: [
        { alg: -7, type: "public-key" },
        { alg: -8, type: "public-key" },
        { alg: -257, type: "public-key" },
      ],
      rp: { id: hostname, name: hostname },
      user: {
        id: Buffer.from(userId).toString("base64url"),
      },
    },
  };

  return res.status(200).json(response);
};

/**
 * @param {import("pg").Pool} pool
 * @returns {import("express").RequestHandler}
 */
export var getRegistrationHandler = (pool) => async (req, res) => {
  var { credential } = req.body;

  if (!credential || credential.type !== "public-key") {
    return res.sendStatus(400);
  }

  var clientData = JSON.parse(
    Buffer.from(credential.response.clientDataJSON, "base64url").toString(),
  );

  if (clientData.type !== "webauthn.create") {
    return res.sendStatus(400);
  }

  if (clientData.origin !== origin) {
    return res.sendStatus(400);
  }

  let payload;

  try {
    payload = verifyRegistrationChallenge(clientData.challenge);
  } catch {
    return res.sendStatus(400);
  }

  var expected = {
    challenge: clientData.challenge,
    origin,
    rpId: hostname,
  };

  let result;

  try {
    result = await server.verifyRegistration(credential, expected);
  } catch {
    return res.sendStatus(400);
  }

  if (!result?.credential || !result.userVerified) {
    return res.sendStatus(400);
  }

  var userId = payload.uid;

  var client = await pool.connect();

  try {
    await client.query("BEGIN");

    await client.query(
      `INSERT INTO users (id) VALUES ($1) ON CONFLICT DO NOTHING`,
      [userId],
    );

    await client.query(
      `
        INSERT INTO webauthn_credentials (
          user_id,
          credential_id,
          public_key,
          algorithm,
          transports,
          sign_count
        )
        VALUES ($1, $2, $3, $4, $5, $6)
      `,
      [
        userId,
        Buffer.from(result.credential.id, "base64url"),
        Buffer.from(result.credential.publicKey, "base64url"),
        result.credential.algorithm,
        result.credential.transports,
        result.authenticator.counter,
      ],
    );

    await client.query("COMMIT");
  } catch {
    await client.query("ROLLBACK");
    return res.sendStatus(500);
  } finally {
    client.release();
  }

  return res.sendStatus(201);
};

/**
 * @returns {import("express").RequestHandler}
 */
export var getAuthenticationChallengeHandler = () => async (_, res) => {
  var challenge = createAuthenticationChallenge();

  var response = {
    publicKey: {
      challenge,
      rpId: hostname,
      userVerification: "required",
    },
  };

  return res.status(200).json(response);
};

/**
 * @param {import("pg").Pool} pool
 * @returns {import("express").RequestHandler}
 */
export var getAuthenticationHandler = (pool) => async (req, res) => {
  var { authentication } = req.body;

  if (!authentication || authentication.type !== "public-key") {
    return res.sendStatus(400);
  }

  var clientData = JSON.parse(
    Buffer.from(authentication.response.clientDataJSON, "base64url").toString(),
  );

  if (clientData.type !== "webauthn.get") {
    return res.sendStatus(401);
  }

  if (clientData.origin !== origin) {
    return res.sendStatus(401);
  }

  try {
    verifyAuthenticationChallenge(clientData.challenge);
  } catch {
    return res.sendStatus(401);
  }

  var credentialId = Buffer.from(authentication.id, "base64url");

  var client = await pool.connect();

  try {
    await client.query("BEGIN");

    var {
      rows: [credential],
    } = await client.query(
      `
        SELECT user_id, credential_id, public_key, algorithm, transports, sign_count
        FROM webauthn_credentials
        WHERE credential_id = $1
        FOR UPDATE
      `,
      [credentialId],
    );

    if (!credential) {
      await client.query("ROLLBACK");
      return res.sendStatus(401);
    }

    var expected = {
      challenge: clientData.challenge,
      counter: Number(credential.sign_count),
      origin,
      rpId: hostname,
      userVerified: true,
    };

    var expectedCredential = {
      algorithm: credential.algorithm,
      id: Buffer.from(credential.credential_id).toString("base64url"),
      publicKey: Buffer.from(credential.public_key).toString("base64url"),
      transports: credential.transports ?? [],
    };

    let result;

    try {
      result = await server.verifyAuthentication(
        authentication,
        expectedCredential,
        expected,
      );
    } catch {
      await client.query("ROLLBACK");
      return res.sendStatus(401);
    }

    if (!result.userVerified) {
      await client.query("ROLLBACK");
      return res.sendStatus(401);
    }

    var newCounter = result.counter;
    var oldCounter = Number(credential.sign_count);

    if (oldCounter > 0 && newCounter === 0) {
      await client.query("ROLLBACK");
      return res.sendStatus(401);
    }

    if (newCounter > 0 && newCounter <= oldCounter) {
      await client.query("ROLLBACK");
      return res.sendStatus(401);
    }

    if (newCounter > oldCounter) {
      var { rowCount } = await client.query(
        `
          UPDATE webauthn_credentials
          SET sign_count = $2
          WHERE credential_id = $1
            AND sign_count < $2
        `,
        [credentialId, newCounter],
      );

      if (rowCount === 0) {
        await client.query("ROLLBACK");
        return res.sendStatus(401);
      }
    }

    await client.query("COMMIT");
  } catch {
    await client.query("ROLLBACK");
    return res.sendStatus(500);
  } finally {
    client.release();
  }

  return res.sendStatus(200);
};
