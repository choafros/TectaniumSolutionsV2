import { db } from '../src/lib/db/db';
import { users } from '../src/lib/db/schema';
import { eq } from 'drizzle-orm';
import { hash } from 'bcryptjs';

// This function updates a user's password.
async function updatePassword() {
  // --- CONFIGURATION ---
  const usernameToUpdate = 'admin';
  const newPassword = 'admin';
  // ---------------------

  console.log(`Attempting to update password for user: "${usernameToUpdate}"...`);

  const user = await db.query.users.findFirst({
    where: eq(users.username, usernameToUpdate),
  });

  if (!user) {
    console.error(`Error: User "${usernameToUpdate}" not found.`);
    return;
  }

  // Hash the new password
  const hashedPassword = await hash(newPassword, 10);

  // Update the user in the database
  await db.update(users)
    .set({ password: hashedPassword })
    .where(eq(users.id, user.id));

  console.log(`✅ Password for "${usernameToUpdate}" has been updated successfully.`);
}

updatePassword().catch((error) => {
  console.error('Failed to update password:', error);
  process.exit(1);
});