// worker/candidate page
"use client";

import { useState, useEffect, FormEvent } from 'react';
import { useAuth } from '@/components/auth-provider';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { type InferSelectModel } from 'drizzle-orm';
import { projects, timesheets as timesheetsSchema } from '@/lib/db/schema';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

// Types
type Timesheet = InferSelectModel<typeof timesheetsSchema> & {
    project: { name: string };
};
type Project = InferSelectModel<typeof projects>;


// API Fetching Functions
async function getTimesheets(): Promise<Timesheet[]> {
    const res = await fetch('/api/timesheets');
    if (!res.ok) throw new Error('Failed to fetch timesheets');
    return res.json();
}

async function getProjects(): Promise<Project[]> {
    const res = await fetch('/api/projects');
    if (!res.ok) throw new Error('Failed to fetch projects');
    return res.json();
}


export default function TimesheetsPage() {
    const { user } = useAuth();
    const [timesheets, setTimesheets] = useState<Timesheet[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    // Form State
    const [selectedProjectId, setSelectedProjectId] = useState<string>('');
    const [weekStarting, setWeekStarting] = useState('');
    const [totalHours, setTotalHours] = useState('');
    const [notes, setNotes] = useState('');

    const fetchAllData = async () => {
        try {
            setIsLoading(true);
            setError('');
            const [timesheetsData, projectsData] = await Promise.all([
                getTimesheets(),
                getProjects()
            ]);
            setTimesheets(timesheetsData);
            setProjects(projectsData);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unknown error occurred');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchAllData();
    }, []);

    const handleCreateDraft = async (e: FormEvent) => {
        e.preventDefault();
        if (!selectedProjectId) {
            setError("Please select a project.");
            return;
        }
        setError('');

        try {
            const response = await fetch('/api/timesheets', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    projectId: parseInt(selectedProjectId),
                    weekStarting,
                    totalHours,
                    notes,
                }),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.message || 'Failed to create timesheet');
            }

            // Reset form and refetch data
            setSelectedProjectId('');
            setWeekStarting('');
            setTotalHours('');
            setNotes('');
            await fetchAllData();

        } catch (err) {
             setError(err instanceof Error ? err.message : 'An unknown error occurred');
        }
    };
    
    const handleAction = async (id: number, action: 'submit' | 'delete') => {
        if (action === 'delete' && !window.confirm("Are you sure you want to delete this draft?")) {
            return;
        }

        const method = action === 'delete' ? 'DELETE' : 'PUT';
        const body = action === 'submit' ? JSON.stringify({ status: 'pending' }) : null;
        
        try {
            const response = await fetch(`/api/timesheets/${id}`, {
                method,
                headers: body ? { 'Content-Type': 'application/json' } : {},
                body,
            });
            if (!response.ok) throw new Error(`Failed to ${action} timesheet`);
            await fetchAllData(); // Refresh list
        } catch (err) {
            setError(err instanceof Error ? err.message : `An error occurred during ${action}`);
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

    return (
        <div className="grid gap-6">
            <Card>
                <CardHeader>
                    <CardTitle>Create New Timesheet</CardTitle>
                    <CardDescription>Fill out your hours for the week. It will be saved as a draft.</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleCreateDraft} className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 items-end">
                        <div className="grid gap-2">
                            <Label htmlFor="project">Project</Label>
                            <Select onValueChange={setSelectedProjectId} value={selectedProjectId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select a project" />
                                </SelectTrigger>
                                <SelectContent>
                                    {projects.map(p => (
                                        <SelectItem key={p.id} value={p.id.toString()}>{p.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="week-starting">Week Starting</Label>
                            <Input id="week-starting" type="date" value={weekStarting} onChange={e => setWeekStarting(e.target.value)} required />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="total-hours">Total Hours</Label>
                            <Input id="total-hours" type="number" step="0.25" value={totalHours} onChange={e => setTotalHours(e.target.value)} required />
                        </div>
                        <div className="grid gap-2 md:col-span-2 lg:col-span-1">
                             <Label htmlFor="notes">Notes (Optional)</Label>
                            <Textarea id="notes" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Any additional details..."/>
                        </div>
                        <div className="md:col-span-2 lg:col-span-4">
                            <Button type="submit">Save as Draft</Button>
                        </div>
                    </form>
                    {error && <p className="text-sm text-red-500 mt-4">{error}</p>}
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>My Timesheets</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {isLoading && <p>Loading timesheets...</p>}
                        {!isLoading && timesheets.length === 0 && <p className="text-gray-500">You haven't created any timesheets yet.</p>}
                        {timesheets.map(ts => (
                            <Card key={ts.id} className={cn("transition-opacity", ts.status === 'approved' && "opacity-60 bg-slate-50")}>
                                <CardHeader className="flex flex-row items-start justify-between gap-4 p-4">
                                    <div>
                                        <CardTitle className="text-base">{ts.project.name}</CardTitle>
                                        <CardDescription>Week of {new Date(ts.weekStarting).toLocaleDateString()}</CardDescription>
                                    </div>
                                    <Badge variant={getStatusVariant(ts.status)} className="capitalize">{ts.status}</Badge>
                                </CardHeader>
                                <CardContent className="p-4 pt-0 grid gap-2">
                                    <p className="font-bold text-lg">{ts.totalHours} hours</p>
                                    {ts.notes && <p className="text-sm text-gray-600 border-l-2 pl-2 italic">{ts.notes}</p>}
                                    <div className="flex gap-2 mt-2 flex-wrap">
                                        {ts.status !== 'approved' && (
                                            <>
                                                <Button variant="outline" size="sm">Edit</Button>
                                                <Button variant="destructive" size="sm" onClick={() => handleAction(ts.id, 'delete')}>Delete</Button>
                                            </>
                                        )}
                                        {ts.status === 'draft' && (
                                            <Button size="sm" onClick={() => handleAction(ts.id, 'submit')}>Submit for Approval</Button>
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
