import Fastify from 'fastify';

import cookie from '@fastify/cookie';

import cors from '@fastify/cors';

import jwt from '@fastify/jwt';
import fastifyStatic from '@fastify/static';
import multipart from '@fastify/multipart';
import websocket from '@fastify/websocket';

import path from 'node:path';
import { fileURLToPath } from 'node:url';

import 'dotenv/config';

import { authRoutes } from './auth/auth.routes.js';
import { scannerRoutes } from './scanner.routes.js';
import { productsRoutes } from './products.routes.js';
import { notificationRoutes } from './notifications.routes.js';

const app = Fastify({
  logger: true,
});
await app.register(websocket);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsPath = path.join(
  __dirname,
  '../uploads',
);

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

await app.register(multipart, {
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 1,
  },
});

await app.register(fastifyStatic, {
  root: uploadsPath,
  prefix: '/uploads/',
});

await app.register(authRoutes, {
  prefix: '/api/auth',
});

await app.register(scannerRoutes, {
  prefix: '/api/scanner',
});

await app.register(productsRoutes, {
  prefix: '/api/products',
});

await app.register(notificationRoutes, {
  prefix: '/api',
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