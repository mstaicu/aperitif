// @ts-check
import { jetstream } from "@nats-io/jetstream";
import { server } from "@passwordless-id/webauthn";
import { Router } from "express";
import nconf from "nconf";

import { Challenge, Passkey, User } from "../models/index.mjs";
import { connect } from "../nats.mjs";

var router = Router();
var nc = await connect();

router.post("/webauthn/challenge/registration", async (req, res) => {
  var { email } = req.body;

  if (!email) return res.sendStatus(400);

  var user = await User.findOne({ email });

  if (!user) {
    user = new User({ email });
    await user.save();
  }

  var challenge = new Challenge({ user: user._id });
  await challenge.save();

  jetstream(nc).publish("auth.challenge.created");

  res.status(200).json({
    challenge: challenge.content,
    challengeId: challenge._id,
    userId: challenge.user,
  });
});

router.post("/webauthn/registration", async (req, res) => {
  var { attestation, challengeId } = req.body;

  if (!attestation || !challengeId) {
    return res.sendStatus(400);
  }

  const challenge = await Challenge.findById(challengeId);
  if (!challenge) return res.sendStatus(400);

  const user = await User.findById(challenge.user);
  if (!user) return res.sendStatus(400);

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

  var { id: credentialId } = reg.credential;

  if (await Passkey.findOne({ credentialId })) {
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
    user: challenge.user,
  });

  await passkey.save();
  await challenge.deleteOne();

  res.sendStatus(201);
});

router.post("/webauthn/challenge/authentication", async (_, res) => {
  var challenge = new Challenge();
  await challenge.save();

  jetstream(nc).publish("auth.challenge.created");

  res.status(200).json({
    challenge: challenge.content,
    challengeId: challenge._id,
  });
});

router.post("/webauthn/authentication", async (req, res) => {
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

  var userIdBase64Url = Buffer.from(passkey.user).toString("base64url");

  if (result.userId !== userIdBase64Url) {
    await challenge.deleteOne();
    return res.sendStatus(401);
  }

  if (typeof result.counter === "number" && result.counter < passkey.counter) {
    await challenge.deleteOne();
    return res.sendStatus(401);
  }

  passkey.counter = result.counter;

  await passkey.save();
  await challenge.deleteOne();

  res.sendStatus(200);
});

export { router as webauthnRouter };

// <script type="module">
//       import {client} from "https://cdn.jsdelivr.net/npm/@passwordless-id/webauthn";

//       const regChallenge = await fetch("https://tma.com/api/v1/auth/webauthn/challenge",
//       {
//           headers: {
//             'Accept': 'application/json',
//             'Content-Type': 'application/json'
//           },
//           method: "POST"
//       });

//       let {challenge, challengeId} = await regChallenge.json();

//       const attestation = await client.register({
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

//       // const authChallenge = await fetch("https://tma.com/api/v1/auth/webauthn/challenge",
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
