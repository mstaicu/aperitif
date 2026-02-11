// @ts-check
// import { jetstream } from "@nats-io/jetstream";
import { server } from "@passwordless-id/webauthn";
import nconf from "nconf";
import { randomUUID } from "node:crypto";
import { DatabaseError } from "pg";

var { hostname, origin } = new URL(nconf.get("ORIGIN"));

// jetstream(nc).publish("auth.challenge.created");

/**
 * @param {import("pg").Pool} pool
 * @returns {import("express").RequestHandler}
 */
export var getRegistrationChallengeHandler = (pool) => async (req, res) => {
  var userId = req.get("x-user-id") ?? randomUUID();

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

  res.status(200).json(response);
};

/**
 * @param {import("pg").Pool} pool
 * @returns {import("express").RequestHandler}
 */
export var getRegistrationHandlerz = (pool) => async (req, res) => {
  var { challengeId, credential } = req.body;

  if (!challengeId || !credential) {
    return res.sendStatus(400);
  }

  var client = await pool.connect();

  try {
    await client.query("BEGIN");

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

    var decodedUserId = Buffer.from(result.user.id, "base64url").toString();

    if (decodedUserId !== challenge.user_id) {
      await client.query("ROLLBACK");
      return res.sendStatus(400);
    }

    await client.query(
      `
        INSERT INTO users (id)
        VALUES ($1)
        ON CONFLICT (id) DO NOTHING
      `,
      [decodedUserId],
    );

    var credentialIdBuffer = Buffer.from(result.credential.id, "base64url");
    var publicKeyBuffer = Buffer.from(result.credential.publicKey, "base64url");

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
          decodedUserId,
          credentialIdBuffer,
          publicKeyBuffer,
          result.credential.algorithm,
          result.credential.transports,
          result.authenticator.counter,
        ],
      );
    } catch (err) {
      if (err instanceof DatabaseError && err.code === "23505") {
        await client.query("ROLLBACK");
        return res.sendStatus(409);
      }

      throw err;
    }

    await client.query("COMMIT");

    return res.sendStatus(201);
  } catch {
    await client.query("ROLLBACK");
    res.sendStatus(500);
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

  res.status(200).json(response);
};

/**
 * @param {import("pg").Pool} pool
 * @returns {import("express").RequestHandler}
 */
export var getAuthenticationHandler = (pool) => async (req, res) => {
  var { authentication, challengeId } = req.body;

  if (!challengeId || !authentication) return res.sendStatus(400);

  var client = await pool.connect();

  try {
    await client.query("BEGIN");

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

    if (typeof authentication?.id !== "string") {
      await client.query("ROLLBACK");
      return res.sendStatus(400);
    }

    var credentialId = Buffer.from(authentication.id, "base64url");

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

    // 5) Enforce monotonic sign_count if provided by authenticator
    // Some authenticators always return 0; treat 0 as "no signal".
    if (typeof result.counter === "number") {
      var newCounter = result.counter;
      var oldCounter = Number(credential.sign_count);

      // If authenticator supports a counter, it should increase.
      // If it returns 0 always, do not brick users; just store 0 and skip strictness.
      if (newCounter !== 0 && newCounter <= oldCounter) {
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

    return res.sendStatus(200);
  } catch {
    await client.query("ROLLBACK");
    return res.sendStatus(500);
  } finally {
    client.release();
  }
};

// <script type="module">
//       import {client} from "https://cdn.jsdelivr.net/npm/@passwordless-id/webauthn";

//       var regChallenge = await fetch("https://tma.com/api/v1/auth/webauthn/challenge",
//       {
//           headers: {
//             'Accept': 'application/json',
//             'Content-Type': 'application/json'
//           },
//           method: "POST"
//       });

//       let {challenge, challengeId} = await regChallenge.json();

//       var attestation = await client.register({
//         user: "Mircea Staicu",
//         challenge,
//       });

//       await fetch("https://tma.com/api/v1/auth/webauthn/registration",
//       {
//           headers: {
//             'Accept': 'application/json',
//             'Content-Type': 'application/json'
//           },
//           method: "POST",
//           body: JSON.stringify({challengeId, attestation})
//       });

//       // var authChallenge = await fetch("https://tma.com/api/v1/auth/webauthn/challenge",
//       // {
//       //     headers: {
//       //       'Accept': 'application/json',
//       //       'Content-Type': 'application/json'
//       //     },
//       //     method: "POST"
//       // });

//       // let {challenge, challengeId} = await authChallenge.json();

//       // var authentication = await client.authenticate({
//       //   challenge
//       // });

//       // await fetch("https://tma.com/api/v1/auth/webauthn/authentication",
//       // {
//       //     headers: {
//       //       'Accept': 'application/json',
//       //       'Content-Type': 'application/json'
//       //     },
//       //     method: "POST",
//       //     body: JSON.stringify({challengeId, authentication})
//       // });
//     </script>
