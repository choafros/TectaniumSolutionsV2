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
  );
}
