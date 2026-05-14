import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
    // 1. Get the path the user is trying to visit
    const path = request.nextUrl.pathname;

    // 2. Define your public path
    const isPublicPath = path === '/';

    // 3. Read the cookies
    const hasSession = request.cookies.has('session');
    const userDept = request.cookies.get('department')?.value;

    // --- RULE 1: NOT LOGGED IN ---
    // If they are trying to access a protected route WITHOUT a session -> Kick to login
    if (!isPublicPath && !hasSession) {
        return NextResponse.redirect(new URL('/', request.url));
    }

    // --- RULE 2: ALREADY LOGGED IN ---
    // If they have a session and try to view the login page -> Kick to their specific home
    if (isPublicPath && hasSession) {
        if (userDept === "Security") {
            return NextResponse.redirect(new URL('/security_home', request.url));
        } else if (userDept === "Facilities") {
            return NextResponse.redirect(new URL('/facility_home', request.url));
        } else {
            return NextResponse.redirect(new URL('/dashboard', request.url));
        }
    }

    // --- RULE 3: CROSS-DEPARTMENT PROTECTION ---
    if (hasSession) {
        // If a non-Facilities user tries to view the Facilities home
        if (path.startsWith('/facility_home') && userDept !== 'Facilities') {
            const redirectPath = userDept === 'Security' ? '/security_home' : userDept === 'Admin' ? '/dashboard' : '/login';
            return NextResponse.redirect(new URL(redirectPath, request.url));
        }
        
        // If a non-Security user tries to view the Security home
        if (path.startsWith('/security_home') && userDept !== 'Security') {
            const redirectPath = userDept === 'Facilities' ? '/facility_home' : userDept === 'Admin' ? '/dashboard' : '/login';
            return NextResponse.redirect(new URL(redirectPath, request.url));
        }

        if (path.startsWith('/dashboard') && userDept !== 'Admin') {
            const redirectPath = userDept === 'Facilities' ? '/facility_home' :  userDept === 'Security' ? '/security_home' : '/login';
            return NextResponse.redirect(new URL(redirectPath, request.url));
        }
    }

    // Otherwise, let them proceed normally!
    return NextResponse.next();
}

export const config = {
    matcher: [
        '/((?!api|_next/static|_next/image|favicon.ico|media).*)',
    ]
};