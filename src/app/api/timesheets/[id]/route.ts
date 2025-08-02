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
        return null;
    }
}

const updateTimesheetSchema = z.object({
    dailyHours: z.any(),
    notes: z.string().optional(),
    totalHours: z.string(),
    status: z.enum(["draft", "pending", "approved", "rejected", "invoiced"]),
});

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
        return NextResponse.json({ message: 'Timesheet ID is required' }, { status: 400 });
    }
    const timesheetId = parseInt(id, 10);
    
    if (isNaN(timesheetId)) {
        return NextResponse.json({ message: 'Invalid timesheet ID' }, { status: 400 });
    }

    try {
        const body = await request.json();
        let validation = updateTimesheetSchema.safeParse(body);

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
        
        const updatedTimesheet = await db.update(timesheets)
            .set({ status, dailyHours, notes, totalHours })
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