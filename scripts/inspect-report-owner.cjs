const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');

const url = process.env.DATABASE_URL_DIRECT || process.env.DATABASE_URL;
if (!url) throw new Error('Missing database URL');

const prisma = new PrismaClient({ adapter: new PrismaPg(url) });

(async () => {
  const report = await prisma.report.findUnique({
    where: { id: 1 },
    select: {
      id: true,
      name: true,
      version: true,
      user: { select: { id: true, name: true, email: true, role: { select: { name: true } } } },
    },
  });
  console.log(JSON.stringify(report, null, 2));
})()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
