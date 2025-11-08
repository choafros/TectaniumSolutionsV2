// src/components/user-profile-form.tsx
"use client";

import { useState, FormEvent } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { type User } from '@/lib/db/schema';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';

interface UserProfileFormProps {
  user: User;
}

export function UserProfileForm({ user }: UserProfileFormProps) {
  const [formData, setFormData] = useState<Partial<User>>(user);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleChange = (field: keyof User, value: unknown) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Failed to update profile.');
      }
      
      setSuccess('Profile updated successfully!');

    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Contact Information */}
      <Card>
        <CardHeader>
          <CardTitle>Contact Information</CardTitle>
          <CardDescription>Your primary contact and address details.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={formData.email || ''} onChange={(e) => handleChange('email', e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" value={formData.phoneNumber || ''} onChange={(e) => handleChange('phoneNumber', e.target.value)} />
            </div>
            <div className="grid gap-2 md:col-span-2">
              <Label htmlFor="address">Address</Label>
              <Input id="address" value={formData.address || ''} onChange={(e) => handleChange('address', e.target.value)} />
            </div>
        </CardContent>
      </Card>

      {/* Business Information */}
       <Card>
        <CardHeader>
          <CardTitle>Business Information</CardTitle>
          <CardDescription>Details about your business or sole trader status.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="userType">User Type</Label>
              <Select value={formData.userType || 'sole_trader'} onValueChange={(value) => handleChange('userType', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sole_trader">Sole Trader</SelectItem>
                  <SelectItem value="business">Business</SelectItem>
                </SelectContent>
              </Select>
            </div>
             <div className="grid gap-2">
              <Label htmlFor="utr">UTR</Label>
              <Input id="utr" value={formData.utr || ''} onChange={(e) => handleChange('utr', e.target.value)} />
            </div>
            {formData.userType === 'sole_trader' && (
              <div className="grid gap-2">
                <Label htmlFor="nino">NINO</Label>
                <Input id="nino" value={formData.nino || ''} onChange={(e) => handleChange('nino', e.target.value)} />
              </div>
            )}
            {formData.userType === 'business' && (
              <>
                <div className="grid gap-2">
                  <Label htmlFor="crn">CRN</Label>
                  <Input id="crn" value={formData.crn || ''} onChange={(e) => handleChange('crn', e.target.value)} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="vatNumber">VAT Number</Label>
                  <Input id="vatNumber" value={formData.vatNumber || ''} onChange={(e) => handleChange('vatNumber', e.target.value)} />
                </div>
              </>
            )}
        </CardContent>
      </Card>
      
      {/* Banking Details */}
      <Card>
        <CardHeader>
          <CardTitle>Banking Details</CardTitle>
          <CardDescription>Where we should send your payments.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="bankName">Bank Name</Label>
              <Input id="bankName" value={formData.bankName || ''} onChange={(e) => handleChange('bankName', e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="accountName">Account Name</Label>
              <Input id="accountName" value={formData.accountName || ''} onChange={(e) => handleChange('accountName', e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="accountNumber">Account Number</Label>
              <Input id="accountNumber" value={formData.accountNumber || ''} onChange={(e) => handleChange('accountNumber', e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="sortCode">Sort Code</Label>
              <Input id="sortCode" value={formData.sortCode || ''} onChange={(e) => handleChange('sortCode', e.target.value)} />
            </div>
        </CardContent>
      </Card>
      
      {error && <p className="text-sm text-red-500">{error}</p>}
      {success && <p className="text-sm text-green-500">{success}</p>}
      
      <div className="flex justify-end">
        <Button type="submit" disabled={isSaving}>
          {isSaving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </form>
  );
}
