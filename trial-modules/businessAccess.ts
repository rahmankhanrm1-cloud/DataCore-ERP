import { BUSINESS_MODULES, type BusinessType } from './businessModules';

export type BusinessAccess = {
  uid: string;
  businessType: BusinessType;
  status: 'active' | 'suspended' | 'expired';
  expiresAtMillis: number;
};

export function isBusinessType(value: unknown): value is BusinessType {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(BUSINESS_MODULES, value);
}

export function getCustomerNavigation(account: BusinessAccess, nowMillis: number = Date.now()): readonly string[] {
  if (!account.uid || !isBusinessType(account.businessType)) return [];
  if (account.status !== 'active' || !Number.isFinite(account.expiresAtMillis) || nowMillis >= account.expiresAtMillis) return [];
  return BUSINESS_MODULES[account.businessType].navigation;
}

export function getCustomerCollectionPath(
  account: BusinessAccess,
  collection: string,
  nowMillis: number = Date.now()
): readonly [string, string, string] {
  if (!getCustomerNavigation(account, nowMillis).length) throw new Error('Trial is not active');
  const module = BUSINESS_MODULES[account.businessType];
  if (!module.collections.includes(collection)) throw new Error('Collection not available for this business');
  return ['tenants', account.uid, collection];
}

export function getBusinessDashboardTitle(account: BusinessAccess, nowMillis: number = Date.now()): string {
  if (!getCustomerNavigation(account, nowMillis).length) return 'Trial expired or unavailable';
  return 'DataCore ERP — ' + BUSINESS_MODULES[account.businessType].label;
}
