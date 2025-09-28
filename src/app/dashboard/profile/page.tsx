// src/app/dashboard/profile/page.tsx
"use client";

import { UserProfileForm } from "@/components/user-profile-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/components/auth-provider";
import { useEffect, useState } from "react";
import { type User } from "@/lib/db/schema";

export default function ProfilePage() {
  const { user: authUser, isLoading: authLoading } = useAuth();
  const [userData, setUserData] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (authLoading) {
      return;
    }
    if (!authUser) {
      setError("You must be logged in to view this page.");
      setIsLoading(false);
      return;
    }

    const fetchUserData = async () => {
      setIsLoading(true);
      setError('');
      try {
        const res = await fetch('/api/user/profile');
        if (!res.ok) {
          throw new Error("Failed to fetch your profile data.");
        }
        const data = await res.json();
        setUserData(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An unknown error occurred.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserData();
  }, [authUser, authLoading]);

  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle>My Profile</CardTitle>
          <CardDescription>
            Update your personal, business, and banking information here.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading || authLoading ? (
            <p>Loading your profile...</p>
          ) : error ? (
            <p className="text-red-500">{error}</p>
          ) : userData ? (
            <UserProfileForm user={userData} />
          ) : (
            <p>Could not load profile data.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
