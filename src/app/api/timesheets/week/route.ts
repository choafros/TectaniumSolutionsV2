// src/app/api/timesheets/week/route.ts
import { NextResponse } from 'next/server';
import { db } from '@/lib/db/db';
import { timesheets } from '@/lib/db/schema';
import { and, eq } from 'drizzle-orm';
import { cookies } from 'next/headers';
import { verify } from 'jsonwebtoken';

interface JwtPayload {
  userId: number;
}

async function getUserIdFromToken(): Promise<number | null> {
    const cookieStore = await cookies();
    const token = cookieStore.get('session')?.value;
    if (!token) return null;

    try {
        const secret = process.env.JWT_SECRET!;
        const decoded = verify(token, secret) as JwtPayload;
        return decoded.userId;
    } catch (e) {
        return null;
    }
}

export async function GET(request: Request) {
    const userId = await getUserIdFromToken();
    if (!userId) {
        return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const weekStarting = searchParams.get('date');

    if (!weekStarting) {
        return NextResponse.json({ message: 'Date parameter is required' }, { status: 400 });
    }

    try {
        const existingTimesheet = await db.query.timesheets.findFirst({
            where: and(
                eq(timesheets.userId, userId),
                eq(timesheets.weekStarting, new Date(weekStarting))
            )
        });

        return NextResponse.json({ exists: !!existingTimesheet, timesheet: existingTimesheet });

    } catch (error) {
        console.error('Failed to check for existing timesheet:', error);
        return NextResponse.json({ message: 'Server error' }, { status: 500 });
    }
}
