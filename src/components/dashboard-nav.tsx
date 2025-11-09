"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/components/auth-provider';
import { Home, Clock, FileText, FolderKanban, User, Users, ReceiptPoundSterling } from 'lucide-react';
import { cn } from '@/lib/utils';

// Define all possible navigation items with the roles that can see them
const allNavItems = [
  { name: 'Dashboard', href: '/dashboard', icon: Home, roles: ['admin', 'candidate', 'client'] },

  // Worker-specific timesheet link
  { name: 'My Timesheets', href: '/dashboard/timesheets', icon: Clock, roles: ['candidate'] },

  // Admin-specific links
  { name: 'Projects', href: '/dashboard/projects', icon: FolderKanban, roles: ['admin'] },
  { name: 'All Timesheets', href: '/dashboard/admin/timesheets', icon: Clock, roles: ['admin'] },
  { name: 'Invoices', href: '/dashboard/admin/invoices', icon: ReceiptPoundSterling, roles: ['admin'] },
  { name: 'Manage Users', href: '/dashboard/admin/users', icon: Users, roles: ['admin'] },
  // Common link for documents
  { name: 'Documents', href: '/dashboard/documents', icon: FileText, roles: ['admin', 'candidate'] },
  { name: 'My Profile', href: '/dashboard/profile', icon: User, roles: ['candidate'] },
  
];

export function DashboardNav() {
  const pathname = usePathname();
  const { user } = useAuth();

  // Filter the navigation items based on the current user's role
  const navItems = allNavItems.filter(item => user && item.roles.includes(user.role));

  return (
    <nav className="grid items-start px-4 text-sm font-medium">
      {navItems.map((item) => (
        <Link
          key={item.name}
          href={item.href}
          className={cn(
            "flex items-center gap-3 rounded-lg px-3 py-2 text-gray-500 transition-all hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-50",
            pathname === item.href && "bg-gray-200/50 text-gray-900 dark:bg-gray-800"
          )}
        >
          <item.icon className="h-4 w-4" />
          {item.name}
        </Link>
      ))}
    </nav>
  );
}
