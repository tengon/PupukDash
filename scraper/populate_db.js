const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const dbPath = path.resolve(__dirname, '../db/custom.db');
const prisma = new PrismaClient({
  datasources: { db: { url: `file:${dbPath}` } },
});

async function populateOrderGow() {
  console.log('🚀 Memulai pengisian data ke tabel OrderGow di database SQLite...');

  let orderFilePath = path.join(__dirname, 'order_full.json');
  if (!fs.existsSync(orderFilePath)) {
    orderFilePath = path.join('d:', 'testGet', 'order_full.json');
  }

  if (!fs.existsSync(orderFilePath)) {
    console.error('❌ File order_full.json tidak ditemukan.');
    process.exit(1);
  }

  const raw = fs.readFileSync(orderFilePath, 'utf-8');
  const dataList = JSON.parse(raw).data || [];

  console.log(`📦 Memproses ${dataList.length} data order...`);

  let count = 0;
  for (const ord of dataList) {
    if (!ord.noPenebusan) continue;

    const qtyKgStr = ord.qtyKg || '0';
    const qtyKg = parseFloat(String(qtyKgStr).replace(/\./g, '').replace(',', '.')) || 0;
    const qtyTon = qtyKg > 0 ? qtyKg / 1000 : 0;

    try {
      await prisma.orderGow.upsert({
        where: { noPenebusan: ord.noPenebusan },
        update: {
          kodeReferensi: ord.kodeReferensi || null,
          distributorName: ord.namaDistributor || null,
          producerName: ord.namaProdusen || null,
          kodeBooking: ord.kodeBooking || null,
          batasAkhir: ord.batasAkhir || null,
          tglPengambilan: ord.tglPengambilan || null,
          tglRencana: ord.tglRencana || null,
          tglOrder: ord.tglOrder || null,
          status: ord.status || null,
          kodeSo: ord.kodeSo || null,
          nomorDo: ord.nomorDo || null,
          productName: ord.namaProduk || 'UREA',
          quantityKg: qtyKg,
          quantityTon: qtyTon,
          tglDo: ord.tglDo || null,
          rawJson: JSON.stringify(ord),
          updatedAt: new Date(),
        },
        create: {
          noPenebusan: ord.noPenebusan,
          kodeReferensi: ord.kodeReferensi || null,
          distributorName: ord.namaDistributor || null,
          producerName: ord.namaProdusen || null,
          kodeBooking: ord.kodeBooking || null,
          batasAkhir: ord.batasAkhir || null,
          tglPengambilan: ord.tglPengambilan || null,
          tglRencana: ord.tglRencana || null,
          tglOrder: ord.tglOrder || null,
          status: ord.status || null,
          kodeSo: ord.kodeSo || null,
          nomorDo: ord.nomorDo || null,
          productName: ord.namaProduk || 'UREA',
          quantityKg: qtyKg,
          quantityTon: qtyTon,
          tglDo: ord.tglDo || null,
          rawJson: JSON.stringify(ord),
        },
      });
      count++;
    } catch (err) {
      console.error(`❌ Gagal upsert ${ord.noPenebusan}:`, err.message);
    }
  }

  console.log(`✅ SUKSES! Terisi ${count} record ke tabel OrderGow di database (${dbPath}).`);
  await prisma.$disconnect();
}

populateOrderGow().catch((err) => {
  console.error('❌ Error:', err);
  process.exit(1);
});
