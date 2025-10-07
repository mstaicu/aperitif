// @ts-ignore
import { jetstream } from "@nats-io/jetstream";
import { Router } from "express";

import { MagicLink, User } from "../models/index.mjs";
import { connect } from "../nats.mjs";

var router = Router();
var nc = await connect();

router.post("/register/magic-link", async (req, res) => {
  const { email } = req.body;

  if (!email) return res.sendStatus(400);

  if (await User.findOne({ email })) return res.statusCode(400);

  var ml = new MagicLink({ email });
  await ml.save();

  try {
    await jetstream(nc).publish(
      "auth.magic_link.requested",
      Buffer.from(
        JSON.stringify({
          email,
          token: ml._id,
        }),
      ),
    );
  } catch {
    await ml.deleteOne();
  }

  res.sendStatus(200);
});

router.post("/register/verify-magic-link", async (req, res) => {
  const { token } = req.body;

  var ml = await MagicLink.findById(token);
  if (!ml || ml.used) return res.sendStatus(400);

  if (await User.findOne({ email: ml.email })) return res.statusCode(400);

  ml.used = true;
  await ml.save();

  var user = new User({ email: ml.email });
  await user.save();

  res.status(200).json({
    id: user._id,
  });
});
