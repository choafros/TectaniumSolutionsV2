import { DashboardLayout } from "@/components/dashboard-layout";

export default function AdminUsersPage() {
  return (
    <DashboardLayout>
      <h1 className="text-3xl font-bold">User Management</h1>
      <p className="text-gray-500">Here you can view, edit, and manage all users in the system.</p>
      <div className="mt-8 rounded-lg border border-dashed border-gray-300 h-96">
        {/* User table will go here */}
      </div>
    </DashboardLayout>
  );
}