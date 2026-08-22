import { prisma } from "@/lib/prisma";
import { getActiveWorkspace } from "@/lib/session";
import { redirect } from "next/navigation";
import { PageHeader } from "@/app/components/ui/page-header";
import { CalendarView, CalendarViewMode } from "@/app/components/calendar/calendar-view";
import { PlatformKey } from "@/lib/platform-meta";

export const dynamic = "force-dynamic";

function parseDateParam(d?: string): Date {
  if (d) {
    const parsed = new Date(`${d}T00:00:00`);
    if (!isNaN(parsed.getTime())) return parsed;
  }
  return new Date();
}

// Luni = inceputul saptamanii, indiferent de setarile locale ale browserului.
function startOfWeek(d: Date): Date {
  const date = new Date(d);
  const day = (date.getDay() + 6) % 7; // 0 = Luni
  date.setDate(date.getDate() - day);
  date.setHours(0, 0, 0, 0);
  return date;
}

const VIEW_DESCRIPTIONS: Record<CalendarViewMode, string> = {
  month: "Vedere lunară a tuturor postărilor programate. Trage un post pe altă zi ca să-l reprogramezi.",
  week: "Vedere săptămânală, cu toate postările zilei vizibile dintr-o privire.",
  day: "Toate postările programate pentru ziua selectată, în ordine cronologică.",
};

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; date?: string; month?: string }>;
}) {
  const { view, date, month } = await searchParams;
  const workspace = await getActiveWorkspace();
  if (!workspace) redirect("/login");

  const viewMode: CalendarViewMode = view === "week" || view === "day" ? view : "month";

  // Compatibilitate cu link-uri vechi ("?month=YYYY-MM") - daca vine asa,
  // il folosim ca data ancora pentru prima zi a lunii respective.
  const anchor = date
    ? parseDateParam(date)
    : month
      ? new Date(`${month}-01T00:00:00`)
      : new Date();

  let rangeStart: Date;
  let rangeEnd: Date;

  if (viewMode === "day") {
    rangeStart = new Date(anchor);
    rangeStart.setHours(0, 0, 0, 0);
    rangeEnd = new Date(anchor);
    rangeEnd.setHours(23, 59, 59, 999);
  } else if (viewMode === "week") {
    rangeStart = startOfWeek(anchor);
    rangeEnd = new Date(rangeStart);
    rangeEnd.setDate(rangeEnd.getDate() + 6);
    rangeEnd.setHours(23, 59, 59, 999);
  } else {
    const year = anchor.getFullYear();
    const monthNum = anchor.getMonth() + 1;
    // Randam o grila completa de saptamani (poate include cateva zile din
    // luna anterioara/urmatoare) - de aceea luam un interval usor mai larg.
    rangeStart = new Date(year, monthNum - 1, 1);
    rangeStart.setDate(rangeStart.getDate() - 7);
    rangeEnd = new Date(year, monthNum, 0);
    rangeEnd.setDate(rangeEnd.getDate() + 7);
  }

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
      <PageHeader title="Calendar" description={VIEW_DESCRIPTIONS[viewMode]} />
      <CalendarView viewMode={viewMode} anchorDate={anchor.toISOString()} posts={calendarPosts} />
    </div>
  );
}
