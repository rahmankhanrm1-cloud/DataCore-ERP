import type { BusinessType } from './businessModules';

export type AttendanceStatus = 'present' | 'absent' | 'half_day' | 'leave' | 'holiday';
export type Shift = { id: string; tenantId: string; businessType: BusinessType; name: string; startTime: string; endTime: string; breakMinutes: number; };
export type Employee = {
  id: string; tenantId: string; businessType: BusinessType; employeeCode: string;
  fullName: string; role: string; phone?: string; email?: string; hireDate: string;
  shiftId?: string; salaryAmount: number; salaryPeriod: 'monthly' | 'daily' | 'hourly';
  active: boolean;
};
export type AttendanceRecord = {
  id: string; tenantId: string; businessType: BusinessType; employeeId: string;
  workDate: string; status: AttendanceStatus; checkIn?: string; checkOut?: string;
  breakMinutes: number; overtimeMinutes: number; notes?: string;
  recordedBy: string; createdAt?: unknown; updatedAt?: unknown;
};
export type LeaveRequest = {
  id: string; tenantId: string; businessType: BusinessType; employeeId: string;
  fromDate: string; toDate: string; category: 'annual' | 'sick' | 'unpaid' | 'other';
  status: 'pending' | 'approved' | 'rejected'; reason?: string;
};
export type PayrollRecord = {
  id: string; tenantId: string; businessType: BusinessType; employeeId: string;
  month: string; basePay: number; overtimePay: number; allowances: number;
  deductions: number; netPay: number; currency: string; paid: boolean;
};

export function validateAttendance(record: AttendanceRecord): void {
  if (!record.tenantId || !record.employeeId || !record.recordedBy) throw new Error('Required attendance field missing');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(record.workDate)) throw new Error('Invalid attendance date');
  if (!['present', 'absent', 'half_day', 'leave', 'holiday'].includes(record.status)) throw new Error('Invalid attendance status');
  if (record.breakMinutes < 0 || record.overtimeMinutes < 0) throw new Error('Negative minutes are not allowed');
  if (record.checkIn && record.checkOut && record.checkOut < record.checkIn) throw new Error('Check-out before check-in');
}

export function calculateNetPay(payroll: Pick<PayrollRecord, 'basePay' | 'overtimePay' | 'allowances' | 'deductions'>): number {
  const fields = [payroll.basePay, payroll.overtimePay, payroll.allowances, payroll.deductions];
  if (fields.some(v => !Number.isFinite(v) || v < 0)) throw new Error('Invalid payroll amount');
  return Math.round((payroll.basePay + payroll.overtimePay + payroll.allowances - payroll.deductions) * 1000) / 1000;
}
