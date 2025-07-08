// This file will now be at /login and will use the AuthLayout

"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function LoginPage() {
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [registerUsername, setRegisterUsername] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const response = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: loginUsername, password: loginPassword }),
    });
    if (response.ok) {
      router.push('/dashboard');
    } else {
      const data = await response.json();
      setError(data.message || 'Failed to login');
    }
  };

  // Placeholder for registration logic
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('Registration is not yet implemented.');
  };

  return (
    <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
      <Tabs defaultValue="login" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="login">Log In</TabsTrigger>
          <TabsTrigger value="register">Sign Up</TabsTrigger>
        </TabsList>
        <TabsContent value="login">
          <Card>
            <CardHeader className="space-y-1">
              <CardTitle className="text-2xl">Log in to your account</CardTitle>
              <CardDescription>Enter your credentials below to access your dashboard.</CardDescription>
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
        <TabsContent value="register">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Create an account</CardTitle>
              <CardDescription>Enter your details below to create a new account.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleRegister} className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="register-username">Username</Label>
                  <Input id="register-username" type="text" placeholder="yourusername" value={registerUsername} onChange={(e) => setRegisterUsername(e.target.value)} required />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="register-password">Password</Label>
                  <Input id="register-password" type="password" value={registerPassword} onChange={(e) => setRegisterPassword(e.target.value)} required />
                </div>
                <Button className="w-full">Create Account</Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      <p className="px-8 text-center text-sm text-muted-foreground">
        By continuing, you agree to our{' '}
        <Link href="/terms" className="underline underline-offset-4 hover:text-primary">
          Terms of Service
        </Link>{' '}
        and{' '}
        <Link href="/privacy" className="underline underline-offset-4 hover:text-primary">
          Privacy Policy
        </Link>
        .
      </p>
    </div>
  );
}