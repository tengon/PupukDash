const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();

async function main() {
  const rows = await db.alokasiTahunanKecamatan.findMany();
  console.log("=== PERHITUNGAN TOTAL ALOKASI UREA & NPK (SPJB OPERASIONAL 2026) ===\n");
  
  let ureaTotal = 0;
  let npkTotal = 0;
  let organikTotal = 0;
  let zaTotal = 0;

  const grouped = {};
  rows.forEach(r => {
    if (!grouped[r.spjbNumber]) grouped[r.spjbNumber] = [];
    grouped[r.spjbNumber].push(r);

    if (r.productName.toUpperCase().includes('UREA')) ureaTotal += r.totalAlokasi;
    if (r.productName.toUpperCase().includes('NPK')) npkTotal += r.totalAlokasi;
    if (r.productName.toUpperCase().includes('ORGANIK')) organikTotal += r.totalAlokasi;
    if (r.productName.toUpperCase().includes('ZA')) zaTotal += r.totalAlokasi;
  });

  Object.entries(grouped).forEach(([spjb, items]) => {
    console.log(`📄 DOKUMEN SPJB: ${spjb}`);
    items.forEach(i => {
      console.log(`   - Kecamatan: ${i.district.padEnd(15)} | Produk: ${i.productName.padEnd(8)} | Alokasi: ${i.totalAlokasi.toLocaleString('id-ID')} Ton | Realisasi: ${i.totalSoApprove.toLocaleString('id-ID')} Ton | Sisa: ${i.totalSisa.toLocaleString('id-ID')} Ton`);
    });
    console.log('');
  });

  console.log("============================================================");
  console.log(`🌾 TOTAL ALOKASI UREA    : ${ureaTotal.toLocaleString('id-ID')} Ton (${(ureaTotal * 1000).toLocaleString('id-ID')} Kg)`);
  console.log(`🌱 TOTAL ALOKASI NPK     : ${npkTotal.toLocaleString('id-ID')} Ton (${(npkTotal * 1000).toLocaleString('id-ID')} Kg)`);
  console.log(`📦 TOTAL ALOKASI ORGANIK : ${organikTotal.toLocaleString('id-ID')} Ton`);
  console.log(`📦 TOTAL ALOKASI ZA      : ${zaTotal.toLocaleString('id-ID')} Ton`);
  console.log("------------------------------------------------------------");
  console.log(`📊 GRAND TOTAL ALOKASI   : ${(ureaTotal + npkTotal + organikTotal + zaTotal).toLocaleString('id-ID')} Ton (${((ureaTotal + npkTotal + organikTotal + zaTotal) * 1000).toLocaleString('id-ID')} Kg)`);
  console.log("============================================================");

  await db.$disconnect();
}
main().catch(console.error);
