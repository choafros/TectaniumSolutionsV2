import { DashboardLayout } from "@/components/dashboard-layout";

export default function AdminSettingsPage() {
  return (
    <DashboardLayout>
      <h1 className="text-3xl font-bold">Admin Settings</h1>
      <p className="text-gray-500">Configure global application settings here.</p>
       <div className="mt-8 rounded-lg border border-dashed border-gray-300 h-96">
        {/* Settings form will go here */}
      </div>
    </DashboardLayout>
  );
}