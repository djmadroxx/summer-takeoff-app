import Fastify from 'fastify';

import cookie from '@fastify/cookie';

import cors from '@fastify/cors';

import jwt from '@fastify/jwt';

import 'dotenv/config';

import { authRoutes } from './auth/auth.routes.js';

import { scannerRoutes } from './scanner.routes.js';

const app = Fastify({
  logger: true,
});

const port = Number(
  process.env.PORT ?? 3000,
);

await app.register(cors, {
  origin: true,
  credentials: true,
});

await app.register(cookie);

await app.register(jwt, {
  secret: process.env.JWT_SECRET ?? 'development-secret-change-me',

  cookie: {
    cookieName: 'access_token',
    signed: false,
  },
});

await app.register(authRoutes, {
  prefix: '/api/auth',
});

await app.register(scannerRoutes, {
  prefix: '/api/scanner',
});

app.get('/api/health', async () => {
  return {
    status: 'ok',
  };
});

try {
  await app.listen({
    port,
    host: '0.0.0.0',
  });
} catch (error) {
  app.log.error(error);

  process.exit(1);
}