// src/components/ui/user-form.tsx
"use client";

import { useState, useEffect, FormEvent } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { type User } from '@/app/dashboard/admin/users/page';
import { Separator } from './separator';

interface UserFormProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  user: User | null;
  onSuccess: () => void;
}

export function UserForm({ isOpen, setIsOpen, user, onSuccess }: UserFormProps) {
  const [formData, setFormData] = useState<Partial<User>>({});
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (user) {
        setFormData(user);
      } else {
        setFormData({
          username: '',
          role: 'candidate',
          active: true,
          normalRate: '0',
          overtimeRate: '0',
          email: '',
          phoneNumber: '',
          nino: '',
          utr: '',
          userType: 'sole_trader',
          address: '',
          crn: '',
          vatNumber: '',
          paymentFrequency: 'weekly',
          bankName: '',
          accountName: '',
          accountNumber: '',
          sortCode: '',
        });
      }
      setPassword('');
      setError('');
    }
  }, [user, isOpen]);

  const handleChange = (field: keyof User, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError('');

    const isCreating = !user;
    const url = isCreating ? '/api/users' : `/api/users/${user.id}`;
    const method = isCreating ? 'POST' : 'PUT';

    const body = isCreating ? { ...formData, password } : formData;

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Failed to save user.');
      }
      
      onSuccess();

    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{user ? 'Edit User' : 'Register New User'}</DialogTitle>
          <DialogDescription>
            {user ? `Editing details for ${user.username}` : 'Fill in the form to create a new user account.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 py-4 overflow-y-auto pr-6">
          {/* Personal Information Section */}
          <div className="mb-4">
            <h3 className="text-lg font-semibold mb-2">Personal Information</h3>
            <Separator />
            <div className="grid grid-cols-4 items-center gap-4 mt-4">
              <Label htmlFor="username" className="text-right">Username</Label>
              <Input id="username" value={formData.username || ''} onChange={(e) => handleChange('username' as keyof User, e.target.value)} className="col-span-3" required />
            </div>
            {!user && (
              <div className="grid grid-cols-4 items-center gap-4 mt-4">
                <Label htmlFor="password" className="text-right">Password</Label>
                <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="col-span-3" required />
              </div>
            )}
            <div className="grid grid-cols-4 items-center gap-4 mt-4">
              <Label htmlFor="email" className="text-right">Email</Label>
              <Input id="email" type="email" value={formData.email || ''} onChange={(e) => handleChange('email', e.target.value)} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4 mt-4">
              <Label htmlFor="phone" className="text-right">Phone</Label>
              <Input id="phone" value={formData.phoneNumber || ''} onChange={(e) => handleChange('phoneNumber', e.target.value)} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4 mt-4">
              <Label htmlFor="address" className="text-right">Address</Label>
              <Input id="address" value={formData.address || ''} onChange={(e) => handleChange('address', e.target.value)} className="col-span-3" />
            </div>
          </div>

          {/* Business & Payment Information Section */}
          <div className="mb-4">
            <h3 className="text-lg font-semibold mb-2">Business & Payment</h3>
            <Separator />
            <div className="grid grid-cols-4 items-center gap-4 mt-4">
              <Label htmlFor="userType" className="text-right">User Type</Label>
              <Select value={formData.userType || 'sole_trader'} onValueChange={(value) => handleChange('userType', value)}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select a type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sole_trader">Sole Trader</SelectItem>
                  <SelectItem value="business">Business</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {formData.userType === 'sole_trader' && (
              <div className="grid grid-cols-4 items-center gap-4 mt-4">
                <Label htmlFor="nino" className="text-right">NINO</Label>
                <Input id="nino" value={formData.nino || ''} onChange={(e) => handleChange('nino', e.target.value)} className="col-span-3" />
              </div>
            )}
            <div className="grid grid-cols-4 items-center gap-4 mt-4">
              <Label htmlFor="utr" className="text-right">UTR</Label>
              <Input id="utr" value={formData.utr || ''} onChange={(e) => handleChange('utr', e.target.value)} className="col-span-3" />
            </div>
            {formData.userType === 'business' && (
              <>
                <div className="grid grid-cols-4 items-center gap-4 mt-4">
                  <Label htmlFor="crn" className="text-right">CRN</Label>
                  <Input id="crn" value={formData.crn || ''} onChange={(e) => handleChange('crn', e.target.value)} className="col-span-3" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4 mt-4">
                  <Label htmlFor="vatNumber" className="text-right">VAT Number</Label>
                  <Input id="vatNumber" value={formData.vatNumber || ''} onChange={(e) => handleChange('vatNumber', e.target.value)} className="col-span-3" />
                </div>
              </>
            )}
            <div className="grid grid-cols-4 items-center gap-4 mt-4">
              <Label htmlFor="normalRate" className="text-right">Normal Rate (£)</Label>
              <Input id="normalRate" type="number" step="0.01" value={formData.normalRate || ''} onChange={(e) => handleChange('normalRate', e.target.value)} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4 mt-4">
              <Label htmlFor="overtimeRate" className="text-right">Overtime Rate (£)</Label>
              <Input id="overtimeRate" type="number" step="0.01" value={formData.overtimeRate || ''} onChange={(e) => handleChange('overtimeRate', e.target.value)} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4 mt-4">
              <Label htmlFor="paymentFrequency" className="text-right">Payment Frequency</Label>
              <Select value={formData.paymentFrequency || 'weekly'} onValueChange={(value) => handleChange('paymentFrequency', value)}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select a frequency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="fortnightly">Fortnightly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {/* Banking Information Section */}
          <div className="mb-4">
            <h3 className="text-lg font-semibold mb-2">Banking Information</h3>
            <Separator />
            <div className="grid grid-cols-4 items-center gap-4 mt-4">
              <Label htmlFor="bankName" className="text-right">Bank Name</Label>
              <Input id="bankName" value={formData.bankName || ''} onChange={(e) => handleChange('bankName', e.target.value)} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4 mt-4">
              <Label htmlFor="accountName" className="text-right">Account Name</Label>
              <Input id="accountName" value={formData.accountName || ''} onChange={(e) => handleChange('accountName', e.target.value)} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4 mt-4">
              <Label htmlFor="accountNumber" className="text-right">Account Number</Label>
              <Input id="accountNumber" value={formData.accountNumber || ''} onChange={(e) => handleChange('accountNumber', e.target.value)} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4 mt-4">
              <Label htmlFor="sortCode" className="text-right">Sort Code</Label>
              <Input id="sortCode" value={formData.sortCode || ''} onChange={(e) => handleChange('sortCode', e.target.value)} className="col-span-3" />
            </div>
          </div>

          {/* Admin Section */}
          <div>
            <h3 className="text-lg font-semibold mb-2">Admin Settings</h3>
            <Separator />
            <div className="grid grid-cols-4 items-center gap-4 mt-4">
              <Label htmlFor="role" className="text-right">Role</Label>
              <Select value={formData.role || 'candidate'} onValueChange={(value) => handleChange('role', value)}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="candidate">Candidate</SelectItem>
                  <SelectItem value="client">Client</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4 mt-4">
              <Label htmlFor="active" className="text-right">Active</Label>
              <Switch id="active" checked={!!formData.active} onCheckedChange={(checked) => handleChange('active', checked)} />
            </div>
          </div>

          {error && <p className="col-span-4 text-sm text-red-500 text-center">{error}</p>}
        </form>
        <DialogFooter>
          <Button type="submit" onClick={handleSubmit} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
