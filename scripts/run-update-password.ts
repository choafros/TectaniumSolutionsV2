import * as dotenv from 'dotenv';
import path from 'path';

// This function will run FIRST
async function run() {
  console.log('Update Password Runner starting...');

  // Explicitly load the .env.local file from the project root.
  const envPath = path.resolve(process.cwd(), '.env.local');
  dotenv.config({ path: envPath });

  console.log('Attempting to load environment variables from:', envPath);
  
  // Check if the variable was loaded successfully
  if (!process.env.DATABASE_URL) {
    console.error('🔴 CRITICAL: DATABASE_URL not found after loading .env.local');
    console.error('Please ensure your .env.local file exists and contains the DATABASE_URL variable.');
    process.exit(1); // Exit with an error code
  }
  
  console.log('✅ DATABASE_URL loaded successfully.');
  
  // Now that the environment is confirmed to be loaded,
  // we can safely import and run the update-password script.
  console.log('Importing and running the update-password script...');
  // This assumes update-password.ts is in the same 'scripts' folder.
  await import('./update-password');
}

run().catch((e) => {
  console.error('Failed to run update password script:', e);
  process.exit(1);
});