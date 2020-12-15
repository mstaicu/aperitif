import express from 'express';

import { generalLoader, expressLoader } from './loaders';

const startServer = async () => {
  const app = express();

  await generalLoader(app);
  console.log('general setup ✅');

  await expressLoader(app);
  console.log('web application ✅');

  const server = app.listen(process.env.PORT, () => {
    console.log(`🏃🏻‍♂️ on port ${process.env.PORT}`);
  });

  process.on('SIGTERM', () => {
    console.info('SIGTERM received: 💣  web application 💥');

    server.close(() => {
      console.info('web application closed 💀');
    });
  });
};

startServer();
