import sg from "@sendgrid/mail";
import type { MailDataRequired } from "@sendgrid/mail";

import { encryptMagicLinkPayload } from "./magic-crypto";

/**
 * Make sure we have all the environment variables
 */
if (!process.env.DOMAIN) {
  throw new Error("DOMAIN must be defined as an environment variable");
}

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
 * Set the Sendgrid API key with which we'll make all our requests
 */
sg.setApiKey(process.env.SENDGRID_API_KEY);

export function generateMagicLink(email: string, landingPage: string) {
  let payload = {
    email,
    landingPage,
    creationDate: new Date().toISOString(),
  };

  let payloadStringified = JSON.stringify(payload);
  let encryptedPayload = encryptMagicLinkPayload(payloadStringified);

  let url = new URL(`https://${process.env.DOMAIN}`);
  url.pathname = "/login";
  url.searchParams.set("magic", encryptedPayload);

  return url.toString();
}

export async function sendMagicLink(email: string, landingPage: string) {
  let link = generateMagicLink(email, landingPage);

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
      email,
    },
    subject: "Your login credentials",
    html,
  };

  return sg.send(message);
}

/**
 * Success page
 * 
 * const session = await stripe.checkout.sessions.retrieve(req.query.session_id);
   const customer = await stripe.customers.retrieve(session.customer);
 */
