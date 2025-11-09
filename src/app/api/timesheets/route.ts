// src/app/api/timesheets/route.ts
import { NextResponse } from 'next/server';
import { db } from '@/lib/db/db';
import { timesheets, users } from '@/lib/db/schema';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { verify } from 'jsonwebtoken';
import type { DailyHours } from '@/lib/db/schema';

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
    const token = cookieStore.get("session")?.value;
    
    if (!token) {
        throw new Error("Unauthorized: No token found");
    }

    const secret = process.env.JWT_SECRET!;
    const decoded = verify(token, secret) as JwtPayload & { userId: number };
    console.log("Decoded JWT payload:", decoded);

    if (!decoded.userId) {
        throw new Error("Unauthorized: Invalid token");
    }

    return decoded.userId;
}

// GET: fetch timesheets
export async function GET(request: Request) {

    const userId = await getUserIdFromToken();
    if (!userId) {
        return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const weekStarting = searchParams.get('week');

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
        where: weekStarting 
        ? and(
        eq(timesheets.userId, userId),
        eq(timesheets.weekStarting, new Date(weekStarting))
        )
        : eq(timesheets.userId, userId),
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

    const { weekStarting, projectId, notes, dailyHours, status } = validation.data;

    // Transform the dailyHours to ensure it matches the DailyHours type
    const transformedDailyHours: DailyHours = {
    monday: {
        start: dailyHours.monday.start,
        end: dailyHours.monday.end,
        notes: dailyHours.monday.notes || ""
    },
    tuesday: {
        start: dailyHours.tuesday.start,
        end: dailyHours.tuesday.end,
        notes: dailyHours.tuesday.notes || ""
    },
    wednesday: {
    start: dailyHours.wednesday.start,
    end: dailyHours.wednesday.end,
    notes: dailyHours.wednesday.notes || ""
    },
    thursday: {
    start: dailyHours.thursday.start,
    end: dailyHours.thursday.end,
    notes: dailyHours.thursday.notes || ""
    },
    friday: {
    start: dailyHours.friday.start,
    end: dailyHours.friday.end,
    notes: dailyHours.friday.notes || ""
    },
    saturday: {
    start: dailyHours.saturday.start,
    end: dailyHours.saturday.end,
    notes: dailyHours.saturday.notes || ""
    },
    sunday: {
    start: dailyHours.sunday.start,
    end: dailyHours.sunday.end,
    notes: dailyHours.sunday.notes || ""
    }
    };
    console.log("Transformed daily hours:", transformedDailyHours);

    // Fetch user rates from the `users` table
    const [user] = await db
      .select({
        normalRate: users.normalRate,
        overtimeRate: users.overtimeRate,
      })
      .from(users)
      .where(eq(users.id, userId));

    if (!user) {
      return NextResponse.json(
        { message: "User rates not found" },
        { status: 404 }
      );
    }
    // Convert decimals into numbers
    const normalRateNum = parseFloat(user.normalRate?.toString() ?? "0");
    const overtimeRateNum = parseFloat(user.overtimeRate?.toString() ?? "0");

    let totalNormalHours = 0;
    let totalOvertimeHours = 0;

    for (const day of Object.values(transformedDailyHours)) {
    if (day.start && day.end) {
        const { normalHours, overtimeHours } = calculateNormalAndOvertime(
        day.start,
        day.end
        );
        totalNormalHours += normalHours;
        totalOvertimeHours += overtimeHours;
    }
    }
        // 💰 Calculate pay
    const normalPay = totalNormalHours * normalRateNum;
    const overtimePay = totalOvertimeHours * overtimeRateNum;
    const totalCost = normalPay + overtimePay;
        
    const newTimesheet = await db.insert(timesheets).values({
        referenceNumber: 'TEMP',
        userId,
        weekStarting: new Date(weekStarting),
        projectId,
        totalHours: (totalNormalHours + totalOvertimeHours).toFixed(2),
        notes,
        status,
        dailyHours: transformedDailyHours,
        normalHours: totalNormalHours.toFixed(2),
        normalRate: user.normalRate || '0.00',
        overtimeHours: totalOvertimeHours.toFixed(2),
        overtimeRate: user.overtimeRate || '0.00',
        totalCost: totalCost.toFixed(2),
    }).returning();

    const timesheetId = newTimesheet[0].id;
    const referenceNumber = `TS-${timesheetId}`;

    await db.update(timesheets)
    .set({ referenceNumber })
    .where(eq(timesheets.id, timesheetId));

    revalidatePath('/dashboard/timesheets');
    revalidatePath('/dashboard/admin/timesheets');
    return NextResponse.json(newTimesheet[0], { status: 201 });

    } catch (error) {
        console.error('Failed to create timesheet:', error);
        return NextResponse.json({ message: 'Failed to create timesheet' }, { status: 500 });
    }

    // helper: calculates normal vs overtime hours based on 09:00–17:00 rule
    function calculateNormalAndOvertime(start: string, end: string) {
    const [sH, sM] = start.split(":").map(Number);
    const [eH, eM] = end.split(":").map(Number);

    const startMin = sH * 60 + sM;
    const endMin = eH * 60 + eM;

    const normalStartMin = 8 * 60;   // 09:00 ? 8am 
    const normalEndMin = 16 * 60;    // 17:00 ? to 4pm

    // overlap with normal working hours
    const normalOverlap = Math.max(
        0,
        Math.min(endMin, normalEndMin) - Math.max(startMin, normalStartMin)
    );

    const normalMinutes = normalOverlap;
    const totalMinutes = endMin - startMin;
    const overtimeMinutes = totalMinutes - normalMinutes;

    return {
        normalHours: normalMinutes / 60,   // ✅ return numbers
        overtimeHours: overtimeMinutes / 60,
    };
    }


}