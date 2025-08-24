// src/lib/pdfGenerator.ts

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { type InferSelectModel } from 'drizzle-orm';
import { users as usersSchema, timesheets as timesheetsSchema, projects as projectsSchema, invoices as invoicesSchema } from '@/lib/db/schema';

// Correctly infer the User type from your schema export
type User = InferSelectModel<typeof usersSchema>;

// Define a detailed invoice type that includes relations
type Timesheet = InferSelectModel<typeof timesheetsSchema> & { project: Pick<InferSelectModel<typeof projectsSchema>, 'name'> };
type InvoiceDetails = InferSelectModel<typeof invoicesSchema> & { 
    user: Pick<User, 'username'>;
    invoiceTimesheets: { timesheet: Timesheet }[];
};

// A helper to safely convert string decimals to numbers
const toNumber = (val: string | null | undefined): number => parseFloat(val || '0');

export async function generateInvoicePDF(invoice: InvoiceDetails, userData: User) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  // --- Styles ---
  const primaryColor = '#2d3436';
  const secondaryColor = '#636e72';
  
  // --- Header & Company Details ---
  doc.setFontSize(20);
  doc.setTextColor(primaryColor);
  doc.setFont('helvetica', 'bold');
  doc.text("Tectanium Solutions", 14, 22);
  
  doc.setFontSize(10);
  doc.setTextColor(secondaryColor);
  doc.setFont('helvetica', 'normal');
  doc.text("123 Innovation Street\nLondon, UK", pageWidth - 14, 20, { align: "right" });

  // --- Client Details ---
  const clientY = 50;
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text("Invoice To:", 14, clientY);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.text(userData.username, 14, clientY + 7);
  if (userData.address) doc.text(userData.address, 14, clientY + 12);
  if (userData.email) doc.text(userData.email, 14, clientY + 17);

  // --- Invoice Metadata ---
  const invoiceMeta = [
    ["Invoice #", invoice.referenceNumber],
    ["Date Issued", new Date(invoice.createdAt!).toLocaleDateString()],
    ["UTR", userData.utr || "N/A"],
  ];
  
  autoTable(doc, {
    startY: clientY - 2,
    margin: { left: pageWidth / 2 },
    theme: "plain",
    styles: { fontSize: 10, cellPadding: 1.5 },
    body: invoiceMeta,
  });

  // --- Main Items Table ---
  const tableColumns = ["Description", "Normal", "Overtime", "Subtotal"];
  const tableBody = invoice.invoiceTimesheets.map(({ timesheet }) => {
    const normalCost = toNumber(timesheet.normalHours) * toNumber(timesheet.normalRate);
    const overtimeCost = toNumber(timesheet.overtimeHours) * toNumber(timesheet.overtimeRate);
    return [
      `${timesheet.referenceNumber}\nProject: ${timesheet.project.name}\nWeek of: ${new Date(timesheet.weekStarting).toLocaleDateString()}`,
      `${timesheet.normalHours}h @ £${timesheet.normalRate}`,
      `${timesheet.overtimeHours}h @ £${timesheet.overtimeRate}`,
      `£${(normalCost + overtimeCost).toFixed(2)}`
    ];
  });

  autoTable(doc, {
    startY: (doc as any).lastAutoTable.finalY + 20,
    head: [tableColumns],
    body: tableBody,
    theme: 'striped',
    headStyles: { fillColor: primaryColor, textColor: 255, fontSize: 10 },
    bodyStyles: { fontSize: 9 },
    margin: { left: 14, right: 14 }
  });

  // --- Totals Section ---
  const finalY = (doc as any).lastAutoTable.finalY;
  const totalsX = pageWidth - 14;
  doc.setFontSize(10);
  
  const subtotal = toNumber(invoice.subtotal);
  const vatAmount = subtotal * (toNumber(invoice.vatRate) / 100);
  const cisAmount = subtotal * (toNumber(invoice.cisRate) / 100);
  const totalAmount = toNumber(invoice.totalAmount);
  
  doc.text(`Subtotal: £${subtotal.toFixed(2)}`, totalsX, finalY + 10, { align: 'right' });
  doc.text(`VAT (${invoice.vatRate}%): £${vatAmount.toFixed(2)}`, totalsX, finalY + 15, { align: 'right' });
  doc.text(`CIS (${invoice.cisRate}%): -£${cisAmount.toFixed(2)}`, totalsX, finalY + 20, { align: 'right' });
  doc.setFont('helvetica', 'bold');
  doc.text(`Total Due: £${totalAmount.toFixed(2)}`, totalsX, finalY + 25, { align: 'right' });
  
  return doc;
}
