1. For recurring plans, add the products and their prices in the Stripe dashboard
1. When the user clicks on a particular subscription on our landing page:
  1. if the user has an account with us, proceed to the next step. If he doesn't, redirect to login/register
  1. during the signup, create a Stripe customer as part of the process with the userId in its metadata

  const customer = await stripe.customers.create({
    email,
    metadata: {
      userId: 'batman'
    }
  });

1. create a Checkout session creation endpoint. Send the Price ID of the subscription plan

  const customer = await stripe.customers.search({
    query: `metadata[\'userId\']:\'${req.user.id}\'`,
  });

  if (!customer) {
    // Throw error
  }

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',

    subscription_data: {
      metadata: {
        userId: req.user.id
      }
    },

    payment_method_types: ['card'],

    customer: customer.id,

    line_items: [
      {price: req.body.priceId, quantity: 1},
    ],

    success_url: 'https://example.com/success',
    cancel_url: 'https://example.com/cancel',
  }, {
    idempotencyKey: `${req.user.id}.${req.body.priceId}`
  });

  return session.url

1. Complete Checkout
1. Create a middleware that queries Stripe and checks if the requesting user has a subscription. This can be done both in Remix and Node

  const subscription = await stripe.subscriptions.search({
    query: `status:\'active\' AND metadata[\'userId\']:${req.user.id}`,
  });

  next(!subscription ? new InactiveSubscription() : null)


Previous:


1. Wait for the hook to be called by Stripe. Emit a subscription:updated even from the payment service to store the Subscription ID in the User model (???) which would indicate that a user has an active subscription IF the Subscription has an active status and it matches a user on our system with the userId from the Subscription metadata
1. On the success page, update the JWT, in the session cookie, to add the new Subscription ID to the payload

x Introduce the concept of User Profiles, and store the Subscription ID in a User Profile model. This way we can query from RemixRun the User Profile and not have to update the JWT with the new Subscription ID