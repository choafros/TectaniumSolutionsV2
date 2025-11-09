// src/app/api/users/[id]/route.ts
import { NextResponse } from 'next/server';
import { db } from '@/lib/db/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { cookies } from 'next/headers';
import { verify } from 'jsonwebtoken';

interface JwtPayload {
  role: string;
}

const updateUserSchema = z.object({
    username: z.string().min(3).optional(),
    role: z.enum(['admin', 'client', 'candidate']).optional(),
    active: z.boolean().optional(),
    normalRate: z.string().optional().nullable(),
    overtimeRate: z.string().optional().nullable(),
    email: z.string().email().optional().or(z.literal('')).nullable(),
    phoneNumber: z.string().optional().or(z.literal('')).nullable(),
    address: z.string().optional().or(z.literal('')).nullable(),
    nino: z.string().optional().or(z.literal('')).nullable(),
    utr: z.string().optional().or(z.literal('')).nullable(),
    userType: z.enum(['sole_trader', 'business']).optional().nullable(),
    pdfUrl: z.string().url().optional().nullable(),
    crn: z.string().optional().nullable(),
    vatNumber: z.string().optional().nullable(),
    paymentFrequency: z.enum(['weekly', 'fortnightly', 'monthly']).optional().nullable(),
    bankName: z.string().optional().nullable(),
    accountName: z.string().optional().nullable(),
    accountNumber: z.string().optional().nullable(),
    sortCode: z.string().optional().nullable(),
});

async function isAdmin(): Promise<boolean> {
    const cookieStore =  await cookies();
    const token = cookieStore.get('session')?.value;

    if (!token) return false;
    try {
        const decoded = verify(token, process.env.JWT_SECRET!) as JwtPayload;
        return decoded.role === 'admin';
    } catch (e) {
        console.error('JWT verification failed:', e);
        return false;
    }
}

// GET: to fetch a single user by ID
export async function GET(
    request: Request,
    context: { params: Promise<{ id: string }> }
) {
    if (!await isAdmin()) {
        return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    const { id } = await context.params;
    const userId = parseInt(id, 10);

    if (isNaN(userId)) {
        return NextResponse.json({ message: 'Invalid user ID' }, { status: 400 });
    }

    try {
        const user = await db.query.users.findFirst({
            where: eq(users.id, userId),
        });

        if (!user) {
            return NextResponse.json({ message: 'User not found' }, { status: 404 });
        }

        return NextResponse.json(user);
    } catch (error) {
        console.error(`Failed to fetch user ${userId}:`, error);
        return NextResponse.json({ message: 'Failed to fetch user' }, { status: 500 });
    }
}

// PUT: to update a user by ID
export async function PUT(
    request: Request, 
    context: { params: Promise<{ id: string }> }
) {
    if (!await isAdmin()) {
        return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    const { id } = await context.params;

    if (!id) {
        return NextResponse.json({ message: 'Invalid user ID' }, { status: 400 });
    }

    const userId = parseInt(id, 10);

    try {
        const body = await request.json();
        const validation = updateUserSchema.safeParse(body);
        if (!validation.success) {
            return NextResponse.json({ message: 'Invalid input', errors: validation.error.flatten().fieldErrors }, { status: 400 });
        }

        const updatedUser = await db.update(users)
            .set(validation.data)
            .where(eq(users.id, userId))
            .returning();

        if (updatedUser.length === 0) {
            return NextResponse.json({ message: 'User not found' }, { status: 404 });
        }

        return NextResponse.json(updatedUser[0]);

    } catch (error) {
        console.error(`Failed to update user ${userId}:`, error);
        return NextResponse.json({ message: 'Failed to update user' }, { status: 500 });
    }
}

// DELETE 
export async function DELETE(
    request: Request,
    context: { params: Promise<{ id: string }> }
) {
    if (!await isAdmin()) {
        return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    const { id } = await context.params;
    if (!id) {
        return NextResponse.json({ message: 'Invalid user ID' }, { status: 400 });
    }

    const userId = parseInt(id, 10);

    try {
        const deletedUser = await db.delete(users)
            .where(eq(users.id, userId))
            .returning();

        if (deletedUser.length === 0) {
            return NextResponse.json({ message: 'User not found' }, { status: 404 });
        }

        return NextResponse.json({ message: 'User deleted successfully' });

    } catch (error) {
        console.error(`Failed to delete user ${userId}:`, error);
        return NextResponse.json({ message: 'Failed to delete user' }, { status: 500 });
    }
}
