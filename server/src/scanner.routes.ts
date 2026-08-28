import type { FastifyInstance } from 'fastify';

import { createHmac, timingSafeEqual } from 'node:crypto';

import { eq, sql } from 'drizzle-orm';

import { db } from './db/index.js';
import { users } from './db/schema.js';

import {
  isValidRole,
  type Role,
} from '@summer-takeoff/shared';

import { getRoleLabel } from '@summer-takeoff/shared';

import { sendNotify } from './notification.service.js';

interface LookupBody {
  query?: string;
  identifier?: string;
  qrToken?: string;
  username?: string;
  email?: string;
}
interface TokenBody {
  userId: string;
  amount: number;
}

interface RoleBody {
  userId: string;
  role: Role;
}

interface JwtPayload {
  sub: string;
  email: string;
  role: Role;
  username: string;
}

interface DynamicQrPayload {
  userId: string;
  expiresAt: number;
}

const QR_TTL_SECONDS = 60;

function getQrSecret(): string {
  const secret = process.env.QR_SECRET;

  if (!secret) {
    throw new Error(
      'QR_SECRET nincs beállítva a környezeti változók között.',
    );
  }

  return secret;
}

function signQrPayload(payload: string): string {
  return createHmac(
    'sha256',
    getQrSecret(),
  )
    .update(payload)
    .digest('base64url');
}

function createDynamicQr(userId: string) {
  const expiresAt =
    Math.floor(Date.now() / 1000) +
    QR_TTL_SECONDS;

  const payload = Buffer.from(
    JSON.stringify({
      userId,
      expiresAt,
    } satisfies DynamicQrPayload),
  ).toString('base64url');

  const signature =
    signQrPayload(payload);

  return {
    value: `STQR.${payload}.${signature}`,
    expiresAt,
  };
}

function verifyDynamicQr(
  qrValue: string,
): DynamicQrPayload | null {
  const parts = qrValue.split('.');

  if (
    parts.length !== 3 ||
    parts[0] !== 'STQR'
  ) {
    return null;
  }

  const [, payload, signature] =
    parts;

  if (!payload || !signature) {
    return null;
  }

  const expectedSignature =
    signQrPayload(payload);

  const receivedBuffer =
    Buffer.from(signature);

  const expectedBuffer =
    Buffer.from(expectedSignature);

  if (
    receivedBuffer.length !==
    expectedBuffer.length
  ) {
    return null;
  }

  if (
    !timingSafeEqual(
      receivedBuffer,
      expectedBuffer,
    )
  ) {
    return null;
  }

  try {
    const decoded = JSON.parse(
      Buffer.from(
        payload,
        'base64url',
      ).toString('utf8'),
    ) as DynamicQrPayload;

    if (
      !decoded.userId ||
      !Number.isInteger(
        decoded.expiresAt,
      )
    ) {
      return null;
    }

    const now =
      Math.floor(Date.now() / 1000);

    if (
      decoded.expiresAt <= now
    ) {
      return null;
    }

    return decoded;
  } catch {
    return null;
  }
}

export async function scannerRoutes(
  app: FastifyInstance,
) {
  /*
   * ========================================================
   * DINAMIKUS QR GENERÁLÁSA
   * ========================================================
   *
   * A QR 60 másodpercig érvényes.
   *
   * A frontend nem kapja meg a valódi qrToken értékét.
   * A QR egy HMAC-SHA256-tal aláírt, rövid életű payload.
   */

  app.get(
    '/qr',
    async (request, reply) => {
      try {
        await request.jwtVerify();

        const authUser =
          request.user as JwtPayload;

        const qr =
          createDynamicQr(
            authUser.sub,
          );

        return {
          qr: qr.value,
          expiresAt: qr.expiresAt,
        };
      } catch (error) {
        request.log.error(
          error,
          'Dinamikus QR generálási hiba.',
        );

        return reply.code(401).send({
          message:
            'Érvénytelen vagy hiányzó bejelentkezés.',
        });
      }
    },
  );

  /*
   * ========================================================
   * QR / USER LOOKUP
   * ========================================================
   */

  app.post<{ Body: LookupBody }>(
    '/lookup',
    async (request, reply) => {
      try {
        await request.jwtVerify();

        const authUser =
          request.user as JwtPayload;

        if (
          authUser.role !== 'admin' &&
          authUser.role !== 'pultos'
        ) {
          return reply.code(403).send({
            message:
              'Nincs jogosultságod ehhez a művelethez.',
          });
        }

        const {
          query,
          identifier,
          qrToken,
          username,
          email,
        } = request.body;

        /*
         * A frontend a kézzel beírt username/email értéket
         * az "identifier" mezőben küldi.
         * A régebbi kliensverziók miatt a többi mezőt is
         * továbbra is elfogadjuk.
         */
        const searchValue = (
          identifier ??
          query ??
          qrToken ??
          username ??
          email ??
          ''
        ).trim();

        if (!searchValue) {
          return reply.code(400).send({
            message:
              'QR-kód, username vagy email megadása kötelező.',
          });
        }

        /*
         * ====================================================
         * DINAMIKUS QR
         * ====================================================
         */

        let result;

if (searchValue.startsWith('STQR.')) {
  /*
   * ====================================================
   * DINAMIKUS QR
   * ====================================================
   */

    const dynamicQr =
      verifyDynamicQr(searchValue);

    if (!dynamicQr) {
      return reply.code(400).send({
        message:
          'A QR-kód érvénytelen vagy lejárt.',
      });
    }

    result = await db
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
          users.id,
          dynamicQr.userId,
        ),
      )
      .limit(1);
  } else {
    /*
    * ====================================================
    * USERNAME / EMAIL KERESÉS
    * ====================================================
    */

    result = await db
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
        sql`
          LOWER(${users.username}) =
            LOWER(${searchValue})
          OR
          LOWER(${users.email}) =
            LOWER(${searchValue})
        `,
      )
      .limit(1);
  }

        const scannedUser =
          result[0];

        if (!scannedUser) {
          return reply.code(404).send({
            message:
              'A QR-kódhoz nem található felhasználó.',
          });
        }

        if (!scannedUser.isActive) {
          return reply.code(403).send({
            message:
              'Ez a felhasználó inaktív.',
          });
        }

        return {
          user: scannedUser,
        };
      } catch (error) {
        request.log.error(
          error,
          'Scanner lookup hiba.',
        );

        return reply.code(401).send({
          message:
            'Érvénytelen vagy hiányzó bejelentkezés.',
        });
      }
    },
  );

  /*
   * ========================================================
   * ROLE MÓDOSÍTÁSA
   * ========================================================
   */

  app.post<{ Body: RoleBody }>(
    '/role',
    async (request, reply) => {
      try {
        await request.jwtVerify();

        const authUser =
          request.user as JwtPayload;

        if (
          authUser.role !== 'admin'
        ) {
          return reply.code(403).send({
            message:
              'Nincs jogosultságod ehhez a művelethez.',
          });
        }

        const {
          userId,
          role,
        } = request.body;

        if (!userId) {
          return reply.code(400).send({
            message:
              'Felhasználó azonosító megadása kötelező.',
          });
        }

        if (!isValidRole(role)) {
          return reply.code(400).send({
            message:
              'Érvénytelen szerepkör.',
          });
        }

        const result =
          await db
            .update(users)
            .set({
              role,
              updatedAt:
                new Date(),
            })
            .where(
              eq(
                users.id,
                userId,
              ),
            )
            .returning({
              id: users.id,
              role: users.role,
            });

        const updatedUser =
          result[0];

        if (!updatedUser) {
          return reply.code(404).send({
            message:
              'A felhasználó nem található.',
          });
        }

        await sendNotify(
          updatedUser.id,
          'success',
          'Megváltoztatták a szerepköröd! Mostantól ' +
            getRoleLabel(
              updatedUser.role,
            ) +
            ' vagy.',
        );

        return {
          userId:
            updatedUser.id,
          role:
            updatedUser.role,
        };
      } catch {
        return reply.code(401).send({
          message:
            'Érvénytelen vagy hiányzó bejelentkezés.',
        });
      }
    },
  );

  /*
   * ========================================================
   * TOKEN MÓDOSÍTÁSA
   * ========================================================
   */

  app.post<{ Body: TokenBody }>(
    '/token',
    async (request, reply) => {
      try {
        await request.jwtVerify();

        const authUser =
          request.user as JwtPayload;

        if (
          authUser.role !== 'admin'
        ) {
          return reply.code(403).send({
            message:
              'Nincs jogosultságod ehhez a művelethez.',
          });
        }

        const {
          userId,
          amount,
        } = request.body;

        if (!userId) {
          return reply.code(400).send({
            message:
              'Felhasználó azonosító megadása kötelező.',
          });
        }

        if (
          !Number.isInteger(
            amount,
          ) ||
          amount === 0
        ) {
          return reply.code(400).send({
            message:
              'Érvényes, nullától különböző token mennyiséget adj meg.',
          });
        }

        const result =
          await db
            .update(users)
            .set({
              token:
                amount > 0
                  ? sql`${users.token} + ${amount}`
                  : sql`GREATEST(${users.token} + ${amount}, 0)`,
              updatedAt:
                new Date(),
            })
            .where(
              eq(
                users.id,
                userId,
              ),
            )
            .returning({
              id: users.id,
              token: users.token,
            });

        const updatedUser =
          result[0];

        if (!updatedUser) {
          return reply.code(404).send({
            message:
              'A felhasználó nem található.',
          });
        }

        await sendNotify(
          updatedUser.id,
          'success',
          authUser.username +
            ' adott neked ' +
            amount +
            ' token-t. Mostantól ' +
            updatedUser.token +
            ' tokened van.',
        );

        return {
          userId:
            updatedUser.id,
          token:
            updatedUser.token,
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