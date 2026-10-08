import React from 'react';
import { BillingScreen } from './BillingScreen';
import { AttendanceScreen } from './AttendanceScreen';
import { PayrollScreen } from './PayrollScreen';
import { BUSINESS_MODULES, type BusinessType } from './businessModules';
import { getCustomerNavigation, type BusinessAccess } from './businessAccess';

type Props = {
  account: BusinessAccess;
  activePage: string;
  onNavigate: (page: string) => void;
};

export function BusinessDashboard({ account, activePage, onNavigate }: Props) {
  const navigation = getCustomerNavigation(account);
  if (!navigation.length) {
    return <main className="p-6 text-center" role="alert"><h1>Trial unavailable</h1><p>Contact the administrator to activate or renew access.</p></main>;
  }
  const module = BUSINESS_MODULES[account.businessType];
  const selected = navigation.includes(activePage) ? activePage : 'Dashboard';
  return (
    <main className="p-4 md:p-6 text-slate-100">
      <header className="mb-6">
        <p className="text-sm text-cyan-400">DataCore ERP</p>
        <h1 className="text-2xl font-bold">{module.label} — {selected}</h1>
      </header>
      <nav aria-label={module.label + ' navigation'} className="flex flex-wrap gap-2 mb-6">
        {navigation.map(page => (
          <button type="button" key={page} onClick={() => onNavigate(page)}
            aria-current={page === selected ? 'page' : undefined}
            className={'rounded-lg px-3 py-2 border ' + (page === selected ? 'bg-cyan-800 border-cyan-500' : 'bg-slate-800 border-slate-700')}>
            {page}
          </button>
        ))}
      </nav>
      {selected === 'Payroll' ? (
        <PayrollScreen tenantId={account.uid} businessType={account.businessType} />
      ) : selected === 'Attendance' ? (
        <AttendanceScreen tenantId={account.uid} businessType={account.businessType} />
      ) : (selected === 'Billing' || selected === 'Invoices') ? (
        <BillingScreen tenantId={account.uid} businessType={account.businessType} />
      ) : selected === 'Dashboard' ? (
        <section>
          <h2 className="text-lg font-semibold mb-3">{module.label} modules</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {navigation.filter(page => page !== 'Dashboard').map(page => (
              <button key={page} type="button" onClick={() => onNavigate(page)}
                className="text-left rounded-xl bg-slate-800 p-4 border border-slate-700">{page}</button>
            ))}
          </div>
        </section>
      ) : (
        <section className="rounded-xl bg-slate-800 p-5 border border-slate-700">
          <h2 className="text-lg font-semibold">{selected}</h2>
          <p className="mt-2 text-slate-300">This module is under development. No records are saved here yet.</p>
        </section>
      )}
    </main>
  );
}

export function isCustomerBusinessAllowed(value: unknown): value is BusinessType {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(BUSINESS_MODULES, value);
}
