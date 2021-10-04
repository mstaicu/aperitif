import express from "express";

import { userCookieHandler } from "@tartine/common";

const router = express.Router();

/**
 * $ http http://ticketing/api/auth/currentuser Cookie:express:sess=eyJqd3QiOiJleUpoYkdjaU9pSklVekkxTmlJc0luUjVjQ0k2SWtwWFZDSjkuZXlKemRXSWlPaUkyTURZNE56QXpabU13TVRaaVlUQXdNekJqT0dReE16WWlMQ0pwWVhRaU9qRTJNVGMwTlRnMk5qWjkuRHRHWkhia3hwV2RoWFMzVkNWWk9SbUo4eWttb2RKVFNyMElmUS1yTHdpZyJ9
 */

router.get("/currentuser", userCookieHandler, (req, res) =>
  res.send({ user: req.user || null })
);

export { router as currentUserRouter };
