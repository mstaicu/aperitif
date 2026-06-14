import { Type } from "@sinclair/typebox";

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

export const RegistrationSuccessResponse = Type.Object(
  {
    refresh_token: Type.String({
      description:
        "Opaque refresh token issued for the newly created identity session.",
      minLength: 1,
    }),
  },
  {
    additionalProperties: false,
    description:
      "Successful registration result containing the first refresh token for the new identity.",
  },
);

export const LoginSuccessResponse = Type.Object(
  {
    refresh_token: Type.String({
      description:
        "Opaque refresh token issued for the authenticated identity session.",
      minLength: 1,
    }),
  },
  {
    additionalProperties: false,
    description:
      "Successful authentication result containing a refresh token for the existing identity.",
  },
);
