const { PrismaClient } = require('../generated/prisma');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  await prisma.team.createMany({
    data: [
      { name: 'D Orange', abbreviation: 'DOR', color: '#f39c12', organization: 'Hornets Regio Moosseedorf Worblental' },
      { name: 'D Weiss',  abbreviation: 'DWE', color: '#ecf0f1', organization: 'Hornets Regio Moosseedorf Worblental' },
      { name: 'Junioren E', abbreviation: 'JUE', color: '#00b894', organization: 'Hornets Regio Moosseedorf Worblental' },
      { name: 'L-UPL', abbreviation: 'TIG', color: '#ebd61f', organization: 'Unihockey Tigers Langnau' },
      { name: 'L-UPL', abbreviation: 'FBK', color: '#eb1f1f', organization: 'Floorball Köniz' },
      { name: 'NLB', abbreviation: 'UHCG', color: '#1feb3e', organization: 'UHC Grünenmatt' }
    ],
    skipDuplicates: true,
  });
  console.log('Seed erfolgreich!');
}

main().catch(console.error).finally(() => prisma.$disconnect());