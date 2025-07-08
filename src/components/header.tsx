"use client";

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useEffect, useState } from 'react';

export function Header() {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header className={`fixed top-0 z-50 w-full transition-all duration-300 ${isScrolled ? 'border-b border-gray-200 bg-white/80 backdrop-blur-lg' : 'bg-transparent'}`}>
      <div className="mx-auto flex max-w-7xl items-center justify-between p-4 lg:px-8">
        <div className="flex lg:flex-1">
          <Link href="/" className="-m-1.5 p-1.5">
            <span className="text-xl font-bold tracking-tight text-gray-900">Tectanium</span>
          </Link>
        </div>
        <div className="flex items-center gap-x-6">
          <Link href="/login">
            <Button>
              Log in <span className="ml-2" aria-hidden="true">&rarr;</span>
            </Button>
          </Link>
        </div>
      </div>
    </header>
  );
}