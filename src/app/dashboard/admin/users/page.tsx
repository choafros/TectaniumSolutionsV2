// src/app/dashboard/admin/users/page.tsx
"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/components/auth-provider';
import { useRouter } from 'next/navigation';
import { type InferSelectModel } from 'drizzle-orm';
import { users as usersSchema } from '@/lib/db/schema';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from '@/components/ui/badge';
import { UserForm } from '@/components/ui/user-form';
import { BackgroundGradient } from '@/components/ui/background-gradient';
import { Input } from '@/components/ui/input';

export type User = InferSelectModel<typeof usersSchema>;

export default function AdminUsersPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [_error, setError] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/users');
      if (!res.ok) throw new Error('Failed to fetch users');
      const data = await res.json();
      setUsers(data);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user && user.role !== 'admin') {
      router.push('/dashboard');
    } else {
      fetchUsers();
    }
  }, [user, router, fetchUsers]);

  const filteredUsers = useMemo(() => {
      if (!searchTerm) return users;
      return users.filter(u => u.username.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [users, searchTerm]);

  const handleEdit = async (userToEdit: User) => {
    setError(null); // FIX: Was 'error(null)'
    try {
      const res = await fetch(`/api/users/${userToEdit.id}`);
      if (!res.ok) {
        throw new Error('Failed to fetch user details.');
      }
      const fullUserData = await res.json();
      setSelectedUser(fullUserData);
      setIsFormOpen(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred.'); // FIX: Was 'error(...)'
    }
  };

  const handleRegister = () => {
    setSelectedUser(null);
    setIsFormOpen(true);
  };
  
  const handleFormSuccess = () => {
    setIsFormOpen(false);
    fetchUsers();
  }

  if (!user || user.role !== 'admin') {
    return <p>Loading or redirecting...</p>;
  }

  return (
    <div className="relative w-full h-full">
      <BackgroundGradient
        from="from-blue-400"
        to="to-emerald-400"
        shape="polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)"
      />
      
      <UserForm 
        isOpen={isFormOpen}
        setIsOpen={setIsFormOpen}
        user={selectedUser}
        onSuccess={handleFormSuccess}
      />

      <Tabs defaultValue="manage">
        <div className="flex justify-between items-center mb-4">
            <TabsList>
                <TabsTrigger value="manage">Manage Users</TabsTrigger>
            </TabsList>
            <div className="flex items-center gap-4">
                <Input 
                    placeholder="Search by username..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-64"
                />
                <Button onClick={handleRegister}>Register New User</Button>
            </div>
        </div>
        <TabsContent value="manage">
          <Card>
            <CardHeader>
              <CardTitle>User Management</CardTitle>
              <CardDescription>View, edit, and manage all users in the system.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Username</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Normal Rate</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow><TableCell colSpan={5} className="text-center">Loading users...</TableCell></TableRow>
                  ) : (
                    filteredUsers.map(u => (
                      <TableRow key={u.id}>
                        <TableCell className="font-medium">{u.username}</TableCell>
                        <TableCell className="capitalize">{u.role}</TableCell>
                        <TableCell>
                          <Badge variant={u.active ? 'default' : 'destructive'}>
                            {u.active ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell>£{u.normalRate}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="outline" size="sm" onClick={() => handleEdit(u)}>Edit</Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
