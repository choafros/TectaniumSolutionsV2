// scripts/create-user.ts
import { db } from '@/lib/db/db';
import { users } from '@/lib/db/schema';
import { hash } from 'bcryptjs';
import { eq } from 'drizzle-orm';

const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const allowedRoles = ['admin', 'candidate', 'client'] as const;
type Role = typeof allowedRoles[number];

function ask(question: string): Promise<string> {
  return new Promise((resolve) => rl.question(question, resolve));
}

export default async function createUser() {
  const username = await ask('Enter username: ');
  const plainPassword = await ask('Enter password: ');
  const role = await ask('Enter role (admin/candidate/client): ');

  rl.close();

  const hashedPassword = await hash(plainPassword, 10);

  // Check if user already exists
  const existing = await db.query.users.findFirst({
    where: eq(users.username, username),
  });

  if (existing) {
    console.error(`❌ User "${username}" already exists.`);
    process.exit(1);
  }

  await db.insert(users).values({
    username,
    password: hashedPassword,
    role: role as Role,
  });

  console.log(`✅ User "${username}" created successfully with role "${role}"`);
}
