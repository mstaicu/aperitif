import generalLoader from './general';
import expressLoader from './express';

export default async app => {
  await generalLoader(app);
  console.log('General setup done');

  await expressLoader(app);
  console.log('Express.js application ready');

  /**
   * More loaders to follow for bootstrapping the web server
   */
};
