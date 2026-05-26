import { PrismaClient, UserRole, CampaignStatus, EvaluationStatus, ObjectiveStatus } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting seed...");

  // ─── Organisation ───────────────────────────────────────────────────────────
  const org = await prisma.organization.upsert({
    where: { slug: "acme-corp" },
    update: {},
    create: {
      name: "Acme Corporation",
      slug: "acme-corp",
      domain: "acme.com",
      logoUrl: null,
    },
  });
  console.log("✅ Organization created:", org.name);

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
  console.log("✅ Departments created:", departments.length);

  // ─── Users & Employees ──────────────────────────────────────────────────────
  const password = await bcrypt.hash("Demo1234!", 12);

  const usersData = [
    // Admins
    {
      email: "admin@demo.com",
      firstName: "Alice",
      lastName: "Dupont",
      role: UserRole.ADMIN,
      dept: "RH",
      title: "DRH",
    },
    // RH
    {
      email: "rh@demo.com",
      firstName: "Marie",
      lastName: "Martin",
      role: UserRole.RH,
      dept: "RH",
      title: "Chargée RH",
    },
    // Managers
    {
      email: "manager.tech@demo.com",
      firstName: "Thomas",
      lastName: "Bernard",
      role: UserRole.MANAGER,
      dept: "TECH",
      title: "Tech Lead",
    },
    {
      email: "manager.sales@demo.com",
      firstName: "Sophie",
      lastName: "Leclerc",
      role: UserRole.MANAGER,
      dept: "SALES",
      title: "Responsable Commercial",
    },
    {
      email: "manager.fin@demo.com",
      firstName: "Pierre",
      lastName: "Moreau",
      role: UserRole.MANAGER,
      dept: "FIN",
      title: "DAF",
    },
    // Collaborateurs
    {
      email: "dev1@demo.com",
      firstName: "Lucas",
      lastName: "Simon",
      role: UserRole.COLLABORATEUR,
      dept: "TECH",
      title: "Développeur Senior",
    },
    {
      email: "dev2@demo.com",
      firstName: "Emma",
      lastName: "Petit",
      role: UserRole.COLLABORATEUR,
      dept: "TECH",
      title: "Développeur Full-stack",
    },
    {
      email: "sales1@demo.com",
      firstName: "Hugo",
      lastName: "Durand",
      role: UserRole.COLLABORATEUR,
      dept: "SALES",
      title: "Commercial Senior",
    },
    {
      email: "sales2@demo.com",
      firstName: "Camille",
      lastName: "Rousseau",
      role: UserRole.COLLABORATEUR,
      dept: "SALES",
      title: "Account Manager",
    },
    {
      email: "fin1@demo.com",
      firstName: "Julie",
      lastName: "Blanc",
      role: UserRole.COLLABORATEUR,
      dept: "FIN",
      title: "Contrôleur de Gestion",
    },
  ];

  const createdUsers: Record<string, { id: string; email: string }> = {};

  for (const u of usersData) {
    const dept = departments.find((d) => d.code === u.dept)!;
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: {
        email: u.email,
        firstName: u.firstName,
        lastName: u.lastName,
        role: u.role,
        password,
        organizationId: org.id,
        isActive: true,
        employee: {
          create: {
            departmentId: dept.id,
            jobTitle: u.title,
            hireDate: new Date("2020-01-15"),
          },
        },
      },
    });
    createdUsers[u.email] = { id: user.id, email: user.email };
  }
  console.log("✅ Users created:", Object.keys(createdUsers).length);

  // ─── Manager relationships ───────────────────────────────────────────────────
  const managerTech = await prisma.user.findUnique({ where: { email: "manager.tech@demo.com" }, include: { employee: true } });
  const dev1 = await prisma.user.findUnique({ where: { email: "dev1@demo.com" }, include: { employee: true } });
  const dev2 = await prisma.user.findUnique({ where: { email: "dev2@demo.com" }, include: { employee: true } });

  if (managerTech?.employee && dev1?.employee) {
    await prisma.employee.update({
      where: { id: dev1.employee.id },
      data: { managerId: managerTech.employee.id },
    });
  }
  if (managerTech?.employee && dev2?.employee) {
    await prisma.employee.update({
      where: { id: dev2.employee.id },
      data: { managerId: managerTech.employee.id },
    });
  }

  // ─── Competencies ───────────────────────────────────────────────────────────
  const competenciesData = [
    { name: "Communication", description: "Capacité à transmettre des idées clairement", category: "Soft Skills" },
    { name: "Leadership", description: "Capacité à motiver et guider une équipe", category: "Management" },
    { name: "Travail en équipe", description: "Collaboration efficace avec les collègues", category: "Soft Skills" },
    { name: "Orienté résultats", description: "Focus sur l'atteinte des objectifs", category: "Performance" },
    { name: "Innovation", description: "Proposer des solutions créatives", category: "Soft Skills" },
    { name: "Gestion du temps", description: "Priorisation et organisation", category: "Organisation" },
    { name: "Expertise technique", description: "Maîtrise des outils et technologies", category: "Technique" },
    { name: "Adaptabilité", description: "S'adapter aux changements", category: "Soft Skills" },
  ];

  const competencies = await Promise.all(
    competenciesData.map((c, i) =>
      prisma.competency.upsert({
        where: { organizationId_name: { organizationId: org.id, name: c.name } },
        update: {},
        create: {
          ...c,
          organizationId: org.id,
          weight: i < 4 ? 20 : 10,
          isActive: true,
        },
      })
    )
  );
  console.log("✅ Competencies created:", competencies.length);

  // ─── Campaign ───────────────────────────────────────────────────────────────
  const campaign = await prisma.campaign.upsert({
    where: { organizationId_name: { organizationId: org.id, name: "Entretiens Annuels 2025" } },
    update: {},
    create: {
      name: "Entretiens Annuels 2025",
      description: "Campagne d'évaluation annuelle pour l'ensemble des collaborateurs",
      organizationId: org.id,
      status: CampaignStatus.ACTIVE,
      startDate: new Date("2025-01-06"),
      endDate: new Date("2025-03-31"),
      selfEvalDeadline: new Date("2025-02-14"),
      managerEvalDeadline: new Date("2025-03-14"),
      createdById: (await prisma.user.findUnique({ where: { email: "rh@demo.com" } }))!.id,
      competencies: {
        create: competencies.slice(0, 6).map((c, i) => ({
          competencyId: c.id,
          weight: i < 3 ? 20 : 15,
        })),
      },
    },
  });
  console.log("✅ Campaign created:", campaign.name);

  // ─── Sample evaluations ─────────────────────────────────────────────────────
  const employees = await prisma.employee.findMany({
    where: { user: { organizationId: org.id, role: UserRole.COLLABORATEUR } },
    include: { user: true, manager: { include: { user: true } } },
  });

  const evalStatuses = [
    EvaluationStatus.SELF_SUBMITTED,
    EvaluationStatus.MANAGER_IN_PROGRESS,
    EvaluationStatus.VALIDATED,
    EvaluationStatus.SELF_IN_PROGRESS,
    EvaluationStatus.MANAGER_SUBMITTED,
  ];

  for (let i = 0; i < employees.length; i++) {
    const emp = employees[i];
    const status = evalStatuses[i % evalStatuses.length];

    await prisma.evaluation.upsert({
      where: {
        campaignId_employeeId: { campaignId: campaign.id, employeeId: emp.id },
      },
      update: {},
      create: {
        campaignId: campaign.id,
        employeeId: emp.id,
        managerId: emp.managerId ?? undefined,
        status,
        selfScore: status !== EvaluationStatus.SELF_IN_PROGRESS ? 3.5 + (i % 3) * 0.5 : null,
        managerScore: [EvaluationStatus.MANAGER_SUBMITTED, EvaluationStatus.VALIDATED].includes(status) ? 3.8 + (i % 2) * 0.4 : null,
        selfComment: status !== EvaluationStatus.SELF_IN_PROGRESS
          ? "Cette année j'ai contribué significativement aux projets de l'équipe, en développant mes compétences techniques et en améliorant ma communication inter-équipes."
          : null,
        managerComment: [EvaluationStatus.MANAGER_SUBMITTED, EvaluationStatus.VALIDATED].includes(status)
          ? "Collaborateur sérieux et impliqué. A fait preuve d'une grande autonomie sur les projets complexes. Des axes de progression identifiés sur le leadership."
          : null,
      },
    });
  }
  console.log("✅ Evaluations created:", employees.length);

  // ─── Sample objectives ───────────────────────────────────────────────────────
  const dev1User = await prisma.user.findUnique({ where: { email: "dev1@demo.com" }, include: { employee: true } });
  if (dev1User?.employee) {
    const objData = [
      {
        title: "Migrer l'API vers GraphQL",
        description: "Refactoriser les endpoints REST critiques vers GraphQL pour améliorer les performances",
        weight: 30,
        kpi: "100% des endpoints migrés, -40% de surcharge réseau",
        status: ObjectiveStatus.IN_PROGRESS,
        progress: 65,
      },
      {
        title: "Certifications Cloud AWS",
        description: "Obtenir la certification AWS Solutions Architect Associate",
        weight: 20,
        kpi: "Certification obtenue avant Q3 2025",
        status: ObjectiveStatus.NOT_STARTED,
        progress: 0,
      },
      {
        title: "Mentorat développeurs juniors",
        description: "Accompagner 2 développeurs juniors dans leur montée en compétences",
        weight: 20,
        kpi: "Sessions hebdomadaires, plan de progression défini",
        status: ObjectiveStatus.COMPLETED,
        progress: 100,
      },
    ];

    for (const obj of objData) {
      await prisma.objective.create({
        data: {
          ...obj,
          employeeId: dev1User.employee.id,
          campaignId: campaign.id,
          dueDate: new Date("2025-12-31"),
        },
      }).catch(() => {}); // Skip if already exists
    }
  }
  console.log("✅ Objectives created");

  // ─── Notifications ───────────────────────────────────────────────────────────
  const collab1 = await prisma.user.findUnique({ where: { email: "dev1@demo.com" } });
  if (collab1) {
    await prisma.notification.createMany({
      data: [
        {
          userId: collab1.id,
          type: "CAMPAIGN_STARTED",
          title: "Campagne d'évaluation lancée",
          message: "La campagne 'Entretiens Annuels 2025' vient d'être activée. Vous avez jusqu'au 14 février pour compléter votre autoévaluation.",
          isRead: false,
        },
        {
          userId: collab1.id,
          type: "EVALUATION_VALIDATED",
          title: "Votre évaluation a été validée",
          message: "Votre évaluation pour la campagne 'Entretiens Annuels 2025' a été validée par les RH.",
          isRead: true,
        },
      ],
      skipDuplicates: true,
    });
  }
  console.log("✅ Notifications created");

  console.log("\n🎉 Seed completed successfully!");
  console.log("\n📋 Demo accounts:");
  console.log("  Admin   → admin@demo.com / Demo1234!");
  console.log("  RH      → rh@demo.com / Demo1234!");
  console.log("  Manager → manager.tech@demo.com / Demo1234!");
  console.log("  Collab  → dev1@demo.com / Demo1234!");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
