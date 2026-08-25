import type { FastifyInstance } from 'fastify';
import bcrypt from 'bcrypt';
import crypto from 'node:crypto';

import { eq, or } from 'drizzle-orm';

import { db } from '../db/index.js';
import { users } from '../db/schema.js';

import { authenticateUser } from './auth.service.js';

interface LoginBody {
  email: string;
  password: string;
}

interface RegisterBody {
  email: string;
  username: string;
  name: string;
  password: string;
}

function generateMemberId(): string {
  const random = crypto
    .randomBytes(4)
    .toString('hex')
    .toUpperCase();

  return `ST-${random}`;
}

function generateQrToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export async function authRoutes(app: FastifyInstance) {
  /*
 * CURRENT USER
 */
  app.get(
    '/me',
    async (request, reply) => {
      try {
        const decoded =
          await request.jwtVerify<{
            sub: string;
          }>();

        const result = await db
          .select({
            id: users.id,
            email: users.email,
            username: users.username,
            name: users.name,
            memberId: users.memberId,
            qrToken: users.qrToken,
            token: users.token,
            role: users.role,
            isActive: users.isActive,
          })
          .from(users)
          .where(eq(users.id, decoded.sub))
          .limit(1);

        if (result.length === 0) {
          return reply.code(404).send({
            message: 'Felhasználó nem található.',
          });
        }

        return {
          user: result[0],
        };
      } catch {
        return reply.code(401).send({
          message: 'Érvénytelen vagy lejárt munkamenet.',
        });
      }
    },
  );
  
  /*
   * LOGIN
   */
  app.post<{ Body: LoginBody }>(
    '/login',
    async (request, reply) => {
      const { email, password } = request.body;

      if (!email?.trim() || !password) {
        return reply.code(400).send({
          message:
            'E-mail és jelszó megadása kötelező.',
        });
      }

      const user = await authenticateUser(
        email,
        password,
      );

      if (!user) {
        return reply.code(401).send({
          message:
            'Hibás e-mail cím vagy jelszó.',
        });
      }

      const token = await app.jwt.sign({
        sub: user.id,
        email: user.email,
        role: user.role,
      });

      reply.setCookie(
        'access_token',
        token,
        {
          httpOnly: true,
          sameSite: 'lax',
          secure:
            process.env.NODE_ENV ===
            'production',
          path: '/',
          maxAge: 60 * 60 * 24 * 7,
        },
      );

      return {
        user,
      };
    },
  );

  /*
   * REGISTRATION
   */
  app.post<{ Body: RegisterBody }>(
    '/register',
    async (request, reply) => {
      const {
        email,
        username,
        name,
        password,
      } = request.body;

      const normalizedEmail =
        email?.trim().toLowerCase();

      const normalizedUsername =
        username?.trim().toLowerCase();

      const normalizedName =
        name?.trim();

      if (
        !normalizedEmail ||
        !normalizedUsername ||
        !normalizedName ||
        !password
      ) {
        return reply.code(400).send({
          message:
            'Minden mező kitöltése kötelező.',
        });
      }

      if (password.length < 8) {
        return reply.code(400).send({
          message:
            'A jelszónak legalább 8 karakteresnek kell lennie.',
        });
      }

      if (
        normalizedUsername.length < 3
      ) {
        return reply.code(400).send({
          message:
            'A felhasználónév legalább 3 karakteres legyen.',
        });
      }

      const existingUser =
        await db
          .select({
            id: users.id,
            email: users.email,
            username: users.username,
          })
          .from(users)
          .where(
            or(
              eq(
                users.email,
                normalizedEmail,
              ),
              eq(
                users.username,
                normalizedUsername,
              ),
            ),
          )
          .limit(1);

      if (existingUser.length > 0) {
        const existing =
          existingUser[0];

        if (
          existing.email ===
          normalizedEmail
        ) {
          return reply.code(409).send({
            message:
              'Ez az e-mail cím már használatban van.',
          });
        }

        if (
          existing.username ===
          normalizedUsername
        ) {
          return reply.code(409).send({
            message:
              'Ez a felhasználónév már foglalt.',
          });
        }
      }

      const passwordHash =
        await bcrypt.hash(
          password,
          12,
        );

      let memberId =
        generateMemberId();

      /*
       * Elméletileg nagyon ritka,
       * de biztosítjuk az egyediséget.
       */
      while (
        (
          await db
            .select({ id: users.id })
            .from(users)
            .where(
              eq(
                users.memberId,
                memberId,
              ),
            )
            .limit(1)
        ).length > 0
      ) {
        memberId =
          generateMemberId();
      }

      const qrToken =
        generateQrToken();

      const result =
        await db
          .insert(users)
          .values({
            email: normalizedEmail,
            username:
              normalizedUsername,
            passwordHash,
            name: normalizedName,
            memberId,
            qrToken,
            token: 0,
            // A regisztráció
            // MINDIG normál user.
            role: 'user',
            isActive: true,
          })
          .returning({
            id: users.id,
            email: users.email,
            username:
              users.username,
            name: users.name,
            memberId:
              users.memberId,
            qrToken:
              users.qrToken,
            token:
              users.token,
            role: users.role,
            isActive:
              users.isActive,
          });

      const user = result[0];

      return reply.code(201).send({
        user,
      });
    },
  );
}