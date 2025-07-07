import * as dotenv from 'dotenv';
import path from 'path';
// This line explicitly loads the .env.local file from your project root
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

// The rest of your seed script remains the same...
import { db } from './db';
import { users } from './schema';
import { eq } from 'drizzle-orm';
import { hash } from 'bcryptjs';

async function main() {
  console.log('Seeding database...');
  // ... your seeding logic
  const adminUsername = 'admin';
  const adminPassword = 'admin';

  const existingAdmin = await db.query.users.findFirst({
    where: eq(users.username, adminUsername),
  });

  if (existingAdmin) {
    console.log('Admin user already exists. Seeding complete.');
    return;
  }

  const hashedPassword = await hash(adminPassword, 10);

  await db.insert(users).values({
    username: adminUsername,
    password: hashedPassword,
    role: 'admin',
    active: true,
    email: 'admin@example.com',
    normalRate: '20',
    overtimeRate: '50',
  });

  console.log('Admin user created successfully.');
  console.log('Seeding complete.');
}

main().catch((error) => {
  console.error('Error during seeding:', error);
  process.exit(1);
});