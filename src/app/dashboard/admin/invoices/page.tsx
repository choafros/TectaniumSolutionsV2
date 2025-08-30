// src/app/dashboard/admin/invoices/page.tsx
"use client";

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '@/components/auth-provider';
import { useRouter } from 'next/navigation';
import { type InferSelectModel } from 'drizzle-orm';
import { invoices as invoicesSchema, users as usersSchema, timesheets as timesheetsSchema, projects as projectsSchema } from '@/lib/db/schema';

// UI Components
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from '@/components/ui/badge';
import { BackgroundGradient } from '@/components/ui/background-gradient';
import { Label } from '@/components/ui/label';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreHorizontal } from 'lucide-react';
import { InvoiceDetailModal } from '@/components/ui/invoice-detail-modal';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from '@/components/ui/separator';
import { UserSearchCombobox } from '@/components/ui/user-search-combobox';

// Types
type Invoice = InferSelectModel<typeof invoicesSchema> & { user: { username: string } };
type User = InferSelectModel<typeof usersSchema>;
type Timesheet = InferSelectModel<typeof timesheetsSchema> & { project: Pick<InferSelectModel<typeof projectsSchema>, 'name'> };

// --- Manage Invoices Component (Formerly the whole page) ---
function ManageInvoices() {
    const { user } = useAuth();
    const router = useRouter();
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    // const [users, setUsers] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    const [selectedUser, setSelectedUser] = useState<string>();
    const [selectedStatus, setSelectedStatus] = useState<string>('all');
    const [viewingInvoiceId, setViewingInvoiceId] = useState<number | null>(null);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

    const fetchInvoices = useCallback(async () => {
        setIsLoading(true);
        try {
            const res = await fetch('/api/admin/invoices');
            if (!res.ok) throw new Error('Failed to fetch invoices');
            const data = await res.json();
            setInvoices(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error');
        } finally {
            setIsLoading(false);
        }
    }, []);

    // const fetchUsers = useCallback(async () => {
    //     const res = await fetch('/api/users');
    //     if (res.ok) {
    //         const allUsers = await res.json();
    //         setUsers(allUsers.filter((u: User) => u.role === 'candidate'));
    //     }
    // }, []);

    useEffect(() => {
        if (user && user.role !== 'admin') {
            router.push('/dashboard');
        } else if (user) {
            fetchInvoices();
            // fetchUsers();
        }
    }, [user, router, fetchInvoices /*, fetchUsers*/]);

    const filteredInvoices = useMemo(() => {
        return invoices.filter(inv => {
            const userMatch = !selectedUser || selectedUser === '' || inv.userId.toString() === selectedUser;
            const statusMatch = selectedStatus === 'all' || inv.status === selectedStatus;
            return userMatch && statusMatch;
        });
    }, [invoices, selectedUser, selectedStatus]);
    
    const handleUpdateStatus = async (invoiceId: number, status: 'paid' | 'pending') => {
        try {
            const res = await fetch(`/api/admin/invoices/${invoiceId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status }),
            });
            if (!res.ok) throw new Error('Failed to update status');
            fetchInvoices();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Update failed');
        }
    };

    const handleDelete = async (invoiceId: number) => {
        if (!confirm('Are you sure you want to delete this invoice? This action cannot be undone.')) return;
        try {   
            const res = await fetch(`/api/admin/invoices/${invoiceId}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Failed to delete invoice');
            fetchInvoices();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Delete failed');
        }
    };
    
    const handleViewClick = (invoiceId: number) => {
        setViewingInvoiceId(invoiceId);
        setIsDetailModalOpen(true);
    };

    return (
        <>
            <InvoiceDetailModal 
                invoiceId={viewingInvoiceId}
                isOpen={isDetailModalOpen}
                setIsOpen={setIsDetailModalOpen}
            />
            <div className="relative w-full h-full">
                <BackgroundGradient from="from-green-400" to="to-teal-500" shape="polygon(0% 0%, 75% 0%, 100% 50%, 75% 100%, 0% 100%)" />
                <Card>
                    <CardHeader>
                        <CardTitle>Manage Invoices</CardTitle>
                        <CardDescription>View, filter, and manage all generated invoices.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex flex-col sm:flex-row gap-4 p-4 border rounded-lg items-end">
                            <div className="flex-1 grid gap-1.5">
                                <Label>Filter by User</Label>
                                <UserSearchCombobox value={selectedUser ?? ""} onChange={setSelectedUser} />

                            </div>
                            <div className="flex-1 grid gap-1.5">
                                <Label>Filter by Status</Label>
                                <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Statuses</SelectItem>
                                        <SelectItem value="pending">Pending</SelectItem>
                                        <SelectItem value="paid">Paid</SelectItem>
                                        <SelectItem value="overdue">Overdue</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        {error && <p className="text-sm text-red-500">{error}</p>}
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Reference</TableHead>
                                    <TableHead>User</TableHead>
                                    <TableHead>Amount</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Created At</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow><TableCell colSpan={6} className="text-center h-24">Loading invoices...</TableCell></TableRow>
                                ) : filteredInvoices.length > 0 ? (
                                    filteredInvoices.map(inv => (
                                        <TableRow key={inv.id}>
                                            <TableCell className="font-mono text-xs">{inv.referenceNumber}</TableCell>
                                            <TableCell className="font-medium">{inv.user.username}</TableCell>
                                            <TableCell>£{inv.totalAmount}</TableCell>
                                            <TableCell><Badge variant={inv.status === 'paid' ? 'default' : 'secondary'} className="capitalize">{inv.status}</Badge></TableCell>
                                            <TableCell>{new Date(inv.createdAt!).toLocaleDateString()}</TableCell>
                                            <TableCell className="text-right">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon">
                                                            <MoreHorizontal className="h-4 w-4" />
                                                            <span className="sr-only">Actions</span>
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuItem onClick={() => handleViewClick(inv.id)}>View Details</DropdownMenuItem>
                                                        {inv.status === 'pending' && <DropdownMenuItem onClick={() => handleUpdateStatus(inv.id, 'paid')}>Mark as Paid</DropdownMenuItem>}
                                                        <DropdownMenuItem className="text-red-600" onClick={() => handleDelete(inv.id)}>Delete</DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow><TableCell colSpan={6} className="text-center h-24">No invoices found for this criteria.</TableCell></TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
        </>
    );
}

// --- Create Invoice Component (Formerly invoicing/page.tsx) ---
function CreateInvoice() {
    // const [users, setUsers] = useState<User[]>([]);
    const [selectedUserId, setSelectedUserId] = useState<string>('');
    const [timesheets, setTimesheets] = useState<Timesheet[]>([]);
    const [selectedTimesheetIds, setSelectedTimesheetIds] = useState<Set<number>>(new Set());
    
    const [vatRate, setVatRate] = useState('20');
    const [cisRate, setCisRate] = useState('20');

    const [isLoading, setIsLoading] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [error, setError] = useState('');

    // const fetchUsers = useCallback(async () => {
    //     const res = await fetch('/api/users');
    //     if (res.ok) {
    //         const allUsers = await res.json();
    //         setUsers(allUsers.filter((u: User) => u.role === 'candidate'));
    //     }
    // }, []);

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
            setSelectedTimesheetIds(new Set(data.map((ts: Timesheet) => ts.id)));
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error');
        } finally {
            setIsLoading(false);
        }
    }, []);

    // useEffect(() => {
    //     fetchUsers();
    // }, [fetchUsers]);

    useEffect(() => {
        fetchTimesheets(selectedUserId);
    }, [selectedUserId, fetchTimesheets]);

    const handleSelectTimesheet = (id: number, checked: boolean) => {
        setSelectedTimesheetIds(prev => {
            const newSet = new Set(prev);
            if (checked) newSet.add(id);
            else newSet.delete(id);
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
        return { subtotal, vatAmount, cisAmount, totalAmount, totalNormalHours, totalOvertimeHours, selectedCount: selected.length };
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
            fetchTimesheets(selectedUserId);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unknown error occurred');
        } finally {
            setIsCreating(false);
        }
    };

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
                            <UserSearchCombobox value={selectedUserId} onChange={setSelectedUserId} />
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
                        <Button variant="outline" onClick={() => setSelectedUserId('')}>Clear Selection</Button>
                        <Button onClick={handleGenerateInvoice} disabled={isCreating || selectedTimesheetIds.size === 0}>
                            {isCreating ? 'Generating...' : 'Generate Invoice'}
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

// --- Main Page Component ---
export default function InvoicesPage() {
    const { user } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (user && user.role !== 'admin') {
            router.push('/dashboard');
        }
    }, [user, router]);

    if (!user || user.role !== 'admin') {
        return <p>Loading or redirecting...</p>;
    }

    return (
        <Tabs defaultValue="manage" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="manage">Manage Invoices</TabsTrigger>
                <TabsTrigger value="create">Create Invoice</TabsTrigger>
            </TabsList>
            <TabsContent value="manage">
                <ManageInvoices />
            </TabsContent>
            <TabsContent value="create">
                <CreateInvoice />
            </TabsContent>
        </Tabs>
    );
}