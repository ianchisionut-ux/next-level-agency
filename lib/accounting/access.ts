import { NextResponse } from "next/server";
import { redirect } from "next/navigation";
import { getCurrentUser, isSuperAdmin } from "@/lib/session";

async function getAccountingAccess() {
  const user = await getCurrentUser();
  if (!user) return { authenticated: false, allowed: false };

  return {
    authenticated: true,
    allowed: await isSuperAdmin(user.userId),
  };
}

export async function requireAccountingPage() {
  const access = await getAccountingAccess();
  if (!access.authenticated) redirect("/login");
  if (!access.allowed) redirect("/dashboard");
}

export function accountingApi<TArgs extends unknown[]>(handler: (...args: TArgs) => Promise<Response>) {
  return async (...args: TArgs): Promise<Response> => {
    const access = await getAccountingAccess();
    if (!access.authenticated) {
      return NextResponse.json({ error: "Neautorizat" }, { status: 401 });
    }
    if (!access.allowed) {
      return NextResponse.json({ error: "Acces interzis" }, { status: 403 });
    }
    return handler(...args);
  };
}
