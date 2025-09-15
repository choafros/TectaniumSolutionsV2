// src/app/api/invoicing/create/route.ts
import { NextResponse } from 'next/server';
import { db } from '@/lib/db/db';
import { invoices, invoiceTimesheets, timesheets, users } from '@/lib/db/schema';
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
  const cookieStore = await cookies();
  const token = cookieStore.get('session')?.value;

  if (!token) return false;
  try {
    const decoded = verify(token, process.env.JWT_SECRET!) as JwtPayload;
    return decoded.role === 'admin';
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const validation = createInvoiceSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { message: 'Invalid input', errors: validation.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { userId, timesheetIds, vatRate, cisRate } = validation.data;

    // Fetch the user to get their payment frequency
    const user = await db.query.users.findFirst({
        where: eq(users.id, userId),
    });

    // 1. Fetch and validate timesheets
    const timesheetsToInvoice = await db.query.timesheets.findMany({
      where: and(
        inArray(timesheets.id, timesheetIds),
        eq(timesheets.userId, userId),
        eq(timesheets.status, 'approved')
      ),
    });

    if (timesheetsToInvoice.length !== timesheetIds.length) {
      return NextResponse.json(
        { message: 'One or more timesheets are invalid or not approved.' },
        { status: 400 }
      );
    }

    // 2. Calculate totals
    const subtotal = timesheetsToInvoice.reduce(
      (acc, ts) => acc + parseFloat(ts.totalCost || '0'),
      0
    );
    const totalNormalHours = timesheetsToInvoice.reduce(
      (acc, ts) => acc + parseFloat(ts.normalHours || '0'),
      0
    );
    const totalOvertimeHours = timesheetsToInvoice.reduce(
      (acc, ts) => acc + parseFloat(ts.overtimeHours || '0'),
      0
    );

    // 3. Calculate Due Date
    const createdAt = new Date();
    let dueDate = new Date(createdAt);
    const paymentFrequency = user?.paymentFrequency || 'monthly';

    if (paymentFrequency === 'weekly') {
      dueDate.setDate(dueDate.getDate() + 7);
    } else if (paymentFrequency === 'fortnightly') {
      dueDate.setDate(dueDate.getDate() + 14);
    } else { // monthly
      dueDate.setMonth(dueDate.getMonth() + 1);
    }

    const vatAmount = subtotal * (vatRate / 100);
    const cisAmount = subtotal * (cisRate / 100);
    const totalAmount = subtotal + vatAmount - cisAmount;

    // 4. Create the invoice record
    const newInvoiceResult = await db.insert(invoices).values({
      userId,
      subtotal: subtotal.toFixed(2),
      vatRate: vatRate.toString(),
      cisRate: cisRate.toString(),
      totalAmount: totalAmount.toFixed(2),
      normalHours: totalNormalHours.toFixed(2),
      overtimeHours: totalOvertimeHours.toFixed(2),
      referenceNumber: 'TEMP', // Temporary until we know ID
      status: 'pending',
      normalRate: null,
      overtimeRate: null,
      createdAt: createdAt,
      dueDate: dueDate,
    }).returning();

    const newInvoice = newInvoiceResult[0];
    const invoiceId = newInvoice.id;

  // 4. Link timesheets to the invoice in the join table
    const invoiceTimesheetEntries = timesheetIds.map(tsId => ({
        invoiceId: invoiceId,
        timesheetId: tsId,
    }));
    await db.insert(invoiceTimesheets).values(invoiceTimesheetEntries);

    // 5. Update invoice with reference number
    const referenceNumber = `INV-${invoiceId}`;
    await db.update(invoices)
      .set({ referenceNumber })
      .where(eq(invoices.id, invoiceId));

    // 6. Mark timesheets as invoiced
    await db.update(timesheets)
      .set({ status: 'invoiced' })
      .where(inArray(timesheets.id, timesheetIds));

    // 7. Return final invoice
    const finalInvoice = { ...newInvoice, referenceNumber };
    return NextResponse.json(
      { message: 'Invoice created successfully', invoice: finalInvoice },
      { status: 201 }
    );

  } catch (error) {
    console.error('Failed to create invoice:', error);
    return NextResponse.json({ message: 'Failed to create invoice' }, { status: 500 });
  }
}
