import { NextResponse } from 'next/server';

export function middleware(request) {
  const { pathname } = request.nextUrl;
  
  // Check session cookie or authorization header
  const authCookie = request.cookies.get('mars_session')?.value;
  const authHeader = request.headers.get('authorization');
  const isAuthenticated = Boolean(authCookie || authHeader);

  // Define route protections
  const isMemberRoute = pathname.startsWith('/member');
  const isErpRoute = pathname.startsWith('/erp');
  const isApiMember = pathname.startsWith('/api/v1/member');
  const isApiErp = pathname.startsWith('/api/v1/erp');

  if (isMemberRoute || isErpRoute || isApiMember || isApiErp) {
    if (!isAuthenticated) {
      if (isApiMember || isApiErp) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'UNAUTHORIZED',
              message: 'Authentication required to access this resource.'
            }
          },
          { status: 401 }
        );
      }
      
      const loginUrl = new URL('/auth/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/member/:path*',
    '/erp/:path*',
    '/api/v1/member/:path*',
    '/api/v1/erp/:path*'
  ]
};
