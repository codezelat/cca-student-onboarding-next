import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

function hasSupabaseAuthCookie(request: NextRequest): boolean {
    return request.cookies
        .getAll()
        .some(
            (cookie) =>
                cookie.name.startsWith("sb-") &&
                cookie.name.endsWith("-auth-token"),
        );
}

export async function updateSession(request: NextRequest) {
    const requestHeaders = new Headers(request.headers);
    requestHeaders.delete("x-admin-user-id");
    requestHeaders.delete("x-admin-user-email");
    requestHeaders.delete("x-admin-user-name");

    const pathname = request.nextUrl.pathname;
    const isAdminRoute = pathname.startsWith("/admin");
    const isAdminLoginRoute = pathname === "/admin/login";
    const hasAuthCookie = hasSupabaseAuthCookie(request);

    const nextWithHeaders = () =>
        NextResponse.next({
            request: {
                headers: requestHeaders,
            },
        });

    // Fast path: unauthenticated request to admin routes does not need Supabase roundtrip.
    if (!hasAuthCookie && isAdminRoute) {
        if (!isAdminLoginRoute) {
            const url = request.nextUrl.clone();
            url.pathname = "/admin/login";
            return NextResponse.redirect(url);
        }
        return nextWithHeaders();
    }

    let supabaseResponse = nextWithHeaders();

    const refreshResponseWithHeaders = () => {
        const currentCookies = supabaseResponse.cookies.getAll();
        const nextResponse = nextWithHeaders();
        currentCookies.forEach((cookie) => nextResponse.cookies.set(cookie));
        supabaseResponse = nextResponse;
    };

    const applyVerifiedUserHeaders = (
        user:
            | {
                  id: string;
                  email?: string | null;
                  user_metadata?: { name?: string | null } | null;
              }
            | null
            | undefined,
    ) => {
        requestHeaders.delete("x-admin-user-id");
        requestHeaders.delete("x-admin-user-email");
        requestHeaders.delete("x-admin-user-name");

        if (!user) return;

        requestHeaders.set("x-admin-user-id", user.id);

        if (user.email) {
            requestHeaders.set("x-admin-user-email", user.email);
        }

        const nameFromMetadata = user.user_metadata?.name;
        if (typeof nameFromMetadata === "string" && nameFromMetadata.length) {
            requestHeaders.set(
                "x-admin-user-name",
                encodeURIComponent(nameFromMetadata),
            );
        }
    };

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll();
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value }) =>
                        request.cookies.set(name, value),
                    );
                    supabaseResponse = nextWithHeaders();
                    cookiesToSet.forEach(({ name, value, options }) =>
                        supabaseResponse.cookies.set(name, value, options),
                    );
                },
            },
        },
    );

    // Refresh session — important for Server Components
    const {
        data: { user },
    } = await supabase.auth.getUser();
    applyVerifiedUserHeaders(user);
    refreshResponseWithHeaders();

    // Protect admin routes — redirect to login if not authenticated
    if (!user && isAdminRoute && !isAdminLoginRoute) {
        const url = request.nextUrl.clone();
        url.pathname = "/admin/login";
        return NextResponse.redirect(url);
    }

    // Redirect authenticated users away from login page
    if (user && isAdminLoginRoute) {
        const url = request.nextUrl.clone();
        url.pathname = "/admin";
        return NextResponse.redirect(url);
    }

    return supabaseResponse;
}
