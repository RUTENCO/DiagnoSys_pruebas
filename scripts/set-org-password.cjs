const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const bcrypt = require('bcryptjs');

const url = process.env.DATABASE_URL_DIRECT || process.env.DATABASE_URL;
if (!url) throw new Error('Missing database URL');

const prisma = new PrismaClient({ adapter: new PrismaPg(url) });

(async () => {
  const email = process.argv[2];
  const password = process.argv[3];
  if (!email || !password) {
    throw new Error('Usage: node scripts/set-org-password.cjs <email> <password>');
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    throw new Error(`User not found: ${email}`);
  }

  const hashed = await bcrypt.hash(password, 10);
  await prisma.user.update({
    where: { email },
    data: { password: hashed },
  });

  console.log(`Password updated for ${email}`);
})()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
