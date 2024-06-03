import initStripe from "stripe";

export const stripe = new initStripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2022-08-01",
});
