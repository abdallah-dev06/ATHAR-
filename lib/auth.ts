import { cookies } from "next/headers";
import crypto from "crypto";

const SESSION_COOKIE_NAME = "athar_session";
const SESSION_SECRET = (
  process.env.SESSION_SECRET || "default_fallback_secret_athar_2026_super_key_99"
).replace(/^["']|["']$/g, "").trim();

const ADMIN_USER = (process.env.ADMIN_USERNAME || "admin").replace(/^["']|["']$/g, "").trim();
const ADMIN_PASS = (process.env.ADMIN_PASSWORD || "Athar_Hub#2026@Secure!Admin$99X").replace(/^["']|["']$/g, "").trim();

export function getSecretSlug(): string {
  return (process.env.ADMIN_SECRET_SLUG || "my-private-hub-7744")
    .replace(/^["'/]|["'/]$/g, "")
    .trim();
}

/**
 * Creates an HMAC signed session token
 */
export function generateSessionToken(username: string): string {
  const payload = JSON.stringify({
    u: username,
    exp: Date.now() + 1000 * 60 * 60 * 24 * 7, // 7 days
  });
  const b64 = Buffer.from(payload).toString("base64url");
  const signature = crypto
    .createHmac("sha256", SESSION_SECRET)
    .update(b64)
    .digest("base64url");
  return `${b64}.${signature}`;
}

/**
 * Verifies the HMAC signed session token
 */
export function verifySessionToken(token: string): boolean {
  try {
    const [b64, signature] = token.split(".");
    if (!b64 || !signature) return false;

    const expectedSig = crypto
      .createHmac("sha256", SESSION_SECRET)
      .update(b64)
      .digest("base64url");

    const sigHash = crypto.createHash("sha256").update(signature).digest();
    const expectedSigHash = crypto.createHash("sha256").update(expectedSig).digest();

    if (!crypto.timingSafeEqual(sigHash, expectedSigHash)) {
      return false;
    }

    const payload = JSON.parse(Buffer.from(b64, "base64url").toString());
    if (payload.exp < Date.now()) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * Checks credentials against environment variables
 */
export function verifyCredentials(username: string, password: string): boolean {
  try {
    const cleanUser = username.trim();
    const cleanPass = password.trim();

    const userHash = crypto.createHash("sha256").update(cleanUser).digest();
    const expectedUserHash = crypto.createHash("sha256").update(ADMIN_USER).digest();

    const passHash = crypto.createHash("sha256").update(cleanPass).digest();
    const expectedPassHash = crypto.createHash("sha256").update(ADMIN_PASS).digest();

    const isUserValid = crypto.timingSafeEqual(userHash, expectedUserHash);
    const isPassValid = crypto.timingSafeEqual(passHash, expectedPassHash);

    return isUserValid && isPassValid;
  } catch (err) {
    console.error("Auth verification error:", err);
    return false;
  }
}

/**
 * Sets the secure session cookie
 */
export async function setSession(username: string) {
  const token = generateSessionToken(username);
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });
}

/**
 * Clears the session cookie
 */
export async function clearSession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

/**
 * Verifies if current request is authenticated
 */
export async function isAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return false;
  return verifySessionToken(token);
}
