import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyAuth } from '@/lib/auth';

export async function middleware(request: NextRequest) {
  const adminSession = request.cookies.get('admin_session')?.value;
  const isAdminPath = request.nextUrl.pathname.startsWith('/admin') && request.nextUrl.pathname !== '/admin/login';

  let isAuthenticated = false;

  if (adminSession) {
    const payload = await verifyAuth(adminSession);
    isAuthenticated = !!payload;
  }

  // Protect /admin routes, redirect to /admin/login if not authenticated
  if (isAdminPath && !isAuthenticated) {
    return NextResponse.redirect(new URL('/admin/login', request.url));
  }

  // Redirect /admin/login to /admin if already authenticated
  if (request.nextUrl.pathname === '/admin/login' && isAuthenticated) {
    return NextResponse.redirect(new URL('/admin', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/admin'],
};
