// src/app/api/invoicing/create/route.ts
import { NextResponse } from 'next/server';
import { db } from '@/lib/db/db';
import { invoices, timesheets } from '@/lib/db/schema';
import { and, eq, inArray } from 'drizzle-orm';
import { z } from 'zod';
import { cookies } from 'next/headers';
import { verify } from 'jsonwebtoken';

interface JwtPayload {
  role: string;
}

const createInvoiceSchema = z.object({
    userId: z.number().int(),
    timesheetIds: z.array(z.number().int()).min(1),
    vatRate: z.number(),
    cisRate: z.number(),
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

export async function POST(request: Request) {
    if (!await isAdmin()) {
        return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    try {
        const body = await request.json();
        const validation = createInvoiceSchema.safeParse(body);
        if (!validation.success) {
            return NextResponse.json({ message: 'Invalid input', errors: validation.error.flatten().fieldErrors }, { status: 400 });
        }

        const { userId, timesheetIds, vatRate, cisRate } = validation.data;

        // 1. Fetch the timesheets to be invoiced to verify and calculate totals
        const timesheetsToInvoice = await db.query.timesheets.findMany({
            where: and(
                inArray(timesheets.id, timesheetIds),
                eq(timesheets.userId, userId),
                eq(timesheets.status, 'approved')
            )
        });

        if (timesheetsToInvoice.length !== timesheetIds.length) {
            return NextResponse.json({ message: 'One or more timesheets are invalid or not approved.' }, { status: 400 });
        }

        // 2. Calculate totals
        const subtotal = timesheetsToInvoice.reduce((acc, ts) => acc + parseFloat(ts.totalCost || '0'), 0);
        const totalNormalHours = timesheetsToInvoice.reduce((acc, ts) => acc + parseFloat(ts.normalHours || '0'), 0);
        const totalOvertimeHours = timesheetsToInvoice.reduce((acc, ts) => acc + parseFloat(ts.overtimeHours || '0'), 0);
        const vatAmount = subtotal * (vatRate / 100);
        const cisAmount = subtotal * (cisRate / 100);
        const totalAmount = subtotal + vatAmount - cisAmount;

        // 3. Perform DB operations sequentially as transactions are not supported
        
        // Create the invoice record first to get an ID
        const newInvoiceResult = await db.insert(invoices).values({
            userId,
            subtotal: subtotal.toFixed(2),
            vatRate: vatRate.toString(),
            cisRate: cisRate.toString(),
            totalAmount: totalAmount.toFixed(2),
            normalHours: totalNormalHours.toFixed(2),
            overtimeHours: totalOvertimeHours.toFixed(2),
            referenceNumber: 'TEMP', // Temporary reference
            status: 'pending',
            normalRate: null, 
            overtimeRate: null,
        }).returning();

        const newInvoice = newInvoiceResult[0];
        const invoiceId = newInvoice.id;
        const referenceNumber = `INV-${invoiceId}`;

        // Now, update the invoice with the correct reference number
        await db.update(invoices)
            .set({ referenceNumber })
            .where(eq(invoices.id, invoiceId));

        // Finally, update the timesheets
        await db.update(timesheets)
            .set({ status: 'invoiced' })
            .where(inArray(timesheets.id, timesheetIds));

        const finalInvoice = { ...newInvoice, referenceNumber };

        return NextResponse.json({ message: 'Invoice created successfully', invoice: finalInvoice }, { status: 201 });

    } catch (error) {
        console.error('Failed to create invoice:', error);
        return NextResponse.json({ message: 'Failed to create invoice' }, { status: 500 });
    }
}
