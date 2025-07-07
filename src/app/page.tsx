import Link from 'next/link';

export default function HomePage() {
  return (
    <main style={{ textAlign: 'center', paddingTop: '5rem' }}>
      <h1>Welcome to Tectanium Solutions</h1>
      <Link href="/login" style={{ fontSize: '1.2rem', color: 'blue' }}>
        Go to Login Page
      </Link>
    </main>
  );
}