# Worklog - Task 2: Backend API Routes

## Created Files

All 14 API route files were created for the Indonesian subsidized fertilizer sales application:

### 1. Dashboard (`/src/app/api/dashboard/route.ts`)
- **GET**: Returns comprehensive dashboard statistics including:
  - Counts: totalFarmers, totalProducts, totalWarehouses, totalOrders
  - Financials: totalSalesAmount, totalSubsidyAmount
  - recentOrders (last 10 with farmer/warehouse names)
  - stockAlerts (stocks where quantity ≤ minStock)
  - salesByMonth (last 6 months with month labels in Indonesian)
  - salesByProductType (grouped by fertilizer type)
  - topFarmers (top 5 by total purchase amount, excludes cancelled)

### 2. Products (`/src/app/api/products/route.ts`, `/src/app/api/products/[id]/route.ts`)
- **GET** (list): All active products with stock summary, supports `?search=` filtering by name/type
- **POST**: Create product with validation (name, type, pricePerKg, subsidyPrice required)
- **GET** (single): Product with stock details and order item count
- **PUT**: Update product fields with price validation
- **DELETE**: Soft delete (sets isActive=false)

### 3. Farmers (`/src/app/api/farmers/route.ts`, `/src/app/api/farmers/[id]/route.ts`)
- **GET** (list): Paginated list with `?page=`, `?limit=`, `?search=` (searches name, NIK, village, district)
- **POST**: Create farmer with NIK validation (exactly 16 digits) and uniqueness check
- **GET** (single): Farmer with full order history including items
- **PUT**: Update farmer with NIK uniqueness validation on change
- **DELETE**: Soft delete

### 4. Warehouses (`/src/app/api/warehouses/route.ts`, `/src/app/api/warehouses/[id]/route.ts`)
- **GET** (list): All active warehouses with total stock, stock entry count, order/distribution counts
- **POST**: Create warehouse with code uniqueness validation (code, name, address, province required)
- **GET** (single): Warehouse with all stock details including product info
- **PUT**: Update warehouse with code uniqueness check
- **DELETE**: Soft delete

### 5. Stock (`/src/app/api/stock/route.ts`, `/src/app/api/stock/[id]/route.ts`)
- **GET**: All stock entries with product and warehouse info, supports `?warehouseId=` filter
- **POST**: Add/restock stock - if stock exists for warehouse+product, increments; if `isRestock=true`, sets lastRestocked=now()
- **PUT**: Update stock quantity or minStock
- **DELETE**: Remove stock entry

### 6. Distributions (`/src/app/api/distributions/route.ts`, `/src/app/api/distributions/[id]/route.ts`)
- **GET** (list): All distributions with warehouse info, supports `?status=` filter
- **POST**: Create distribution with auto-generated number (DIST-YYYYMMDD-XXXX), deducts stock, sets DRAFT status
- **GET** (single): Distribution with warehouse details
- **PUT**: Update distribution status (DRAFT/IN_TRANSIT/DELIVERED/CANCELLED). CANCELLED restores stock. DELIVERED sets distributedAt.
- **DELETE**: Delete distribution and restore stock if not DELIVERED

### 7. Orders (`/src/app/api/orders/route.ts`, `/src/app/api/orders/[id]/route.ts`)
- **GET** (list): Paginated orders with farmer/warehouse/items info, supports `?status=`, `?search=`, `?page=`, `?limit=`
- **POST**: Create order with items in a transaction:
  - Validates farmer/warehouse existence
  - Checks stock availability for each item
  - Calculates pricePerKg, subtotal from product data
  - Calculates totalAmount and totalSubsidy (savings from subsidized prices)
  - Deducts stock atomically
  - Auto-generates orderNumber (SO-YYYYMMDD-XXXX)
- **GET** (single): Full order with all details
- **PUT**: Update order status. CANCELLED restores all stock via transaction.

### 8. Seed (`/src/app/api/seed/route.ts`)
- **POST**: Seeds database with realistic Indonesian data:
  - 5 fertilizer products (Urea, NPK Phonska, SP-36, ZA, Pupuk Organik) with subsidized prices
  - 3 warehouses in Kudus, Demak, Jepara (Jawa Tengah)
  - 15 stock entries with varied quantities (including one below minStock for alert testing)
  - 15 farmers with realistic Indonesian names, 16-digit NIKs, Central Java addresses
  - 10 orders with mixed statuses (PENDING, CONFIRMED, PICKED_UP, CANCELLED) spread across dates
  - 5 distributions with mixed statuses
  - Idempotent: returns error if data exists, `?force=true` clears and re-seeds

## Design Decisions
- All error messages in Indonesian (Bahasa Indonesia)
- Proper HTTP status codes (200, 201, 400, 404, 500)
- Unique constraint violations (P2002) handled specifically
- Stock deduction/restoration done atomically with Prisma transactions
- Order number/distribution number uniqueness guaranteed with retry loop
- Soft delete pattern for products, farmers, warehouses
- Hard delete for stock and distributions (with stock restoration)