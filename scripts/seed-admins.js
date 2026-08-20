// -----------------------------------------------------------------------------
// Creeaza (sau actualizeaza) cele doua conturi Signal:
//   1. nextlevel.zalau@gmail.com  -> SUPER ADMIN (vede si "Oferte Web"), login cu email
//   2. Cristina                    -> admin normal (vede tot in afara de "Oferte Web"),
//                                      login doar cu username, fara email
//
// Poti schimba username-ul Cristinei mai jos (CRISTINA_USERNAME) inainte de rulare.
//
// Rulare (local, cu DATABASE_URL real in .env):
//   node scripts/seed-admins.js
// -----------------------------------------------------------------------------

const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

const CRISTINA_USERNAME = "cristina"; // <-- schimba daca vrei alt username

const ACCOUNTS = [
  {
    email: "nextlevel.zalau@gmail.com",
    username: null,
    name: "Next Level",
    password: "@newmindset1",
    isSuperAdmin: true,
    workspaceRole: "OWNER",
  },
  {
    email: null,
    username: CRISTINA_USERNAME,
    name: "Cristina",
    password: "@Abovenextlevel",
    isSuperAdmin: false,
    workspaceRole: "EDITOR",
  },
];

async function upsertUser({ email, username, name, password, isSuperAdmin }) {
  const passwordHash = await bcrypt.hash(password, 10);
  const where = email ? { email } : { username };
  const existing = await prisma.user.findFirst({ where });
  const label = email || `@${username}`;

  if (existing) {
    const updated = await prisma.user.update({
      where: { id: existing.id },
      data: { passwordHash, name, isSuperAdmin, email, username },
    });
    console.log(`✓ Actualizat: ${label} (isSuperAdmin=${isSuperAdmin})`);
    return updated.id;
  }

  const created = await prisma.user.create({
    data: { email, username, passwordHash, name, isSuperAdmin },
  });
  console.log(`✓ Creat: ${label} (isSuperAdmin=${isSuperAdmin})`);
  return created.id;
}

async function ensureMembership(userId, workspaceId, role) {
  const existing = await prisma.workspaceMember.findUnique({
    where: { userId_workspaceId: { userId, workspaceId } },
  });

  if (existing) {
    if (existing.role !== role) {
      await prisma.workspaceMember.update({ where: { id: existing.id }, data: { role } });
      console.log(`  -> rol actualizat in workspace: ${role}`);
    }
    return;
  }

  await prisma.workspaceMember.create({ data: { userId, workspaceId, role } });
  console.log(`  -> adaugat in workspace ca ${role}`);
}

async function main() {
  // Foloseste primul workspace existent (cel creat deja pentru Next Level),
  // sau creeaza unul nou daca baza de date e complet goala.
  let workspace = await prisma.workspace.findFirst({ orderBy: { createdAt: "asc" } });
  if (!workspace) {
    workspace = await prisma.workspace.create({ data: { name: "Next Level Advertising Agency" } });
    console.log(`Workspace nou creat: "${workspace.name}"`);
  } else {
    console.log(`Folosesc workspace existent: "${workspace.name}"`);
  }

  for (const acc of ACCOUNTS) {
    const userId = await upsertUser(acc);
    await ensureMembership(userId, workspace.id, acc.workspaceRole);
  }

  console.log("\nGata.");
  console.log(`  - Super admin: login cu email "nextlevel.zalau@gmail.com"`);
  console.log(`  - Admin:       login cu username "${CRISTINA_USERNAME}" (fara email)\n`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
