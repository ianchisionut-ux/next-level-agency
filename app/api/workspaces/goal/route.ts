import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Neautentificat" }, { status: 401 });

    const { workspaceId, goal } = await req.json();
    if (!workspaceId) return NextResponse.json({ error: "workspaceId lipsește" }, { status: 400 });

    const member = await prisma.workspaceMember.findUnique({
      where: { userId_workspaceId: { userId: user.userId, workspaceId } },
    });
    if (!member) return NextResponse.json({ error: "Nu ai acces la acest workspace" }, { status: 403 });

    const parsedGoal = goal === null || goal === "" ? null : parseInt(goal, 10);
    if (parsedGoal !== null && (isNaN(parsedGoal) || parsedGoal < 0)) {
      return NextResponse.json({ error: "Obiectivul trebuie să fie un număr pozitiv" }, { status: 400 });
    }

    await prisma.workspace.update({
      where: { id: workspaceId },
      data: { monthlyEngagementGoal: parsedGoal },
    });

    return NextResponse.json({ success: true, goal: parsedGoal });
  } catch (err) {
    console.error("Eroare la setarea obiectivului:", err);
    return NextResponse.json({ error: "Nu am putut salva obiectivul" }, { status: 500 });
  }
}
