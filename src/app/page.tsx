import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { ShieldCheck, CheckCircle, Wifi, Users } from 'lucide-react';

const features = [
  {
    name: 'Structured Data Cabling',
    description: 'Expert installation of Cat5e, Cat6, Cat6a, and fiber optic systems for robust network infrastructure.',
    icon: Wifi,
  },
  {
    name: 'Managed Labour Provision',
    description: 'Supplying highly skilled, certified engineers for your critical IT and telecoms projects across Europe.',
    icon: Users,
  },
  {
    name: 'Industry Certified',
    description: 'Holding ISO 9001, ISO 27001, and CHAS certifications to guarantee quality, security, and safety.',
    icon: ShieldCheck,
  },
];

const clientLogos = [
  { name: 'IKEA', logo: 'IKEA' },
  { name: 'Tesco', logo: 'Tesco' },
  { name: 'NHS', logo: 'NHS' },
  { name: 'Vodafone', logo: 'Vodafone' },
  { name: 'Equinix', logo: 'Equinix' },
];

export default function HomePage() {
  return (
    <div className="bg-white">
      <Header />
      <main className="isolate">
        {/* Hero Section */}
        <div className="relative pt-14">
          <div
            className="absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl sm:-top-80"
            aria-hidden="true"
          >
            <div
              className="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-[#ff80b5] to-[#9089fc] opacity-30 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]"
              style={{
                clipPath:
                  'polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)',
              }}
            />
          </div>
          <div className="py-24 sm:py-32">
            <div className="mx-auto max-w-7xl px-6 lg:px-8">
              <div className="mx-auto max-w-2xl text-center">
                <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl">
                  Expert Data Cabling & Managed Labour Solutions
                </h1>
                <p className="mt-6 text-lg leading-8 text-gray-600">
                  Tectanium delivers unparalleled quality in network infrastructure and provides elite, certified professionals for your most critical projects.
                </p>
                <div className="mt-10 flex items-center justify-center gap-x-6">
                  <Link href="/login">
                    <Button size="lg">Get Started</Button>
                  </Link>
                  <Link href="#features">
                    <Button variant="ghost" size="lg">Learn more <span aria-hidden="true">→</span></Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Features/Services Section */}
        <div id="features" className="mx-auto mt-16 max-w-7xl px-6 sm:mt-20 md:mt-24 lg:px-8">
          <dl className="mx-auto grid max-w-2xl grid-cols-1 gap-x-6 gap-y-10 text-base leading-7 text-gray-600 sm:grid-cols-2 lg:mx-0 lg:max-w-none lg:grid-cols-3 lg:gap-x-8 lg:gap-y-16">
            {features.map((feature) => (
              <div key={feature.name} className="relative pl-9">
                <dt className="inline font-semibold text-gray-900">
                  <feature.icon className="absolute left-1 top-1 h-5 w-5 text-indigo-600" aria-hidden="true" />
                  {feature.name}
                </dt>{' '}
                <dd className="inline">{feature.description}</dd>
              </div>
            ))}
          </dl>
        </div>

        {/* Client Logos Section */}
        <div id="clients" className="mx-auto mt-32 max-w-7xl px-6 sm:mt-40 lg:px-8">
           <div className="mx-auto max-w-2xl lg:max-w-none">
            <h2 className="text-center text-lg font-semibold leading-8 text-gray-900">
              Trusted by the world’s most innovative companies
            </h2>
            <div className="mx-auto mt-10 grid grid-cols-2 items-center gap-x-8 gap-y-10 sm:grid-cols-3 lg:grid-cols-5">
              {clientLogos.map((client) => (
                <div key={client.name} className="flex justify-center">
                  <span className="text-2xl font-bold text-gray-400">{client.logo}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

      </main>
      <Footer />
    </div>
  );
}
// This is the main page of the Tectanium Solutions website, showcasing the company's services and features.
// It includes a hero section, features/services section, and client logos section, along with a header and footer.