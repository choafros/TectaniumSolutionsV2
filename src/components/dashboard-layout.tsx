"use client"; // This component uses hooks, so it must be a client component

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/components/auth-provider';
import { Button } from '@/components/ui/button';
import { Home, Clock, FolderKanban, FileText, Users, Settings, LogOut, FileBox } from 'lucide-react';

// Define the navigation items
const navItems = [
  { name: 'Dashboard', href: '/dashboard', icon: Home, roles: ['admin', 'candidate', 'client'] },
  { name: 'Timesheets', href: '/timesheets', icon: Clock, roles: ['admin', 'candidate'] },
  { name: 'Projects', href: '/projects', icon: FolderKanban, roles: ['admin', 'candidate'] },
  { name: 'Invoices', href: '/invoices', icon: FileBox, roles: ['admin', 'candidate'] },
  { name: 'Documents', href: '/documents', icon: FileText, roles: ['admin', 'candidate'] },
];

const adminNavItems = [
  { name: 'Users', href: '/admin/users', icon: Users, roles: ['admin'] },
  { name: 'Settings', href: '/admin/settings', icon: Settings, roles: ['admin'] },
];

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  // Filter navigation items based on the current user's role
  const getNavItems = () => {
    if (!user) return [];
    const allItems = user.role === 'admin' ? [...navItems, ...adminNavItems] : navItems;
    return allItems.filter(item => item.roles.includes(user.role));
  };

  const visibleNavItems = getNavItems();

  return (
    <div className="grid min-h-screen w-full lg:grid-cols-[280px_1fr]">
      <div className="hidden border-r bg-gray-100/40 lg:block dark:bg-gray-800/40">
        <div className="flex h-full max-h-screen flex-col gap-2">
          <div className="flex h-[60px] items-center border-b px-6">
            <Link className="flex items-center gap-2 font-semibold" href="/">
              <span className="">Tectanium</span>
            </Link>
          </div>
          <div className="flex-1 overflow-auto py-2">
            <nav className="grid items-start px-4 text-sm font-medium">
              {visibleNavItems.map((item) => (
                <Link
                  key={item.name}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2 text-gray-500 transition-all hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-50 ${
                    pathname === item.href && 'bg-gray-200/50 text-gray-900 dark:bg-gray-800'
                  }`}
                  href={item.href}
                >
                  <item.icon className="h-4 w-4" />
                  {item.name}
                </Link>
              ))}
            </nav>
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
          <div className="flex-1">
            <h1 className="text-lg font-semibold capitalize">{pathname.split('/').pop()?.replace('-', ' ')}</h1>
          </div>
        </header>
        <main className="flex-1 p-4 md:p-6 bg-gray-50">
          {children}
        </main>
      </div>
    </div>
  );
}