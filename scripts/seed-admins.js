// -----------------------------------------------------------------------------
// Creeaza (sau actualizeaza) cele doua conturi Signal, ambele pe login cu
// username (fara email):
//   1. username "admin"    -> SUPER ADMIN (vede si "Oferte Web")
//   2. username "cristina" -> admin normal (vede tot in afara de "Oferte Web")
//
// Daca ai deja un cont vechi creat cu email (nextlevel.zalau@gmail.com),
// scriptul il gaseste automat si il converteste la noile date de logare,
// in loc sa creeze un cont duplicat.
//
// Rulare (local, cu DATABASE_URL real in .env):
//   node scripts/seed-admins.js
// -----------------------------------------------------------------------------

const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

const CRISTINA_USERNAME = "cristina"; // <-- schimba daca vrei alt username
const ADMIN_USERNAME = "admin"; // <-- username-ul contului de super admin

const ACCOUNTS = [
  {
    email: null,
    username: ADMIN_USERNAME,
    legacyEmail: "nextlevel.zalau@gmail.com", // contul vechi, creat cu email - il gasim si il convertim
    name: "Admin",
    password: "@Newmindset1",
    isSuperAdmin: true,
    workspaceRole: "OWNER",
  },
  {
    email: null,
    username: CRISTINA_USERNAME,
    legacyEmail: null,
    name: "Cristina",
    password: "@Abovenextlevel",
    isSuperAdmin: false,
    workspaceRole: "EDITOR",
  },
];

async function upsertUser({ email, username, legacyEmail, name, password, isSuperAdmin }) {
  const passwordHash = await bcrypt.hash(password, 10);
  const label = email || `@${username}`;

  // Cauta contul existent dupa noul username, apoi dupa email nou, apoi dupa
  // un email vechi (cazul in care contul a fost creat inainte cu alt login).
  const existing = await prisma.user.findFirst({
    where: {
      OR: [
        username ? { username } : undefined,
        email ? { email } : undefined,
        legacyEmail ? { email: legacyEmail } : undefined,
      ].filter(Boolean),
    },
  });

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
  console.log(`  - Admin (super):  login cu username "${ADMIN_USERNAME}"`);
  console.log(`  - Cristina:       login cu username "${CRISTINA_USERNAME}"\n`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
