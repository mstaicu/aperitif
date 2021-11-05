import { useState, useEffect } from "react";

import { Elements } from "@stripe/react-stripe-js";
import type { Appearance } from "@stripe/stripe-js";

import { getStripe } from "../../stripe";
// import { CheckoutForm } from "../../components";

const appearance: Appearance = { theme: "stripe" };

const ShowOrderComponent = ({ clientSecret }) => (
  <Elements
    stripe={getStripe()}
    options={{
      clientSecret,
      appearance,
    }}
  ></Elements>
);

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
