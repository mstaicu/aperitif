import initStripe from "stripe";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error(
    "STRIPE_SECRET_KEY must be defined as an environment variable"
  );
}

export const stripe = new initStripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2020-08-27",
});
