const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const dbPath = path.resolve(__dirname, '../db/custom.db');
const prisma = new PrismaClient({
  datasources: { db: { url: `file:${dbPath}` } },
});

async function populateDistribusiPo() {
  console.log('🚀 Memulai pengisian data ke tabel DistribusiPo di database SQLite...');

  let poFilePath = path.join(__dirname, 'penyaluran_pemenuhan_order_kios_full.json');
  if (!fs.existsSync(poFilePath)) {
    poFilePath = path.join('d:', 'testGet', 'penyaluran_pemenuhan_order_kios_full.json');
  }

  if (!fs.existsSync(poFilePath)) {
    console.error('❌ File penyaluran_pemenuhan_order_kios_full.json tidak ditemukan.');
    process.exit(1);
  }

  const raw = fs.readFileSync(poFilePath, 'utf-8');
  const dataList = JSON.parse(raw).data || [];

  console.log(`📦 Memproses ${dataList.length} record Pemenuhan Order Kios (Distribusi PO)...`);

  let count = 0;
  for (const item of dataList) {
    if (!item.noOrderPengecer) continue;

    const qtyTon = parseFloat(String(item.qtyTon || '0').replace(/\./g, '').replace(',', '.')) || 0;
    const qtyKg = qtyTon * 1000;

    try {
      await prisma.distribusiPo.upsert({
        where: { noOrderPengecer: item.noOrderPengecer },
        update: {
          noPkp: item.noPkp || null,
          kodePengecer: item.kodePengecer || null,
          namaPengecer: item.namaPengecer || null,
          provinsi: item.provinsi || null,
          kabupaten: item.kabupaten || null,
          kecamatan: item.kecamatan || null,
          kodeSo: item.kodeSo || null,
          status: item.status || null,
          tanggalPenyaluran: item.tanggalPenyaluran || null,
          productName: item.produk || 'UREA',
          quantityTon: qtyTon,
          quantityKg: qtyKg,
          rawJson: JSON.stringify(item),
          updatedAt: new Date(),
        },
        create: {
          noPkp: item.noPkp || null,
          noOrderPengecer: item.noOrderPengecer,
          kodePengecer: item.kodePengecer || null,
          namaPengecer: item.namaPengecer || null,
          provinsi: item.provinsi || null,
          kabupaten: item.kabupaten || null,
          kecamatan: item.kecamatan || null,
          kodeSo: item.kodeSo || null,
          status: item.status || null,
          tanggalPenyaluran: item.tanggalPenyaluran || null,
          productName: item.produk || 'UREA',
          quantityTon: qtyTon,
          quantityKg: qtyKg,
          rawJson: JSON.stringify(item),
        },
      });
      count++;
    } catch (err) {
      console.error(`❌ Gagal upsert ${item.noOrderPengecer}:`, err.message);
    }
  }

  console.log(`✅ SUKSES! Terisi ${count} record ke tabel DistribusiPo di database (${dbPath}).`);
  await prisma.$disconnect();
}

populateDistribusiPo().catch((err) => {
  console.error('❌ Error:', err);
  process.exit(1);
});
