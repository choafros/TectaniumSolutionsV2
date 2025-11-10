// src/app/api/timesheets/[id]/route.ts
import { NextResponse } from 'next/server';
import { db } from '@/lib/db/db';
import { timesheets } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { verify } from 'jsonwebtoken';
import { z } from 'zod';

interface JwtPayload {
  userId: number;
  role: 'admin' | 'candidate' | 'client';
}

async function getAuthPayload(): Promise<JwtPayload | null> {
    const cookieStore = await cookies();
    const token = cookieStore.get('session')?.value;
    
    if (!token) return null;
    try {
        const secret = process.env.JWT_SECRET!;
        return verify(token, secret) as JwtPayload;
    } catch (e) {
        console.error('JWT verification failed:', e);
        return null;
    }
}

const updateTimesheetSchema = z.object({
    dailyHours: z.any(),
    notes: z.string().optional(),
    totalHours: z.string(),
    status: z.enum(["draft", "pending", "approved", "rejected", "invoiced"]),
});

// This function calculates normal vs overtime hours based on 09:00–17:00 rule
// We use 9:00 (540 mins) and 17:00 (1020 mins) as the standard day
function calculateNormalAndOvertime(start: string, end: string) {
    if (!start || !end) {
        return { normalHours: 0, overtimeHours: 0 };
    }
    
    const [sH, sM] = start.split(":").map(Number);
    const [eH, eM] = end.split(":").map(Number);

    const startMin = sH * 60 + sM;
    const endMin = eH * 60 + eM;

    if (endMin <= startMin) {
        return { normalHours: 0, overtimeHours: 0 };
    }

    const normalStartMin = 8 * 60;   // 08:00
    const normalEndMin = 16 * 60;    // 16:00

    // Calculate overlap with normal working hours
    const normalOverlap = Math.max(
        0,
        Math.min(endMin, normalEndMin) - Math.max(startMin, normalStartMin)
    );

    const normalMinutes = normalOverlap;
    const totalMinutes = endMin - startMin;
    const overtimeMinutes = totalMinutes - normalMinutes;

    return {
        normalHours: normalMinutes / 60,
        overtimeHours: overtimeMinutes / 60,
    };
}

// PUT: update a timesheet
export async function PUT(
    request: Request, 
    context: { params: Promise<{ id: string }> }
) {
    const auth = await getAuthPayload();
    if (!auth) {
        return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    const { id } = await context.params;
    if (!id) {
        return NextResponse.json({ message: 'Timesheet Id is required' }, { status: 400 });
    }
    const timesheetId = parseInt(id, 10);
    
    if (isNaN(timesheetId)) {
        return NextResponse.json({ message: 'Invalid timesheet Id' }, { status: 400 });
    }

    try {
        const body = await request.json();
        const validation = updateTimesheetSchema.safeParse(body);

        if (!validation.success) {
            console.error("Zod validation failed:", validation.error.flatten());
            return NextResponse.json({ message: 'Invalid input', errors: validation.error.flatten().fieldErrors }, { status: 400 });
        }        
        const { dailyHours, notes, totalHours, status } = validation.data;
        
        const targetTimesheet = await db.query.timesheets.findFirst({ where: eq(timesheets.id, timesheetId) });

        if (!targetTimesheet) {
            return NextResponse.json({ message: 'Timesheet not found' }, { status: 404 });
        }

        const isOwner = targetTimesheet.userId === auth.userId;
        const isAdmin = auth.role === 'admin';
        
        if (!isAdmin && !isOwner) {
            return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
        }
        
        // Allow user to edit if it's rejected
        // A non-admin user cannot edit a pending or approved timesheet. Admins can.
        if (!isAdmin && (targetTimesheet.status === 'approved' || targetTimesheet.status === 'pending')) {
             return NextResponse.json({ message: 'Forbidden: Timesheet is locked.' }, { status: 403 });
        }
        // Get rates from the timesheet itself (they are snapshotted for history)
        const normalRateNum = parseFloat(targetTimesheet.normalRate?.toString() ?? "0");
        const overtimeRateNum = parseFloat(targetTimesheet.overtimeRate?.toString() ?? "0");

        let totalNormalHours = 0;
        let totalOvertimeHours = 0;

        // Recalculate hours from the *new* dailyHours submitted in the body
        for (const day of Object.values(dailyHours)) {
            // The dailyHours object is { monday: { start: '...', end: '...' }, ... }
            const { start, end } = day as { start?: string; end?: string };
            if (start && end) {
                const { normalHours, overtimeHours } = calculateNormalAndOvertime(start, end);
                totalNormalHours += normalHours;
                totalOvertimeHours += overtimeHours;
            }
        }

        // Recalculate final cost
        const normalPay = totalNormalHours * normalRateNum;
        const overtimePay = totalOvertimeHours * overtimeRateNum;
        const totalCost = normalPay + overtimePay;
        
        const updatedTimesheet = await db.update(timesheets)
            .set({ 
                status, 
                dailyHours,
                notes,
                totalHours,
                // Save the recalculated values
                normalHours: totalNormalHours.toFixed(2),
                overtimeHours: totalOvertimeHours.toFixed(2),
                totalCost: totalCost.toFixed(2) })
            .where(eq(timesheets.id, timesheetId))
            .returning();

        revalidatePath('/dashboard/timesheets');
        revalidatePath('/dashboard/admin/timesheets');

        return NextResponse.json(updatedTimesheet[0]);

    } catch (error) {
        console.error(`Failed to update timesheet ${timesheetId}:`, error);
        return NextResponse.json({ message: 'Failed to update timesheet' }, { status: 500 });
    }
}

// DELETE: remove a timesheet
export async function DELETE(
    request: Request, 
    context: { params: Promise<{ id: string }> }
) {
    const auth = await getAuthPayload();
    if (!auth || auth.role !== 'admin') {
        return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    // Await the params promise before using it
    const { id } = await context.params;
    const timesheetId = parseInt(id, 10);
     if (isNaN(timesheetId)) {
        return NextResponse.json({ message: 'Invalid timesheet ID' }, { status: 400 });
    }

    try {
        const targetTimesheet = await db.query.timesheets.findFirst({ where: eq(timesheets.id, timesheetId) });

        if (!targetTimesheet) {
            return NextResponse.json({ message: 'Timesheet not found' }, { status: 404 });
        }

        const isOwner = targetTimesheet.userId === auth.userId;
        const isAdmin = auth.role === 'admin';

        if (!isAdmin && !isOwner) {
             return NextResponse.json({ message: 'Forbidden: Cannot delete this timesheet' }, { status: 403 });
        }

        await db.delete(timesheets).where(eq(timesheets.id, timesheetId));

        revalidatePath('/dashboard/timesheets');
        revalidatePath('/dashboard/admin/timesheets');

        return NextResponse.json({ message: 'Timesheet deleted successfully' });

    } catch (error) {
        console.error(`Failed to delete timesheet ${timesheetId}:`, error);
        return NextResponse.json({ message: 'Failed to delete timesheet' }, { status: 500 });
    }
}