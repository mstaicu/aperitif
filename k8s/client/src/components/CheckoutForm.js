import React, { useEffect, useState } from "react";
import {
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";

export const CheckoutForm = () => {
  const stripe = useStripe();
  const elements = useElements();

  const handleSubmit = async (event) => {
    event.preventDefault();

    const response = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: "http://ticketing/orders/617ff8d8f6b2800d2ce2d4e4",
      },
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      <PaymentElement />
      <button>Pay now</button>
    </form>
  );
};
