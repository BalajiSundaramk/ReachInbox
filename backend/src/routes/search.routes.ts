import { Router } from 'express';
import { checkElasticsearchHealth } from '../services/elasticsearch.service.js';

export const searchRouter = Router();
searchRouter.get('/health', async (_req, res) => {
  const healthy = await checkElasticsearchHealth();
  res.status(healthy ? 200 : 503).json({ success: healthy, elasticsearch: healthy ? 'connected' : 'unavailable' });
});