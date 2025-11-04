// src/app/api/invoicing/generate-pdf/route.ts
import { NextResponse } from 'next/server';
import { db } from '@/lib/db/db';
import { invoices, users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { cookies } from 'next/headers';
import { verify } from 'jsonwebtoken';
import { generateInvoicePDF } from '@/lib/pdfGenerator';
import { getStorage } from '@/lib/firebase';

interface JwtPayload {
  role: string;
}

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
    const { invoiceId } = await request.json();
    if (!invoiceId) {
      return NextResponse.json({ message: 'Invoice ID is required' }, { status: 400 });
    }

    // 1. Fetch full invoice details
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

    // 2. Fetch full user details for the PDF
    const userData = await db.query.users.findFirst({
        where: eq(users.id, invoiceDetails.userId),
    });

    if (!userData) {
        return NextResponse.json({ message: 'User for invoice not found' }, { status: 404 });
    }

    // 3. Generate the PDF document
    const doc = await generateInvoicePDF(invoiceDetails, userData);
    const pdfBuffer = doc.output('arraybuffer');

    // 4. Upload to Firebase Storage
    const storage = getStorage();
    const bucket = storage.bucket();
    const fileName = `invoices/${invoiceDetails.userId}/${invoiceDetails.referenceNumber}.pdf`;
    const file = bucket.file(fileName);

    await file.save(Buffer.from(pdfBuffer), {
        metadata: {
            contentType: 'application/pdf',
        },
    });

    // 5. Get the public URL
    const [url] = await file.getSignedUrl({
        action: 'read',
        expires: '09-09-2100', // A very long expiry date
    });

    // 6. Update the invoice in the database with the URL
    await db.update(invoices).set({ pdfUrl: url }).where(eq(invoices.id, invoiceId));

    return NextResponse.json({ pdfUrl: url });

  } catch (error) {
    console.error('Failed to generate or upload PDF:', error);
    return NextResponse.json({ message: 'Failed to process PDF', error: (error as Error).message }, { status: 500 });
  }
}
