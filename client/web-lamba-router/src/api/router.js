const whitelist = [/page\/\d/];

const validateRequestUri = uri => whitelist.some(regex => regex.test(uri));

const rootDocument = '/index.html';

const handler = (event, context, callback) => {
  const request = event.Records[0].cf.request;

  if (validateRequestUri(request.uri)) {
    request.uri = rootDocument;
  }

  callback(null, request);
};

module.exports = { handler };
