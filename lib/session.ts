import { cookies } from "next/headers";
import { verifySessionToken, SESSION_COOKIE_NAME } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;

  const payload = await verifySessionToken(token);
  if (!payload) return null;

  return payload;
}

const ACTIVE_WORKSPACE_COOKIE = "signal_active_workspace";

/**
 * Returneaza workspace-ul activ pentru userul curent.
 * Preferă workspace-ul ales explicit (cookie), altfel primul la care are acces.
 */
export async function getActiveWorkspace() {
  const user = await getCurrentUser();
  if (!user) return null;

  const cookieStore = await cookies();
  const preferredId = cookieStore.get(ACTIVE_WORKSPACE_COOKIE)?.value;

  if (preferredId) {
    const membership = await prisma.workspaceMember.findUnique({
      where: { userId_workspaceId: { userId: user.userId, workspaceId: preferredId } },
      include: { workspace: true },
    });
    if (membership) return membership.workspace;
  }

  const membership = await prisma.workspaceMember.findFirst({
    where: { userId: user.userId },
    include: { workspace: true },
    orderBy: { joinedAt: "asc" },
  });

  return membership?.workspace ?? null;
}

export async function getUserWorkspaces(userId: string) {
  const memberships = await prisma.workspaceMember.findMany({
    where: { userId },
    include: { workspace: true },
    orderBy: { joinedAt: "asc" },
  });
  return memberships.map((m) => ({ ...m.workspace, role: m.role }));
}

/**
 * Acces global (nu per-workspace) - folosit pentru sectiuni sensibile precum
 * "Oferte Web", vizibile doar contului/conturilor de super admin.
 */
export async function isSuperAdmin(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { isSuperAdmin: true },
  });
  return user?.isSuperAdmin ?? false;
}

export const ACTIVE_WORKSPACE_COOKIE_NAME = ACTIVE_WORKSPACE_COOKIE;
