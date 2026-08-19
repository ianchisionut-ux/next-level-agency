import { prisma } from "@/lib/prisma";
import { getActiveWorkspace } from "@/lib/session";
import { redirect } from "next/navigation";
import { PageHeader } from "@/app/components/ui/page-header";
import { CalendarView } from "@/app/components/calendar/calendar-view";
import { PlatformKey } from "@/lib/platform-meta";

export const dynamic = "force-dynamic";

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const { month } = await searchParams;
  const workspace = await getActiveWorkspace();
  if (!workspace) redirect("/login");

  // "month" vine ca "YYYY-MM" din URL (navigare inainte/inapoi) - implicit, luna curenta.
  const now = new Date();
  const [year, monthNum] = month
    ? month.split("-").map(Number)
    : [now.getFullYear(), now.getMonth() + 1];

  // Randam o grila completa de saptamani (poate include cateva zile din
  // luna anterioara/urmatoare, ca sa completam saptamana) - de aceea luam
  // un interval usor mai larg decat exact prima->ultima zi a lunii.
  const rangeStart = new Date(year, monthNum - 1, 1);
  rangeStart.setDate(rangeStart.getDate() - 7);
  const rangeEnd = new Date(year, monthNum, 0);
  rangeEnd.setDate(rangeEnd.getDate() + 7);

  const posts = await prisma.post.findMany({
    where: {
      workspaceId: workspace.id,
      scheduledAt: { gte: rangeStart, lte: rangeEnd },
    },
    include: { variants: true },
    orderBy: { scheduledAt: "asc" },
  });

  const calendarPosts = posts
    .filter((p) => p.scheduledAt)
    .map((p) => ({
      id: p.id,
      title: p.title || p.variants[0]?.content.slice(0, 40) || "(fără titlu)",
      status: p.status,
      scheduledAt: p.scheduledAt!.toISOString(),
      platforms: p.variants.map((v) => v.platform as PlatformKey),
    }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Calendar"
        description="Vedere lunară a tuturor postărilor programate. Trage un post pe altă zi ca să-l reprogramezi."
      />
      <CalendarView year={year} month={monthNum} posts={calendarPosts} />
    </div>
  );
}
