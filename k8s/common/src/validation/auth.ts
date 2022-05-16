export type TokenPayload = {
  user: {
    id: string;
    subscription: {
      id: string;
      status: string;
      product: {
        id: string;
      };
      price: {
        id: string;
        currency: string;
        unit_amount: number | null;
      };
    };
  };
};

export function isTokenPayload(obj: any): obj is TokenPayload {
  return (
    typeof obj === "object" &&
    typeof obj.user === "object" &&
    typeof obj.user.id === "string" &&
    typeof obj.user.subscription === "object" &&
    typeof obj.user.subscription.id === "string" &&
    typeof obj.user.subscription.status === "string" &&
    typeof obj.user.subscription.product === "object" &&
    typeof obj.user.subscription.product.id === "string" &&
    typeof obj.user.subscription.price === "object" &&
    typeof obj.user.subscription.price.id === "string" &&
    typeof obj.user.subscription.price.currency === "string" &&
    (typeof obj.user.subscription.price.unit_amount === "number" ||
      typeof obj.user.subscription.price.unit_amount === null)
  );
}

export type MagicLinkPayload = {
  email: string;
  landingPage: string;
  creationDate: string;
};

export function isMagicLinkPayload(obj: any): obj is MagicLinkPayload {
  return (
    typeof obj === "object" &&
    typeof obj.email === "string" &&
    typeof obj.landingPage === "string" &&
    typeof obj.creationDate === "string"
  );
}
