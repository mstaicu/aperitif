import { loadStripe } from "@stripe/stripe-js";

let stripePromise;

console.log(
  "process.env.STRIPE_PUBLISHABLE_KEY STRIPE",
  process.env.STRIPE_PUBLISHABLE_KEY
);

export const getStripe = () => {
  if (!stripePromise) {
    stripePromise = loadStripe(process.env.STRIPE_PUBLISHABLE_KEY);
  }

  return stripePromise;
};
