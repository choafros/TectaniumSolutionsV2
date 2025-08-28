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
  const imageData = "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i0biupXmnvtTTshpbaMSWHJaM39PszdKf1CwqW+9ENlSFKbeMe+mQefm058qZdkQncRgBkpDTVtxy/Ei45c+VFcnDJE+MYyER221i7K9c197Q+LvdlNPocLspnDUNLBVuPq3syfTzBph+NmDrOFttFlR3XVa5kHt7awxb0NTzbcBltV2NrZYJuPGFj21Icl4e/MWp5Ko0lChlbRYacd2xv6anyhEQhJQ3snLedv57ft/JLOTMZRyX6udRMQeDiV4Nm3UcHLC9TEKa/uCivTzSMx9v0fYSmg83xsa8HjMpaZ+qKW/FipadVxUPfT7dP/EACcQAQABAwMCBgMBAAAAAAAAAAERACExQVFhcYEgQJGhwfAwcPGx/9oACAEBAAE/If3HnW4WlXYKILFrpDyNfzdfy9fwtJgBdUVlFqSg4nPk80b4lcNJxIwgY0vT9M/2kmEvpvX3j5qY/BkJ1ahVSI/JEvalkS97hiIpetIMX4RAE8UHKjrIjwJMAOgUVFC8kXEMbi8W7qDEkW3MiIe5moXr/wDUlExKnotMiR1Nz2FuqphLFrbrYWZNiaPbojVU0Gr1oACLaEhPSl8RVIInog9KcVkhaj8GoU2N28kuQs9DRRUE2SMEkU7z4Y1tm5wti8TWZ7YOHcWKCiN2QmKNSkQWLQ1kShQQaFcqtFmWPoUAD5ZCRbOWYxQCnvDYWRMdaldSxgJbq5FOtFiPECIFo7DReUukaagXc3xbmmPWsg6e9A6o9Z3AUKyYwFTalR5imwG4xR00TBO4dvnmlbhjq1vAjCnO7ZhWHtMVq/ewwLrbaMxm9SUWRSUjH3aNUdamDsQaAak9YBGDEyevjk+3xUdiUQXby/fQ4Uey8SfdYpGxHfsBU/0/lBGr6LRzTHBgGMBLwnD502NBllzZJgGw4mnVSJCtSEs5XlvkIVccp0vNzGi04GOJ2naGybjZaiTQT1grFGqrfxpjHI2DbZa4pg7YHK5yZl+GP+hIlz7UQSwEIAOnBULxkXtXpC9vLv11yyHcS5QQhnWmczOe9BD2ELBsS+z96f/aAAwDAQACAAMAAAAQ888888888888888888888888888888888888888888888888888886y+1888888888+DBvMIokEsU8889W88w4w408888Df88888888888888888888888888888888888888888888888888888888888888888888888888//EACIRAQACAQMDBQAAAAAAAAAAAAERIQAwMVFBYZFQYIGx8P/aAAgBAwEBPxD1VGcVmJJjmM7LOy85ByORk0npSw2Q8kNqmcDIE1SSljljWQgehuN7xOUZab+f3GmcjwYAQO/26kgNZKj2X//EACQRAAIBAwIGAwAAAAAAAAAAAAERIQAxYTBBUFFxgZGxYKHw/9oACAECAQE/EOKg6S2NQ+tYqx05YuRC0kAhzc30JylRkYSckMiCzlQ6QDc4YYYrt0kJHqPPfT/LlV/pqAdMvPBCPkRbNPeBATiPSHb4X//EACcQAQEAAgICAAYBBQAAAAAAAAERACExQVFhIEBwocHwEDBxkbHh/9oACAEBAAE/EPrGsNJsJcA2unGNAoinJAmfv35z9m/OfoX5w/GoCAcvOCeKiOOVgg+TcftPoIgb35OJgdLIBoOTbvzfRr+EK+N4cziIZ79AAAF0d6wigDTbKqyJ0XbzrLy+kz8inV+7K13OaJ26MBdmluAMyC4oRIlC4N3KnTDDIByp2bBABHyv3UW1svt1t/8AR/lvK2v+zijkDsEsdrs15VkkcDLymhgDK0MGOlFa1qIVWh384XohzrCNmHE4MGNL4lZNoAbqMUgeyKEaIE3pwT28nrdEKK+Dozdo4lRY0Gg37X4TwmpFS4bByD10OE42RR5AZXAz0TDcfEQhQIsp3jJ6sio48VWdXB5eRjAVQRn+3WjH8fAImdkg+Lg4EqQWvHbWtXrF8IzXgiNtpjbijsRKMH1QEWA5PE2jgxNkFDvTHTEZT6ALvVRSIYxltAOAFaabNnk8408UI3BaAaBdoY7JjLQWIshAFYl4qRGgFUjpiIdLBAcm04hPYgAOxwiPWGx1N0pOnEXLZYkuVKSEIOENIoMFhiDJ0xyYEN6EJuPBF6PDKkkbrdCIoXlfb4/TK4rLIsl1fl37F8foOb1Y4J7P+MyHt/xRD/IuVzclr0RFxQhu5d8ik3O7CLucjXmcVoiQOhwCCN6zAU6VjSY6IghrAW/HeyBWR68hXAy+cD+LligddaxSUeBzbuEzT54PRh9IJNgX6tOf6Jo822TleVgD2vUWBn+IQ2h0QeR6SCWsJQw8NoN8nl8uYvoRD4QE2lE0p3lRsEEPkaVvCpxgGmGjUUA+AH10/9k=";
  // params: (imageData, format, x, y, width, height)
  doc.addImage(imageData, "JPEG", 5, 1, 50, 50);

  // --- Header & Company Details ---
  doc.setFontSize(20);
  doc.setTextColor(primaryColor);
  doc.setFont('helvetica', 'bold');
  
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
