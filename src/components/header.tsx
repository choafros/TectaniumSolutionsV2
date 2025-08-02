// src/components/header.tsx
"use client";

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useEffect, useState } from 'react';
import { useAuth } from '@/components/auth-provider';
import { ShieldCheck, Menu } from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { VisuallyHidden } from './ui/visually-hidden';

export function Header() {
  const { user, logout } = useAuth();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header className={`sticky top-0 z-50 w-full transition-all duration-300 ${isScrolled ? 'border-b border-gray-200 bg-white/80 backdrop-blur-lg' : 'bg-transparent'}`}>
      <div className="mx-auto flex max-w-7xl items-center justify-between p-4 lg:px-8">
        <div className="flex lg:flex-1">
          <Link href="/" className="-m-1.5 p-1.5 flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-gray-900" />
            <span className="text-xl font-bold tracking-tight text-gray-900">Tectanium</span>
          </Link>
        </div>

        {/* Desktop Menu */}
        <div className="hidden lg:flex lg:items-center lg:gap-x-4">
          {user ? (
            <>
              <Link href="/dashboard">
                <Button variant="ghost">Dashboard</Button>
              </Link>
              <Button onClick={logout} variant="secondary">Log Out</Button>
            </>
          ) : (
            <Link href="/login">
              <Button>
                Log in <span className="ml-2" aria-hidden="true">&rarr;</span>
              </Button>
            </Link>
          )}
        </div>

        {/* Mobile Menu */}
        <div className="flex lg:hidden">
          <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon">
                <Menu className="h-6 w-6" />
                <span className="sr-only">Open main menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent>
                <SheetHeader>
                    <VisuallyHidden>
                        <SheetTitle>Main Menu</SheetTitle>
                    </VisuallyHidden>
                </SheetHeader>
                <div className="mt-6 flow-root">
                    <div className="-my-6 divide-y divide-gray-500/10">
                        <div className="space-y-2 py-6">
                             {user ? (
                                <>
                                <Link href="/dashboard" onClick={() => setIsMobileMenuOpen(false)} className="-mx-3 block rounded-lg px-3 py-2 text-base font-semibold leading-7 text-gray-900 hover:bg-gray-50">Dashboard</Link>
                                <Button onClick={() => { logout(); setIsMobileMenuOpen(false); }} variant="ghost" className="w-full justify-start -mx-3 px-3 py-2 text-base font-semibold leading-7">Log Out</Button>
                                </>
                            ) : (
                                <Link href="/login" onClick={() => setIsMobileMenuOpen(false)} className="-mx-3 block rounded-lg px-3 py-2.5 text-base font-semibold leading-7 text-gray-900 hover:bg-gray-50">
                                    Log in
                                </Link>
                            )}
                        </div>
                    </div>
                </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
