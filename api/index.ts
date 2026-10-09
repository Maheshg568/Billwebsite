import express, { Request, Response } from 'express';
import { apiRouter } from '../server/api.ts';

const app = express();
app.use(express.json());

// Support both /api prefix and root mount when rewritten by Vercel
app.use('/api', apiRouter);
app.use(apiRouter);

export default function handler(req: Request, res: Response) {
  return app(req, res);
}
