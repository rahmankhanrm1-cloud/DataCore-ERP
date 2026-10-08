import React, { useState } from 'react';
import { BusinessDashboard } from './BusinessDashboard';
import { isBusinessType, type BusinessAccess } from './businessAccess';

type TrialAccountDocument = {
  businessType?: unknown;
  status?: unknown;
  createdAt?: { toMillis?: () => number } | null;
};

type Props = {
  uid: string;
  trial: TrialAccountDocument | null | undefined;
  isAdmin: boolean;
  adminContent: React.ReactNode;
};

/**
 * Customer router for use after Firebase Auth + trialAccounts/{uid} load.
 * A missing, untyped, suspended or expired trial is denied, never defaulted to grocery.
 * Firestore rules must independently enforce these checks.
 */
export function TrialBusinessRouter({ uid, trial, isAdmin, adminContent }: Props) {
  const [activePage, setActivePage] = useState('Dashboard');
  if (isAdmin) return <>{adminContent}</>;
  if (!trial || !isBusinessType(trial.businessType) || trial.status !== 'active') {
    return <main role="alert" className="p-6">Trial account not active or business not assigned. Contact administrator.</main>;
  }
  const createdAtMillis = trial.createdAt?.toMillis?.();
  if (!Number.isFinite(createdAtMillis)) {
    return <main role="alert" className="p-6">Trial start time is unavailable. Contact administrator.</main>;
  }
  const account: BusinessAccess = {
    uid,
    businessType: trial.businessType,
    status: 'active',
    expiresAtMillis: (createdAtMillis as number) + 72 * 60 * 60 * 1000
  };
  return <BusinessDashboard account={account} activePage={activePage} onNavigate={setActivePage} />;
}
