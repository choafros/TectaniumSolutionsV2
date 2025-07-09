// This secure route checks the session cookie and returns the current user's data.
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verify } from 'jsonwebtoken';
import { db } from '@/lib/db/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

interface JwtPayload {
  userId: number;
}

export async function GET() {
  const cookieStore = cookies();
  const token = (await cookieStore).get('session')?.value;

  if (!token) {
    return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
  }

  try {
    const secret = process.env.JWT_SECRET!;
    const decoded = verify(token, secret) as JwtPayload;

    const user = await db.query.users.findFirst({
      where: eq(users.id, decoded.userId),
      columns: {
        id: true,
        username: true,
        role: true,
      },
    });

    if (!user) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ user });
  } catch (error) {
    // This will catch invalid tokens
    return NextResponse.json({ message: 'Invalid token' }, { status: 401 });
  }
}