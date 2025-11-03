// @ts-check
import { jetstream } from "@nats-io/jetstream";
import { server } from "@passwordless-id/webauthn";
import nconf from "nconf";
import { randomBytes } from "node:crypto";

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

    res.status(200).json({
      challenge: challenge.content,
      challengeId: challenge._id,
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
    var { attestation, challengeId } = req.body;

    if (!attestation || !challengeId) return res.sendStatus(400);

    var userId = attestation?.user?.id;
    if (!userId) return res.sendStatus(400);

    var challenge = await Challenge.findOne({
      _id: challengeId,
      userId,
    });
    if (!challenge) return res.sendStatus(400);

    var { origin } = new URL(nconf.get("ORIGIN"));

    var expected = {
      challenge: challenge.content,
      origin,
    };

    var reg;

    try {
      reg = await server.verifyRegistration(attestation, expected);
    } catch {
      await challenge.deleteOne();
      return res.sendStatus(400);
    }

    if (!reg.userVerified) {
      await challenge.deleteOne();
      return res.sendStatus(400);
    }

    if (reg.user.id !== challenge.userId) {
      await challenge.deleteOne();
      return res.sendStatus(400);
    }

    var { id: credentialId } = reg.credential;

    if (await Passkey.findOne({ credentialId, userId })) {
      await challenge.deleteOne();
      return res.sendStatus(409);
    }

    var { algorithm, publicKey } = reg.credential;
    var { counter } = reg.authenticator;

    var passkey = new Passkey({
      algorithm,
      counter,
      credentialId,
      publicKey,
      userId: challenge.userId,
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

    res.status(200).json({
      challenge: challenge.content,
      challengeId: challenge._id,
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
    var { authentication, challengeId } = req.body;

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
      challenge: challenge.content,
      counter: passkey.counter,
      origin,
      userVerified: true,
    };

    var credential = {
      algorithm: passkey.algorithm,
      id: passkey.credentialId,
      publicKey: passkey.publicKey,
    };

    var result;

    try {
      result = await server.verifyAuthentication(
        authentication,
        // @ts-ignore
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

    var userIdBase64Url = Buffer.from(passkey.userId).toString("base64url");

    if (result.userId !== userIdBase64Url) {
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
