const http = require('http');

const options = {
  timeout: 2000,
  host: 'localhost',
  port: process.env.PORT || 3000,
  path: '/healthz',
};

const request = http.request(options, res => {
  process.exitCode = res.statusCode === 200 ? 0 : 1;
  process.exit();
});

request.on('error', () => process.exit(1));
request.end();
