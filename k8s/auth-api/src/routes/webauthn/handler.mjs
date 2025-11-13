// @ts-check
import { jetstream } from "@nats-io/jetstream";
import { server } from "@passwordless-id/webauthn";
// import { importPKCS8, SignJWT } from "jose";
import nconf from "nconf";
import { randomBytes } from "node:crypto";
// import { readFile } from "node:fs/promises";

// var ES256_PRIVATE_KEY = await importPKCS8(
//   await readFile(nconf.get("JWT_PRIVATE_KEY_PATH"), "utf8"),
//   "ES256",
// );

/**
 * @param {import("mongoose").Connection} mc
 * @param {import("@nats-io/transport-node").NatsConnection} nc
 * @returns {import("express").RequestHandler}
 */
export var getRegistrationChallengeHandler = (mc, nc) => {
  var { Challenge } = mc.models;

  return async (req, res) => {
    var userId = req.get("x-user-id") ?? randomBytes(32).toString("base64url");

    var challenge = new Challenge({ userId });
    await challenge.save();

    jetstream(nc).publish("auth.challenge.created");

    var { hostname } = new URL(nconf.get("ORIGIN"));

    res.status(200).json({
      challenge: {
        id: challenge.id,
        value: challenge.value,
      },
      rp: {
        id: hostname,
        name: hostname,
      },
      user: {
        id: userId,
      },
    });
  };
};

/**
 * @param {import("mongoose").Connection} mc
 * @returns {import("express").RequestHandler}
 */
export var getRegistrationHandler = (mc) => {
  var { Challenge, Passkey } = mc.models;

  return async (req, res) => {
    var {
      challenge: { id: challengeId },
      registration,
    } = req.body;

    if (!challengeId || !registration) return res.sendStatus(400);

    /**
     * NOTE: If the framework ever decides to remove the user from the registration
     * we need to send the user id sent with the challenge in this request
     */
    var userId = registration?.user?.id;
    // These come as well in the registration object
    // var userName = registration?.user?.name;
    // var userDisplayName = registration?.user?.displayName;

    if (!userId) return res.sendStatus(400);

    var challenge = await Challenge.findOne({
      _id: challengeId,
      userId,
    });
    if (!challenge) return res.sendStatus(400);

    var expected = {
      challenge: challenge.value,
      origin: new URL(nconf.get("ORIGIN")).origin,
    };

    var result;

    try {
      result = await server.verifyRegistration(registration, expected);
    } catch {
      await challenge.deleteOne();
      return res.sendStatus(400);
    }

    if (!result.userVerified) {
      await challenge.deleteOne();
      return res.sendStatus(400);
    }

    if (result.user.id !== challenge.userId) {
      await challenge.deleteOne();
      return res.sendStatus(400);
    }

    var { id: credentialId } = result.credential;

    if (await Passkey.findOne({ credentialId, userId: result.user.id })) {
      await challenge.deleteOne();
      return res.sendStatus(409);
    }

    var { algorithm, publicKey, transports } = result.credential;
    var { counter } = result.authenticator;

    var passkey = new Passkey({
      algorithm,
      counter,
      credentialId,
      publicKey,
      transports,
      userId: result.user.id,
    });

    await passkey.save();
    await challenge.deleteOne();

    res.sendStatus(201);
  };
};

/**
 * @param {import("mongoose").Connection} mc
 * @param {import("@nats-io/transport-node").NatsConnection} nc
 * @returns {import("express").RequestHandler}
 */
export var getAuthenticationChallengeHandler = (mc, nc) => {
  var { Challenge } = mc.models;

  return async (_, res) => {
    var challenge = new Challenge();
    await challenge.save();

    jetstream(nc).publish("auth.challenge.created");

    var { hostname } = new URL(nconf.get("ORIGIN"));

    res.status(200).json({
      challenge: {
        id: challenge.id,
        value: challenge.value,
      },
      rp: {
        id: hostname,
        name: hostname,
      },
    });
  };
};

/**
 * @param {import("mongoose").Connection} mc
 * @returns {import("express").RequestHandler}
 */
export var getAuthenticationHandler = (mc) => {
  var { Challenge, Passkey } = mc.models;

  return async (req, res) => {
    var {
      authentication,
      challenge: { id: challengeId },
    } = req.body;

    if (!authentication || !challengeId) return res.sendStatus(400);

    var challenge = await Challenge.findById(challengeId);
    if (!challenge) return res.sendStatus(400);

    var passkey = await Passkey.findOne({ credentialId: authentication.id });

    if (!passkey) {
      await challenge.deleteOne();
      return res.sendStatus(401);
    }

    var { origin } = new URL(nconf.get("ORIGIN"));

    var expected = {
      challenge: challenge.value,
      counter: passkey.counter,
      origin,
      userVerified: true,
    };

    var credential = {
      algorithm: passkey.algorithm,
      id: passkey.credentialId,
      publicKey: passkey.publicKey,
      transports: passkey.transports,
    };

    var result;

    try {
      result = await server.verifyAuthentication(
        authentication,
        credential,
        expected,
      );
    } catch {
      await challenge.deleteOne();
      return res.sendStatus(401);
    }

    if (!result.userVerified) {
      await challenge.deleteOne();
      return res.sendStatus(401);
    }

    if (result.userId && result.userId !== passkey.userId) {
      await challenge.deleteOne();
      return res.sendStatus(401);
    }

    if (
      typeof result.counter === "number" &&
      result.counter < passkey.counter
    ) {
      await challenge.deleteOne();
      return res.sendStatus(401);
    }

    passkey.counter = result.counter;

    await passkey.save();
    await challenge.deleteOne();

    // var { hostname } = new URL(nconf.get("ORIGIN"));

    // var jwt = new SignJWT({
    //   sub: passkey.userId,
    // })
    //   .setProtectedHeader({ alg: "ES256", kid: "jwk-1" })
    //   .setExpirationTime("1000m")
    //   .setAudience(hostname)
    //   .setIssuer(origin);

    // var signed = await jwt.sign(ES256_PRIVATE_KEY);

    res.sendStatus(200);
  };
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
