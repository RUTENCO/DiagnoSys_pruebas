const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');

const url = process.env.DATABASE_URL_DIRECT || process.env.DATABASE_URL;
if (!url) {
  throw new Error('Missing database URL');
}

const prisma = new PrismaClient({ adapter: new PrismaPg(url) });

(async () => {
  const role = await prisma.role.findUnique({ where: { name: 'organization' } });
  if (!role) {
    console.log('[]');
    return;
  }

  const users = await prisma.user.findMany({
    where: { roleId: role.id },
    select: { id: true, name: true, email: true },
    orderBy: { id: 'asc' },
  });

  console.log(JSON.stringify(users, null, 2));
})()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
