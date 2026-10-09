export type BusinessType = 'restaurant' | 'laundry' | 'grocery' | 'workshop';

export type CatalogItem = {
  id: string;
  name: string;
  category: string;
  unit: string;
  price: number;
  active: boolean;
};

export type BusinessModule = {
  type: BusinessType;
  label: string;
  navigation: readonly string[];
  collections: readonly string[];
  starterCatalog: readonly CatalogItem[];
  staffFeatures: readonly string[];
};

export const BUSINESS_MODULES: Record<BusinessType, BusinessModule> = {
  restaurant: {
    type: 'restaurant', label: 'Restaurant',
    staffFeatures: ['Employees', 'Attendance', 'Shifts', 'Leave', 'Overtime', 'Payroll', 'Attendance Reports'],
    navigation: ['Dashboard', 'Menu', 'Tables', 'Orders', 'Kitchen Tickets', 'Recipes', 'Ingredients', 'Inventory', 'Purchases', 'Customers', 'Billing', 'Reports', 'Employees', 'Attendance', 'Payroll', 'Settings'],
    collections: ['menuCategories', 'menuItems', 'tables', 'orders', 'orderItems', 'kitchenTickets', 'recipes', 'ingredients', 'stockMovements', 'purchases', 'customers', 'payments', 'expenses', 'employees', 'attendance', 'shifts', 'leaveRequests', 'payroll', 'settings'],
    starterCatalog: [
      { id: 'rest-tea', name: 'Tea', category: 'Beverages', unit: 'cup', price: 0, active: true },
      { id: 'rest-coffee', name: 'Coffee', category: 'Beverages', unit: 'cup', price: 0, active: true },
      { id: 'rest-rice', name: 'Rice Meal', category: 'Main Course', unit: 'plate', price: 0, active: true },
      { id: 'rest-biryani', name: 'Biryani', category: 'Main Course', unit: 'plate', price: 0, active: true }
    ]
  },
  laundry: {
    type: 'laundry', label: 'Laundry',
    staffFeatures: ['Employees', 'Attendance', 'Shifts', 'Leave', 'Overtime', 'Payroll', 'Attendance Reports'],
    navigation: ['Dashboard', 'Services', 'Price List', 'Customer Intake', 'Orders', 'Garment Tracking', 'Workflow', 'Pickup & Delivery', 'Billing', 'Reports', 'Employees', 'Attendance', 'Payroll', 'Settings'],
    collections: ['serviceCategories', 'services', 'garmentTypes', 'laundryOrders', 'laundryOrderItems', 'garmentTags', 'workflowEvents', 'pickups', 'deliveries', 'customers', 'payments', 'expenses', 'employees', 'attendance', 'shifts', 'leaveRequests', 'payroll', 'settings'],
    starterCatalog: [
      { id: 'laundry-shirt-wash', name: 'Shirt Wash', category: 'Wash', unit: 'piece', price: 0, active: true },
      { id: 'laundry-shirt-iron', name: 'Shirt Iron', category: 'Iron', unit: 'piece', price: 0, active: true },
      { id: 'laundry-suit-dry', name: 'Suit Dry Clean', category: 'Dry Clean', unit: 'set', price: 0, active: true },
      { id: 'laundry-blanket', name: 'Blanket Wash', category: 'Wash', unit: 'piece', price: 0, active: true }
    ]
  },
  grocery: {
    type: 'grocery', label: 'Grocery',
    staffFeatures: ['Employees', 'Attendance', 'Shifts', 'Leave', 'Overtime', 'Payroll', 'Attendance Reports'],
    navigation: ['Dashboard', 'Products', 'Barcode POS', 'Sales', 'Inventory', 'Purchases', 'Suppliers', 'Customers', 'Returns', 'Expiry Tracking', 'Billing', 'Reports', 'Employees', 'Attendance', 'Payroll', 'Settings'],
    collections: ['categories', 'products', 'stockBatches', 'stockMovements', 'sales', 'saleItems', 'purchases', 'suppliers', 'customers', 'returns', 'payments', 'expenses', 'employees', 'attendance', 'shifts', 'leaveRequests', 'payroll', 'settings'],
    starterCatalog: [
      { id: 'grocery-rice', name: 'Rice', category: 'Grains', unit: 'kg', price: 0, active: true },
      { id: 'grocery-milk', name: 'Milk', category: 'Dairy', unit: 'pack', price: 0, active: true },
      { id: 'grocery-oil', name: 'Cooking Oil', category: 'Cooking', unit: 'bottle', price: 0, active: true },
      { id: 'grocery-sugar', name: 'Sugar', category: 'Groceries', unit: 'kg', price: 0, active: true }
    ]
  },
  workshop: {
    type: 'workshop', label: 'Workshop',
    staffFeatures: ['Employees', 'Attendance', 'Shifts', 'Leave', 'Overtime', 'Payroll', 'Attendance Reports'],
    navigation: ['Dashboard', 'Customers', 'Vehicles & Equipment', 'Job Cards', 'Inspections', 'Estimates', 'Service Jobs', 'Spare Parts', 'Purchases', 'Invoices', 'Reports', 'Employees', 'Attendance', 'Payroll', 'Settings'],
    collections: ['customers', 'assets', 'jobCards', 'inspections', 'estimates', 'serviceTasks', 'labourRates', 'parts', 'stockMovements', 'purchases', 'suppliers', 'invoices', 'payments', 'expenses', 'employees', 'attendance', 'shifts', 'leaveRequests', 'payroll', 'settings'],
    starterCatalog: [
      { id: 'workshop-oil-change', name: 'Oil Change Labour', category: 'Service', unit: 'job', price: 0, active: true },
      { id: 'workshop-brake-check', name: 'Brake Inspection', category: 'Service', unit: 'job', price: 0, active: true },
      { id: 'workshop-filter', name: 'Oil Filter', category: 'Parts', unit: 'piece', price: 0, active: true },
      { id: 'workshop-diagnostics', name: 'Diagnostics', category: 'Service', unit: 'job', price: 0, active: true }
    ]
  }
};

export function getBusinessModule(type: string): BusinessModule {
  if (!Object.prototype.hasOwnProperty.call(BUSINESS_MODULES, type)) {
    throw new Error('Unsupported business type');
  }
  return BUSINESS_MODULES[type as BusinessType];
}

export function tenantBusinessPath(uid: string, type: BusinessType, collection: string): string[] {
  if (!uid || uid.includes('/')) throw new Error('Invalid tenant UID');
  const module = getBusinessModule(type);
  if (!module.collections.includes(collection)) throw new Error('Collection not allowed for business');
  return ['tenants', uid, collection];
}
