// src/app/dashboard/admin/invoicing/page.tsx
"use client";

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '@/components/auth-provider';
import { useRouter } from 'next/navigation';
import { type InferSelectModel } from 'drizzle-orm';
import { users as usersSchema, timesheets as timesheetsSchema, projects as projectsSchema } from '@/lib/db/schema';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { BackgroundGradient } from '@/components/ui/background-gradient';
import { Separator } from '@/components/ui/separator';

type User = InferSelectModel<typeof usersSchema>;
type Timesheet = InferSelectModel<typeof timesheetsSchema> & { project: Pick<InferSelectModel<typeof projectsSchema>, 'name'> };

export default function AdminInvoicingPage() {
    const { user } = useAuth();
    const router = useRouter();

    const [users, setUsers] = useState<User[]>([]);
    const [selectedUserId, setSelectedUserId] = useState<string>('');
    const [timesheets, setTimesheets] = useState<Timesheet[]>([]);
    const [selectedTimesheetIds, setSelectedTimesheetIds] = useState<Set<number>>(new Set());
    
    const [vatRate, setVatRate] = useState('20');
    const [cisRate, setCisRate] = useState('20');

    const [isLoading, setIsLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);
    const [error, setError] = useState('');

    const fetchUsers = useCallback(async () => {
        const res = await fetch('/api/users');
        if (res.ok) {
            const allUsers = await res.json();
            setUsers(allUsers.filter((u: User) => u.role === 'candidate'));
        }
    }, []);

    const fetchTimesheets = useCallback(async (userId: string) => {
        if (!userId) {
            setTimesheets([]);
            return;
        }
        setIsLoading(true);
        try {
            const res = await fetch(`/api/invoicing/timesheets?userId=${userId}`);
            if (!res.ok) throw new Error('Failed to fetch timesheets');
            const data = await res.json();
            setTimesheets(data);
            // Automatically select all timesheets by default
            setSelectedTimesheetIds(new Set(data.map((ts: Timesheet) => ts.id)));
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        if (user && user.role !== 'admin') {
            router.push('/dashboard');
        } else {
            fetchUsers();
        }
    }, [user, router, fetchUsers]);

    useEffect(() => {
        fetchTimesheets(selectedUserId);
    }, [selectedUserId, fetchTimesheets]);

    const handleSelectTimesheet = (id: number, checked: boolean) => {
        setSelectedTimesheetIds(prev => {
            const newSet = new Set(prev);
            if (checked) {
                newSet.add(id);
            } else {
                newSet.delete(id);
            }
            return newSet;
        });
    };

    const invoiceData = useMemo(() => {
        const selected = timesheets.filter(ts => selectedTimesheetIds.has(ts.id));
        
        const subtotal = selected.reduce((acc, ts) => acc + parseFloat(ts.totalCost || '0'), 0);
        const totalNormalHours = selected.reduce((acc, ts) => acc + parseFloat(ts.normalHours || '0'), 0);
        const totalOvertimeHours = selected.reduce((acc, ts) => acc + parseFloat(ts.overtimeHours || '0'), 0);

        const vatAmount = subtotal * (parseFloat(vatRate) / 100);
        const cisAmount = subtotal * (parseFloat(cisRate) / 100);
        const totalAmount = subtotal + vatAmount - cisAmount;

        return {
            subtotal,
            vatAmount,
            cisAmount,
            totalAmount,
            totalNormalHours,
            totalOvertimeHours,
            selectedCount: selected.length
        };
    }, [timesheets, selectedTimesheetIds, vatRate, cisRate]);

    const handleGenerateInvoice = async () => {
        if (!selectedUserId || selectedTimesheetIds.size === 0) {
            setError("Please select a user and at least one timesheet.");
            return;
        }
        setIsCreating(true);
        setError('');

        try {
            const res = await fetch('/api/invoicing/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: parseInt(selectedUserId),
                    timesheetIds: Array.from(selectedTimesheetIds),
                    vatRate: parseFloat(vatRate),
                    cisRate: parseFloat(cisRate),
                }),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.message || 'Failed to generate invoice');
            }

            // Success, refetch timesheets for the user
            fetchTimesheets(selectedUserId);

        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unknown error occurred');
        } finally {
            setIsCreating(false);
        }
    };

    if (!user || user.role !== 'admin') {
        return <p>Access Denied.</p>;
    }

    return (
        <div className="relative w-full h-full">
            <BackgroundGradient from="from-cyan-400" to="to-light-blue-500" shape="polygon(25% 0%, 100% 0%, 75% 100%, 0% 100%)" />
            <Card>
                <CardHeader>
                    <CardTitle>Create Invoice</CardTitle>
                    <CardDescription>Generate a new invoice from approved timesheets for a user.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                        <div className="grid gap-1.5">
                            <Label htmlFor="user-select">Select User</Label>
                            <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                                <SelectTrigger id="user-select"><SelectValue placeholder="Select a user..." /></SelectTrigger>
                                <SelectContent>
                                    {users.map(u => <SelectItem key={u.id} value={u.id.toString()}>{u.username}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-1.5">
                            <Label htmlFor="vat-rate">VAT Rate</Label>
                            <Select value={vatRate} onValueChange={setVatRate}>
                                <SelectTrigger id="vat-rate"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="0">0%</SelectItem>
                                    <SelectItem value="5">5%</SelectItem>
                                    <SelectItem value="20">20%</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-1.5">
                            <Label htmlFor="cis-rate">CIS Deduction Rate</Label>
                            <Select value={cisRate} onValueChange={setCisRate}>
                                <SelectTrigger id="cis-rate"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="0">0%</SelectItem>
                                    <SelectItem value="20">20%</SelectItem>
                                    <SelectItem value="30">30%</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <Separator />

                    <div>
                        <h3 className="text-lg font-medium mb-2">Timesheets to Invoice</h3>
                        <div className="border rounded-lg max-h-96 overflow-y-auto">
                            {isLoading ? <p className="p-4 text-center">Loading timesheets...</p> : timesheets.length === 0 ? <p className="p-4 text-center text-gray-500">No approved timesheets available for this user.</p> : (
                                <ul className="divide-y">
                                    {timesheets.map(ts => (
                                        <li key={ts.id} className="p-4 flex items-start gap-4">
                                            <Checkbox 
                                                id={`ts-${ts.id}`} 
                                                checked={selectedTimesheetIds.has(ts.id)}
                                                onCheckedChange={(checked) => handleSelectTimesheet(ts.id, !!checked)}
                                                className="mt-1"
                                            />
                                            <div className="grid gap-1 text-sm flex-1">
                                                <Label htmlFor={`ts-${ts.id}`} className="font-bold">{ts.referenceNumber} - Week of {new Date(ts.weekStarting).toLocaleDateString()}</Label>
                                                <p className="text-muted-foreground">Project: {ts.project.name}</p>
                                                <div className="flex gap-4 text-xs">
                                                    <span>Normal: {ts.normalHours}h @ £{ts.normalRate}</span>
                                                    <span>Overtime: {ts.overtimeHours}h @ £{ts.overtimeRate}</span>
                                                    <span className="font-semibold">Total: £{ts.totalCost}</span>
                                                </div>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </div>

                    <Separator />

                    <div className="p-4 bg-gray-50 rounded-lg space-y-2">
                        <h3 className="text-lg font-medium">Invoice Summary</h3>
                        <div className="flex justify-between items-center text-sm font-medium">
                            <span>Subtotal ({invoiceData.selectedCount} items):</span>
                            <span>£{invoiceData.subtotal.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-muted-foreground">Total Normal Hours:</span>
                            <span>{invoiceData.totalNormalHours.toFixed(2)}h</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-muted-foreground">Total Overtime Hours:</span>
                            <span>{invoiceData.totalOvertimeHours.toFixed(2)}h</span>
                        </div>
                         <div className="flex justify-between items-center text-sm">
                            <span className="text-muted-foreground">VAT ({vatRate}%):</span>
                            <span>+ £{invoiceData.vatAmount.toFixed(2)}</span>
                        </div>
                         <div className="flex justify-between items-center text-sm">
                            <span className="text-muted-foreground">CIS Deduction ({cisRate}%):</span>
                            <span className="text-red-600">- £{invoiceData.cisAmount.toFixed(2)}</span>
                        </div>
                        <Separator />
                        <div className="flex justify-between items-center text-lg font-bold">
                            <span>Total Amount:</span>
                            <span>£{invoiceData.totalAmount.toFixed(2)}</span>
                        </div>
                    </div>
                     {error && <p className="text-sm text-red-500 text-center">{error}</p>}
                    <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setSelectedUserId('')}>Cancel</Button>
                        <Button onClick={handleGenerateInvoice} disabled={isCreating || selectedTimesheetIds.size === 0}>
                            {isCreating ? 'Generating...' : 'Generate Invoice'}
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

// Add Separator to ui if it doesn't exist
// src/components/ui/separator.tsx
/*
"use client"
import * as React from "react"
import * as SeparatorPrimitive from "@radix-ui/react-separator"
import { cn } from "@/lib/utils"

const Separator = React.forwardRef<
  React.ElementRef<typeof SeparatorPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SeparatorPrimitive.Root>
>(
  (
    { className, orientation = "horizontal", decorative = true, ...props },
    ref
  ) => (
    <SeparatorPrimitive.Root
      ref={ref}
      decorative={decorative}
      orientation={orientation}
      className={cn(
        "shrink-0 bg-border",
        orientation === "horizontal" ? "h-[1px] w-full" : "h-full w-[1px]",
        className
      )}
      {...props}
    />
  )
)
Separator.displayName = SeparatorPrimitive.Root.displayName

export { Separator }
*/

// Add Checkbox to ui if it doesn't exist
// src/components/ui/checkbox.tsx
/*
"use client"
import * as React from "react"
import * as CheckboxPrimitive from "@radix-ui/react-checkbox"
import { Check } from "lucide-react"
import { cn } from "@/lib/utils"

const Checkbox = React.forwardRef<
  React.ElementRef<typeof CheckboxPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>
>(({ className, ...props }, ref) => (
  <CheckboxPrimitive.Root
    ref={ref}
    className={cn(
      "peer h-4 w-4 shrink-0 rounded-sm border border-primary ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground",
      className
    )}
    {...props}
  >
    <CheckboxPrimitive.Indicator
      className={cn("flex items-center justify-center text-current")}
    >
      <Check className="h-4 w-4" />
    </CheckboxPrimitive.Indicator>
  </CheckboxPrimitive.Root>
))
Checkbox.displayName = CheckboxPrimitive.Root.displayName

export { Checkbox }
*/
