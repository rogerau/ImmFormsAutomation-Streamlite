export function backendUrl(): string {
  const u = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8080";
  return u.replace(/\/+$/, "");
}
