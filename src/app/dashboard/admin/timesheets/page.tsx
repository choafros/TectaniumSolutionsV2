// src/app/dashboard/admin/timesheets/page.tsx
"use client";

import { useState, useEffect, useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { type InferSelectModel } from 'drizzle-orm';
import { timesheets as timesheetsSchema, users as usersSchema, projects as projectsSchema } from '@/lib/db/schema';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Label } from '@/components/ui/label';
import { TimesheetEditModal } from '@/components/ui/timesheet-edit-modal';
import { UserSearchCombobox } from '@/components/ui/user-search-combobox';

// Types
export type TimesheetWithRelations = InferSelectModel<typeof timesheetsSchema> & { user: { username: string }, project: { name: string } };
export type User = InferSelectModel<typeof usersSchema>;
export type Project = InferSelectModel<typeof projectsSchema>;


function getStartOfWeek(date: Date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    d.setHours(0, 0, 0, 0);
    return new Date(d.setDate(diff));
}

export default function AdminTimesheetsPage() {
    const [allTimesheets, setAllTimesheets] = useState<TimesheetWithRelations[]>([]);
    // const [users, setUsers] = useState<User[]>([]);
    const [weekStart, setWeekStart] = useState<Date>(getStartOfWeek(new Date()));
    
    // Filter states
    const [selectedUser, setSelectedUser] = useState<string>('all');
    const [selectedStatus, setSelectedStatus] = useState<string>('all');
    const [isLoading, setIsLoading] = useState(true);
    
    // State for the edit modal
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedTimesheet, setSelectedTimesheet] = useState<TimesheetWithRelations | null>(null);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const timesheetsRes = await fetch('/api/admin/timesheets');
            if (!timesheetsRes.ok) throw new Error('Failed to fetch data');
            const timesheetsData = await timesheetsRes.json();

            setAllTimesheets(timesheetsData);

        } catch (error) {
            console.error("Fetch error:", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const filteredTimesheets = useMemo(() => {
        const weekStartTimestamp = weekStart.getTime();
        return allTimesheets.filter(t => {
            const userMatch = selectedUser === 'all' || t.userId.toString() === selectedUser;
            const statusMatch = selectedStatus === 'all' || t.status === selectedStatus;
            const weekMatch = getStartOfWeek(new Date(t.weekStarting)).getTime() === weekStartTimestamp;
            return userMatch && statusMatch && weekMatch;
        });
    }, [allTimesheets, selectedUser, selectedStatus, weekStart]);

    const changeWeek = (direction: 'prev' | 'next') => {
        setWeekStart(prev => {
            const newDate = new Date(prev);
            newDate.setDate(newDate.getDate() + (direction === 'prev' ? -7 : 7));
            return newDate;
        });
    };

    const handleEditClick = (timesheet: TimesheetWithRelations) => {
        setSelectedTimesheet(timesheet);
        setIsModalOpen(true);
    };
    
    const getStatusVariant = (status: TimesheetWithRelations['status']): "default" | "secondary" | "destructive" | "outline" => {
        switch (status) {
            case 'approved': return 'default';
            case 'pending': return 'secondary';
            case 'rejected': return 'destructive';
            case 'invoiced': return 'outline';
            default: return 'secondary';
        }
    };

    return (
        <>
            <TimesheetEditModal 
                isOpen={isModalOpen} 
                setIsOpen={setIsModalOpen} 
                timesheet={selectedTimesheet}
                onUpdate={fetchData} // Pass a function to refresh data on update
            />
            <div className="grid gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Review Timesheets</CardTitle>
                        <CardDescription>Filter, review, and approve all submitted timesheets.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex flex-col sm:flex-row gap-4 p-4 border rounded-lg items-end">
                            <div className="flex-1 grid gap-1.5">
                                <Label>User</Label>
                                <UserSearchCombobox value={selectedUser} onChange={setSelectedUser} />
                            </div>
                            <div className="flex-1 grid gap-1.5">
                                <Label>Status</Label>
                                <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                                    <SelectTrigger><SelectValue placeholder="Filter by Status..." /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Statuses</SelectItem>
                                        <SelectItem value="draft">Draft</SelectItem>
                                        <SelectItem value="pending">Pending</SelectItem>
                                        <SelectItem value="approved">Approved</SelectItem>
                                        <SelectItem value="rejected">Rejected</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="flex-1 flex flex-col items-center">
                                <Label className="mb-1.5">Week</Label>
                                <div className="flex items-center gap-2">
                                    <Button variant="outline" size="icon" onClick={() => changeWeek('prev')}><ChevronLeft className="h-4 w-4" /></Button>
                                    <span className="w-28 text-center text-sm">{weekStart.toLocaleDateString()}</span>
                                    <Button variant="outline" size="icon" onClick={() => changeWeek('next')}><ChevronRight className="h-4 w-4" /></Button>
                                </div>
                            </div>
                        </div>
                        
                        <Card>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Reference</TableHead>
                                        <TableHead>User</TableHead>
                                        <TableHead>Project</TableHead>
                                        <TableHead>Total Hours</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {isLoading ? (
                                        <TableRow><TableCell colSpan={5} className="text-center h-24">Loading...</TableCell></TableRow>
                                    ) : filteredTimesheets.length > 0 ? (
                                        filteredTimesheets.map(ts => (
                                            <TableRow key={ts.id}>
                                                <TableCell className="font-mono text-xs">{ts.referenceNumber}</TableCell>
                                                <TableCell className="font-medium">{ts.user.username}</TableCell>
                                                <TableCell>{ts.project.name}</TableCell>
                                                <TableCell>{ts.totalHours}</TableCell>
                                                <TableCell><Badge variant={getStatusVariant(ts.status)} className="capitalize">{ts.status}</Badge></TableCell>
                                                <TableCell className="text-right">
                                                    <Button variant="outline" size="sm" onClick={() => handleEditClick(ts)}>View / Edit</Button>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow><TableCell colSpan={5} className="text-center h-24">No timesheets found for this criteria.</TableCell></TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </Card>
                    </CardContent>
                </Card>
            </div>
        </>
    );
}
