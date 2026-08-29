import { Router } from 'express';
import { slackCallbackController, slackConnectController, slackDisconnectController, slackStatusController, slackTestController } from '../controllers/slack.controller.js';

export const slackRouter = Router();
slackRouter.get('/connect', slackConnectController);
slackRouter.get('/callback', slackCallbackController);
slackRouter.get('/status', slackStatusController);
slackRouter.post('/test', slackTestController);
slackRouter.post('/disconnect', slackDisconnectController);