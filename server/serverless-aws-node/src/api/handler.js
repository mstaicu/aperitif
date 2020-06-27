const middy = require('middy');
const { cors } = require('middy/middlewares');

/**
 * If you want to turn this Lambda into an expressjs router web application
 * set the following function configuration

functions:
  hello:
    handler: src/api/handler.hello
    events:
      - http: ANY
      - http: 'ANY /{param+}'

/**
 * The handler file
 *

const serverless = require("serverless-http");

module.exports.hello = serverless(require('./api'));

 *
 * api.js
 *
 * const express = require('express');
 *
 * const app = express();
 *
 * module.exports = app;
 */

const hello = async event => {
  /**
   * Early return in the event of a warmup event from the serverless plugin
   */
  if (event.source === 'serverless-plugin-warmup') {
    console.log('Lambda 🔥');

    /** Slightly delayed (25ms) response
      to ensure concurrent invocation */
    await new Promise(r => setTimeout(r, 25));

    return 'Lambda is 🔥';
  }

  return {
    statusCode: 200,
    body: JSON.stringify(
      {
        message: 'Hello from the starter kit of Lambda fns',
        input: event,
      },
      null,
      2,
    ),
  };
};

const handler = middy(hello).use(cors());

module.exports = { hello };
