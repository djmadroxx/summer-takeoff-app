import {
  boolean,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

import {
  ROLES,
  type Role,
} from '@summer-takeoff/shared';

/*
 * =========================================================
 * ENUMS
 * =========================================================
 */

/*
 * A role-ok egyetlen központi helyről:
 * packages/shared/roles.ts
 */
export const userRole = pgEnum(
  'user_role',
  ROLES as [Role, ...Role[]],
);

export const tokenTransactionType = pgEnum(
  'token_transaction_type',
  [
    'add',
    'remove',
    'purchase',
  ],
);

export const orderStatus = pgEnum(
  'order_status',
  [
    'completed',
    'cancelled',
  ],
);

/*
 * =========================================================
 * USERS
 * =========================================================
 */

export const users = pgTable('users', {
  id: uuid('id')
    .defaultRandom()
    .primaryKey(),

  email: varchar('email', {
    length: 255,
  })
    .notNull()
    .unique(),

  username: varchar('username', {
    length: 50,
  })
    .notNull()
    .unique(),

  passwordHash: text(
    'password_hash',
  ).notNull(),

  name: varchar('name', {
    length: 120,
  }).notNull(),

  memberId: varchar('member_id', {
    length: 50,
  })
    .notNull()
    .unique(),

  qrToken: varchar('qr_token', {
    length: 64,
  })
    .notNull()
    .unique(),

  token: integer('token')
    .notNull()
    .default(0),

  role: userRole('role')
    .notNull()
    .default('user'),

  isActive: boolean('is_active')
    .notNull()
    .default(true),

  createdAt: timestamp(
    'created_at',
    {
      withTimezone: true,
    },
  )
    .notNull()
    .defaultNow(),

  updatedAt: timestamp(
    'updated_at',
    {
      withTimezone: true,
    },
  )
    .notNull()
    .defaultNow(),
});

/*
 * =========================================================
 * PRODUCT CATEGORIES
 * =========================================================
 */

export const productCategories =
  pgTable('product_categories', {
    id: uuid('id')
      .defaultRandom()
      .primaryKey(),

    name: varchar('name', {
      length: 100,
    })
      .notNull()
      .unique(),

    /*
     * A pultos oldalán ezzel tudjuk
     * meghatározni a kategóriák sorrendjét.
     */
    sortOrder: integer('sort_order')
      .notNull()
      .default(0),

    isActive: boolean('is_active')
      .notNull()
      .default(true),

    createdAt: timestamp(
      'created_at',
      {
        withTimezone: true,
      },
    )
      .notNull()
      .defaultNow(),

    updatedAt: timestamp(
      'updated_at',
      {
        withTimezone: true,
      },
    )
      .notNull()
      .defaultNow(),
  });

/*
 * =========================================================
 * PRODUCTS
 * =========================================================
 */

export const products = pgTable('products', {
  id: uuid('id')
    .defaultRandom()
    .primaryKey(),

  name: varchar('name', {
    length: 150,
  }).notNull(),

  /*
   * Például:
   * /uploads/products/cola-123.jpg
   */
  imagePath: varchar(
    'image_path',
    {
      length: 500,
    },
  ),

  /*
   * Az ár tokenben.
   */
  tokenPrice: integer(
    'token_price',
  ).notNull(),

  categoryId: uuid(
    'category_id',
  )
    .notNull()
    .references(
      () => productCategories.id,
      {
        onDelete: 'restrict',
      },
    ),

  /*
   * Törlés helyett inaktívvá tesszük.
   * Így a régi vásárlásoknál megmarad
   * a termék története.
   */
  isActive: boolean('is_active')
    .notNull()
    .default(true),

  createdAt: timestamp(
    'created_at',
    {
      withTimezone: true,
    },
  )
    .notNull()
    .defaultNow(),

  updatedAt: timestamp(
    'updated_at',
    {
      withTimezone: true,
    },
  )
    .notNull()
    .defaultNow(),
});

/*
 * =========================================================
 * ORDERS
 * =========================================================
 */

export const orders = pgTable('orders', {
  id: uuid('id')
    .defaultRandom()
    .primaryKey(),

  /*
   * A vendég, akitől levontuk
   * a tokeneket.
   */
  userId: uuid('user_id')
    .notNull()
    .references(
      () => users.id,
      {
        onDelete: 'restrict',
      },
    ),

  /*
   * A pultos, aki a vásárlást
   * végrehajtotta.
   */
  staffUserId: uuid(
    'staff_user_id',
  )
    .notNull()
    .references(
      () => users.id,
      {
        onDelete: 'restrict',
      },
    ),

  totalToken: integer(
    'total_token',
  ).notNull(),

  status: orderStatus(
    'status',
  )
    .notNull()
    .default('completed'),

  createdAt: timestamp(
    'created_at',
    {
      withTimezone: true,
    },
  )
    .notNull()
    .defaultNow(),
});

/*
 * =========================================================
 * ORDER ITEMS
 * =========================================================
 */

export const orderItems = pgTable(
  'order_items',
  {
    id: uuid('id')
      .defaultRandom()
      .primaryKey(),

    orderId: uuid('order_id')
      .notNull()
      .references(
        () => orders.id,
        {
          onDelete: 'cascade',
        },
      ),

    productId: uuid(
      'product_id',
    )
      .notNull()
      .references(
        () => products.id,
        {
          onDelete: 'restrict',
        },
      ),

    quantity: integer(
      'quantity',
    ).notNull(),

    /*
     * NAGYON FONTOS:
     * nem csak a productId-t tároljuk,
     * hanem a vásárláskori árat is.
     *
     * Ha később a Cola ára 2 tokenről
     * 3 tokenre változik, a régi vásárlás
     * továbbra is helyesen fog látszani.
     */
    unitTokenPrice: integer(
      'unit_token_price',
    ).notNull(),

    createdAt: timestamp(
      'created_at',
      {
        withTimezone: true,
      },
    )
      .notNull()
      .defaultNow(),
  },
);

/*
 * =========================================================
 * TOKEN TRANSACTIONS
 * =========================================================
 */

export const tokenTransactions =
  pgTable(
    'token_transactions',
    {
      id: uuid('id')
        .defaultRandom()
        .primaryKey(),

      /*
       * Akinek a tokenegyenlege változott.
       */
      userId: uuid('user_id')
        .notNull()
        .references(
          () => users.id,
          {
            onDelete: 'restrict',
          },
        ),

      /*
       * add:
       *   token feltöltés
       *
       * remove:
       *   manuális token levonás
       *
       * purchase:
       *   vásárlás miatt történt levonás
       */
      type: tokenTransactionType(
        'type',
      ).notNull(),

      /*
       * Pozitív = hozzáadás
       * Negatív = levonás
       */
      amount: integer(
        'amount',
      ).notNull(),

      /*
       * Ha vásárlásról van szó,
       * ide kerül a kapcsolódó order.
       */
      orderId: uuid('order_id').references(
        () => orders.id,
        {
          onDelete: 'set null',
        },
      ),

      /*
       * Ki hajtotta végre a műveletet.
       *
       * Például:
       * - admin töltött tokent
       * - pultos vásárlást végzett
       */
      performedByUserId: uuid(
        'performed_by_user_id',
      ).references(
        () => users.id,
        {
          onDelete: 'set null',
        },
      ),

      /*
       * Opcionális megjegyzés.
       */
      description: text(
        'description',
      ),

      createdAt: timestamp(
        'created_at',
        {
          withTimezone: true,
        },
      )
        .notNull()
        .defaultNow(),
    },
  );
  /*
 * =========================================================
 * NOTIFICATIONS
 * =========================================================
 */

export const notifications =
  pgTable('notifications', {
    id: uuid('id')
      .defaultRandom()
      .primaryKey(),

    /*
     * A felhasználó, akinek az értesítés szól.
     */
    userId: uuid('user_id')
      .notNull()
      .references(
        () => users.id,
        {
          onDelete: 'cascade',
        },
      ),

    /*
     * Értesítés típusa.
     *
     * Például:
     * - purchase
     * - token
     * - system
     * - warning
     */
    type: varchar('type', {
      length: 50,
    }).notNull(),

    /*
     * Az értesítés szövege.
     */
    text: text('text').notNull(),

    /*
     * Megnyitotta / elolvasta-e
     * a felhasználó.
     */
    isRead: boolean('is_read')
      .notNull()
      .default(false),

    createdAt: timestamp(
      'created_at',
      {
        withTimezone: true,
      },
    )
      .notNull()
      .defaultNow(),
  });