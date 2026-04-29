import { jwtVerify, SignJWT } from "jose";

const enc = new TextEncoder();

function secret() {
  const s = process.env.JWT_SECRET;
  if (!s) throw new Error("JWT_SECRET env var not set");
  return enc.encode(s);
}

export interface TokenClaims {
  case_id: string;
  form_type: string;
  client_name: string;
  tenant_id: string;
  exp: number;
}

export async function signToken(
  payload: Omit<TokenClaims, "exp">,
  expiresInDays = 30,
): Promise<string> {
  return await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(`${expiresInDays}d`)
    .sign(secret());
}

export async function verifyToken(token: string): Promise<TokenClaims | null> {
  try {
    const { payload } = await jwtVerify(token, secret());
    return payload as unknown as TokenClaims;
  } catch {
    return null;
  }
}
