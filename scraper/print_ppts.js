const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();

async function main() {
  const pptsList = await db.pPTS.findMany();
  console.log(`=== RINCIAN 18 KIOS PPTS (TOTAL: ${pptsList.length} KIOS) ===\n`);

  for (const p of pptsList) {
    console.log(`🏪 Kios: ${p.name.padEnd(20)} | SPJB: ${p.spjbNumber} | Status: ${p.status}`);
    console.log(`   🌾 UREA : Alokasi ${p.quotaUreaTon} Ton | Realisasi ${p.usedUreaTon} Ton | Sisa ${p.remainingUreaTon} Ton`);
    console.log(`   🌱 NPK  : Alokasi ${p.quotaNpkTon} Ton | Realisasi ${p.usedNpkTon} Ton | Sisa ${p.remainingNpkTon} Ton`);
    console.log('');
  }

  await db.$disconnect();
}
main().catch(console.error);
