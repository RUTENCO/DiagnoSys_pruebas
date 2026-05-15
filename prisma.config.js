require('dotenv').config();
const { defineConfig } = require('prisma/config');

const databaseUrl = process.env.DATABASE_URL_DIRECT ?? process.env.DATABASE_URL;

module.exports = defineConfig({
  datasource: {
    url: databaseUrl,
  },
  migrations: {
    seed: 'tsx prisma/seed.ts',
  },
});
