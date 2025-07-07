import { NextResponse } from 'next/server';
import { db } from '@/lib/db/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { compare } from 'bcryptjs';

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json({ message: 'Username and password are required' }, { status: 400 });
    }

    const user = await db.query.users.findFirst({
      where: eq(users.username, username),
    });

    // 2. Add a check to see if a user was found and if they have a password
    if (!user || !user.password) {
      return NextResponse.json({ message: 'Invalid credentials' }, { status: 401 });
    }

    // 3. Securely compare the provided password with the stored hash
    const passwordsMatch = await compare(password, user.password);

    if (!passwordsMatch) {
      return NextResponse.json({ message: 'Invalid credentials' }, { status: 401 });
    }

    // 4. Don't send the password back to the client
    const { password: _, ...userWithoutPassword } = user;
    return NextResponse.json(userWithoutPassword);

  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ message: 'An internal server error occurred' }, { status: 500 });
  }
}