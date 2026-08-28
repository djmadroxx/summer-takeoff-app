import type { FastifyInstance } from 'fastify';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';

import {
  and,
  asc,
  eq,
  gte,
  inArray,
  sql,
} from 'drizzle-orm';

import { db } from './db/index.js';
import {
  productCategories,
  products,
  orders,
  orderItems,
  tokenTransactions,
  users,
} from './db/schema.js';
import type { Role } from '@summer-takeoff/shared';

import { sendNotify } from './notification.service.js';

interface JwtPayload {
  sub: string;
  email: string;
  role: Role;
}

interface CategoryBody {
  name: string;
  sortOrder?: number;
  isActive?: boolean;
}

interface ProductBody {
  name: string;
  imagePath?: string | null;
  tokenPrice: number;
  categoryId: string;
  isActive?: boolean;
}
interface PurchaseItem {
  productId: string;
  quantity: number;
}

interface PurchaseBody {
  userId: string;
  items: PurchaseItem[];
}
/*
 * =========================================================
 * AUTH HELPERS
 * =========================================================
 */

async function authenticate(
  request: any,
  reply: any,
): Promise<JwtPayload | null> {
  try {
    await request.jwtVerify();

    return request.user as JwtPayload;
  } catch {
    reply.code(401).send({
      message:
        'Érvénytelen vagy hiányzó bejelentkezés.',
    });

    return null;
  }
}

function requireAdmin(
  authUser: JwtPayload,
  reply: any,
): boolean {
  if (authUser.role !== 'admin') {
    reply.code(403).send({
      message:
        'Nincs jogosultságod ehhez a művelethez.',
    });

    return false;
  }

  return true;
}

function requireStaffAccess(
  authUser: JwtPayload,
  reply: any,
): boolean {
  if (
    authUser.role !== 'admin' &&
    authUser.role !== 'pultos'
  ) {
    reply.code(403).send({
      message:
        'Nincs jogosultságod ehhez a művelethez.',
    });

    return false;
  }

  return true;
}

/*
 * =========================================================
 * CATEGORIES
 * =========================================================
 */

/*
 * Aktív kategóriák lekérése.
 *
 * ADMIN + PULTOS
 */
export async function productsRoutes(
  app: FastifyInstance,
) {

    /*
   * -------------------------------------------------------
   * POST /upload-image
   * -------------------------------------------------------
   *
   * ADMIN ONLY
   *
   * Termékkép feltöltése.
   */

  app.post(
    '/upload-image',
    async (request, reply) => {
      const authUser = await authenticate(
        request,
        reply,
      );

      if (!authUser) return;

      if (
        !requireAdmin(
          authUser,
          reply,
        )
      ) {
        return;
      }

      try {
        const file =
          await request.file();

        if (!file) {
          return reply.code(400).send({
            message:
              'Kép feltöltése kötelező.',
          });
        }

        const allowedMimeTypes = [
          'image/jpeg',
          'image/png',
          'image/webp',
        ];

        if (
          !allowedMimeTypes.includes(
            file.mimetype,
          )
        ) {
          return reply.code(400).send({
            message:
              'Csak JPG, PNG vagy WebP kép tölthető fel.',
          });
        }

        const extensionMap: Record<
          string,
          string
        > = {
          'image/jpeg': '.jpg',
          'image/png': '.png',
          'image/webp': '.webp',
        };

        const extension =
          extensionMap[file.mimetype];

        const fileName =
          `${randomUUID()}${extension}`;

        const uploadDirectory =
          path.join(
            process.cwd(),
            'uploads',
            'products',
          );

        await mkdir(
          uploadDirectory,
          {
            recursive: true,
          },
        );

        const filePath =
          path.join(
            uploadDirectory,
            fileName,
          );
        const MAX_FILE_SIZE = 5 * 1024 * 1024;

        if (file.file.bytesRead > MAX_FILE_SIZE) {
            return reply.code(400).send({
                message:
                'A kép maximális mérete 5 MB lehet.',
            });
        }    
        const buffer =
          await file.toBuffer();

        await writeFile(
          filePath,
          buffer,
        );

        return reply.code(201).send({
          imagePath:
            `/uploads/products/${fileName}`,
        });
      } catch (error) {
        request.log.error(
          error,
          'Termékkép feltöltési hiba',
        );

        return reply.code(500).send({
          message:
            'A kép feltöltése sikertelen.',
        });
      }
    },
  );
  /*
   * -------------------------------------------------------
   * GET /categories
   * -------------------------------------------------------
   */

  app.get(
    '/categories',
    async (request, reply) => {
      const authUser = await authenticate(
        request,
        reply,
      );

      if (!authUser) return;

      if (
        !requireStaffAccess(
          authUser,
          reply,
        )
      ) {
        return;
      }

      const categories =
        await db
          .select()
          .from(productCategories)
          .where(
            eq(
              productCategories.isActive,
              true,
            ),
          )
          .orderBy(
            asc(
              productCategories.sortOrder,
            ),
            asc(
              productCategories.name,
            ),
          );

      return {
        categories,
      };
    },
  );

  /*
   * -------------------------------------------------------
   * POST /categories
   * -------------------------------------------------------
   *
   * ADMIN ONLY
   */

  app.post<{
    Body: CategoryBody;
  }>(
    '/categories',
    async (request, reply) => {
      const authUser = await authenticate(
        request,
        reply,
      );

      if (!authUser) return;

      if (
        !requireAdmin(
          authUser,
          reply,
        )
      ) {
        return;
      }

      const {
        name,
        sortOrder = 0,
        isActive = true,
      } = request.body;

      const normalizedName =
        name?.trim();

      if (!normalizedName) {
        return reply.code(400).send({
          message:
            'A kategória neve kötelező.',
        });
      }

      if (
        !Number.isInteger(sortOrder)
      ) {
        return reply.code(400).send({
          message:
            'A sorrendnek egész számnak kell lennie.',
        });
      }

      const existing =
        await db
          .select({
            id:
              productCategories.id,
          })
          .from(productCategories)
          .where(
            eq(
              productCategories.name,
              normalizedName,
            ),
          )
          .limit(1);

      if (existing.length > 0) {
        return reply.code(409).send({
          message:
            'Ez a kategória már létezik.',
        });
      }

      const result =
        await db
          .insert(productCategories)
          .values({
            name: normalizedName,
            sortOrder,
            isActive,
          })
          .returning();

      return reply.code(201).send({
        category: result[0],
      });
    },
  );

  /*
   * -------------------------------------------------------
   * PATCH /categories/:id
   * -------------------------------------------------------
   *
   * ADMIN ONLY
   */

  app.patch<{
    Params: {
      id: string;
    };
    Body: CategoryBody;
  }>(
    '/categories/:id',
    async (request, reply) => {
      const authUser = await authenticate(
        request,
        reply,
      );

      if (!authUser) return;

      if (
        !requireAdmin(
          authUser,
          reply,
        )
      ) {
        return;
      }

      const {
        id,
      } = request.params;

      const {
        name,
        sortOrder,
        isActive,
      } = request.body;

      const updateData: {
        name?: string;
        sortOrder?: number;
        isActive?: boolean;
        updatedAt: Date;
      } = {
        updatedAt: new Date(),
      };

      if (
        name !== undefined
      ) {
        const normalizedName =
          name.trim();

        if (!normalizedName) {
          return reply.code(400).send({
            message:
              'A kategória neve nem lehet üres.',
          });
        }

        updateData.name =
          normalizedName;
      }

      if (
        sortOrder !== undefined
      ) {
        if (
          !Number.isInteger(
            sortOrder,
          )
        ) {
          return reply.code(400).send({
            message:
              'A sorrendnek egész számnak kell lennie.',
          });
        }

        updateData.sortOrder =
          sortOrder;
      }

      if (
        isActive !== undefined
      ) {
        updateData.isActive =
          isActive;
      }

      const result =
        await db
          .update(
            productCategories,
          )
          .set(updateData)
          .where(
            eq(
              productCategories.id,
              id,
            ),
          )
          .returning();

      if (result.length === 0) {
        return reply.code(404).send({
          message:
            'A kategória nem található.',
        });
      }

      return {
        category: result[0],
      };
    },
  );

  /* VÁSÁRLÁS */
  app.post<{
    Body: PurchaseBody;
    }>(
    '/purchase',
    async (request, reply) => {
        const authUser = await authenticate(
        request,
        reply,
        );

        if (!authUser) return;

        if (
        !requireStaffAccess(
            authUser,
            reply,
        )
        ) {
        return;
        }

        const {
        userId,
        items,
        } = request.body;

        if (!userId) {
        return reply.code(400).send({
            message:
            'A fizető felhasználó azonosítója kötelező.',
        });
        }

        if (
        !Array.isArray(items) ||
        items.length === 0
        ) {
        return reply.code(400).send({
            message:
            'A kosár nem lehet üres.',
        });
        }

        /*
        * Ellenőrizzük a kosár tételeit.
        */
        for (const item of items) {
        if (
            !item.productId ||
            !Number.isInteger(
            item.quantity,
            ) ||
            item.quantity <= 0
        ) {
            return reply.code(400).send({
            message:
                'Érvénytelen kosártétel.',
            });
        }
        }

        /*
        * Ha ugyanaz a termék többször szerepel,
        * összevonjuk.
        */
        const quantityMap =
        new Map<string, number>();

        for (const item of items) {
        quantityMap.set(
            item.productId,
            (quantityMap.get(
            item.productId,
            ) ?? 0) + item.quantity,
        );
        }

        const normalizedItems =
        Array.from(
            quantityMap.entries(),
        ).map(
            ([productId, quantity]) => ({
            productId,
            quantity,
            }),
        );

        try {
        const result =
            await db.transaction(
            async (tx) => {
                /*
                * A vásárló lekérése a tranzakción belül.
                */
                const userResult =
                await tx
                    .select({
                    id: users.id,
                    name: users.name,
                    token: users.token,
                    isActive:
                        users.isActive,
                    })
                    .from(users)
                    .where(
                    eq(
                        users.id,
                        userId,
                    ),
                    )
                    .limit(1);

                const customer =
                userResult[0];

                if (!customer) {
                throw new Error(
                    'USER_NOT_FOUND',
                );
                }

                if (!customer.isActive) {
                throw new Error(
                    'USER_INACTIVE',
                );
                }

                /*
                * A termékek aktuális árait
                * mindig az adatbázisból kérjük le.
                *
                * A frontend által küldött árban
                * egyáltalán nem bízunk.
                */
                const productIds =
                normalizedItems.map(
                    (item) =>
                    item.productId,
                );

                const productResult =
                await tx
                    .select({
                    id: products.id,
                    name: products.name,
                    tokenPrice:
                        products.tokenPrice,
                    isActive:
                        products.isActive,
                    })
                    .from(products)
                    .where(
                    and(
                        inArray(
                        products.id,
                        productIds,
                        ),
                        eq(
                        products.isActive,
                        true,
                        ),
                    ),
                    );

                /*
                * Minden kosárban lévő terméknek
                * léteznie és aktívnak kell lennie.
                */
                if (
                productResult.length !==
                productIds.length
                ) {
                throw new Error(
                    'PRODUCT_NOT_FOUND',
                );
                }

                /*
                * Végösszeg kiszámítása
                * az adatbázisból kapott árak alapján.
                */
                let totalToken = 0;

                const orderItemValues =
                normalizedItems.map(
                    (item) => {
                    const product =
                        productResult.find(
                        (p) =>
                            p.id ===
                            item.productId,
                        );

                    if (!product) {
                        throw new Error(
                        'PRODUCT_NOT_FOUND',
                        );
                    }

                    totalToken +=
                        product.tokenPrice *
                        item.quantity;

                    return {
                        productId:
                        product.id,
                        quantity:
                        item.quantity,
                        unitTokenPrice:
                        product.tokenPrice,
                    };
                    },
                );

                if (totalToken <= 0) {
                throw new Error(
                    'INVALID_TOTAL',
                );
                }

                /*
                * Atomikus tokenlevonás.
                *
                * Nem elég előtte ellenőrizni a balance-t:
                * a WHERE token >= totalToken miatt
                * párhuzamos fizetésnél sem tudunk
                * negatív egyenleget létrehozni.
                */
                const updatedUser =
                await tx
                    .update(users)
                    .set({
                    token:
                        sql`${users.token} - ${totalToken}`,
                    updatedAt:
                        new Date(),
                    })
                    .where(
                    and(
                        eq(
                        users.id,
                        userId,
                        ),
                        eq(
                        users.isActive,
                        true,
                        ),
                        gte(
                        users.token,
                        totalToken,
                        ),
                    ),
                    )
                    .returning({
                    id: users.id,
                    token: users.token,
                    });

                if (
                updatedUser.length === 0
                ) {
                throw new Error(
                    'INSUFFICIENT_TOKENS',
                );
                }

                /*
                * Order létrehozása.
                */
                const orderResult =
                await tx
                    .insert(orders)
                    .values({
                    userId,
                    staffUserId:
                        authUser.sub,
                    totalToken,
                    status:
                        'completed',
                    })
                    .returning({
                    id: orders.id,
                    totalToken:
                        orders.totalToken,
                    createdAt:
                        orders.createdAt,
                    });

                const order =
                orderResult[0];

                /*
                * Order items.
                */
                await tx
                .insert(orderItems)
                .values(
                    orderItemValues.map(
                    (item) => ({
                        orderId:
                        order.id,
                        productId:
                        item.productId,
                        quantity:
                        item.quantity,
                        unitTokenPrice:
                        item.unitTokenPrice,
                    }),
                    ),
                );

                /*
                * Token tranzakció.
                *
                * Negatív amount = levonás.
                */
                await tx
                .insert(
                    tokenTransactions,
                )
                .values({
                    userId,
                    type: 'purchase',
                    amount:
                    -totalToken,
                    orderId:
                    order.id,
                    performedByUserId:
                    authUser.sub,
                    description:
                    'Termékvásárlás',
                });

                await sendNotify(customer.id, 'success', 'Sikeres vásárlás! ' + 'Sikeresen levontunk ' + result.totalToken + ' tokent a vásárlásodért. A vásárlás részleteit a "Vásárlások" menüpontban találod.');
                
                return {
                orderId: order.id,
                totalToken,
                remainingToken:
                    updatedUser[0]
                    .token,
                customerName:
                    customer.name,
                };
            },
          );

          return reply.code(201).send({
              success: true,
              ...result,
          });
        } catch (error) {
        if (
            error instanceof Error
        ) {
            switch (error.message) {
            case 'USER_NOT_FOUND':
                return reply
                .code(404)
                .send({
                    message:
                    'A fizető felhasználó nem található.',
                });

            case 'USER_INACTIVE':
                return reply
                .code(400)
                .send({
                    message:
                    'A felhasználó inaktív.',
                });

            case 'PRODUCT_NOT_FOUND':
                return reply
                .code(400)
                .send({
                    message:
                    'A kosár egyik terméke már nem elérhető.',
                });

            case 'INSUFFICIENT_TOKENS':
                return reply
                .code(400)
                .send({
                    message:
                    'A felhasználónak nincs elegendő tokenje a vásárláshoz.',
                });

            case 'INVALID_TOTAL':
                return reply
                .code(400)
                .send({
                    message:
                    'Érvénytelen vásárlási összeg.',
                });
            }
        }

        request.log.error(
            error,
            'Vásárlás végrehajtási hiba',
        );

        return reply.code(500).send({
            message:
            'A vásárlás végrehajtása sikertelen.',
        });
        }
    },
    );
  /*
   * -------------------------------------------------------
   * DELETE /categories/:id
   * -------------------------------------------------------
   *
   * Valójában soft delete:
   * isActive = false
   *
   * ADMIN ONLY
   */

  app.delete<{
    Params: {
      id: string;
    };
  }>(
    '/categories/:id',
    async (request, reply) => {
      const authUser = await authenticate(
        request,
        reply,
      );

      if (!authUser) return;

      if (
        !requireAdmin(
          authUser,
          reply,
        )
      ) {
        return;
      }

      const {
        id,
      } = request.params;

      const result =
        await db
          .update(
            productCategories,
          )
          .set({
            isActive: false,
            updatedAt:
              new Date(),
          })
          .where(
            eq(
              productCategories.id,
              id,
            ),
          )
          .returning({
            id:
              productCategories.id,
          });

      if (result.length === 0) {
        return reply.code(404).send({
          message:
            'A kategória nem található.',
        });
      }

      return {
        success: true,
      };
    },
  );

  /*
   * =========================================================
   * PRODUCTS
   * =========================================================
   */

  /*
   * -------------------------------------------------------
   * GET /products
   * -------------------------------------------------------
   *
   * ADMIN + PULTOS
   *
   * Csak aktív termékek,
   * csak aktív kategóriából.
   */

  app.get(
    '/products',
    async (request, reply) => {
      const authUser = await authenticate(
        request,
        reply,
      );

      if (!authUser) return;

      if (
        !requireStaffAccess(
          authUser,
          reply,
        )
      ) {
        return;
      }

      const result =
        await db
          .select({
            id: products.id,
            name: products.name,
            imagePath:
              products.imagePath,
            tokenPrice:
              products.tokenPrice,
            categoryId:
              products.categoryId,
            categoryName:
              productCategories.name,
            isActive:
              products.isActive,
          })
          .from(products)
          .innerJoin(
            productCategories,
            eq(
              products.categoryId,
              productCategories.id,
            ),
          )
          .where(
            and(
              eq(
                products.isActive,
                true,
              ),
              eq(
                productCategories.isActive,
                true,
              ),
            ),
          )
          .orderBy(
            asc(
              productCategories.sortOrder,
            ),
            asc(
              products.name,
            ),
          );

      return {
        products: result,
      };
    },
  );

  /*
   * -------------------------------------------------------
   * POST /products
   * -------------------------------------------------------
   *
   * ADMIN ONLY
   */

  app.post<{
    Body: ProductBody;
  }>(
    '/products',
    async (request, reply) => {
      const authUser = await authenticate(
        request,
        reply,
      );

      if (!authUser) return;

      if (
        !requireAdmin(
          authUser,
          reply,
        )
      ) {
        return;
      }

      const {
        name,
        imagePath,
        tokenPrice,
        categoryId,
        isActive = true,
      } = request.body;

      const normalizedName =
        name?.trim();

      if (!normalizedName) {
        return reply.code(400).send({
          message:
            'A termék neve kötelező.',
        });
      }

      if (
        !Number.isInteger(
          tokenPrice,
        ) ||
        tokenPrice <= 0
      ) {
        return reply.code(400).send({
          message:
            'Az ár pozitív egész szám kell legyen.',
        });
      }

      const category =
        await db
          .select({
            id:
              productCategories.id,
          })
          .from(productCategories)
          .where(
            and(
              eq(
                productCategories.id,
                categoryId,
              ),
              eq(
                productCategories.isActive,
                true,
              ),
            ),
          )
          .limit(1);

      if (category.length === 0) {
        return reply.code(400).send({
          message:
            'A kategória nem található vagy inaktív.',
        });
      }

      const result =
        await db
          .insert(products)
          .values({
            name: normalizedName,
            imagePath:
              imagePath ?? null,
            tokenPrice,
            categoryId,
            isActive,
          })
          .returning();

      return reply.code(201).send({
        product: result[0],
      });
    },
  );

  /*
   * -------------------------------------------------------
   * PATCH /products/:id
   * -------------------------------------------------------
   *
   * ADMIN ONLY
   */

  app.patch<{
    Params: {
      id: string;
    };
    Body: ProductBody;
  }>(
    '/products/:id',
    async (request, reply) => {
      const authUser = await authenticate(
        request,
        reply,
      );

      if (!authUser) return;

      if (
        !requireAdmin(
          authUser,
          reply,
        )
      ) {
        return;
      }

      const {
        id,
      } = request.params;

      const {
        name,
        imagePath,
        tokenPrice,
        categoryId,
        isActive,
      } = request.body;

      const updateData: {
        name?: string;
        imagePath?: string | null;
        tokenPrice?: number;
        categoryId?: string;
        isActive?: boolean;
        updatedAt: Date;
      } = {
        updatedAt: new Date(),
      };

      if (
        name !== undefined
      ) {
        const normalizedName =
          name.trim();

        if (!normalizedName) {
          return reply.code(400).send({
            message:
              'A termék neve nem lehet üres.',
          });
        }

        updateData.name =
          normalizedName;
      }

      if (
        imagePath !== undefined
      ) {
        updateData.imagePath =
          imagePath;
      }

      if (
        tokenPrice !== undefined
      ) {
        if (
          !Number.isInteger(
            tokenPrice,
          ) ||
          tokenPrice <= 0
        ) {
          return reply.code(400).send({
            message:
              'Az ár pozitív egész szám kell legyen.',
          });
        }

        updateData.tokenPrice =
          tokenPrice;
      }

      if (
        categoryId !== undefined
      ) {
        const category =
          await db
            .select({
              id:
                productCategories.id,
            })
            .from(
              productCategories,
            )
            .where(
              and(
                eq(
                  productCategories.id,
                  categoryId,
                ),
                eq(
                  productCategories.isActive,
                  true,
                ),
              ),
            )
            .limit(1);

        if (
          category.length === 0
        ) {
          return reply.code(400).send({
            message:
              'A kategória nem található vagy inaktív.',
          });
        }

        updateData.categoryId =
          categoryId;
      }

      if (
        isActive !== undefined
      ) {
        updateData.isActive =
          isActive;
      }

      const result =
        await db
          .update(products)
          .set(updateData)
          .where(
            eq(
              products.id,
              id,
            ),
          )
          .returning();

      if (result.length === 0) {
        return reply.code(404).send({
          message:
            'A termék nem található.',
        });
      }

      return {
        product: result[0],
      };
    },
  );

  /*
   * -------------------------------------------------------
   * DELETE /products/:id
   * -------------------------------------------------------
   *
   * Soft delete.
   *
   * ADMIN ONLY
   */

  app.delete<{
    Params: {
      id: string;
    };
  }>(
    '/products/:id',
    async (request, reply) => {
      const authUser = await authenticate(
        request,
        reply,
      );

      if (!authUser) return;

      if (
        !requireAdmin(
          authUser,
          reply,
        )
      ) {
        return;
      }

      const {
        id,
      } = request.params;

      const result =
        await db
          .update(products)
          .set({
            isActive: false,
            updatedAt:
              new Date(),
          })
          .where(
            eq(
              products.id,
              id,
            ),
          )
          .returning({
            id: products.id,
          });

      if (result.length === 0) {
        return reply.code(404).send({
          message:
            'A termék nem található.',
        });
      }

      return {
        success: true,
      };
    },
  );
}