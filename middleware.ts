import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const secretSlug = (
    process.env.ADMIN_SECRET_SLUG || "my-private-hub-7744"
  )
    .replace(/^["'/]|["'/]$/g, "")
    .trim();

  const { pathname } = request.nextUrl;

  // 1. Allow Next.js static assets and icons
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // 2. Allow API routes (Cron job dispatch)
  if (pathname.startsWith("/api/cron")) {
    return NextResponse.next();
  }

  // 3. Check for Secret Slug routes
  if (pathname === `/${secretSlug}`) {
    // Internally rewrite to "/" while keeping the secret slug in the browser URL
    return NextResponse.rewrite(new URL("/", request.url));
  }

  if (pathname === `/${secretSlug}/login`) {
    // Internally rewrite to "/login" while keeping the secret slug in the browser URL
    return NextResponse.rewrite(new URL("/login", request.url));
  }

  // 4. Any other path (including root "/" and direct "/login") returns 404 NOT FOUND!
  // This completely conceals the platform from search engines, bots, and anyone visiting the base domain
  const notFoundHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>404 - Page Not Found</title>
  <style>
    body { font-family: system-ui, sans-serif; background: #090d16; color: #64748b; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
    .box { text-align: center; }
    h1 { font-size: 4rem; margin: 0; color: #334155; }
    p { font-size: 1rem; margin-top: 0.5rem; }
  </style>
</head>
<body>
  <div class="box">
    <h1>404</h1>
    <p>This page could not be found.</p>
  </div>
</body>
</html>`;

  return new NextResponse(notFoundHtml, {
    status: 404,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
