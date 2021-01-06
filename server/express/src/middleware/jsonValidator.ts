import { Validator } from 'express-json-validator-middleware';

/**
 * Create a new instance of the `express-json-validator-middleware`
 * `Validator` class and pass in Ajv options if needed.
 *
 * @see https://github.com/ajv-validator/ajv/blob/master/docs/api.md#options
 *
 * Here we're using the `validate()` method from our `Validator`
 * instance. We pass it an object telling it which request properties
 * we want to validate, and what JSON schema we want to validate the
 * value of each property against. In this example we are going to
 * validate the `body` property of any requests to the POST /user
 * endpoint against our `userSchema` JSON schema.
 *
 * The `validate()` method compiles the JSON schema with Ajv, and
 * then returns a middleware function which will be run every time a
 * request is made to this endpoint. This middleware function will
 * take care of running the validation which we've configured.
 *
 * If the request `body` validates against our `userSchema`, the
 * middleware function will call the `next()` Express function which
 * was passed to it and our route handler function will be run. If Ajv
 * returns a validation error, the middleware  will call the `next()`
 * Express function with an error object which has a `validationErrors`
 * property containing an array of validation errors, and our route handler
 * function will NOT be run. We'll look at where that error object gets
 * passed to and how we can handle it in the next step.
 */

export const { validate } = new Validator({});
