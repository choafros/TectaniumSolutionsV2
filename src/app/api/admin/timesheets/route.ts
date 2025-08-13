// src/app/api/admin/timesheets/route.ts
import { NextResponse } from 'next/server';
import { db } from '@/lib/db/db';
import { cookies } from 'next/headers';
import { verify } from 'jsonwebtoken';

interface JwtPayload {
  role: string;
}

async function isAdmin(): Promise<boolean> {
    const cookieStore = await cookies();
    const token = cookieStore.get('session')?.value;
    if (!token) return false;
    try {
        const decoded = verify(token, process.env.JWT_SECRET!) as JwtPayload;
        return decoded.role === 'admin';
    } catch {
        return false;
    }
}

export async function GET() {
    if (!(await isAdmin())) {
        return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    try {
        const allTimesheets = await db.query.timesheets.findMany({
            with: {
                project: { columns: { name: true } },
                user: { columns: { username: true } } 
            },
            orderBy: (timesheets, { desc }) => [desc(timesheets.weekStarting)],
        });
        return NextResponse.json(allTimesheets);
    } catch (error) {
        console.error('Failed to fetch timesheets:', error);
        return NextResponse.json({ message: 'Failed to fetch timesheets' }, { status: 500 });
    }
}
