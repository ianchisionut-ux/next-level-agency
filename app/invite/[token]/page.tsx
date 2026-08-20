import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { AcceptInviteButton } from "@/app/components/auth/accept-invite-button";

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const invitation = await prisma.workspaceInvitation.findUnique({
    where: { token },
    include: { workspace: true },
  });

  const user = await getCurrentUser();

  if (!invitation) {
    return <Message title="Invitație inexistentă" body="Linkul nu este valid." />;
  }
  if (invitation.acceptedAt) {
    return <Message title="Invitație deja folosită" body="Ai acceptat deja această invitație." cta />;
  }
  if (invitation.expiresAt < new Date()) {
    return <Message title="Invitație expirată" body="Cere o invitație nouă persoanei care te-a invitat." />;
  }

  const emailMismatch = user && (!user.email || user.email.toLowerCase() !== invitation.email.toLowerCase());

  return (
    <div className="min-h-screen bg-ink-900 flex items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-2xl border border-ink-700 bg-ink-800 shadow-card p-6 text-center">
        <div className="flex items-center gap-2 justify-center mb-6">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/logo-full-transparent.png" alt="Next Level Advertising Agency" className="h-14 w-auto object-contain" />
        </div>

        <h1 className="font-display font-semibold text-lg text-mist-100 mb-2">
          Invitație în {invitation.workspace.name}
        </h1>
        <p className="text-sm text-mist-500 mb-6">
          {invitation.invitedByName} te-a invitat să colaborezi ca {roleLabel(invitation.role)}.
        </p>

        {!user && (
          <div className="space-y-2">
            <Link
              href={`/signup?next=/invite/${token}`}
              className="block w-full rounded-xl bg-signal hover:bg-signal-bright transition-colors text-white text-sm font-medium py-2.5"
            >
              Creează cont și acceptă
            </Link>
            <Link
              href={`/login?next=/invite/${token}`}
              className="block w-full rounded-xl border border-ink-600 hover:border-ink-500 text-mist-100 text-sm font-medium py-2.5"
            >
              Am deja cont
            </Link>
          </div>
        )}

        {user && emailMismatch && (
          <p className="text-sm text-state-error">
            Ești autentificat ca {user.email ?? "acest cont"}, dar invitația e pentru {invitation.email}.
            Deconectează-te și intră cu emailul corect.
          </p>
        )}

        {user && !emailMismatch && <AcceptInviteButton token={token} />}
      </div>
    </div>
  );
}

function roleLabel(role: string) {
  if (role === "OWNER") return "proprietar";
  if (role === "EDITOR") return "editor";
  return "vizualizator";
}

function Message({ title, body, cta }: { title: string; body: string; cta?: boolean }) {
  return (
    <div className="min-h-screen bg-ink-900 flex items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-2xl border border-ink-700 bg-ink-800 shadow-card p-6 text-center">
        <h1 className="font-display font-semibold text-lg text-mist-100 mb-2">{title}</h1>
        <p className="text-sm text-mist-500 mb-4">{body}</p>
        {cta && (
          <Link href="/dashboard" className="text-signal-bright text-sm font-medium hover:underline">
            Mergi la dashboard →
          </Link>
        )}
      </div>
    </div>
  );
}
