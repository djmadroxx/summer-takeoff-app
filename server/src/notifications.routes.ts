import type { FastifyInstance } from 'fastify';

import {
  registerNotificationSocket,
} from './notification.service.js';

interface JwtPayload {
  sub: string;
  email: string;
  role: string;
}

export async function notificationRoutes(
  app: FastifyInstance,
) {
  app.get(
    '/notifications/ws',
    {
      websocket: true,
    },
    async (socket, request) => {
      try {
        await request.jwtVerify();

        const user =
          request.user as JwtPayload;

        app.log.info(
          {
            userId: user.sub,
          },
          'Notification WebSocket connected',
        );

        registerNotificationSocket(
          user.sub,
          socket,
        );
      } 
      catch (error) 
      {
        app.log.error(
          error,
          'Notification WebSocket authentication failed',
        );

        socket.close();
      }
    },
  );
}