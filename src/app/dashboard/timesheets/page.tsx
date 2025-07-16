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

// Types
type Project = InferSelectModel<typeof projects>;
type Timesheet = InferSelectModel<typeof timesheetsSchema>;

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
    const [currentTimesheet, setCurrentTimesheet] = useState<Timesheet | null>(null);
    const [dailyHours, setDailyHours] = useState<DailyHours>(initialDailyHours);
    const [selectedProjectId, setSelectedProjectId] = useState<string>('');
    const [weekStart, setWeekStart] = useState<Date>(getStartOfWeek(new Date()));
    const [isDirty, setIsDirty] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    const fetchTimesheetForWeek = useCallback(async (date: Date) => {
        setIsLoading(true);
        setError('');
        try {
            const dateString = date.toISOString().split('T')[0];
            const res = await fetch(`/api/timesheets/week?date=${dateString}`);
            if (!res.ok) throw new Error("Failed to load timesheet data.");

            const data = await res.json();
            if (data.exists) {
                setCurrentTimesheet(data.timesheet);
                setDailyHours(data.timesheet.dailyHours);
                setSelectedProjectId(data.timesheet.projectId.toString());
            } else {
                setCurrentTimesheet(null);
                setDailyHours(JSON.parse(JSON.stringify(initialDailyHours)));
                setSelectedProjectId(projects.length > 0 ? projects[0].id.toString() : '');
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unknown error occurred');
        } finally {
            setIsLoading(false);
            setIsDirty(false);
        }
    }, [projects]);

    useEffect(() => {
        const fetchProjects = async () => {
            const res = await fetch('/api/projects');
            if (res.ok) {
                const projectData = await res.json();
                setProjects(projectData);
            }
        };
        fetchProjects();
    }, []);

    useEffect(() => {
        if (projects.length > 0) {
            fetchTimesheetForWeek(weekStart);
        }
    }, [weekStart, fetchTimesheetForWeek, projects]);

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
            
            await fetchTimesheetForWeek(weekStart);

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
    
    const isApproved = currentTimesheet?.status === 'approved';
    const isSubmitted = currentTimesheet?.status === 'pending';

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
                    {isLoading ? <p>Loading...</p> : (
                        <fieldset disabled={isApproved || isSubmitted || isSaving} className="space-y-4">
                            <div className="grid gap-2">
                                <Label htmlFor="project">Project</Label>
                                <Select value={selectedProjectId} onValueChange={val => { setSelectedProjectId(val); setIsDirty(true); }}>
                                    <SelectTrigger><SelectValue placeholder="Select a project" /></SelectTrigger>
                                    <SelectContent>{projects.map(p => <SelectItem key={p.id} value={p.id.toString()}>{p.name}</SelectItem>)}</SelectContent>
                                </Select>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                {Object.keys(dailyHours).map(day => (
                                    <Card key={day} className="p-4 bg-background">
                                        <div className="flex justify-between items-center mb-2">
                                            <Label className="capitalize font-semibold">{day}</Label>
                                            <Button type="button" variant="link" size="sm" className="p-0 h-auto" onClick={() => handleSetDefault(day as keyof DailyHours)}>Set Default</Button>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                            <Input type="time" value={dailyHours[day as keyof DailyHours].start} onChange={e => handleDayChange(day as keyof DailyHours, 'start', e.target.value)} />
                                            <Input type="time" value={dailyHours[day as keyof DailyHours].end} onChange={e => handleDayChange(day as keyof DailyHours, 'end', e.target.value)} />
                                        </div>
                                        <Textarea placeholder="Notes (optional)..." className="mt-2 text-sm" value={dailyHours[day as keyof DailyHours].notes} onChange={e => handleDayChange(day as keyof DailyHours, 'notes', e.target.value)} />
                                    </Card>
                                ))}
                            </div>
                            
                            <div className="flex justify-between items-center pt-4 border-t flex-wrap gap-4">
                                <div>
                                    {currentTimesheet && <Badge className="capitalize">{currentTimesheet.status}</Badge>}
                                    <p className="text-sm font-bold">Total Hours: {totalHours}</p>
                                </div>
                                {!isApproved && !isSubmitted && (
                                    <div className="flex gap-2">
                                         <Button onClick={() => handleSave('draft')} disabled={!isDirty || isSaving}>
                                            {isSaving && <RefreshCw className="mr-2 h-4 w-4 animate-spin" />}
                                            Save Draft
                                        </Button>
                                        <Button onClick={() => handleSave('pending')} disabled={!isDirty || isSaving}>
                                            {isSaving && <RefreshCw className="mr-2 h-4 w-4 animate-spin" />}
                                            Submit
                                        </Button>
                                    </div>
                                )}
                            </div>
                             {isSubmitted && <p className="text-sm text-blue-600">This timesheet has been submitted and is pending approval.</p>}
                             {isApproved && <p className="text-sm text-green-600">This timesheet has been approved and is locked.</p>}
                        </fieldset>
                    )}
                    {error && <p className="text-sm text-red-500 mt-4">{error}</p>}
                </CardContent>
            </Card>
        </div>
    );
}
