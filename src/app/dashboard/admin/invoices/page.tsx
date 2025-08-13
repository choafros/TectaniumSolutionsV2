// src/app/dashboard/admin/invoices/page.tsx
"use client";

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '@/components/auth-provider';
import { useRouter } from 'next/navigation';
import { type InferSelectModel } from 'drizzle-orm';
import { invoices as invoicesSchema, users as usersSchema } from '@/lib/db/schema';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from '@/components/ui/badge';
import { BackgroundGradient } from '@/components/ui/background-gradient';
import { Label } from '@/components/ui/label';

type Invoice = InferSelectModel<typeof invoicesSchema> & { user: { username: string } };
type User = InferSelectModel<typeof usersSchema>;

export default function AdminInvoicesPage() {
    const { user } = useAuth();
    const router = useRouter();
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    // Filters
    const [selectedUser, setSelectedUser] = useState<string>('all');
    const [selectedStatus, setSelectedStatus] = useState<string>('all');

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

    const fetchUsers = useCallback(async () => {
        const res = await fetch('/api/users');
        if (res.ok) {
            const allUsers = await res.json();
            setUsers(allUsers.filter((u: User) => u.role === 'candidate'));
        }
    }, []);

    useEffect(() => {
        if (user && user.role !== 'admin') {
            router.push('/dashboard');
        } else if (user) {
            fetchInvoices();
            fetchUsers();
        }
    }, [user, router, fetchInvoices, fetchUsers]);

    const filteredInvoices = useMemo(() => {
        return invoices.filter(inv => {
            const userMatch = selectedUser === 'all' || inv.userId.toString() === selectedUser;
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
            fetchInvoices(); // Refresh list
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Update failed');
        }
    };

    const handleDelete = async (invoiceId: number) => {
        if (!confirm('Are you sure you want to delete this invoice? This action cannot be undone.')) return;
        try {
            const res = await fetch(`/api/admin/invoices/${invoiceId}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Failed to delete invoice');
            fetchInvoices(); // Refresh list
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Delete failed');
        }
    };

    return (
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
                            <Select value={selectedUser} onValueChange={setSelectedUser}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Users</SelectItem>
                                    {users.map(u => <SelectItem key={u.id} value={u.id.toString()}>{u.username}</SelectItem>)}
                                </SelectContent>
                            </Select>
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
                                        <TableCell className="text-right space-x-2">
                                            {inv.status === 'pending' && <Button variant="outline" size="sm" onClick={() => handleUpdateStatus(inv.id, 'paid')}>Mark as Paid</Button>}
                                            <Button variant="destructive" size="sm" onClick={() => handleDelete(inv.id)}>Delete</Button>
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
    );
}
