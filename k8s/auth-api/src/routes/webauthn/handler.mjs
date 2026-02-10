// @ts-check
// import { jetstream } from "@nats-io/jetstream";
import { server } from "@passwordless-id/webauthn";
import nconf from "nconf";
import { randomBytes, randomUUID } from "node:crypto";
import { DatabaseError } from "pg";

var ORIGIN = nconf.get("ORIGIN");

/**
 * @param {import("pg").Pool} pool
 * @returns {import("express").RequestHandler}
 */
export var getRegistrationChallengeHandler = (pool) => async (req, res) => {
  var userId = req.get("x-user-id") ?? randomUUID();

  var challengeValue = randomBytes(32);
  var expiresAt = new Date(Date.now() + 60_000);

  var { rows } = await pool.query(
    `
      INSERT INTO webauthn_challenges (user_id, value, expires_at)
      VALUES ($1, $2, $3)
      RETURNING id, value
    `,
    [userId, challengeValue, expiresAt],
  );

  var [challenge] = rows;
  // TODO: Pass 'ORIGIN' as a param
  var { hostname } = new URL(ORIGIN);

  var response = {
    challengeId: challenge.id,
    publicKey: {
      attestation: "none",
      authenticatorSelection: {
        residentKey: "preferred",
        userVerification: "required",
      },
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
      timeout: 60000,
      user: {
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

    var { rows } = await client.query(
      `
        DELETE FROM webauthn_challenges
        WHERE id = $1
          AND expires_at > NOW()
        RETURNING *
      `,
      [challengeId],
    );

    var [challenge] = rows;

    if (!challenge) {
      await client.query("ROLLBACK");
      return res.sendStatus(400);
    }

    var expected = {
      challenge: challenge.value.toString("base64url"),
      origin: ORIGIN,
      rpId: new URL(ORIGIN).hostname,
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

    const credentialIdBuffer = Buffer.from(result.credential.id, "base64url");

    const publicKeyBuffer = Buffer.from(
      result.credential.publicKey,
      "base64url",
    );

    try {
      await client.query(
        `
          INSERT INTO webauthn_credentials (
            user_id,
            credential_id,
            public_key,
            algorithm,
            sign_count,
            transports
          )
          VALUES ($1, $2, $3, $4, $5, $6)
          `,
        [
          decodedUserId,
          credentialIdBuffer,
          publicKeyBuffer,
          result.credential.algorithm,
          result.authenticator.counter,
          result.credential.transports ?? [],
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

// /**
//  * @param {import("mongoose").Connection} mc
//  * @param {import("@nats-io/transport-node").NatsConnection} nc
//  * @returns {import("express").RequestHandler}
//  */
// export var getAuthenticationChallengeHandler = (mc, nc) => {
//   var { Challenge } = mc.models;

//   return async (_, res) => {
//     var challenge = new Challenge();
//     await challenge.save();

//     jetstream(nc).publish("auth.challenge.created");

//     var { hostname } = new URL(nconf.get("ORIGIN"));

//     res.status(200).json({
//       challenge: {
//         id: challenge.id,
//         value: challenge.value,
//       },
//       rp: {
//         id: hostname,
//         name: hostname,
//       },
//     });
//   };
// };

// /**
//  * @param {import("mongoose").Connection} mc
//  * @returns {import("express").RequestHandler}
//  */
// export var getAuthenticationHandler = (mc) => {
//   var { Challenge, Passkey } = mc.models;

//   return async (req, res) => {
//     var {
//       authentication,
//       challenge: { id: challengeId },
//     } = req.body;

//     if (!authentication || !challengeId) return res.sendStatus(400);

//     var challenge = await Challenge.findById(challengeId);
//     if (!challenge) return res.sendStatus(400);

//     var passkey = await Passkey.findOne({ credentialId: authentication.id });

//     if (!passkey) {
//       await challenge.deleteOne();
//       return res.sendStatus(401);
//     }

//     var { origin } = new URL(nconf.get("ORIGIN"));

//     var expected = {
//       challenge: challenge.value,
//       counter: passkey.counter,
//       origin,
//       userVerified: true,
//     };

//     var credential = {
//       algorithm: passkey.algorithm,
//       id: passkey.credentialId,
//       publicKey: passkey.publicKey,
//       transports: passkey.transports,
//     };

//     var result;

//     try {
//       result = await server.verifyAuthentication(
//         authentication,
//         credential,
//         expected,
//       );
//     } catch {
//       await challenge.deleteOne();
//       return res.sendStatus(401);
//     }

//     if (!result.userVerified) {
//       await challenge.deleteOne();
//       return res.sendStatus(401);
//     }

//     if (result.userId && result.userId !== passkey.userId) {
//       await challenge.deleteOne();
//       return res.sendStatus(401);
//     }

//     if (
//       typeof result.counter === "number" &&
//       result.counter < passkey.counter
//     ) {
//       await challenge.deleteOne();
//       return res.sendStatus(401);
//     }

//     passkey.counter = result.counter;

//     await passkey.save();
//     await challenge.deleteOne();

//     res.sendStatus(200);
//   };
// };

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
