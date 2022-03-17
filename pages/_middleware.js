import { getToken } from 'next-auth/jwt';
import { NextResponse } from 'next/server';

export async function middleware(req) {
	// Token will exist if user is logged in
	const url = req.nextUrl.clone();
	const token = await getToken({ req, secret: process.env.JWT_SECRET });

	const { pathname } = req.nextUrl;

	// Allow the requests if the follow is true...
	// 1. It is a request for next-auth session & provider fetching
	// 2. The token exists
	if (pathname.includes('/api/auth') || token) {
		return NextResponse.next();
	}

	// Redirect them to login if they don't have token AND request a protected route
	if (!token && pathname !== '/login') {
		url.pathname = '/login';
		return NextResponse.redirect(url);
	}
}
