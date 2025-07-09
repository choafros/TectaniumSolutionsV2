// src/app/api/timesheets/[id]/route.ts
import { NextResponse } from 'next/server';
import { db } from '@/lib/db/db';
import { timesheets, users } from '@/lib/db/schema';
import { and, eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { verify } from 'jsonwebtoken';
import { z } from 'zod';

interface JwtPayload {
  userId: number;
  role: 'admin' | 'candidate' | 'client';
}

async function getAuthPayload(): Promise<JwtPayload | null> {
    // Await the cookies() function to get the cookie store
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

const statusUpdateSchema = z.object({
    status: z.enum(["draft", "pending", "approved", "rejected", "invoiced"]),
});

// PUT handler to update a timesheet (e.g., change status)
export async function PUT(request: Request, { params }: { params: { id: string } }) {
    const auth = await getAuthPayload();
    if (!auth) {
        return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
    }

    const timesheetId = parseInt(params.id, 10);
    if (isNaN(timesheetId)) {
        return NextResponse.json({ message: 'Invalid timesheet ID' }, { status: 400 });
    }

    try {
        const body = await request.json();
        const validation = statusUpdateSchema.safeParse(body);
        if (!validation.success) {
            return NextResponse.json({ message: 'Invalid input', errors: validation.error.flatten().fieldErrors }, { status: 400 });
        }
        
        const { status } = validation.data;

        const targetTimesheet = await db.query.timesheets.findFirst({ where: eq(timesheets.id, timesheetId) });

        if (!targetTimesheet) {
            return NextResponse.json({ message: 'Timesheet not found' }, { status: 404 });
        }

        const isOwner = targetTimesheet.userId === auth.userId;
        const isAdmin = auth.role === 'admin';
        const isApproved = targetTimesheet.status === 'approved';

        if (!isAdmin && (!isOwner || isApproved)) {
             return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
        }
        
        const updatedTimesheet = await db.update(timesheets)
            .set({ status })
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

// DELETE handler to remove a timesheet
export async function DELETE(request: Request, { params }: { params: { id: string } }) {
     const auth = await getAuthPayload();
    if (!auth) {
        return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
    }

    const timesheetId = parseInt(params.id, 10);
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
        const isApproved = targetTimesheet.status === 'approved';

        if (!isAdmin && (!isOwner || isApproved)) {
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
