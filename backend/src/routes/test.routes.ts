import { Router } from 'express';
import { testController } from '../controllers/test.controller.js';

export const testRouter = Router();
testRouter.post('/queue', testController);
