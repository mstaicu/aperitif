import { Router } from 'express';

const statusRouter = Router();

statusRouter.get('/healthz', (_, res) => res.sendStatus(200));

export { statusRouter };
