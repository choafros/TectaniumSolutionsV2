// src/app/api/admin/invoices/[id]/route.ts
import { NextResponse } from 'next/server';
import { db } from '@/lib/db/db';
import { invoices } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { cookies } from 'next/headers';
import { verify } from 'jsonwebtoken';

interface JwtPayload {
  role: string;
}

const updateInvoiceSchema = z.object({
    status: z.enum(['pending', 'paid', 'overdue']),
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

export async function GET(
    request: Request, 
    context: { params: Promise<{ id: string }> }
) {    
    if (!(await isAdmin())) {
        return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }
    
    const { id } = await context.params;

    if (!id) {
        return NextResponse.json({ message: 'Invalid Invoice Id' }, { status: 400 });
    }

    const invoiceId = parseInt(id, 10);

    if (isNaN(invoiceId)) {
        return NextResponse.json({ message: 'Invalid invoice ID' }, { status: 400 });
    }

    try {
        const invoiceDetails = await db.query.invoices.findFirst({
            where: eq(invoices.id, invoiceId),
            with: {
                user: { columns: { username: true } },
                invoiceTimesheets: {
                    with: {
                        timesheet: {
                            with: {
                                project: { columns: { name: true } }
                            }
                        }
                    }
                }
            }
        });

        if (!invoiceDetails) {
            return NextResponse.json({ message: 'Invoice not found' }, { status: 404 });
        }
        console.log('Fetched invoice details:', invoiceDetails);
        return NextResponse.json(invoiceDetails);
    } catch (error) {
        console.error(`Failed to fetch invoice ${invoiceId}:`, error);
        return NextResponse.json({ message: 'Failed to fetch invoice' }, { status: 500 });
    }
}

// PUT request to update invoice status
export async function PUT(
    request: Request, 
    context: { params: Promise<{ id: string }> }
) {    
    if (!(await isAdmin())) {
        return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    const { id } = await context.params;

    if (!id) {
        return NextResponse.json({ message: 'Invalid Invoice Id' }, { status: 400 });
    }

    const invoiceId = parseInt(id, 10);

    if (isNaN(invoiceId)) {
        return NextResponse.json({ message: 'Invalid Invoice Id' }, { status: 400 });
    }

    try {
        const body = await request.json();
        const validation = updateInvoiceSchema.safeParse(body);
        if (!validation.success) {
            return NextResponse.json({ message: 'Invalid input' }, { status: 400 });
        }

        await db.update(invoices)
            .set({ status: validation.data.status })
            .where(eq(invoices.id, invoiceId));

        return NextResponse.json({ message: 'Invoice status updated' });
    } catch (error) {
        console.error(`Failed to update invoice ${invoiceId}:`, error);
        return NextResponse.json({ message: 'Failed to update invoice' }, { status: 500 });
    }
}

export async function DELETE(
    request: Request, 
    context: { params: Promise<{ id: string }> }
) {   if (!(await isAdmin())) {
        return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    const { id } = await context.params;

    if (!id) {
        return NextResponse.json({ message: 'Invalid invoice Id' }, { status: 400 });
    }

    const invoiceId = parseInt(id, 10);
    
    if (isNaN(invoiceId)) {
        return NextResponse.json({ message: 'Invalid invoice Id' }, { status: 400 });
    }

    try {
        await db.delete(invoices).where(eq(invoices.id, invoiceId));
        return NextResponse.json({ message: 'Invoice deleted successfully' });
    } catch (error) {
        console.error(`Failed to delete invoice ${invoiceId}:`, error);
        return NextResponse.json({ message: 'Failed to delete invoice' }, { status: 500 });
    }
}
