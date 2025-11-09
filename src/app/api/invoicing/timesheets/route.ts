// src/app/api/invoicing/timesheets/route.ts
import { NextResponse } from 'next/server';
import { db } from '@/lib/db/db';
import { timesheets } from '@/lib/db/schema';
import { and, eq } from 'drizzle-orm';
import { cookies } from 'next/headers';
import { verify } from 'jsonwebtoken';

interface JwtPayload {
  role: string;
}

async function isAdmin(): Promise<boolean> {
    const cookieStore =  await cookies();
    const token = cookieStore.get('session')?.value;

    if (!token) return false;
    try {
        const decoded = verify(token, process.env.JWT_SECRET!) as JwtPayload;
        return decoded.role === 'admin';
    } catch (err) {
        console.error('JWT verification failed:', err);
        return false;
    }
}

export async function GET(request: Request) {
    if (!await isAdmin()) {
        return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
        return NextResponse.json({ message: 'User Id is required' }, { status: 400 });
    }

    try {
        const approvedTimesheets = await db.query.timesheets.findMany({
            where: and(
                eq(timesheets.userId, parseInt(userId, 10)),
                eq(timesheets.status, 'approved')
            ),
            with: {
                project: {
                    columns: {
                        name: true
                    }
                }
            },
            orderBy: (timesheets, { asc }) => [asc(timesheets.weekStarting)],
        });

        return NextResponse.json(approvedTimesheets);

    } catch (error) {
        console.error('Failed to fetch approved timesheets:', error);
        return NextResponse.json({ message: 'Server error' }, { status: 500 });
    }
}
