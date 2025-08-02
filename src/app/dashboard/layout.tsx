"use client";

import Link from 'next/link';
import { useAuth } from '@/components/auth-provider';
import { DashboardNav } from '@/components/dashboard-nav';
import { Button } from '@/components/ui/button';
import { LogOut, ShieldCheck } from 'lucide-react';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, logout } = useAuth();

return (
    <div className="grid min-h-screen w-full lg:grid-cols-[280px_1fr]">
      <div className="hidden border-r bg-gray-100/40 lg:block dark:bg-gray-800/40">
        <div className="flex h-full max-h-screen flex-col gap-2">
          <div className="flex h-[60px] items-center border-b px-6">
            <Link className="flex items-center gap-2 font-semibold" href="/">
              <ShieldCheck className="h-6 w-6" />
              <span className="">Tectanium</span>
            </Link>
          </div>
          <div className="flex-1 overflow-auto py-2">
            <DashboardNav />
          </div>
          <div className="mt-auto p-4 border-t">
            <div className="flex justify-between items-center text-xs text-gray-500 mb-4">
              <span>Tectanium v2.0</span>
            </div>
            <Button variant="ghost" className="w-full justify-start" onClick={logout}>
              <LogOut className="mr-2 h-4 w-4" />
              Log Out
            </Button>
          </div>
        </div>
      </div>
      <div className="flex flex-col">
         <header className="flex h-14 lg:h-[60px] items-center gap-4 border-b bg-gray-100/40 px-6 dark:bg-gray-800/40">
            {/* Welcome message for the logged-in user */}
            <div className="flex-1">
                <h1 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Welcome, {user?.username || 'User'}
                </h1>
            </div>
        </header>
        <main className="flex-1 p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
