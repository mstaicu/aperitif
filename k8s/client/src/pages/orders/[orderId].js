import { useState, useEffect } from "react";
import Router from "next/router";

import { Elements, PaymentElement } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js/pure";

import { getStripe } from "../../stripe";
// import { CheckoutForm } from "../../components";

console.log(
  "process.env.STRIPE_PUBLISHABLE_KEY [orderId]",
  process.env.STRIPE_PUBLISHABLE_KEY
);

const ShowOrderComponent = () => {
  return (
    <Elements
      stripe={getStripe()}
      options={{
        clientSecret:
          "pi_3Jr6sEAOtJTtrj7r0uq1oWkU_secret_7klTFaEG34IWPLJX8todfmkMW",
        appearance: { theme: "stripe" },
      }}
    ></Elements>
  );
};

ShowOrderComponent.getInitialProps = async (context, client) => {
  const { orderId } = context.query;

  const { data: order } = await client.get(`/api/orders/${orderId}`);
  const { data: clientSecret } = await client.post("/api/payments/intent", {
    orderId,
  });

  return {
    order,
    ...clientSecret,
  };
};

export default ShowOrderComponent;
