import { createNeonAuth } from "@neondatabase/auth/next/server";

const baseUrl = process.env.NEON_AUTH_BASE_URL;
const cookieSecret = process.env.NEON_AUTH_COOKIE_SECRET;

if (!baseUrl || !cookieSecret) {
  throw new Error("Neon Auth environment is not configured.");
}

export const auth = createNeonAuth({
  baseUrl,
  cookies: { secret: cookieSecret }
});
