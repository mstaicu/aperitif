import sg from "@sendgrid/mail";
import { sign } from "jsonwebtoken";

import type { MailDataRequired } from "@sendgrid/mail";

/**
 *
 */
if (!process.env.DOMAIN) {
  throw new Error("DOMAIN must be defined as an environment variable");
}
/**
 *
 */
if (!process.env.SENDGRID_API_KEY) {
  throw new Error(
    "SENDGRID_API_KEY must be defined as an environment variable"
  );
}
if (!process.env.SENDGRID_SENDER_EMAIL) {
  throw new Error(
    "SENDGRID_SENDER_EMAIL must be defined as an environment variable"
  );
}
/**
 *
 */
if (!process.env.MAGIC_PAYLOAD_SECRET) {
  throw new Error(
    "MAGIC_PAYLOAD_SECRET must be defined as an environment variable"
  );
}
/**
 *
 */
sg.setApiKey(process.env.SENDGRID_API_KEY);

/**
 *
 */

export async function getLoginLink(payload: {
  email: string;
  landingPage: string;
}) {
  let magicPayload = sign(payload, process.env.MAGIC_PAYLOAD_SECRET!, {
    expiresIn: "30m",
  });

  let url = new URL(`https://${process.env.DOMAIN}`);
  url.pathname = "/login";
  url.searchParams.set("magic", magicPayload);

  return url.toString();
}

export async function sendLoginLink(payload: {
  email: string;
  landingPage: string;
}) {
  let link = getLoginLink(payload);

  let html = `
    <div>
      Greetings!
      <br>
      Click <a rel="nofollow noopener noreferrer" target="_blank" href="${link}">here</a> to login into your account.
    </div>
  `;

  const message: MailDataRequired = {
    from: {
      name: "no-reply",
      email: process.env.SENDGRID_SENDER_EMAIL!,
    },
    to: {
      email: payload.email,
    },
    subject: "Your login credentials",
    html,
  };

  return sg.send(message);
}
