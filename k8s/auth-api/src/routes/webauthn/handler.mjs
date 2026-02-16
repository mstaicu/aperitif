// @ts-check
// import { jetstream } from "@nats-io/jetstream";
import { server } from "@passwordless-id/webauthn";
import nconf from "nconf";
import { randomUUID } from "node:crypto";

var { hostname, origin } = new URL(nconf.get("ORIGIN"));

// jetstream(nc).publish("auth.challenge.created");

/**
 * @param {import("pg").Pool} pool
 * @returns {import("express").RequestHandler}
 */
export var getRegistrationChallengeHandler = (pool) => async (req, res) => {
  var userId = randomUUID();
  var client = await pool.connect();

  try {
    await client.query("BEGIN");
    await client.query("SET LOCAL statement_timeout = '1s'");

    var {
      rows: [challenge],
    } = await client.query(
      `
        INSERT INTO webauthn_challenges (user_id)
        VALUES ($1)
        RETURNING id, value
      `,
      [userId],
    );

    await client.query("COMMIT");

    var response = {
      challengeId: challenge.id,
      publicKey: {
        attestation: "none",
        authenticatorSelection: {
          residentKey: "required",
          userVerification: "required",
        },
        challenge: challenge.value.toString("base64url"),
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

    res.set("Cache-Control", "no-store");
    res.set("Pragma", "no-cache");
    return res.status(200).json(response);
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch {
      //
    }

    var err = /** @type {any} */ (error);

    if (err?.code === "22P02") return res.sendStatus(400); // invalid UUID / casting
    if (err?.code === "55P03") return res.sendStatus(429); // lock timeout
    if (err?.code === "57014") return res.sendStatus(503); // statement timeout

    return res.sendStatus(500);
  } finally {
    client.release();
  }
};

/**
 * @param {import("pg").Pool} pool
 * @returns {import("express").RequestHandler}
 */
export var getRegistrationHandler = (pool) => async (req, res) => {
  var { challengeId, credential } = req.body;

  // TODO: Add zod validation
  if (!challengeId || typeof challengeId !== "string") {
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
    await client.query("SET LOCAL statement_timeout = '1s'");

    var {
      rows: [challenge],
    } = await client.query(
      `
        DELETE FROM webauthn_challenges
        WHERE id = $1::uuid
          AND expires_at > NOW()
        RETURNING user_id, value
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

    if (!result?.credential) {
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

    if (credentialIdBuffer.length === 0) {
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

    if (publicKeyBuffer.length === 0) {
      await client.query("ROLLBACK");
      return res.sendStatus(400);
    }

    if (!["EdDSA", "ES256", "RS256"].includes(result.credential.algorithm)) {
      await client.query("ROLLBACK");
      return res.sendStatus(400);
    }

    try {
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
    } catch (e) {
      var err = /** @type {any} */ (e);

      if (err?.code === "23505") {
        await client.query("ROLLBACK");
        return res.sendStatus(409);
      }

      throw e;
    }

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

    // eslint-disable-next-line
    var err = /** @type {any} */ (error);

    if (err?.code === "22P02") return res.sendStatus(400);
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
  var client = await pool.connect();

  try {
    await client.query("BEGIN");
    await client.query("SET LOCAL statement_timeout = '1s'");

    var {
      rows: [challenge],
    } = await client.query(
      `
        INSERT INTO webauthn_challenges
        DEFAULT VALUES
        RETURNING id, value
      `,
    );

    await client.query("COMMIT");

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
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch {
      //
    }

    var err = /** @type {any} */ (error);

    if (err?.code === "22P02") return res.sendStatus(400);
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
export var getAuthenticationHandler = (pool) => async (req, res) => {
  var { authentication, challengeId } = req.body;

  // TODO: Add zod validation
  if (!challengeId || typeof challengeId !== "string") {
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
    await client.query("SET LOCAL statement_timeout = '1s'");

    var {
      rows: [challenge],
    } = await client.query(
      `
        DELETE FROM webauthn_challenges
        WHERE id = $1::uuid
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

      // If we have EVER seen a non-zero counter, never accept 0 again.
      if (oldCounter > 0 && newCounter === 0) {
        await client.query("ROLLBACK");
        return res.sendStatus(401);
      }

      // If authenticator provides counters (newCounter > 0), enforce strict monotonicity.
      if (newCounter > 0 && newCounter <= oldCounter) {
        await client.query("ROLLBACK");
        return res.sendStatus(401);
      }

      // Only update when it moves forward; never move backwards.
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

        // If rowCount is 0, someone updated concurrently OR we had a counter issue.
        // Treat as suspicious and fail closed.
        if (rowCount === 0) {
          await client.query("ROLLBACK");
          return res.sendStatus(401);
        }
      }
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

    if (err?.code === "22P02") return res.sendStatus(400);
    if (err?.code === "55P03") return res.sendStatus(429);
    if (err?.code === "57014") return res.sendStatus(503);

    return res.sendStatus(500);
  } finally {
    client.release();
  }
};
