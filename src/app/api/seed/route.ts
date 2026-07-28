import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { hashPassword } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const force = searchParams.get('force') === 'true'

    // Ensure default users always exist
    const existingUsers = await db.user.count()
    if (existingUsers === 0) {
      await db.user.create({
        data: {
          username: 'admin',
          password: await hashPassword('admin123'),
          name: 'Administrator PPST',
          role: 'ADMIN',
          ppstCode: 'PPST-KDS-001',
          ppstName: 'PD. Pupuk Subur Jaya',
        },
      })
      await db.user.create({
        data: {
          username: 'operator',
          password: await hashPassword('operator123'),
          name: 'Budi Santoso',
          role: 'OPERATOR',
          ppstCode: 'PPST-KDS-001',
          ppstName: 'PD. Pupuk Subur Jaya',
        },
      })
      await db.user.create({
        data: {
          username: 'pemantau',
          password: await hashPassword('pemantau123'),
          name: 'Dinas Pertanian',
          role: 'VIEWER',
          ppstCode: null,
          ppstName: null,
        },
      })
    }

    // Check if data already exists
    const existingProducts = await db.fertilizerProduct.count()

    if (existingProducts > 0 && !force) {
      return NextResponse.json(
        { error: 'Data sudah ada. Gunakan ?force=true untuk menghapus dan mengisi ulang.' },
        { status: 400 }
      )
    }

    if (force && existingProducts > 0) {
      await db.$transaction(async (tx) => {
        await tx.orderItem.deleteMany()
        await tx.order.deleteMany()
        await tx.distribution.deleteMany()
        await tx.stock.deleteMany()
        await tx.farmer.deleteMany()
        await tx.warehouse.deleteMany()
        await tx.fertilizerProduct.deleteMany()
        await tx.ppts.deleteMany()
      })
    }

    // Seed products
    const products = await Promise.all([
      db.fertilizerProduct.create({
        data: {
          name: 'Pupuk Urea',
          type: 'UREA',
          pricePerKg: 2500,
          subsidyPrice: 2250,
          description: 'Pupuk Urea bersubsidi untuk tanaman padi dan jagung',
          imageUrl: '/images/urea-sub-psp.png',
        },
      }),
      db.fertilizerProduct.create({
        data: {
          name: 'NPK Phonska',
          type: 'NPK',
          pricePerKg: 3600,
          subsidyPrice: 2300,
          description: 'Pupuk NPK Phonska bersubsidi untuk berbagai tanaman',
          imageUrl: '/images/npk-phonska-sub.png',
        },
      }),
      db.fertilizerProduct.create({
        data: {
          name: 'SP-36',
          type: 'SP-36',
          pricePerKg: 2800,
          subsidyPrice: 2000,
          description: 'Pupuk SP-36 bersubsidi sumber fosfor',
          imageUrl: '/images/sp36.png',
        },
      }),
      db.fertilizerProduct.create({
        data: {
          name: 'Pupuk ZA',
          type: 'ZA',
          pricePerKg: 2600,
          subsidyPrice: 1700,
          description: 'Pupuk ZA bersubsidi sumber nitrogen dan belerang',
          imageUrl: '/images/za.png',
        },
      }),
      db.fertilizerProduct.create({
        data: {
          name: 'Pupuk Organik',
          type: 'ORGANIK',
          pricePerKg: 1500,
          subsidyPrice: 1000,
          description: 'Pupuk organik bersubsidi untuk perbaikan tanah',
          imageUrl: '/images/organik.png',
        },
      }),
    ])

    // Seed warehouses
    const warehouses = await Promise.all([
      db.warehouse.create({
        data: {
          code: 'WH-KDS-01',
          name: 'Gudang Kudus Utara',
          address: 'Jl. Raya Kudus-Jepara KM 5',
          district: 'Kota',
          regency: 'Kudus',
          province: 'Jawa Tengah',
          managerName: 'Budi Santoso',
          managerPhone: '081234567890',
        },
      }),
      db.warehouse.create({
        data: {
          code: 'WH-DMK-01',
          name: 'Gudang Demak Pusat',
          address: 'Jl. Raya Demak-Semarang KM 8',
          district: 'Demak',
          regency: 'Demak',
          province: 'Jawa Tengah',
          managerName: 'Ahmad Fauzi',
          managerPhone: '081345678901',
        },
      }),
      db.warehouse.create({
        data: {
          code: 'WH-JPR-01',
          name: 'Gudang Jepara Selatan',
          address: 'Jl. Raya Jepara-Kudus KM 3',
          district: 'Jepara',
          regency: 'Jepara',
          province: 'Jawa Tengah',
          managerName: 'Siti Rahayu',
          managerPhone: '081456789012',
        },
      }),
    ])

    // Seed PPTS (Pos Penyalur Pupuk Terdaftar & Bersubsidi)
    await Promise.all([
      db.ppts.create({
        data: {
          code: 'PPTS-KDS-001',
          name: 'UD. Tani Subur Jaya',
          address: 'Jl. Raya Kudus-Pati KM 4',
          district: 'Kota Kudus',
          village: 'Demaan',
          regency: 'Kudus',
          ownerName: 'Sutrisno',
          phone: '081234567890',
        },
      }),
      db.ppts.create({
        data: {
          code: 'PPTS-KDS-002',
          name: 'Kios Pupuk Sumber Rejeki',
          address: 'Jl. Sunan Kudus No. 45',
          district: 'Jati',
          village: 'Getas Peftaten',
          regency: 'Kudus',
          ownerName: 'Budi Santoso',
          phone: '081398765432',
        },
      }),
      db.ppts.create({
        data: {
          code: 'PPTS-KDS-003',
          name: 'UD. Ferti Tani Mandiri',
          address: 'Jl. Raya Undaan Lor No. 12',
          district: 'Undaan',
          village: 'Undaan Lor',
          regency: 'Kudus',
          ownerName: 'H. Ahmad Fauzi',
          phone: '081567890123',
        },
      }),
      db.ppts.create({
        data: {
          code: 'PPTS-KDS-004',
          name: 'Kios Tani Berkah Sejahtera',
          address: 'Jl. Mejobo KM 2',
          district: 'Mejobo',
          village: 'Jokosari',
          regency: 'Kudus',
          ownerName: 'Sugeng Riyadi',
          phone: '081789012345',
        },
      }),
      db.ppts.create({
        data: {
          code: 'PPTS-KDS-005',
          name: 'UD. Agraria Makmur',
          address: 'Jl. Lingkar Utara Bae',
          district: 'Bae',
          village: 'Bae',
          regency: 'Kudus',
          ownerName: 'Drs. Mulyono',
          phone: '081901234567',
        },
      }),
    ])

    // Seed stocks (varied quantities per warehouse-product)
    const stockData = [
      // Warehouse Kudus
      { warehouseId: warehouses[0].id, productId: products[0].id, quantity: 5000, minStock: 1000 },
      { warehouseId: warehouses[0].id, productId: products[1].id, quantity: 3500, minStock: 800 },
      { warehouseId: warehouses[0].id, productId: products[2].id, quantity: 2000, minStock: 500 },
      { warehouseId: warehouses[0].id, productId: products[3].id, quantity: 1500, minStock: 500 },
      { warehouseId: warehouses[0].id, productId: products[4].id, quantity: 3000, minStock: 600 },
      // Warehouse Demak
      { warehouseId: warehouses[1].id, productId: products[0].id, quantity: 4000, minStock: 1000 },
      { warehouseId: warehouses[1].id, productId: products[1].id, quantity: 4200, minStock: 800 },
      { warehouseId: warehouses[1].id, productId: products[2].id, quantity: 2800, minStock: 500 },
      { warehouseId: warehouses[1].id, productId: products[3].id, quantity: 1800, minStock: 500 },
      { warehouseId: warehouses[1].id, productId: products[4].id, quantity: 2500, minStock: 600 },
      // Warehouse Jepara
      { warehouseId: warehouses[2].id, productId: products[0].id, quantity: 3000, minStock: 1000 },
      { warehouseId: warehouses[2].id, productId: products[1].id, quantity: 2800, minStock: 800 },
      { warehouseId: warehouses[2].id, productId: products[2].id, quantity: 400, minStock: 500 },
      { warehouseId: warehouses[2].id, productId: products[3].id, quantity: 3500, minStock: 500 },
      { warehouseId: warehouses[2].id, productId: products[4].id, quantity: 1200, minStock: 600 },
    ]

    await Promise.all(
      stockData.map((s) =>
        db.stock.create({
          data: {
            warehouseId: s.warehouseId,
            productId: s.productId,
            quantity: s.quantity,
            minStock: s.minStock,
            lastRestocked: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
          },
        })
      )
    )

    // Seed farmers
    const farmerData = [
      { nik: '3302010101800001', name: 'Sutrisno', phone: '085211223344', address: 'RT 03/RW 05 Desa Kaliwungu', village: 'Kaliwungu', district: 'Kaliwungu', regency: 'Kudus', province: 'Jawa Tengah', landAreaHa: 0.75, farmerGroup: 'Kelompok Tani Makmur Jaya' },
      { nik: '3302011502750002', name: 'Wartini', phone: '085322334455', address: 'RT 01/RW 02 Desa Jati Kulon', village: 'Jati Kulon', district: 'Jati', regency: 'Kudus', province: 'Jawa Tengah', landAreaHa: 1.2, farmerGroup: 'Kelompok Tani Sumber Makmur' },
      { nik: '3302012003700003', name: 'Suparno', phone: '085433445566', address: 'RT 05/RW 03 Desa Hadipolo', village: 'Hadipolo', district: 'Jekulo', regency: 'Kudus', province: 'Jawa Tengah', landAreaHa: 0.5, farmerGroup: 'Kelompok Tani Tani Makmur' },
      { nik: '3302130508850004', name: 'Siti Aminah', phone: '085544556677', address: 'RT 02/RW 04 Desa Betokan', village: 'Betokan', district: 'Demak', regency: 'Demak', province: 'Jawa Tengah', landAreaHa: 1.0, farmerGroup: 'Kelompok Tani Harapan Jaya' },
      { nik: '3302131003900005', name: 'Mukmin', phone: '085655667788', address: 'RT 04/RW 01 Desa Karangtengah', village: 'Karangtengah', district: 'Karangtengah', regency: 'Demak', province: 'Jawa Tengah', landAreaHa: 0.8, farmerGroup: 'Kelompok Tani Sekar Jagat' },
      { nik: '3302131804780006', name: 'Haryono', phone: '085766778899', address: 'RT 06/RW 02 Desa Wonosari', village: 'Wonosari', district: 'Wonosalam', regency: 'Demak', province: 'Jawa Tengah', landAreaHa: 2.0, farmerGroup: 'Kelompok Tani Mekar Sari' },
      { nik: '3302050105800007', name: 'Darmanto', phone: '085877889900', address: 'RT 01/RW 03 Desa Tahunan', village: 'Tahunan', district: 'Tahunan', regency: 'Jepara', province: 'Jawa Tengah', landAreaHa: 0.6, farmerGroup: 'Kelompok Tani Lestari' },
      { nik: '3302051204900008', name: 'Sugeng', phone: '085988990011', address: 'RT 03/RW 01 Desa Mayong', village: 'Mayong', district: 'Mayong', regency: 'Jepara', province: 'Jawa Tengah', landAreaHa: 1.5, farmerGroup: 'Kelompok Tani Bumi Sentosa' },
      { nik: '3302052008720009', name: 'Sunarti', phone: '086099001122', address: 'RT 02/RW 05 Desa Kedung', village: 'Kedung', district: 'Kedung', regency: 'Jepara', province: 'Jawa Tengah', landAreaHa: 0.9, farmerGroup: 'Kelompok Tani Subur Makmur' },
      { nik: '3302010605850010', name: 'Agus Riyanto', phone: '086100112233', address: 'RT 07/RW 02 Desa Gondangmanis', village: 'Gondangmanis', district: 'Bae', regency: 'Kudus', province: 'Jawa Tengah', landAreaHa: 1.1, farmerGroup: 'Kelompok Tani Tani Sejahtera' },
      { nik: '3302012508780011', name: 'Parmin', phone: '086211223344', address: 'RT 04/RW 03 Desa Megawon', village: 'Megawon', district: 'Kota', regency: 'Kudus', province: 'Jawa Tengah', landAreaHa: 0.4, farmerGroup: 'Kelompok Tani Makmur Jaya' },
      { nik: '3302132804700012', name: 'Jumadi', phone: '086322334455', address: 'RT 01/RW 01 Desa Sriwulan', village: 'Sriwulan', district: 'Sayung', regency: 'Demak', province: 'Jawa Tengah', landAreaHa: 1.8, farmerGroup: 'Kelompok Tani Pantai Harapan' },
      { nik: '3302050805820013', name: 'Suyatno', phone: '086433445566', address: 'RT 05/RW 04 Desa Kalinyamatan', village: 'Kalinyamatan', district: 'Kalinyamatan', regency: 'Jepara', province: 'Jawa Tengah', landAreaHa: 0.7, farmerGroup: 'Kelompok Tani Lestari' },
      { nik: '3302011509750014', name: 'Sukirman', phone: '086544556677', address: 'RT 02/RW 03 Desa Mejobo', village: 'Mejobo', district: 'Mejobo', regency: 'Kudus', province: 'Jawa Tengah', landAreaHa: 1.3, farmerGroup: 'Kelompok Tani Sumber Makmur' },
      { nik: '3302130305880015', name: 'Rohani', phone: '086655667788', address: 'RT 03/RW 02 Desa Mranggen', village: 'Mranggen', district: 'Mranggen', regency: 'Demak', province: 'Jawa Tengah', landAreaHa: 0.55, farmerGroup: 'Kelompok Tani Sekar Jagat' },
    ]

    const farmers = await Promise.all(
      farmerData.map((f) => db.farmer.create({ data: f }))
    )

    // Helper: create date in the past
    function daysAgo(days: number): Date {
      const d = new Date()
      d.setDate(d.getDate() - days)
      return d
    }

    // Seed orders with various statuses
    const orderData = [
      // Order 1: CONFIRMED, 30 days ago
      { farmerId: farmers[0].id, warehouseId: warehouses[0].id, status: 'CONFIRMED', createdAt: daysAgo(30), items: [{ productId: products[0].id, quantity: 100 }, { productId: products[1].id, quantity: 50 }] },
      // Order 2: PICKED_UP, 25 days ago
      { farmerId: farmers[1].id, warehouseId: warehouses[0].id, status: 'PICKED_UP', createdAt: daysAgo(25), items: [{ productId: products[0].id, quantity: 150 }, { productId: products[2].id, quantity: 75 }] },
      // Order 3: PENDING, 20 days ago
      { farmerId: farmers[2].id, warehouseId: warehouses[1].id, status: 'PENDING', createdAt: daysAgo(20), items: [{ productId: products[1].id, quantity: 200 }] },
      // Order 4: CONFIRMED, 15 days ago
      { farmerId: farmers[3].id, warehouseId: warehouses[1].id, status: 'CONFIRMED', createdAt: daysAgo(15), items: [{ productId: products[3].id, quantity: 120 }, { productId: products[4].id, quantity: 80 }] },
      // Order 5: PICKED_UP, 12 days ago
      { farmerId: farmers[4].id, warehouseId: warehouses[2].id, status: 'PICKED_UP', createdAt: daysAgo(12), items: [{ productId: products[0].id, quantity: 250 }, { productId: products[1].id, quantity: 100 }, { productId: products[3].id, quantity: 50 }] },
      // Order 6: CANCELLED, 10 days ago
      { farmerId: farmers[5].id, warehouseId: warehouses[0].id, status: 'CANCELLED', createdAt: daysAgo(10), items: [{ productId: products[2].id, quantity: 100 }] },
      // Order 7: PENDING, 7 days ago
      { farmerId: farmers[6].id, warehouseId: warehouses[2].id, status: 'PENDING', createdAt: daysAgo(7), items: [{ productId: products[4].id, quantity: 300 }, { productId: products[0].id, quantity: 100 }] },
      // Order 8: CONFIRMED, 5 days ago
      { farmerId: farmers[7].id, warehouseId: warehouses[1].id, status: 'CONFIRMED', createdAt: daysAgo(5), items: [{ productId: products[1].id, quantity: 180 }, { productId: products[2].id, quantity: 60 }] },
      // Order 9: PENDING, 3 days ago
      { farmerId: farmers[8].id, warehouseId: warehouses[0].id, status: 'PENDING', createdAt: daysAgo(3), items: [{ productId: products[0].id, quantity: 200 }, { productId: products[4].id, quantity: 150 }] },
      // Order 10: PICKED_UP, 1 day ago
      { farmerId: farmers[9].id, warehouseId: warehouses[2].id, status: 'PICKED_UP', createdAt: daysAgo(1), items: [{ productId: products[3].id, quantity: 100 }, { productId: products[1].id, quantity: 75 }] },
    ]

    // Create orders with items and deduct stock

    for (const orderDef of orderData) {
      const isCancelled = orderDef.status === 'CANCELLED'

      // Calculate totals
      let totalAmount = 0
      let totalSubsidy = 0

      for (const item of orderDef.items) {
        const product = products.find((p) => p.id === item.productId)!
        totalAmount += product.pricePerKg * item.quantity
        totalSubsidy += product.subsidyPrice * item.quantity
      }

      // Generate unique order number
      const dateStr =
        orderDef.createdAt.getFullYear().toString() +
        String(orderDef.createdAt.getMonth() + 1).padStart(2, '0') +
        String(orderDef.createdAt.getDate()).padStart(2, '0')
      const orderNumber = `SO-${dateStr}-${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`

      await db.$transaction(async (tx) => {
        // Deduct stock for non-cancelled orders
        if (!isCancelled) {
          for (const item of orderDef.items) {
            const stock = await tx.stock.findUnique({
              where: {
                warehouseId_productId: {
                  warehouseId: orderDef.warehouseId,
                  productId: item.productId,
                },
              },
            })
            if (stock) {
              await tx.stock.update({
                where: { id: stock.id },
                data: { quantity: stock.quantity - item.quantity },
              })
            }
          }
        }

        // Create order
        await tx.order.create({
          data: {
            orderNumber,
            farmerId: orderDef.farmerId,
            warehouseId: orderDef.warehouseId,
            status: orderDef.status,
            totalAmount,
            totalSubsidy,
            createdAt: orderDef.createdAt,
            notes: orderDef.status === 'CANCELLED' ? 'Dibatalkan oleh petani' : null,
            items: {
              create: orderDef.items.map((item: { productId: string; quantity: number }) => {
                const product = products.find((p) => p.id === item.productId)!
                return {
                  productId: item.productId,
                  productName: product.name,
                  quantity: item.quantity,
                  pricePerKg: product.pricePerKg,
                  subtotal: product.pricePerKg * item.quantity,
                }
              }),
            },
          },
        })
      })
    }

    // Seed distributions
    const distData = [
      { warehouseId: warehouses[0].id, productId: products[0].id, quantity: 500, status: 'DELIVERED', targetVillage: 'Kaliwungu', targetGroup: 'Kelompok Tani Makmur Jaya', daysAgo: 28 },
      { warehouseId: warehouses[1].id, productId: products[1].id, quantity: 300, status: 'IN_TRANSIT', targetVillage: 'Betokan', targetGroup: 'Kelompok Tani Harapan Jaya', daysAgo: 5 },
      { warehouseId: warehouses[2].id, productId: products[4].id, quantity: 200, status: 'DRAFT', targetVillage: 'Tahunan', targetGroup: 'Kelompok Tani Lestari', daysAgo: 2 },
      { warehouseId: warehouses[0].id, productId: products[1].id, quantity: 400, status: 'CANCELLED', targetVillage: 'Jati Kulon', targetGroup: null, daysAgo: 15 },
      { warehouseId: warehouses[1].id, productId: products[3].id, quantity: 250, status: 'IN_TRANSIT', targetVillage: 'Wonosari', targetGroup: 'Kelompok Tani Mekar Sari', daysAgo: 1 },
    ]

    for (const distDef of distData) {
      const product = products.find((p) => p.id === distDef.productId)!
      const warehouse = warehouses.find((w) => w.id === distDef.warehouseId)!

      const dateStr =
        daysAgo(distDef.daysAgo).getFullYear().toString() +
        String(daysAgo(distDef.daysAgo).getMonth() + 1).padStart(2, '0') +
        String(daysAgo(distDef.daysAgo).getDate()).padStart(2, '0')
      const distNo = `DIST-${dateStr}-${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`

      // Only deduct stock for non-cancelled distributions
      if (distDef.status !== 'CANCELLED') {
        const stock = await db.stock.findUnique({
          where: {
            warehouseId_productId: {
              warehouseId: distDef.warehouseId,
              productId: distDef.productId,
            },
          },
        })
        if (stock) {
          await db.stock.update({
            where: { id: stock.id },
            data: { quantity: stock.quantity - distDef.quantity },
          })
        }
      }

      await db.distribution.create({
        data: {
          distributionNo: distNo,
          warehouseId: distDef.warehouseId,
          productId: distDef.productId,
          productName: product.name,
          quantity: distDef.quantity,
          sourceRegency: warehouse.regency,
          targetVillage: distDef.targetVillage,
          targetGroup: distDef.targetGroup,
          status: distDef.status,
          distributedAt: distDef.status === 'DELIVERED' ? daysAgo(distDef.daysAgo + 1) : null,
          createdAt: daysAgo(distDef.daysAgo),
        },
      })
    }

    return NextResponse.json({
      success: true,
      message: 'Data berhasil disematkan',
    })
  } catch (error) {
    console.error('Seed error:', error)
    return NextResponse.json(
      { error: 'Gagal menyematkan data: ' + (error instanceof Error ? error.message : String(error)) },
      { status: 500 }
    )
  }
}

export async function DELETE() {
  try {
    await db.$transaction(async (tx) => {
      await tx.orderItem.deleteMany()
      await tx.order.deleteMany()
      await tx.distribution.deleteMany()
      await tx.stock.deleteMany()
      await tx.farmer.deleteMany()
      await tx.fertilizerProduct.deleteMany()
      await tx.warehouse.deleteMany()
      await tx.ppts.deleteMany()
      await tx.activityLog.deleteMany()
    })

    return NextResponse.json({
      success: true,
      message: 'Seluruh isi database berhasil dikosongkan.',
    })
  } catch (error) {
    console.error('Clear database error:', error)
    return NextResponse.json(
      { error: 'Gagal mengosongkan database: ' + (error instanceof Error ? error.message : String(error)) },
      { status: 500 }
    )
  }
}