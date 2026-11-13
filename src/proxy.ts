import { auth } from "@/lib/auth/server";

export default auth.middleware({
  loginUrl: "/auth/sign-in"
});

export const config = {
  // Password-reset links are bearer-token flows. They must remain public so
  // the auth middleware does not redirect the one-time token back to sign-in.
  // The auth pages perform their own token validation before changing a password.
  matcher: ["/((?!api(?:/|$)|_next/static|_next/image|favicon.ico|auth(?:/|$)|teacher/(?:offline(?:/|$)|manifest\\.webmanifest$)|teacher\\.webmanifest$|teacher-sw\\.js$|teacher-icon\\.svg$).*)"]
};
