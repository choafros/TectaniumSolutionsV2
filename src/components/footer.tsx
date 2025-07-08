import Link from 'next/link';
import { ShieldCheck, Mail, Phone, MapPin } from 'lucide-react';

export function Footer() {
  return (
    <footer className="bg-gray-50 border-t">
      <div className="mx-auto max-w-7xl px-6 py-12 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <ShieldCheck className="h-6 w-6 text-gray-800" />
              <h3 className="text-lg font-semibold text-gray-900">Tectanium</h3>
            </div>
            <p className="text-sm text-gray-600">
              Your trusted partner in specialized data cabling and talent management solutions.
            </p>
          </div>
          <div>
            <h3 className="text-sm font-semibold leading-6 text-gray-900">Quick Links</h3>
            <ul role="list" className="mt-6 space-y-4">
              <li><Link href="#features" className="text-sm leading-6 text-gray-600 hover:text-gray-900">Our Services</Link></li>
              <li><Link href="#clients" className="text-sm leading-6 text-gray-600 hover:text-gray-900">Our Clients</Link></li>
              <li><Link href="/contact" className="text-sm leading-6 text-gray-600 hover:text-gray-900">Contact Us</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-semibold leading-6 text-gray-900">Contact</h3>
            <ul role="list" className="mt-6 space-y-4">
              <li className="flex items-center gap-2 text-sm leading-6 text-gray-600">
                <MapPin className="h-4 w-4" /> 123 Innovation Drive, London
              </li>
              <li className="flex items-center gap-2 text-sm leading-6 text-gray-600">
                <Phone className="h-4 w-4" /> +44 123 456 7890
              </li>
              <li className="flex items-center gap-2 text-sm leading-6 text-gray-600">
                <Mail className="h-4 w-4" /> info@tectanium.com
              </li>
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-semibold leading-6 text-gray-900">Legal</h3>
            <ul role="list" className="mt-6 space-y-4">
              <li><Link href="/privacy" className="text-sm leading-6 text-gray-600 hover:text-gray-900">Privacy Policy</Link></li>
              <li><Link href="/terms" className="text-sm leading-6 text-gray-600 hover:text-gray-900">Terms of Service</Link></li>
            </ul>
          </div>
        </div>
        <div className="mt-12 border-t border-gray-900/10 pt-8">
          <p className="text-center text-xs leading-5 text-gray-500">
            &copy; {new Date().getFullYear()} Tectanium Solutions. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}