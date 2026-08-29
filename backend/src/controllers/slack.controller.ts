import type { RequestHandler } from 'express';
import { randomBytes } from 'node:crypto';
import { redisConnection } from '../config/redis.js';
import { env } from '../config/env.js';
import { AppError } from '../middleware/errorHandler.js';
import { createSlackState, disconnectSlack, exchangeSlackCode, getSlackAuthorizationUrl, getSlackConnection, sendSlackMessage } from '../services/slack.service.js';

const statePrefix = 'slack:oauth:state:';
const stateTtlSeconds = 600;
const slackTestMessage = 'ReachInbox Slack integration test: connection is working.';

export const slackConnectController: RequestHandler = async (_req, res, next) => {
  try {
    const state = createSlackState();
    const stored = await redisConnection.set(`${statePrefix}${state}`, randomBytes(16).toString('hex'), 'EX', stateTtlSeconds, 'NX');
    if (stored !== 'OK') throw new AppError(503, 'Unable to start Slack authorization.');
    res.redirect(getSlackAuthorizationUrl(state));
  } catch (error) {
    if (error instanceof Error && error.message === 'Slack OAuth configuration is incomplete.') {
      next(new AppError(503, error.message));
      return;
    }
    next(error);
  }
};

export const slackCallbackController: RequestHandler = async (req, res) => {
  const redirect = (result: string) => res.redirect(`${env.FRONTEND_URL}/scheduled?slack=${result}`);
  try {
    if (req.query.error) { redirect('error'); return; }
    const code = typeof req.query.code === 'string' ? req.query.code : '';
    const state = typeof req.query.state === 'string' ? req.query.state : '';
    if (!code || !state) { redirect('error'); return; }
    const validState = await redisConnection.getdel(`${statePrefix}${state}`);
    if (!validState) { redirect('error'); return; }
    await exchangeSlackCode(code);
    redirect('connected');
  } catch (error) {
    console.error('Slack OAuth callback failed:', error instanceof Error ? error.message : 'Unknown Slack error.');
    redirect('error');
  }
};

export const slackStatusController: RequestHandler = async (_req, res, next) => {
  try {
    const connection = await getSlackConnection();
    if (!connection) { res.json({ connected: false }); return; }
    res.json({ connected: true, teamId: connection.teamId, teamName: connection.teamName, channelId: connection.channelId, channelName: connection.channelName });
  } catch (error) { next(error); }
};

export const slackTestController: RequestHandler = async (_req, res, next) => {
  try {
    const result = await sendSlackMessage(slackTestMessage);
    if (!result?.ok) {
      next(new AppError(503, 'Slack test message was not sent because no configured Slack connection or channel was available.'));
      return;
    }
    res.status(200).json({ success: true, slack: result });
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('Slack notification failed:')) {
      next(new AppError(502, error.message));
      return;
    }
    next(error);
  }
};

export const slackDisconnectController: RequestHandler = async (_req, res, next) => {
  try { await disconnectSlack(); res.json({ success: true, connected: false }); } catch (error) { next(error); }
};