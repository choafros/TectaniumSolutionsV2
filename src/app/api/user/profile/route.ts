// src/app/api/user/profile/route.ts
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verify } from 'jsonwebtoken';
import { db } from '@/lib/db/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

interface JwtPayload {
  userId: number;
}

const userProfileSchema = z.object({
    email: z.string().email().optional().or(z.literal('')).nullable(),
    phoneNumber: z.string().optional().or(z.literal('')).nullable(),
    address: z.string().optional().or(z.literal('')).nullable(),
    nino: z.string().optional().or(z.literal('')).nullable(),
    utr: z.string().optional().or(z.literal('')).nullable(),
    userType: z.enum(['sole_trader', 'business']).optional().nullable(),
    crn: z.string().optional().nullable(),
    vatNumber: z.string().optional().nullable(),
    // Banking
    bankName: z.string().optional().nullable(),
    accountName: z.string().optional().nullable(),
    accountNumber: z.string().optional().nullable(),
    sortCode: z.string().optional().nullable(),
    iban: z.string().optional().nullable(),
    swift: z.string().optional().nullable(),
});


async function getUserIdFromToken(): Promise<number | null> {
    const cookieStore = await cookies();
    const token = cookieStore.get("session")?.value;
  
    if (!token) {
        console.error('Unauthorized: No token found');
        throw new Error("Unauthorized: No token found");
    }
  
    try {
      const secret = process.env.JWT_SECRET!;
      const decoded = verify(token, secret) as JwtPayload;
      return decoded.userId;
    } catch (error) {
      console.error('Invalid token', error);
      return null;
    }
}

export async function GET() {
  const userId = await getUserIdFromToken();

  if (!userId) {
    return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
  }

  try {
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!user) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }
    
    // Omit password before sending
    const { password: _password, ...safeUser } = user;
    return NextResponse.json(safeUser);

  } catch (error) {
    console.error('Error fetching user profile:', error);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
    const userId = await getUserIdFromToken();

    if (!userId) {
        return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
    }

    try {
        const body = await request.json();
        const validation = userProfileSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json({ message: 'Invalid input', errors: validation.error.flatten().fieldErrors }, { status: 400 });
        }
        
        await db.update(users)
            .set(validation.data)
            .where(eq(users.id, userId));
        
        return NextResponse.json({ message: 'Profile updated successfully' });

    } catch (error) {
        console.error('Failed to update profile:', error);
        return NextResponse.json({ message: 'Failed to update profile' }, { status: 500 });
    }
}
