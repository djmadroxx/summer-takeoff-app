import type { FastifyInstance } from 'fastify';
import { and, desc, eq, gte, sql } from 'drizzle-orm';
import { db } from './db/index.js';
import { orderItems, orders, products, tokenTransactions, users } from './db/schema.js';
import type { Role } from '@summer-takeoff/shared';

interface JwtPayload { sub: string; email: string; role: Role; username: string; }

async function authenticate(request: any, reply: any): Promise<JwtPayload | null> {
  try { await request.jwtVerify(); return request.user as JwtPayload; }
  catch { reply.code(401).send({ message: 'Érvénytelen vagy lejárt munkamenet.' }); return null; }
}

function requireStaff(authUser: JwtPayload, reply: any): boolean {
  if (authUser.role !== 'admin' && authUser.role !== 'pultos') {
    reply.code(403).send({ message: 'Nincs jogosultságod ehhez a művelethez.' });
    return false;
  }
  return true;
}

export async function activityRoutes(app: FastifyInstance) {
  app.get('/history', async (request, reply) => {
    const authUser = await authenticate(request, reply);
    if (!authUser) return;

    const transactions = await db
      .select({
        id: tokenTransactions.id,
        type: tokenTransactions.type,
        amount: tokenTransactions.amount,
        description: tokenTransactions.description,
        createdAt: tokenTransactions.createdAt,
        orderId: tokenTransactions.orderId,
      })
      .from(tokenTransactions)
      .where(eq(tokenTransactions.userId, authUser.sub))
      .orderBy(desc(tokenTransactions.createdAt))
      .limit(50);

    const purchases = await db
      .select({
        orderId: orders.id,
        totalToken: orders.totalToken,
        status: orders.status,
        createdAt: orders.createdAt,
        productName: products.name,
        quantity: orderItems.quantity,
        unitTokenPrice: orderItems.unitTokenPrice,
      })
      .from(orders)
      .innerJoin(orderItems, eq(orderItems.orderId, orders.id))
      .innerJoin(products, eq(products.id, orderItems.productId))
      .where(eq(orders.userId, authUser.sub))
      .orderBy(desc(orders.createdAt))
      .limit(100);

    return { transactions, purchases };
  });

  app.get('/stats', async (request, reply) => {
    const authUser = await authenticate(request, reply);
    if (!authUser) return;
    if (!requireStaff(authUser, reply)) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [activeUsers, todayOrders, todaySales, activeProducts] = await Promise.all([
      db.select({ count: sql<number>`count(*)` }).from(users).where(eq(users.isActive, true)),
      db.select({ count: sql<number>`count(*)` }).from(orders).where(gte(orders.createdAt, today)),
      db.select({ total: sql<number>`coalesce(sum(${orders.totalToken}), 0)` }).from(orders).where(and(gte(orders.createdAt, today), eq(orders.status, 'completed'))),
      db.select({ count: sql<number>`count(*)` }).from(products).where(eq(products.isActive, true)),
    ]);

    return {
      activeUsers: Number(activeUsers[0]?.count ?? 0),
      todayOrders: Number(todayOrders[0]?.count ?? 0),
      todaySales: Number(todaySales[0]?.total ?? 0),
      activeProducts: Number(activeProducts[0]?.count ?? 0),
    };
  });
}
