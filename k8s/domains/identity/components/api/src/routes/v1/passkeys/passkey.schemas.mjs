import { Type } from "@fastify/type-provider-typebox";

import {
  AuthenticationChallengeResponse,
  AuthenticationResponseJSON,
  RegistrationChallengeResponse,
  RegistrationResponseJSON,
} from "./webauthn.schemas.mjs";

export { AuthenticationChallengeResponse, RegistrationChallengeResponse };

export const PasskeyRegistrationBody = Type.Object(
  {
    credential: RegistrationResponseJSON,
  },
  {
    additionalProperties: false,
    description:
      "Passkey registration payload received from the browser after the WebAuthn registration ceremony.",
  },
);

export const LoginBody = Type.Object(
  {
    authentication: AuthenticationResponseJSON,
  },
  {
    additionalProperties: false,
    description:
      "Passkey authentication payload received from the browser after the WebAuthn login ceremony.",
  },
);

export const RefreshTokenResponse = Type.Object(
  {
    expires_in: Type.Integer({
      description: "Refresh-token lifetime in seconds.",
      minimum: 1,
    }),
    refresh_token: Type.String({
      description: "Opaque credential for the newly created identity session.",
      minLength: 1,
    }),
  },
  {
    additionalProperties: false,
    description:
      "Refresh token and lifetime for the newly created identity session.",
  },
);
