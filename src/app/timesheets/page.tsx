import { DashboardLayout } from "@/components/dashboard-layout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function TimesheetsPage() {
  return (
    <DashboardLayout>
        <div className="flex items-center justify-between mb-6">
            <div>
                <h1 className="text-3xl font-bold">Timesheets</h1>
                <p className="text-gray-500">Submit and track your weekly work hours.</p>
            </div>
            <Button>Submit New Timesheet</Button>
        </div>
        
        <Card>
            <CardHeader>
                <CardTitle>Your Submissions</CardTitle>
                <CardDescription>A list of all your submitted timesheets.</CardDescription>
            </CardHeader>
            <CardContent>
                <p>Timesheet list will be displayed here.</p>
            </CardContent>
        </Card>
    </DashboardLayout>
  );
}
