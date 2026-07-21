---
Task ID: 5
Agent: Main Agent
Task: Major UI/UX improvements across all SiPUPUK views

Work Log:
- Created ThemeToggle component using next-themes with useSyncExternalStore (avoids setState-in-effect lint error)
- Wrapped app in ThemeProvider in layout.tsx (attribute="class", defaultTheme="light")
- Created NotificationBell component that queries /api/dashboard for stock alert count
- Integrated NotificationBell and ThemeToggle into page.tsx header

## Farmers View Enhancement
- Added summary cards at top: Total Petani Aktif + Rata-rata Luas Lahan with icons (UserCheck, Wheat)
- Expanded table columns: NIK, Nama, Telepon (hidden md), Kelompok Tani (hidden lg), Kabupaten (hidden xl), Luas Lahan (hidden sm), Pesanan, Aksi
- Improved empty state with Users icon and contextual message
- Reorganized edit dialog into 2-column grid with Alamat spanning full width below
- Added left border accent (emerald-500) to card
- Added pagination (10 per page) with "Menampilkan X-Y dari Z data" text

## Stock View - Visual Stock Cards
- Replaced plain table with visual card grid (3 columns on lg)
- Each card shows: product name, warehouse name, product type badge
- Large prominent stock quantity number with color coding
- Colored stock level indicator bar (green >150%, yellow 100-150%, red <100% of minStock)
- Status-colored card borders matching stock level
- Search input added alongside warehouse filter
- Better empty state with Boxes icon
- Added pagination

## Orders View - Order Detail Timeline
- Added OrderStatusTimeline component with 3-step stepper: Menunggu → Dikonfirmasi → Diambil
- Each step has circle icon (Clock, Check, PackageCheck) connected by lines
- Current status: green border + glow shadow, Completed: solid green fill, Future: gray
- Cancelled orders show a centered red badge instead
- Improved items table in detail dialog with better spacing and product type badges
- Added pagination and left border accent (green-500)

## Distributions View - Status Improvements
- Added icons to status tabs: FileText (Draft), Truck (Dikirim), CheckCircle (Diterima), XCircle (Dibatalkan)
- Added progress bar under each distribution status badge
- Distinct status badge colors: DRAFT=gray, IN_TRANSIT=blue, DELIVERED=green, CANCELLED=red (with dark mode variants)
- Progress bar widths: DRAFT=25%, IN_TRANSIT=60%, DELIVERED=100%, CANCELLED=0%
- Added pagination and left border accent (blue-500)

## All Views - Consistent Card Headers
- Each view's main Card has a subtle 2px left colored border accent matching module theme
- Colors: Products=primary, Farmers=emerald-500, Warehouses=amber-500, Stock=teal-500, Orders=green-500, Distributions=blue-500
- Consistent header layout: icon + title left, search + actions right

## Sidebar - Active State Indicator
- Added green dot (2px circle) before the icon on active menu items
- Green dot has a subtle glow shadow (shadow-[0_0_6px_rgba(52,211,153,0.6)])
- Retained existing border-l-emerald-400 + bg-sidebar-accent/80 active styling

## Pagination (All Views)
- Client-side pagination added to Farmers, Warehouses, Stock, Distributions, Orders
- 10 items per page with shadcn/ui Pagination component
- Shows "Menampilkan X-Y dari Z data" text
- Smart page number display with ellipsis for large page counts
- Previous/Next disabled at boundaries

Stage Summary:
- All 9 mandatory changes completed
- ESLint passes with zero errors
- Dev server compiles successfully
- Page renders correctly (200 status)
- All API endpoints return correct data
- New files created: theme-toggle.tsx, notification-bell.tsx
- Modified files: layout.tsx, page.tsx, products-view.tsx, farmers-view.tsx, warehouses-view.tsx, stock-view.tsx, distributions-view.tsx, orders-view.tsx, app-sidebar.tsx