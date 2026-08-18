import { prisma } from "@/lib/prisma";
import { getActiveWorkspace } from "@/lib/session";
import { redirect } from "next/navigation";
import { CampaignsList } from "@/app/components/campaigns/campaigns-list";

export const dynamic = "force-dynamic";

export default async function CampaignsPage() {
  const workspace = await getActiveWorkspace();
  if (!workspace) redirect("/login");

  const campaigns = await prisma.campaign.findMany({
    where: { workspaceId: workspace.id },
    include: { posts: { include: { variants: { include: { insights: true } } } } },
    orderBy: { createdAt: "desc" },
  });

  const withStats = campaigns.map((c) => {
    let engagement = 0;
    for (const post of c.posts) {
      for (const variant of post.variants) {
        for (const insight of variant.insights) {
          engagement += insight.likes + insight.comments + insight.shares + insight.saves;
        }
      }
    }
    return {
      id: c.id,
      name: c.name,
      description: c.description,
      goal: c.goal,
      startDate: c.startDate ? c.startDate.toISOString() : null,
      endDate: c.endDate ? c.endDate.toISOString() : null,
      postsCount: c.posts.length,
      publishedCount: c.posts.filter((p) => p.status === "PUBLISHED").length,
      engagement,
      progressPct: c.goal ? Math.min(100, Math.round((engagement / c.goal) * 100)) : null,
    };
  });

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-2xl font-semibold">Campanii</h1>
        <p className="text-sm text-mist-500 mt-1">
          Grupează mai multe postări sub un obiectiv comun și urmărește progresul agregat.
        </p>
      </header>

      <CampaignsList workspaceId={workspace.id} campaigns={withStats} />
    </div>
  );
}
