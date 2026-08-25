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

export const userRole = pgEnum('user_role', [
  'user',
  'staff',
  'admin',
]);

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),

  email: varchar('email', {
    length: 255,
  }).notNull().unique(),

  username: varchar('username', {
    length: 50,
  }).notNull().unique(),

  passwordHash: text('password_hash').notNull(),

  name: varchar('name', {
    length: 120,
  }).notNull(),

  memberId: varchar('member_id', {
    length: 50,
  }).notNull().unique(),

  qrToken: varchar('qr_token', {
    length: 64,
  }).notNull().unique(),

  token: integer('token')
    .notNull()
    .default(0),

  role: userRole('role')
    .notNull()
    .default('user'),

  isActive: boolean('is_active')
    .notNull()
    .default(true),

  createdAt: timestamp('created_at', {
    withTimezone: true,
  })
    .notNull()
    .defaultNow(),

  updatedAt: timestamp('updated_at', {
    withTimezone: true,
  })
    .notNull()
    .defaultNow(),
});