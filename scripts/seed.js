'use strict';

const { seedDemo } = require('../lib/seed');
const db = require('../lib/db');

(async () => {
  console.log(`Seeding demo data into ${db.mode}…`);
  const result = await seedDemo();
  console.log(`Done. site=${result.site.domain} events=${result.events} crawls=${result.crawls}`);
  console.log(`Open the dashboard and select "${result.site.name}".`);
  process.exit(0);
})().catch((err) => {
  console.error('Seed failed:', err.message);
  process.exit(1);
});
