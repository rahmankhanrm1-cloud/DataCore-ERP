# DataCore ERP Trial V1 — Business Modules and Database Blueprint

Status: implementation specification; NOT evidence that modules are implemented.
Scope: feature/trial-v1 only. Do not change main or deploy live rules until end-to-end tests pass.

## Core access
- Admin creates 72-hour trial account, chooses one immutable businessType: restaurant, laundry, grocery, workshop.
- After login read trialAccounts/{uid}; if inactive, missing or expired, block every business route.
- Render only the assigned business navigation and dashboard. Never trust hidden UI for authorization.
- Tenant data path: tenants/{uid}/{collection}/{document}; each customer UID has isolated data.
- The deployed Firestore security rules MUST check owner UID, active status, expiry, and business type on every request. Do not deploy permissive rules.
- Use named Firestore database consistently in web app and Firebase rules. Current APK build has not verified this.

## Restaurant
Screens: Dashboard, Menu & Categories, Tables, Dine-in Orders, Takeaway, Delivery, Kitchen Tickets (KOT), Kitchen Display, Recipe/BOM, Ingredient Stock, Purchases, Suppliers, Customers, Payments, Discounts/Tax, Expenses, Reports, Settings.
Collections: menuCategories, menuItems, tables, orders, orderItems, kitchenTickets, recipes, ingredients, stockMovements, purchases, suppliers, customers, payments, expenses, settings.
Order fields: tenantId, orderNo, channel, tableId?, items[], status, subtotal, discount, tax, total, paymentStatus, createdAt.
Menu item fields: name, categoryId, sku, price, cost, taxRate, active, modifiers[], recipeId?.

## Laundry
Screens: Dashboard, Services & Price List, Garment Types, Customer Intake, Orders, Tags/Tracking, Wash/Iron/Dry-Clean Workflow, Pickup/Delivery, Payments, Expenses, Reports, Settings.
Collections: serviceCategories, services, garmentTypes, laundryOrders, laundryOrderItems, garmentTags, workflowEvents, pickups, deliveries, customers, payments, expenses, settings.
Order fields: tenantId, orderNo, customerId, garments[], promisedAt, status, subtotal, discount, tax, total, paymentStatus, createdAt.
Garment fields: typeId, serviceId, quantity, unitPrice, tagCode, notes, currentStage.

## Grocery
Screens: Dashboard, Products/Categories, Barcode POS, Inventory, Purchases, Suppliers, Customers, Returns, Expiry/Batch Tracking, Discounts/Tax, Payments, Expenses, Reports, Settings.
Collections: categories, products, stockBatches, stockMovements, sales, saleItems, purchases, suppliers, customers, returns, payments, expenses, settings.
Product fields: sku, barcode, name, categoryId, unit, salePrice, costPrice, taxRate, reorderLevel, active.

## Workshop
Screens: Dashboard, Customers, Vehicles/Equipment, Job Cards, Inspection, Estimates, Service Jobs, Labour, Spare Parts, Purchases, Suppliers, Invoices, Payments, Service History, Expenses, Reports, Settings.
Collections: customers, assets, jobCards, inspections, estimates, serviceTasks, labourRates, parts, stockMovements, purchases, suppliers, invoices, payments, expenses, settings.
Job fields: tenantId, jobNo, customerId, assetId, issue, diagnosis, tasks[], parts[], labourTotal, partsTotal, tax, total, status, createdAt.

## Shared minimum requirements
- Currency and tax configurable (including KWD decimal precision); invoice and receipt print/share.
- CRUD with input validation, searchable lists, empty states, loading and error feedback.
- Audit metadata: createdAt, updatedAt, createdBy; immutable tenant ownership.
- Server-side timestamps for trial creation; expired users denied by Firestore rules.
- Sample catalog templates can be seeded per business without mixing customer data.
- Reports scoped to tenant and business; no cross-customer queries.

## Acceptance tests before giving APK to customers
1. Admin creates restaurant trial; customer sees only restaurant pages.
2. Repeat for laundry, grocery, workshop, each with functional sample item and sale/order.
3. Customer A cannot read/write customer B records even using direct SDK requests.
4. Expired/suspended trial cannot read or write data.
5. Named Firestore database in APK matches deployed rules target.
6. Verify offline/error/restart behavior, billing totals, stock updates, and receipts.
7. Never claim completion until each test passes against the actual APK and backend.
