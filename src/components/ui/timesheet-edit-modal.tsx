// src/components/timesheet-edit-modal.tsx
"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
// import { Badge } from '@/components/ui/badge';
import { DailyHours, DayEntry } from "@/lib/db/schema";
import { TimesheetWithRelations } from "@/app/dashboard/admin/timesheets/page";
import { useEffect, useState, useMemo } from "react";

interface TimesheetEditModalProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  timesheet: TimesheetWithRelations | null;
  onUpdate: () => void; // Function to refresh data on the parent page
}

const initialDailyHours: DailyHours = {
  monday: { start: '', end: '', notes: '' },
  tuesday: { start: '', end: '', notes: '' },
  wednesday: { start: '', end: '', notes: '' },
  thursday: { start: '', end: '', notes: '' },
  friday: { start: '', end: '', notes: '' },
  saturday: { start: '', end: '', notes: '' },
  sunday: { start: '', end: '', notes: '' },
};

export function TimesheetEditModal({ isOpen, setIsOpen, timesheet, onUpdate }: TimesheetEditModalProps) {
  const [dailyHours, setDailyHours] = useState<DailyHours>(initialDailyHours);
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (timesheet) {
      setDailyHours(timesheet.dailyHours);
      setNotes(timesheet.notes || '');
    }
  }, [timesheet]);

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

  const handleDayChange = (day: keyof DailyHours, field: keyof DayEntry, value: string) => {
    setDailyHours(prev => ({
        ...prev,
        [day]: { ...prev[day], [field]: value }
    }));
  };

  const handleAction = async (action: 'update' | 'approve' | 'reject' | 'delete') => {
    if (!timesheet) return;
    setIsSaving(true);
    
    const isDelete = action === 'delete';
    const method = isDelete ? 'DELETE' : 'PUT';
    
    let body = {};
    if (!isDelete) {
      body = {
        dailyHours,
        notes,
        totalHours,
        status: action === 'approve' ? 'approved' : action === 'reject' ? 'rejected' : timesheet.status,
      };
    }

    try {
      const res = await fetch(`/api/timesheets/${timesheet.id}`, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: isDelete ? null : JSON.stringify(body),
      });

      if (!res.ok) {
        throw new Error(`Failed to ${action} timesheet`);
      }
      onUpdate(); // Refresh the data on the admin page
      setIsOpen(false);
    } catch (error) {
      console.error(error);
      // You could show an error message here
    } finally {
      setIsSaving(false);
    }
  };

  if (!timesheet) return null;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[600px] grid-rows-[auto_1fr_auto]">
        <DialogHeader>
          <DialogTitle>Edit Timesheet</DialogTitle>
          <DialogDescription>
            {timesheet.user.username} - Week of {new Date(timesheet.weekStarting).toLocaleDateString()}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4 overflow-y-auto pr-6">
           {Object.keys(dailyHours).map(day => (
              <div key={day} className="grid grid-cols-[100px_1fr_1fr] items-center gap-4">
                  <Label htmlFor={day} className="text-right capitalize">{day}</Label>
                  <Input id={`${day}-start`} type="time" value={dailyHours[day as keyof DailyHours].start} onChange={e => handleDayChange(day as keyof DailyHours, 'start', e.target.value)} />
                  <Input id={`${day}-end`} type="time" value={dailyHours[day as keyof DailyHours].end} onChange={e => handleDayChange(day as keyof DailyHours, 'end', e.target.value)} />
              </div>
            ))}
            <div className="grid gap-2">
              <Label>Main Notes</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
             <div className="text-right font-bold">Total Hours: {totalHours}</div>
        </div>

        <DialogFooter className="flex-wrap">
          <Button variant="destructive" onClick={() => handleAction('delete')} disabled={isSaving}>Delete</Button>
          <div className="flex-grow" />
          {timesheet.status === 'pending' && (
            <>
              <Button variant="secondary" onClick={() => handleAction('reject')} disabled={isSaving}>Reject</Button>
              <Button onClick={() => handleAction('approve')} disabled={isSaving}>Approve</Button>
            </>
          )}
          <Button onClick={() => handleAction('update')} disabled={isSaving}>Save Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
