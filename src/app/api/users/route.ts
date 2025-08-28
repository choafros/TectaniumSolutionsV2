// src/app/api/users/route.ts
import { NextResponse } from 'next/server';
import { db } from '@/lib/db/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { hash } from 'bcryptjs';
import { cookies } from 'next/headers';
import { verify } from 'jsonwebtoken';

interface JwtPayload {
  role: string;
}

const userSchema = z.object({
    username: z.string().min(3),
    password: z.string().min(4),
    role: z.enum(['admin', 'client', 'candidate']),
    email: z.string().email().optional().or(z.literal('')).nullable(),
    active: z.boolean().optional(),
    normalRate: z.string().optional().nullable(),
    overtimeRate: z.string().optional().nullable(),
    phoneNumber: z.string().optional().or(z.literal('')).nullable(),
    address: z.string().optional().or(z.literal('')).nullable(),
    nino: z.string().optional().or(z.literal('')).nullable(),
    utr: z.string().optional().or(z.literal('')).nullable(),
    userType: z.enum(['sole_trader', 'business']).optional().nullable(),
    crn: z.string().optional().nullable(),
    vatNumber: z.string().optional().nullable(),
    paymentFrequency: z.enum(['weekly', 'fortnightly', 'monthly']).optional().nullable(),
});

async function isAdmin(): Promise<boolean> {
    const cookieStore =  await cookies();
    const token = cookieStore.get('session')?.value;

    if (!token) return false;
    try {
        const decoded = verify(token, process.env.JWT_SECRET!) as JwtPayload;
        return decoded.role === 'admin';
    } catch (e) {
        return false;
    }
}

// GET
export async function GET() {
  if (!await isAdmin()) {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
  }
  try {
    const allUsers = await db.query.users.findMany();
    
    return NextResponse.json(allUsers);
  } catch (error) {
    console.error('Failed to fetch users:', error);
    return NextResponse.json({ message: 'Failed to fetch users' }, { status: 500 });
  }
}

// POST: create a new user
export async function POST(request: Request) {
    if (!await isAdmin()) {
        return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    try {
        const body = await request.json();
        const validation = userSchema.safeParse(body);
        if (!validation.success) {
            return NextResponse.json({ message: 'Invalid input', errors: validation.error.flatten().fieldErrors }, { status: 400 });
        }

        const { username, password, ...otherData } = validation.data;

        const existingUser = await db.query.users.findFirst({ where: eq(users.username, username) });
        if (existingUser) {
            return NextResponse.json({ message: 'Username already exists' }, { status: 409 });
        }

        const hashedPassword = await hash(password, 10);

        const newUser = await db.insert(users).values({
            username,
            password: hashedPassword,
            ...otherData
        }).returning();

        return NextResponse.json(newUser[0], { status: 201 });

    } catch (error) {
        console.error('Failed to create user:', error);
        return NextResponse.json({ message: 'Failed to create user' }, { status: 500 });
    }
}
