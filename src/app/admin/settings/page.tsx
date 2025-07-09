import { DashboardNav } from "@/components/dashboard-nav";

export default function AdminSettingsPage() {
  return (
    <div className="flex min-h-screen">
      <aside className="w-64 border-r">
        <DashboardNav />
      </aside>
      <main className="flex-1 p-8">
        <h1 className="text-3xl font-bold">Admin Settings</h1>
        <p className="text-gray-500">Configure global application settings here.</p>
        <div className="mt-8 rounded-lg border border-dashed border-gray-300 h-96">
          {/* Settings form will go here */}
        </div>
      </main>
    </div>
  );
}