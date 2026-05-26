import { PrismaClient, UserRole, CampaignStatus, EvaluationStatus, ObjectiveStatus } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting seed...");

  // ─── Organisation ───────────────────────────────────────────────────────────
  const org = await prisma.organization.upsert({
    where: { slug: "acme-corp" },
    update: {},
    create: { name: "Acme Corporation", slug: "acme-corp", domain: "acme.com" },
  });
  console.log("✅ Organization:", org.name);

  // ─── Departments ────────────────────────────────────────────────────────────
  const deptData = [
    { name: "Technologie", code: "TECH" },
    { name: "Ressources Humaines", code: "RH" },
    { name: "Commercial", code: "SALES" },
    { name: "Finance", code: "FIN" },
    { name: "Marketing", code: "MKT" },
  ];

  const departments = await Promise.all(
    deptData.map((d) =>
      prisma.department.upsert({
        where: { organizationId_code: { organizationId: org.id, code: d.code } },
        update: {},
        create: { ...d, organizationId: org.id },
      })
    )
  );
  console.log("✅ Departments:", departments.length);

  // ─── Users & Employees ──────────────────────────────────────────────────────
  const password = await bcrypt.hash("Demo1234!", 12);

  const usersData = [
    { email: "admin@demo.com",        firstName: "Alice",   lastName: "Dupont",   role: UserRole.ADMIN,         dept: "RH",    title: "DRH" },
    { email: "rh@demo.com",           firstName: "Marie",   lastName: "Martin",   role: UserRole.RH,            dept: "RH",    title: "Chargée RH" },
    { email: "manager.tech@demo.com", firstName: "Thomas",  lastName: "Bernard",  role: UserRole.MANAGER,       dept: "TECH",  title: "Tech Lead" },
    { email: "manager.sales@demo.com",firstName: "Sophie",  lastName: "Leclerc", role: UserRole.MANAGER,       dept: "SALES", title: "Responsable Commercial" },
    { email: "manager.fin@demo.com",  firstName: "Pierre",  lastName: "Moreau",   role: UserRole.MANAGER,       dept: "FIN",   title: "DAF" },
    { email: "dev1@demo.com",         firstName: "Lucas",   lastName: "Simon",    role: UserRole.COLLABORATEUR, dept: "TECH",  title: "Développeur Senior" },
    { email: "dev2@demo.com",         firstName: "Emma",    lastName: "Petit",    role: UserRole.COLLABORATEUR, dept: "TECH",  title: "Développeur Full-stack" },
    { email: "sales1@demo.com",       firstName: "Hugo",    lastName: "Durand",   role: UserRole.COLLABORATEUR, dept: "SALES", title: "Commercial Senior" },
    { email: "sales2@demo.com",       firstName: "Camille", lastName: "Rousseau", role: UserRole.COLLABORATEUR, dept: "SALES", title: "Account Manager" },
    { email: "fin1@demo.com",         firstName: "Julie",   lastName: "Blanc",    role: UserRole.COLLABORATEUR, dept: "FIN",   title: "Contrôleur de Gestion" },
  ];

  for (const u of usersData) {
    const dept = departments.find((d) => d.code === u.dept)!;
    const existing = await prisma.user.findUnique({ where: { email: u.email } });
    if (!existing) {
      await prisma.user.create({
        data: {
          email: u.email, firstName: u.firstName, lastName: u.lastName,
          role: u.role, password, organizationId: org.id, isActive: true,
          employee: { create: { departmentId: dept.id, jobTitle: u.title, hireDate: new Date("2020-01-15") } },
        },
      });
    }
  }
  console.log("✅ Users created");

  // ─── Manager relationships ───────────────────────────────────────────────────
  const managerTech  = await prisma.user.findUnique({ where: { email: "manager.tech@demo.com" }, include: { employee: true } });
  const managerSales = await prisma.user.findUnique({ where: { email: "manager.sales@demo.com" }, include: { employee: true } });
  const managerFin   = await prisma.user.findUnique({ where: { email: "manager.fin@demo.com" }, include: { employee: true } });
  const dev1  = await prisma.user.findUnique({ where: { email: "dev1@demo.com" }, include: { employee: true } });
  const dev2  = await prisma.user.findUnique({ where: { email: "dev2@demo.com" }, include: { employee: true } });
  const sales1 = await prisma.user.findUnique({ where: { email: "sales1@demo.com" }, include: { employee: true } });
  const sales2 = await prisma.user.findUnique({ where: { email: "sales2@demo.com" }, include: { employee: true } });
  const fin1  = await prisma.user.findUnique({ where: { email: "fin1@demo.com" }, include: { employee: true } });

  const managerLinks = [
    [dev1, managerTech], [dev2, managerTech],
    [sales1, managerSales], [sales2, managerSales],
    [fin1, managerFin],
  ] as const;

  for (const [sub, mgr] of managerLinks) {
    if (sub?.employee && mgr?.employee) {
      await prisma.employee.update({ where: { id: sub.employee.id }, data: { managerId: mgr.employee.id } });
    }
  }

  // ─── Competencies ───────────────────────────────────────────────────────────
  const competenciesData = [
    { name: "Communication",      description: "Capacité à transmettre des idées clairement", category: "Soft Skills",  weight: 20 },
    { name: "Leadership",         description: "Capacité à motiver et guider une équipe",      category: "Management",   weight: 20 },
    { name: "Travail en équipe",  description: "Collaboration efficace avec les collègues",    category: "Soft Skills",  weight: 20 },
    { name: "Orienté résultats",  description: "Focus sur l'atteinte des objectifs",           category: "Performance",  weight: 20 },
    { name: "Innovation",         description: "Proposer des solutions créatives",             category: "Soft Skills",  weight: 10 },
    { name: "Gestion du temps",   description: "Priorisation et organisation",                category: "Organisation", weight: 10 },
    { name: "Expertise technique",description: "Maîtrise des outils et technologies",         category: "Technique",    weight: 10 },
    { name: "Adaptabilité",       description: "S'adapter aux changements",                   category: "Soft Skills",  weight: 10 },
  ];

  const competencies = [];
  for (const c of competenciesData) {
    const existing = await prisma.competency.findFirst({ where: { organizationId: org.id, name: c.name } });
    if (existing) {
      competencies.push(existing);
    } else {
      competencies.push(await prisma.competency.create({ data: { ...c, organizationId: org.id } }));
    }
  }
  console.log("✅ Competencies:", competencies.length);

  // ─── Campaign ───────────────────────────────────────────────────────────────
  const rhUser = await prisma.user.findUnique({ where: { email: "rh@demo.com" } });
  let campaign = await prisma.campaign.findFirst({ where: { organizationId: org.id, name: "Entretiens Annuels 2025" } });
  if (!campaign) {
    campaign = await prisma.campaign.create({
      data: {
        name: "Entretiens Annuels 2025",
        description: "Campagne d'évaluation annuelle pour l'ensemble des collaborateurs",
        organizationId: org.id,
        year: 2025,
        status: CampaignStatus.ACTIVE,
        startDate: new Date("2025-01-06"),
        endDate: new Date("2025-03-31"),
        selfEvalDeadline: new Date("2025-02-14"),
        managerEvalDeadline: new Date("2025-03-14"),
        createdById: rhUser!.id,
        campaignCompetencies: {
          create: competencies.slice(0, 6).map((c, i) => ({
            competencyId: c.id,
            weight: i < 3 ? 20 : 15,
          })),
        },
      },
    });
  }
  console.log("✅ Campaign:", campaign.name);

  // ─── Evaluations ─────────────────────────────────────────────────────────────
  const collaborateurs = await prisma.employee.findMany({
    where: { user: { organizationId: org.id, role: UserRole.COLLABORATEUR } },
    include: { user: true },
  });

  const evalStatuses = [
    EvaluationStatus.SELF_SUBMITTED,
    EvaluationStatus.MANAGER_IN_PROGRESS,
    EvaluationStatus.VALIDATED,
    EvaluationStatus.SELF_IN_PROGRESS,
    EvaluationStatus.MANAGER_SUBMITTED,
  ];

  for (let i = 0; i < collaborateurs.length; i++) {
    const emp = collaborateurs[i];
    const status = evalStatuses[i % evalStatuses.length];
    const existing = await prisma.evaluation.findUnique({
      where: { campaignId_evaluateeId: { campaignId: campaign.id, evaluateeId: emp.id } },
    });
    if (!existing) {
      await prisma.evaluation.create({
        data: {
          campaignId: campaign.id,
          evaluateeId: emp.id,
          evaluatorId: emp.managerId ?? undefined,
          status,
          selfScore: status !== EvaluationStatus.SELF_IN_PROGRESS ? 3.5 + (i % 3) * 0.5 : null,
          managerScore: [EvaluationStatus.MANAGER_SUBMITTED, EvaluationStatus.VALIDATED].includes(status) ? 3.8 + (i % 2) * 0.4 : null,
          selfComments: status !== EvaluationStatus.SELF_IN_PROGRESS ? "Cette année j'ai contribué significativement aux projets de l'équipe." : null,
          managerComments: [EvaluationStatus.MANAGER_SUBMITTED, EvaluationStatus.VALIDATED].includes(status) ? "Collaborateur sérieux et impliqué." : null,
        },
      });
    }
  }
  console.log("✅ Evaluations:", collaborateurs.length);

  // ─── Objectives ──────────────────────────────────────────────────────────────
  if (dev1?.employee) {
    const objData = [
      { title: "Migrer l'API vers GraphQL", description: "Refactoriser les endpoints REST critiques", weight: 30, kpi: "100% migrés", status: ObjectiveStatus.ACTIVE,     progress: 65 },
      { title: "Certifications Cloud AWS",  description: "Obtenir la certification AWS SAA",          weight: 20, kpi: "Cert avant Q3",status: ObjectiveStatus.DRAFT,      progress: 0 },
      { title: "Mentorat juniors",          description: "Accompagner 2 développeurs juniors",        weight: 20, kpi: "Sessions hebdo", status: ObjectiveStatus.COMPLETED, progress: 100 },
    ];
    for (const obj of objData) {
      await prisma.objective.create({
        data: { ...obj, employeeId: dev1.employee.id, campaignId: campaign.id, year: 2025, dueDate: new Date("2025-12-31") },
      }).catch(() => {});
    }
  }
  console.log("✅ Objectives created");

  // ─── Notifications ────────────────────────────────────────────────────────────
  if (dev1) {
    await prisma.notification.createMany({
      data: [
        { userId: dev1.id, type: "CAMPAIGN_STARTED",      title: "Campagne lancée",          body: "Entretiens Annuels 2025 est active. Autoévaluation due le 14 février.", isRead: false },
        { userId: dev1.id, type: "EVALUATION_VALIDATED",  title: "Évaluation validée",       body: "Votre évaluation a été validée par les RH.", isRead: true },
      ],
      skipDuplicates: true,
    });
  }
  console.log("✅ Notifications created");

  console.log("\n🎉 Seed completed!");
  console.log("\n📋 Demo accounts (password: Demo1234!):");
  console.log("  Admin   → admin@demo.com");
  console.log("  RH      → rh@demo.com");
  console.log("  Manager → manager.tech@demo.com");
  console.log("  Collab  → dev1@demo.com");
}

main()
  .catch((e) => { console.error("❌ Seed failed:", e); process.exit(1); })
  .finally(() => prisma.$disconnect());
