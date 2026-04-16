import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.lead.upsert({
    where: { email: "lead-demo@maxrent.local" },
    create: {
      email: "lead-demo@maxrent.local",
      name: "Lead demo",
      source: "seed",
      status: "NEW",
    },
    update: {},
  });
}

main()
  .then(() => {
    console.log("Seed OK");
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
