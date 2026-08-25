import type { FastifyInstance } from 'fastify';

import { eq, sql } from 'drizzle-orm';

import { db } from './db/index.js';
import { users } from './db/schema.js';

interface LookupBody {
  qrToken: string;
}

interface TokenBody {
  userId: string;
  amount: number;
}

interface JwtPayload {
  sub: string;
  email: string;
  role: 'user' | 'staff' | 'admin';
}

export async function scannerRoutes(
  app: FastifyInstance,
) {
  app.post<{ Body: LookupBody }>(
    '/lookup',
    async (request, reply) => {
      try {
        await request.jwtVerify();

        const authUser =
          request.user as JwtPayload;

        if (authUser.role !== 'admin') {
          return reply.code(403).send({
            message:
              'Nincs jogosultságod ehhez a művelethez.',
          });
        }

        const { qrToken } = request.body;

        if (!qrToken?.trim()) {
          return reply.code(400).send({
            message:
              'QR-kód megadása kötelező.',
          });
        }

        const result = await db
          .select({
            id: users.id,
            email: users.email,
            username: users.username,
            name: users.name,
            memberId: users.memberId,
            role: users.role,
            isActive: users.isActive,
            token: users.token,
          })
          .from(users)
          .where(
            eq(
              users.qrToken,
              qrToken.trim(),
            ),
          )
          .limit(1);

        const scannedUser = result[0];

        if (!scannedUser) {
          return reply.code(404).send({
            message:
              'A QR-kódhoz nem található felhasználó.',
          });
        }

        return {
          user: scannedUser,
        };
      } catch {
        return reply.code(401).send({
          message:
            'Érvénytelen vagy hiányzó bejelentkezés.',
        });
      }
    },
  );

  app.post<{ Body: TokenBody }>(
    '/token',
    async (request, reply) => {
      try {
        await request.jwtVerify();

        const authUser =
          request.user as JwtPayload;

        if (authUser.role !== 'admin') {
          return reply.code(403).send({
            message:
              'Nincs jogosultságod ehhez a művelethez.',
          });
        }

        const { userId, amount } =
          request.body;

        if (!userId) {
          return reply.code(400).send({
            message:
              'Felhasználó azonosító megadása kötelező.',
          });
        }

        if (
          !Number.isInteger(amount) ||
          amount === 0
        ) {
          return reply.code(400).send({
            message:
              'Érvényes, nullától különböző token mennyiséget adj meg.',
          });
        }

        const result = await db
          .update(users)
          .set({
            token:
              amount > 0
                ? sql`${users.token} + ${amount}`
                : sql`GREATEST(${users.token} + ${amount}, 0)`,
            updatedAt: new Date(),
          })
          .where(eq(users.id, userId))
          .returning({
            id: users.id,
            token: users.token,
          });

        const updatedUser = result[0];

        if (!updatedUser) {
          return reply.code(404).send({
            message:
              'A felhasználó nem található.',
          });
        }

        return {
          userId: updatedUser.id,
          token: updatedUser.token,
        };
      } catch {
        return reply.code(401).send({
          message:
            'Érvénytelen vagy hiányzó bejelentkezés.',
        });
      }
    },
  );
}