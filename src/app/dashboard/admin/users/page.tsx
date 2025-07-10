// src/app/dashboard/admin/users/page.tsx
"use client";

import { useAuth } from '@/components/auth-provider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function AdminUsersPage() {
  const { user } = useAuth();
  const router = useRouter();

  // Protect the route client-side as an extra layer of security
  useEffect(() => {
    if (user && user.role !== 'admin') {
      router.push('/dashboard');
    }
  }, [user, router]);

  // Render a loading/redirecting state while checking the user role
  if (!user || user.role !== 'admin') {
    return <p>Loading or redirecting...</p>;
  }

  return (
    <div className="relative w-full h-full">
       {/* Subtle background gradient effect */}
      <div
        className="absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl sm:-top-80"
        aria-hidden="true"
      >
        <div
          className="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-[#ff80b5] to-[#9089fc] opacity-20 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]"
          style={{
            clipPath:
              'polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)',
          }}
        />
      </div>
      
      {/* Page content */}
      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Manage Users</CardTitle>
            <CardDescription>
              Here you can view, edit, and manage all users in the system.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p>User management functionality will be built here.</p>
            {/* You can add a table of users here in the future */}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
