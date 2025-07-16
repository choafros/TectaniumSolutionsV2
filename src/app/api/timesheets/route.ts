// src/app/api/timesheets/route.ts
import { NextResponse } from 'next/server';
import { db } from '@/lib/db/db';
import { timesheets, users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { verify } from 'jsonwebtoken';

interface JwtPayload {
  userId: number;
}

// Zod schema for creating a timesheet
const dayEntrySchema = z.object({
  start: z.string().optional(),
  end:  z.string().optional(),
  notes: z.string().optional().default(""),
});

const dailyHoursSchema = z.object({
  monday: dayEntrySchema,
  tuesday: dayEntrySchema,
  wednesday: dayEntrySchema,
  thursday: dayEntrySchema,
  friday: dayEntrySchema,
  saturday: dayEntrySchema,
  sunday: dayEntrySchema,
});

const timesheetSchema = z.object({
  weekStarting: z.string().refine((date) => !isNaN(Date.parse(date)), { message: "Invalid date" }),
  projectId: z.number().int(),
  notes: z.string().optional(),
  totalHours: z.string().refine(val => !isNaN(parseFloat(val)), { message: "Total hours must be a number" }),
  dailyHours: dailyHoursSchema,
status: z.enum(['draft', 'pending']),
});

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

// GET: fetch timesheets
export async function GET() {
    const userId = await getUserIdFromToken();
    if (!userId) {
        return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
    }

    try {
        const currentUser = await db.query.users.findFirst({
            where: eq(users.id, userId),
            columns: { role: true }
        });

        if (!currentUser) {
            return NextResponse.json({ message: 'User not found' }, { status: 404 });
        }

        let userTimesheets;

        if (currentUser.role === 'admin') {
            userTimesheets = await db.query.timesheets.findMany({
                with: {
                    project: { columns: { name: true } },
                    user: { columns: { username: true } } 
                },
                orderBy: (timesheets, { desc }) => [desc(timesheets.weekStarting)],
            });
        } else {
            userTimesheets = await db.query.timesheets.findMany({
                where: eq(timesheets.userId, userId),
                with: {
                    project: { columns: { name: true } }
                },
                orderBy: (timesheets, { desc }) => [desc(timesheets.weekStarting)],
            });
        }

        return NextResponse.json(userTimesheets);
    } catch (error) {
        console.error('Failed to fetch timesheets:', error);
        return NextResponse.json({ message: 'Failed to fetch timesheets' }, { status: 500 });
    }
}

// POST: create a new timesheet
export async function POST(request: Request) {
    const userId = await getUserIdFromToken();
    if (!userId) {
        return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
    }

    try {
        const body = await request.json();
        console.log("Received body:", body);

        const validation = timesheetSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json({ message: 'Invalid input', errors: validation.error.flatten().fieldErrors }, { status: 400 });
        }

        const { weekStarting, projectId, totalHours, notes, dailyHours, status } = validation.data;
        
        console.log("Validated dailyHours:", dailyHours);

        //TODO: Fetch normal rate from projects hourlyRate. Overtime can be left as hardcoded for now!
        
        const normalRate = "20.00"; 
        const overtimeRate = "30.00";

        const newTimesheet = await db.insert(timesheets).values({
            userId,
            weekStarting: new Date(weekStarting),
            projectId,
            totalHours,
            notes,
            status,
            dailyHours,
            normalHours: totalHours,
            normalRate: normalRate,
            overtimeHours: "0",
            overtimeRate: overtimeRate,
            totalCost: (parseFloat(totalHours) * parseFloat(normalRate)).toString(),
            referenceNumber: `TS-${Date.now()}`
        }).returning();

        revalidatePath('/dashboard/timesheets');
        revalidatePath('/dashboard/admin/timesheets');
        return NextResponse.json(newTimesheet[0], { status: 201 });

    } catch (error) {
        console.error('Failed to create timesheet:', error);
        return NextResponse.json({ message: 'Failed to create timesheet' }, { status: 500 });
    }
}
