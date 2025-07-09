// src/app/dashboard/admin/timesheets/page.tsx
"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/auth-provider';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { type InferSelectModel } from 'drizzle-orm';
import { projects, timesheets as timesheetsSchema, users } from '@/lib/db/schema';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';

// Types
type Timesheet = InferSelectModel<typeof timesheetsSchema> & {
    project: { name: string };
    user: { username: string };
};

async function getTimesheets(): Promise<Timesheet[]> {
    const res = await fetch('/api/timesheets');
    if (!res.ok) throw new Error('Failed to fetch timesheets');
    return res.json();
}

export default function AdminTimesheetsPage() {
    const { user } = useAuth();
    const router = useRouter();
    const [timesheets, setTimesheets] = useState<Timesheet[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    const fetchAllData = async () => {
        try {
            setIsLoading(true);
            setError('');
            const timesheetsData = await getTimesheets();
            setTimesheets(timesheetsData);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unknown error occurred');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        // Redirect if not an admin
        if (user && user.role !== 'admin') {
            router.push('/dashboard');
            return;
        }
        fetchAllData();
    }, [user, router]);
    
    const handleStatusUpdate = async (id: number, status: Timesheet['status']) => {
        try {
            const response = await fetch(`/api/timesheets/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status }),
            });
            if (!response.ok) throw new Error(`Failed to ${status} timesheet`);
            await fetchAllData(); // Refresh list
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
        }
    };

    const handleDelete = async (id: number) => {
        // FIX: Removed window.confirm. A proper modal should be added later.
        try {
            const response = await fetch(`/api/timesheets/${id}`, { method: 'DELETE' });
            if (!response.ok) throw new Error('Failed to delete timesheet');
            await fetchAllData(); // Refresh list
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
        }
    };

    const getStatusVariant = (status: Timesheet['status']): "default" | "secondary" | "destructive" | "outline" => {
        switch (status) {
            case 'approved': return 'default';
            case 'pending': return 'secondary';
            case 'rejected': return 'destructive';
            case 'invoiced': return 'outline';
            default: return 'secondary';
        }
    };

    if (user?.role !== 'admin') {
        return <p>Redirecting...</p>;
    }

    return (
        <div className="grid gap-6">
            <Card>
                <CardHeader>
                    <CardTitle>All Timesheets</CardTitle>
                    <CardDescription>Review, approve, and manage all user-submitted timesheets.</CardDescription>
                </CardHeader>
                <CardContent>
                    {error && <p className="text-red-500 mb-4">{error}</p>}
                    <div className="space-y-4">
                        {isLoading && <p>Loading timesheets...</p>}
                        {!isLoading && timesheets.length === 0 && <p className="text-gray-500">No timesheets have been submitted yet.</p>}
                        {timesheets.map(ts => (
                            <Card key={ts.id} className={cn("transition-opacity", ts.status === 'approved' && "opacity-60")}>
                                <CardHeader className="flex flex-row items-start justify-between gap-4 p-4">
                                    <div>
                                        <CardTitle className="text-base">{ts.project.name}</CardTitle>
                                        <CardDescription>
                                            Week of {new Date(ts.weekStarting).toLocaleDateString()} by <span className="font-semibold">{ts.user.username}</span>
                                        </CardDescription>
                                    </div>
                                    <Badge variant={getStatusVariant(ts.status)} className="capitalize">{ts.status}</Badge>
                                </CardHeader>
                                <CardContent className="p-4 pt-0 grid gap-2">
                                    <p className="font-bold text-lg">{ts.totalHours} hours</p>
                                    {ts.notes && <p className="text-sm text-gray-600 border-l-2 pl-2 italic">{ts.notes}</p>}
                                    <div className="flex gap-2 mt-2 flex-wrap">
                                        <Button variant="outline" size="sm">Edit</Button>
                                        <Button variant="destructive" size="sm" onClick={() => handleDelete(ts.id)}>Delete</Button>
                                        {ts.status === 'pending' && (
                                            <>
                                                <Button size="sm" onClick={() => handleStatusUpdate(ts.id, 'approved')}>Approve</Button>
                                                <Button variant="secondary" size="sm" onClick={() => handleStatusUpdate(ts.id, 'rejected')}>Reject</Button>
                                            </>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
