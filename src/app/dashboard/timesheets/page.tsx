// src/app/dashboard/timesheets/page.tsx
"use client";

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { type InferSelectModel } from 'drizzle-orm';
import { projects, timesheets as timesheetsSchema, DailyHours, DayEntry } from '@/lib/db/schema';
import { ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

// Types (Infer)
type Project = InferSelectModel<typeof projects>;
type Timesheet = InferSelectModel<typeof timesheetsSchema>;
type TimesheetWithProject = InferSelectModel<typeof timesheetsSchema> & {
  project: Project;
};


const DEFAULT_START_TIME = '09:00';
const DEFAULT_END_TIME = '17:00';

const initialDayEntry: DayEntry = { start: DEFAULT_START_TIME, end: DEFAULT_END_TIME, notes: '' };
const initialDailyHours: DailyHours = {
  monday: { ...initialDayEntry },
  tuesday: { ...initialDayEntry },
  wednesday: { ...initialDayEntry },
  thursday: { ...initialDayEntry },
  friday: { ...initialDayEntry },
  saturday: { ...initialDayEntry, start: '', end: '' },
  sunday: { ...initialDayEntry, start: '', end: '' },
};
const daysOfWeek: (keyof DailyHours)[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];


function getStartOfWeek(date: Date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    d.setDate(diff);
    d.setHours(0, 0, 0, 0);
    return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
}

export default function TimesheetsPage() {

    const [projects, setProjects] = useState<Project[]>([]);
    const [weekTimesheets, setWeekTimesheets] = useState<TimesheetWithProject[]>([]);
    const [currentTimesheet, setCurrentTimesheet] = useState<Timesheet | null>(null);
    const [dailyHours, setDailyHours] = useState<DailyHours>(initialDailyHours);
    const [selectedProjectId, setSelectedProjectId] = useState<string>('');
    const [weekStart, setWeekStart] = useState<Date>(getStartOfWeek(new Date()));
    const [isDirty, setIsDirty] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    const fetchTimesheetsForWeek = useCallback(async (date: Date) => {
        setIsLoading(true);
        setError('');
        try {
            const dateString = date.toISOString().split('T')[0];
            const res = await fetch(`/api/timesheets?week=${dateString}`);

            if (!res.ok) throw new Error("Failed to load timesheet data.");

            const data = await res.json();
            setWeekTimesheets(data);
            
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unknown error occurred');
        } finally {
            setIsLoading(false);
            setIsDirty(false);
        }
    }, []);

    useEffect(() => {
        const fetchProjects = async () => {
            const res = await fetch('/api/projects');
            if (res.ok) {
                const projectData = await res.json();
                setProjects(projectData);
                if (projectData.length > 0) {
                    setSelectedProjectId(projectData[0].id.toString());
                }
            }
        };
        fetchProjects();
    }, []);

    useEffect(() => {
        fetchTimesheetsForWeek(weekStart);

    }, [weekStart, fetchTimesheetsForWeek]);
    
    useEffect(() => {
        const activeTimesheet = weekTimesheets.find(ts => ts.projectId.toString() === selectedProjectId) || null;
        setCurrentTimesheet(activeTimesheet);
        if (activeTimesheet) {
            setDailyHours(activeTimesheet.dailyHours);
        } else {
            setDailyHours(JSON.parse(JSON.stringify(initialDailyHours)));
        }
    }, [selectedProjectId, weekTimesheets]);

    const handleDayChange = (day: keyof DailyHours, field: keyof DayEntry, value: string) => {
        setDailyHours(prev => ({ ...prev, [day]: { ...prev[day], [field]: value } }));
        setIsDirty(true);
    };
    
    const handleSetDefault = (day: keyof DailyHours) => {
        handleDayChange(day, 'start', DEFAULT_START_TIME);
        handleDayChange(day, 'end', DEFAULT_END_TIME);
    };

    const totalHours = useMemo(() => {
        return Object.values(dailyHours).reduce((acc, day) => {
            if (day.start && day.end) {
                const start = new Date(`1970-01-01T${day.start}:00`);
                const end = new Date(`1970-01-01T${day.end}:00`);
                if (end > start) {
                    const diff = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
                    return acc + diff;
                }
            }
            return acc;
        }, 0).toFixed(2);
    }, [dailyHours]);


    const handleSave = async (status: 'draft' | 'pending') => {

        if (!selectedProjectId) {
            setError("Please select a project.");
            return;
        }

        setIsSaving(true);
        setError('');

        const isUpdating = !!currentTimesheet;
        const method = currentTimesheet ? 'PUT' : 'POST';
        const url = currentTimesheet ? `/api/timesheets/${currentTimesheet.id}` : '/api/timesheets';

        const payload = {
            projectId: parseInt(selectedProjectId),
            weekStarting: weekStart.toISOString(),
            dailyHours,
            totalHours,
            status,
        };
        
        console.log("Saving Timesheet Payload:", payload);

        try {
            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.message || 'Failed to save timesheet');
            }
            
            await fetchTimesheetsForWeek(weekStart);

        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unknown error occurred');
        } finally {
            setIsSaving(false);
        }
    };
    
    const changeWeek = (direction: 'prev' | 'next') => {
        setWeekStart(prev => {
            const newDate = new Date(prev);
            newDate.setDate(newDate.getDate() + (direction === 'prev' ? -7 : 7));
            return newDate;
        });
    };

    const isLocked = currentTimesheet?.status === 'approved' || currentTimesheet?.status === 'pending';
    const submittedProjectIds = useMemo(() => new Set(weekTimesheets.filter(ts => ts.status === 'pending' || ts.status === 'approved').map(ts => ts.projectId.toString())), [weekTimesheets]);

    return (
        <div className="grid gap-6">
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center flex-wrap gap-4">
                        <div>
                            <CardTitle>My Timesheet</CardTitle>
                            <CardDescription>Fill out your hours for the week.</CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button variant="outline" size="icon" onClick={() => changeWeek('prev')}><ChevronLeft className="h-4 w-4" /></Button>
                            <span className="text-sm font-medium w-28 text-center">{weekStart.toLocaleDateString()}</span>
                            <Button variant="outline" size="icon" onClick={() => changeWeek('next')}><ChevronRight className="h-4 w-4" /></Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <fieldset disabled={isSaving} className="space-y-4">
                        <div className="grid gap-2">
                            <Label htmlFor="project">Project</Label>
                            <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                                <SelectTrigger><SelectValue placeholder="Select a project" /></SelectTrigger>
                                <SelectContent>
                                    {projects.map(p => (
                                        <SelectItem 
                                            key={p.id} 
                                            value={p.id.toString()}
                                            disabled={submittedProjectIds.has(p.id.toString()) && p.id.toString() !== selectedProjectId}
                                        >
                                            {p.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <fieldset disabled={isLocked || isSaving}>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Day</TableHead>
                                        <TableHead>Start Time</TableHead>
                                        <TableHead>End Time</TableHead>
                                        <TableHead>Notes</TableHead>
                                        <TableHead>Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {daysOfWeek.map(day => (
                                        <TableRow key={day}>
                                            <TableCell className="capitalize font-semibold">{day}</TableCell>
                                            <TableCell><Input type="time" value={dailyHours[day].start} onChange={e => handleDayChange(day, 'start', e.target.value)} /></TableCell>
                                            <TableCell><Input type="time" value={dailyHours[day].end} onChange={e => handleDayChange(day, 'end', e.target.value)} /></TableCell>
                                            <TableCell><Textarea placeholder="Notes..." className="text-sm" value={dailyHours[day].notes} onChange={e => handleDayChange(day, 'notes', e.target.value)} /></TableCell>
                                            <TableCell><Button type="button" variant="link" size="sm" className="p-0 h-auto" onClick={() => handleSetDefault(day)}>Set Default</Button></TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </fieldset>
                        
                        <div className="flex justify-between items-center pt-4 border-t flex-wrap gap-4">
                            <div>
                                {currentTimesheet && <Badge className="capitalize">{currentTimesheet.status}</Badge>}
                                <p className="text-sm font-bold">Total Hours: {totalHours}</p>
                            </div>
                            {!isLocked && (
                                <div className="flex gap-2">
                                     <Button onClick={() => handleSave('draft')} disabled={isSaving}>
                                        {isSaving && <RefreshCw className="mr-2 h-4 w-4 animate-spin" />}
                                        Save Draft
                                    </Button>
                                    <Button onClick={() => handleSave('pending')} disabled={isSaving}>
                                        {isSaving && <RefreshCw className="mr-2 h-4 w-4 animate-spin" />}
                                        Submit
                                    </Button>
                                </div>
                            )}
                             {currentTimesheet?.status === 'rejected' && (
                                <Button onClick={() => handleSave('pending')} disabled={isSaving}>
                                    {isSaving && <RefreshCw className="mr-2 h-4 w-4 animate-spin" />}
                                    Resubmit
                                </Button>
                             )}
                        </div>
                         {currentTimesheet?.status === 'pending' && <p className="text-sm text-blue-600">This timesheet has been submitted and is pending approval.</p>}
                         {currentTimesheet?.status === 'approved' && <p className="text-sm text-green-600">This timesheet has been approved and is locked.</p>}
                    </fieldset>
                    {error && <p className="text-sm text-red-500 mt-4">{error}</p>}
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Weekly Submissions</CardTitle>
                    <CardDescription>Your timesheets for the week starting {weekStart.toLocaleDateString()}.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Project</TableHead>
                                <TableHead>Total Hours</TableHead>
                                <TableHead>Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow><TableCell colSpan={3} className="text-center h-24">Loading...</TableCell></TableRow>
                            ) : weekTimesheets.length > 0 ? (
                                weekTimesheets.map(ts => (
                                    <TableRow key={ts.id}>
                                        <TableCell className="font-medium">{ts.project.name}</TableCell>
                                        <TableCell>{ts.totalHours}</TableCell>
                                        <TableCell><Badge className="capitalize">{ts.status}</Badge></TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow><TableCell colSpan={3} className="text-center h-24">No timesheets submitted for this week.</TableCell></TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
