import bcrypt from 'bcrypt';
import { randomBytes } from 'node:crypto';
import { db } from './db/index.js';
import { users } from './db/schema.js';

const password = 'Test1234!';
const passwordHash = await bcrypt.hash(password, 12);

const qrToken = randomBytes(32).toString('hex');

await db.insert(users).values({
  email: 'test@summer-takeoff.com',
  passwordHash,
  name: 'Teszt Felhasználó',
  username: 'testuser',
  memberId: 'ST-000001',
  qrToken,
  role: 'user',
});

console.log('Tesztfelhasználó létrehozva.');
console.log('E-mail: test@summer-takeoff.com');
console.log('Jelszó: Test1234!');
console.log(`QR token: ${qrToken}`);

process.exit(0);