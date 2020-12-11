/**
 *  HTTP response status codes are a great starting point
 *  as they can communicate a specific error state.
 *  If you need to provide additional context beyond this
 *  about why the error occurred – and perhaps what can be done to resolve the issue,
 *  in the case of a client error – it’s worth considering
 *  applying the application/problem+json specification
 */

const genericErrorMiddleware = (error, request, response, next) => {
  // TODO: implement this once application/problem+json is available
};

export { genericErrorMiddleware };
