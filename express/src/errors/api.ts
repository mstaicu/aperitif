interface InvalidParam {
  name: string;
  reason?: string;
}

interface ProblemDetails {
  type: string;
  title: string;
  status: number;
  details?: string;
  invalid_params?: InvalidParam[];
}

const DefaultValidationProblemDetails = {
  type: 'https://example-api.com/problem/invalid-request-payload',
  title: "Request payload didn't pass the checks",
  status: 422,
  invalid_params: [],
};

const DefaultAuthenticationProblemDetails = {
  type: 'https://example-api.com/problem/invalid-credentials',
  title: "Request didn't pass authentication checks",
  status: 403,
};

const DefaultAuthorizationProblemDetails = {
  type: 'https://example-api.com/problem/invalid-authorization',
  title: "Request didn't pass authorization checks",
  status: 401,
};

class AuthenticationError extends Error {
  problemDetails: ProblemDetails;

  constructor(problemDetails?: Partial<ProblemDetails>) {
    super((problemDetails || DefaultAuthenticationProblemDetails).title);

    this.name = 'AuthenticationError';

    this.problemDetails = {
      ...DefaultAuthenticationProblemDetails,
      ...problemDetails,
    };
  }
}

class AuthorizationError extends Error {
  problemDetails: ProblemDetails;

  constructor(problemDetails?: Partial<ProblemDetails>) {
    super((problemDetails || DefaultAuthorizationProblemDetails).title);

    this.name = 'AuthorizationError';

    this.problemDetails = {
      ...DefaultAuthorizationProblemDetails,
      ...problemDetails,
    };
  }
}

class ValidationError extends Error {
  problemDetails: ProblemDetails;

  constructor(problemDetails?: Partial<ProblemDetails>) {
    super((problemDetails || DefaultValidationProblemDetails).title);

    this.name = 'ValidationError';

    /**
     * @see https://tools.ietf.org/html/rfc7807#section-3
     */
    this.problemDetails = {
      ...DefaultValidationProblemDetails,
      ...problemDetails,
    };
  }
}

export type { InvalidParam, ProblemDetails };
export { AuthenticationError, AuthorizationError, ValidationError };
