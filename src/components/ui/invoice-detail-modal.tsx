// src/components/ui/invoice-detail-modal.tsx
"use client";

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { type InferSelectModel } from 'drizzle-orm';
import { invoices as invoicesSchema, users as usersSchema, timesheets as timesheetsSchema, projects as projectsSchema } from '@/lib/db/schema';
import { generateInvoicePDF } from '@/lib/pdfGenerator';

type Timesheet = InferSelectModel<typeof timesheetsSchema> & { project: Pick<InferSelectModel<typeof projectsSchema>, 'name'> };
type InvoiceDetails = InferSelectModel<typeof invoicesSchema> & { 
    user: Pick<User, 'id' | 'username'>; // Added 'id' to the user object
    invoiceTimesheets: { timesheet: Timesheet }[];
};
// Correctly infer the User type from your schema export
type User = InferSelectModel<typeof usersSchema>;

interface InvoiceDetailModalProps {
  invoiceId: number | null;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

export function InvoiceDetailModal({ invoiceId, isOpen, setIsOpen }: InvoiceDetailModalProps) {
    const [invoice, setInvoice] = useState<InvoiceDetails | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);

    useEffect(() => {
        if (isOpen && invoiceId) {
            const fetchInvoiceDetails = async () => {
                setIsLoading(true);
                try {
                    const res = await fetch(`/api/admin/invoices/${invoiceId}`);
                    if (!res.ok) throw new Error('Failed to fetch invoice details');
                    const data = await res.json();
                    setInvoice(data);
                } catch (error) {
                    console.error(error);
                } finally {
                    setIsLoading(false);
                }
            };
            fetchInvoiceDetails();
        }
    }, [isOpen, invoiceId]);

    const handleGeneratePdf = async () => {
            if (!invoice) return;

            setIsGenerating(true);
            try {
                // Fetch the full user details required for the invoice PDF
                const userRes = await fetch(`/api/users/${invoice.user.id}`);
                if(!userRes.ok) {
                    const errorData = await userRes.json();
                    throw new Error(errorData.message || 'Failed to fetch user details for PDF.');
                }
                const userData: User = await userRes.json();
                
                const doc = await generateInvoicePDF(invoice, userData);
                // ✅ Instead of saving, open in new tab
                const pdfBlobUrl = doc.output("bloburl");
                window.open(pdfBlobUrl, "_blank");
                doc.save(`invoice-${invoice.referenceNumber}.pdf`);
            } catch (error) {
                console.error("Failed to generate PDF:", error);
                alert(`Could not generate PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
            } finally {
                setIsGenerating(false);
            }
        };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent className="sm:max-w-3xl max-h-[90vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Invoice Details</DialogTitle>
                    {invoice && <DialogDescription>Invoice {invoice.referenceNumber} for {invoice.user.username}</DialogDescription>}
                </DialogHeader>
                {isLoading ? <div className="text-center py-8">Loading...</div> : !invoice ? <div className="text-center py-8">No details found.</div> : (
                    <div className="flex-1 overflow-y-auto pr-4">
                        <div className="space-y-4">
                            <h3 className="font-semibold">Included Timesheets</h3>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Ref</TableHead>
                                        <TableHead>Project</TableHead>
                                        <TableHead>Week</TableHead>
                                        <TableHead>Normal</TableHead>
                                        <TableHead>Overtime</TableHead>
                                        <TableHead className="text-right">Cost</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {invoice.invoiceTimesheets.map(({ timesheet }) => (
                                        <TableRow key={timesheet.id}>
                                            <TableCell className="font-mono text-xs">{timesheet.referenceNumber}</TableCell>
                                            <TableCell>{timesheet.project.name}</TableCell>
                                            <TableCell>{new Date(timesheet.weekStarting).toLocaleDateString()}</TableCell>
                                            <TableCell>{timesheet.normalHours}h @ £{timesheet.normalRate}</TableCell>
                                            <TableCell>{timesheet.overtimeHours}h @ £{timesheet.overtimeRate}</TableCell>
                                            <TableCell className="text-right">£{timesheet.totalCost}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                            <Separator />
                            <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm w-full max-w-sm ml-auto">
                                <span className="font-medium">Subtotal:</span>
                                <span className="text-right">£{invoice.subtotal}</span>

                                <span className="text-muted-foreground">VAT ({invoice.vatRate}%):</span>
                                <span className="text-right">+ £{(parseFloat(invoice.subtotal!) * (parseFloat(invoice.vatRate!) / 100)).toFixed(2)}</span>
                                
                                <span className="text-muted-foreground">CIS ({invoice.cisRate}%):</span>
                                <span className="text-right text-red-600">- £{(parseFloat(invoice.subtotal!) * (parseFloat(invoice.cisRate!) / 100)).toFixed(2)}</span>

                                <Separator className="col-span-2 my-1" />

                                <span className="font-bold text-base">Total Amount:</span>
                                <span className="text-right font-bold text-base">£{invoice.totalAmount}</span>
                            </div>
                        </div>
                    </div>
                )}
                <DialogFooter className="pt-4 border-t">
                    <Button variant="outline" onClick={() => setIsOpen(false)}>Close</Button>
                    <Button onClick={handleGeneratePdf} disabled={isGenerating}>
                        {isGenerating ? 'Generating...' : 'Generate PDF'}
                    </Button>                
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
