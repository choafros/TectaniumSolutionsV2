// src/app/api/users/route.ts
import { NextResponse } from 'next/server';
import { db } from '@/lib/db/db';
import { users } from '@/lib/db/schema';
import { eq, or, ilike } from 'drizzle-orm';
import { z } from 'zod';
import { hash } from 'bcryptjs';
import { cookies } from 'next/headers';
import { verify } from 'jsonwebtoken';
import { InferSelectModel } from "drizzle-orm";

type User = InferSelectModel<typeof users>;

interface JwtPayload {
  role: string;
}
const safeUserFields = {
  id: users.id,
  username: users.username,
  email: users.email,
  role: users.role,
  companyId: users.companyId,
  active: users.active,
  normalRate: users.normalRate,
  overtimeRate: users.overtimeRate,
  nino: users.nino,
  utr: users.utr,
  userType: users.userType,
  crn: users.crn,
  vatNumber: users.vatNumber,
  phoneNumber: users.phoneNumber,
  address: users.address,
  pdfUrl: users.pdfUrl,
  notes: users.notes,
  paymentFrequency: users.paymentFrequency,
};

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
export async function GET(request: Request) {

  if (!await isAdmin()) {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
  }

  try {
        const { searchParams } = new URL(request.url);
        const search = searchParams.get('search');

        const query = db
            .select(safeUserFields)
            .from(users);
            
        if (search) {
            query.where(
                or(
                    ilike(users.username, `%${search}%`)
                )
            );
        }
        const result = await query;
        return NextResponse.json(result);
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
