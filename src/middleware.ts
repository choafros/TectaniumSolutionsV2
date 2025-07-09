import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

interface JwtPayload {
  userId: number;
  role: 'admin' | 'candidate' | 'client';
  iat: number;
  exp: number;
}

function isJwtPayload(payload: any): payload is JwtPayload {
  return (
    typeof payload === 'object' &&
    payload !== null &&
    'userId' in payload &&
    'role' in payload
  );
}

async function verifyToken(token: string, secret: string): Promise<JwtPayload | null> {
  try {
    const encoder = new TextEncoder();
    const { payload } = await jwtVerify(token, encoder.encode(secret));
    if (isJwtPayload(payload)) {
      return payload;
    }
    return null;
  } catch (err) {
    console.error('JWT verification failed:', err);
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const token = request.cookies.get('session')?.value;
  const { pathname } = request.nextUrl;

  const loginUrl = new URL('/login', request.url);
  const dashboardUrl = new URL('/dashboard', request.url);

  const isProtectedRoute = pathname.startsWith('/dashboard') || pathname.startsWith('/admin');

  if (!token) {
    if (isProtectedRoute) {
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.next();
  }

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    console.error('JWT_SECRET not defined');
    return NextResponse.json({ message: 'Server configuration error' }, { status: 500 });
  }

  const decoded = await verifyToken(token, secret);

  if (!decoded) {
    const response = pathname === '/login'
      ? NextResponse.next()
      : NextResponse.redirect(loginUrl);
    response.cookies.set('session', '', { maxAge: -1, path: '/' });
    return response;
  }

  if (pathname.startsWith('/admin') && decoded.role !== 'admin') {
    return NextResponse.redirect(dashboardUrl);
  }

  if (pathname === '/login') {
    return NextResponse.redirect(dashboardUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/admin/:path*', '/login'],
};
