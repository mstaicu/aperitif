const whitelist = [/page\/\d/];

const validateRequestUri = uri => whitelist.some(regex => regex.test(uri));

const rootDocument = '/index.html';

const handler = async (event, context) => {
  const { request } = event.Records[0].cf;

  if (validateRequestUri(request.uri)) {
    request.uri = rootDocument;
  }

  return request;
};

module.exports = { handler };
