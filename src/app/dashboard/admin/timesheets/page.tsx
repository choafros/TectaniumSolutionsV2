// src/app/dashboard/admin/timesheets/page.tsx
"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarIcon } from "lucide-react";
import { type InferSelectModel } from "drizzle-orm";
import { timesheets as timesheetsSchema, users as usersSchema, projects as projectsSchema } from "@/lib/db/schema";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { TimesheetEditModal } from "@/components/ui/timesheet-edit-modal";
import { UserSearchCombobox } from "@/components/ui/user-search-combobox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { formatHoursAndMinutes } from "@/lib/utils";


// Types
export type TimesheetWithRelations = InferSelectModel<typeof timesheetsSchema> & {
  user: { username: string };
  project: { name: string };
};
export type User = InferSelectModel<typeof usersSchema>;
export type Project = InferSelectModel<typeof projectsSchema>;

export default function AdminTimesheetsPage() {
  // Filter states
  const [allTimesheets, setAllTimesheets] = useState<TimesheetWithRelations[]>([]);
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [selectedUser, setSelectedUser] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [isLoading, setIsLoading] = useState(true);

  // Edit modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTimesheet, setSelectedTimesheet] = useState<TimesheetWithRelations | null>(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Fetch timesheets
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/admin/timesheets");
      if (!res.ok) throw new Error("Failed to fetch data");

      const data = await res.json();
      if (Array.isArray(data)) {
        setAllTimesheets(data);
      } else {
        console.error("Unexpected response:", data);
        setAllTimesheets([]);
      }
    } catch (error) {
      console.error("Fetch error:", error);
      setAllTimesheets([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load data on mount
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedUser, selectedStatus, currentMonth]);

  // Filtering logic
  const filteredTimesheets = useMemo(() => {
    return allTimesheets.filter((t) => {
      const userMatch = selectedUser === "all" || t.userId.toString() === selectedUser;
      const statusMatch = selectedStatus === "all" || t.status === selectedStatus;
      const timesheetDate = new Date(t.weekStarting);
      const monthMatch =
        timesheetDate.getFullYear() === currentMonth.getFullYear() &&
        timesheetDate.getMonth() === currentMonth.getMonth();
      return userMatch && statusMatch && monthMatch;
    });
  }, [allTimesheets, selectedUser, selectedStatus, currentMonth]);

  // Pagination logic
  const totalPages = Math.max(1, Math.ceil(filteredTimesheets.length / itemsPerPage));
  const paginatedTimesheets = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredTimesheets.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredTimesheets, currentPage, itemsPerPage]);

  // Handlers
  const handleEditClick = (timesheet: TimesheetWithRelations) => {
    setSelectedTimesheet(timesheet);
    setIsModalOpen(true);
  };

  const getStatusVariant = (
    status: TimesheetWithRelations["status"]
  ): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case "approved":
        return "default";
      case "pending":
        return "secondary";
      case "rejected":
        return "destructive";
      case "invoiced":
        return "outline";
      default:
        return "secondary";
    }
  };

  return (
    <>
      <TimesheetEditModal
        isOpen={isModalOpen}
        setIsOpen={setIsModalOpen}
        timesheet={selectedTimesheet}
        onUpdate={fetchData} // refresh data after update
      />

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Review Timesheets</CardTitle>
            <CardDescription>Filter, review, and approve all submitted timesheets.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4 p-4 border rounded-lg items-end">
              <div className="flex-1 grid gap-1.5">
                <Label>User</Label>
                <UserSearchCombobox value={selectedUser} onChange={setSelectedUser} />
              </div>

              <div className="flex-1 grid gap-1.5">
                <Label>Status</Label>
                <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by Status..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                    <SelectItem value="invoiced">Invoiced</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex-1 grid gap-1.5">
                <Label>Month</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {format(currentMonth, "MMMM yyyy")}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" onOpenAutoFocus={(e) => e.preventDefault()}>
                    <Calendar
                      mode="single"
                      selected={currentMonth}
                      onSelect={(date) => date && setCurrentMonth(date)}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Table */}
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
                    <TableRow>
                      <TableCell colSpan={6} className="text-center h-24">
                        Loading...
                      </TableCell>
                    </TableRow>
                  ) : paginatedTimesheets.length > 0 ? (
                    paginatedTimesheets.map((ts) => (
                      <TableRow key={ts.id}>
                        <TableCell className="font-mono text-xs">{ts.referenceNumber}</TableCell>
                        <TableCell className="font-medium">{ts.user.username}</TableCell>
                        <TableCell>{ts.project.name}</TableCell>
                        <TableCell>{formatHoursAndMinutes(ts.totalHours)}</TableCell>
                        <TableCell>
                          <Badge variant={getStatusVariant(ts.status)} className="capitalize">
                            {ts.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="outline" size="sm" onClick={() => handleEditClick(ts)}>
                            View / Edit
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center h-24">
                        No timesheets found for this criteria.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </Card>

            {/* Pagination */}
            <div className="flex items-center justify-end space-x-2 py-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              <span className="text-sm">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
              >
                Next
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
