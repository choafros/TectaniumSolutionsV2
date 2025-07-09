// scripts/run-create-user.ts
import * as dotenv from 'dotenv';
import path from 'path';

async function run() {
  console.log('User Creation Script Starting...');

  const envPath = path.resolve(process.cwd(), '.env.local');
  dotenv.config({ path: envPath });

  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL not found in .env.local');
    process.exit(1);
  }

  console.log('✅ Environment loaded, connecting to database...');
  const { default: createUser } = await import('./create-user');
  await createUser();
}

run().catch((err) => {
  console.error('Error during user creation:', err);
  process.exit(1);
});
