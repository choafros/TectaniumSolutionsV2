// Now uses the useAuth hook to handle login state.

"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { useAuth } from '@/components/auth-provider';

export default function LoginPage() {
  const [loginUsername, setLoginUsername] = useState('admin');
  const [loginPassword, setLoginPassword] = useState('admin');
  const [error, setError] = useState('');
  const router = useRouter();
  const { checkAuth } = useAuth(); // Get the checkAuth function

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const response = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: loginUsername, password: loginPassword }),
    });

    if (response.ok) {
      await checkAuth(); // Re-check authentication to update global state
      router.push('/dashboard');
    } else {
      const data = await response.json();
      setError(data.message || 'Failed to login');
    }
  };

  return (
    <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
      <Tabs defaultValue="login" className="w-full">
        <TabsContent value="login">
          <Card>
            <CardHeader className="space-y-1">
              <CardTitle className="text-2xl">Log in to your account</CardTitle>
              <CardDescription>Enter your credentials to access your dashboard.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleLogin} className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="login-username">Username</Label>
                  <Input id="login-username" type="text" placeholder="admin" value={loginUsername} onChange={(e) => setLoginUsername(e.target.value)} required />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="login-password">Password</Label>
                  <Input id="login-password" type="password" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} required />
                </div>
                {error && <p className="text-sm text-red-500">{error}</p>}
                <Button className="w-full">Log In</Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
        {/* ... Register Tab remains the same ... */}
      </Tabs>
    </div>
  );
}