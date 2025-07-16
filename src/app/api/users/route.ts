// src/app/api/users/route.ts
import { NextResponse } from 'next/server';
import { db } from '@/lib/db/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function GET() {
  try {
    // Fetch all users, but only the fields we need for the filter
    const allUsers = await db.query.users.findMany({
      columns: {
        id: true,
        username: true,
        role: true,
      }
    });
    return NextResponse.json(allUsers);
  } catch (error) {
    console.error('Failed to fetch users:', error);
    return NextResponse.json({ message: 'Failed to fetch users' }, { status: 500 });
  }
}