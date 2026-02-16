// @ts-check
// import { jetstream } from "@nats-io/jetstream";
import { server } from "@passwordless-id/webauthn";
import nconf from "nconf";
import { randomUUID } from "node:crypto";

var { hostname, origin } = new URL(nconf.get("ORIGIN"));

var UUID_REGEX =
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/;

// jetstream(nc).publish("auth.challenge.created");

/**
 * @param {import("pg").Pool} pool
 * @returns {import("express").RequestHandler}
 */
export var getRegistrationChallengeHandler = (pool) => async (req, res) => {
  var userId = randomUUID();

  var {
    rows: [challenge],
  } = await pool.query(
    `
      INSERT INTO webauthn_challenges (user_id)
      VALUES ($1)
      RETURNING id, value
    `,
    [userId],
  );

  var response = {
    challengeId: challenge.id,
    publicKey: {
      attestation: "none",
      authenticatorSelection: {
        residentKey: "required",
        userVerification: "required",
      },
      // Convert this to Uint8Array on the client, serialized for in-transit
      challenge: challenge.value.toString("base64url"),
      pubKeyCredParams: [
        { alg: -7, type: "public-key" },
        { alg: -8, type: "public-key" },
        { alg: -257, type: "public-key" },
      ],
      rp: {
        id: hostname,
        name: hostname,
      },
      user: {
        // Convert this to Uint8Array on the client, serialized for in-transit
        // Add 'name' and/or 'displayName'
        id: Buffer.from(userId).toString("base64url"),
      },
    },
  };

  res.set("Cache-Control", "no-store");
  res.set("Pragma", "no-cache");

  return res.status(200).json(response);
};

/**
 * @param {import("pg").Pool} pool
 * @returns {import("express").RequestHandler}
 */
export var getRegistrationHandlerz = (pool) => async (req, res) => {
  var { challengeId, credential } = req.body;

  // TODO: Add zod validation
  if (
    !challengeId ||
    typeof challengeId !== "string" ||
    !UUID_REGEX.test(challengeId)
  ) {
    return res.sendStatus(400);
  }

  if (!credential) {
    return res.sendStatus(400);
  }

  // TODO: Add zod validation
  if (
    typeof credential !== "object" ||
    credential === null ||
    credential.type !== "public-key" ||
    typeof credential.id !== "string" ||
    typeof credential.response !== "object" ||
    credential.response === null ||
    typeof credential.response.clientDataJSON !== "string" ||
    typeof credential.response.attestationObject !== "string"
  ) {
    return res.sendStatus(400);
  }

  var client = await pool.connect();

  try {
    await client.query("BEGIN");
    await client.query("SET LOCAL lock_timeout = '50ms'");
    await client.query("SET LOCAL statement_timeout = '250ms'");

    var {
      rows: [challenge],
    } = await client.query(
      `
        DELETE FROM webauthn_challenges
        WHERE id = $1
          AND expires_at > NOW()
        RETURNING *
      `,
      [challengeId],
    );

    if (!challenge) {
      await client.query("ROLLBACK");
      return res.sendStatus(400);
    }

    var expected = {
      challenge: challenge.value.toString("base64url"),
      origin,
      // The library doesn't need this
      rpId: hostname,
    };

    var result;

    try {
      result = await server.verifyRegistration(credential, expected);
    } catch {
      await client.query("ROLLBACK");
      return res.sendStatus(400);
    }

    if (!result.userVerified) {
      await client.query("ROLLBACK");
      return res.sendStatus(400);
    }

    var userId = challenge.user_id;

    await client.query(
      `
        INSERT INTO users (id)
        VALUES ($1)
        ON CONFLICT (id) DO NOTHING
      `,
      [userId],
    );

    var credentialIdBuffer;

    try {
      credentialIdBuffer = Buffer.from(result.credential.id, "base64url");
    } catch {
      await client.query("ROLLBACK");
      return res.sendStatus(400);
    }

    var publicKeyBuffer;

    try {
      publicKeyBuffer = Buffer.from(result.credential.publicKey, "base64url");
    } catch {
      await client.query("ROLLBACK");
      return res.sendStatus(400);
    }

    // 🔐 NOTE: algorithm TEXT may mismatch COSE ints
    // 🔧 RECOMMENDED: change DB column to INT (see migration note below)

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
        credentialIdBuffer,
        publicKeyBuffer,
        result.credential.algorithm,
        result.credential.transports,
        result.authenticator.counter,
      ],
    );

    await client.query("COMMIT");

    res.set("Cache-Control", "no-store");
    res.set("Pragma", "no-cache");

    return res.sendStatus(201);
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch {
      /* empty */
    }

    var err = /** @type {any} */ (error);

    if (err?.code === "55P03") return res.sendStatus(429);
    if (err?.code === "57014") return res.sendStatus(503);

    return res.sendStatus(500);
  } finally {
    client.release();
  }
};

/**
 * @param {import("pg").Pool} pool
 * @returns {import("express").RequestHandler}
 */
export var getAuthenticationChallengeHandler = (pool) => async (_, res) => {
  var {
    rows: [challenge],
  } = await pool.query(
    `
      INSERT INTO webauthn_challenges
      DEFAULT VALUES
      RETURNING id, value
    `,
  );

  var response = {
    challengeId: challenge.id,
    publicKey: {
      challenge: challenge.value.toString("base64url"),
      rpId: hostname,
      userVerification: "required",
    },
  };

  res.set("Cache-Control", "no-store");
  res.set("Pragma", "no-cache");

  return res.status(200).json(response);
};

/**
 * @param {import("pg").Pool} pool
 * @returns {import("express").RequestHandler}
 */
export var getAuthenticationHandler = (pool) => async (req, res) => {
  var { authentication, challengeId } = req.body;

  // TODO: Add zod validation
  if (
    !challengeId ||
    typeof challengeId !== "string" ||
    !UUID_REGEX.test(challengeId)
  ) {
    return res.sendStatus(400);
  }

  if (!authentication) {
    return res.sendStatus(400);
  }

  // TODO: Add zod validation
  if (
    typeof authentication !== "object" ||
    authentication === null ||
    authentication.type !== "public-key" ||
    typeof authentication.id !== "string" ||
    typeof authentication.response !== "object" ||
    authentication.response === null ||
    typeof authentication.response.clientDataJSON !== "string" ||
    typeof authentication.response.authenticatorData !== "string" ||
    typeof authentication.response.signature !== "string"
  ) {
    return res.sendStatus(400);
  }

  var client = await pool.connect();

  try {
    await client.query("BEGIN");
    await client.query("SET LOCAL lock_timeout = '50ms'");
    await client.query("SET LOCAL statement_timeout = '250ms'");

    var {
      rows: [challenge],
    } = await client.query(
      `
        DELETE FROM webauthn_challenges
        WHERE id = $1
          AND expires_at > NOW()
        RETURNING id, value
      `,
      [challengeId],
    );

    if (!challenge) {
      await client.query("ROLLBACK");
      return res.sendStatus(400);
    }

    var credentialId;

    try {
      credentialId = Buffer.from(authentication.id, "base64url");
    } catch {
      await client.query("ROLLBACK");
      return res.sendStatus(400);
    }

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
      challenge: challenge.value.toString("base64url"),
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

    var result;

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

    if (typeof result.counter === "number") {
      var newCounter = result.counter;
      var oldCounter = Number(credential.sign_count);

      if (newCounter !== 0 && newCounter <= oldCounter) {
        // console.log("auth.counter_violation", { userId: credential.user_id });

        await client.query("ROLLBACK");
        return res.sendStatus(401);
      }

      await client.query(
        `
          UPDATE webauthn_credentials
          SET sign_count = $2
          WHERE credential_id = $1
        `,
        [credentialId, newCounter],
      );
    }

    await client.query("COMMIT");

    // console.log("auth.authentication.success", { userId: credential.user_id });

    res.set("Cache-Control", "no-store");
    res.set("Pragma", "no-cache");
    return res.sendStatus(200);
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch {
      /* empty */
    }

    var err = /** @type {any} */ (error);

    if (err?.code === "55P03") return res.sendStatus(429); // lock contention
    if (err?.code === "57014") return res.sendStatus(503); // statement timeout

    return res.sendStatus(500);
  } finally {
    client.release();
  }
};
