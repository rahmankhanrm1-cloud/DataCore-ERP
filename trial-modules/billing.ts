import type { BusinessType } from './businessModules';

export type PaymentMethod = 'cash' | 'card' | 'bank_transfer' | 'other';
export type InvoiceStatus = 'draft' | 'unpaid' | 'partial' | 'paid' | 'void';
export type InvoiceLine = {
  id: string; description: string; quantity: number; unitPrice: number;
  discountAmount?: number; taxRatePercent?: number;
};
export type Invoice = {
  id: string; tenantId: string; businessType: BusinessType; invoiceNumber: string;
  customerId?: string; createdAt: string; currency: 'KWD';
  lines: InvoiceLine[]; status: InvoiceStatus;
  payments: Array<{ id: string; amount: number; method: PaymentMethod; receivedAt: string }>;
  reference?: string;
};
export type InvoiceTotals = {
  subtotal: number; discount: number; taxableBase: number;
  tax: number; total: number; paid: number; balance: number;
};

const toMils = (value: number) => {
  if (!Number.isFinite(value) || value < 0) throw new Error('Invalid nonnegative amount');
  return Math.round(value * 1000);
};
const fromMils = (value: number) => value / 1000;

export function calculateInvoice(invoice: Invoice): InvoiceTotals {
  if (!invoice.tenantId || !invoice.id || !invoice.invoiceNumber) throw new Error('Missing invoice identity');
  if (!['restaurant', 'laundry', 'grocery', 'workshop'].includes(invoice.businessType)) throw new Error('Invalid business type');
  let subtotal = 0, discount = 0, tax = 0;
  for (const line of invoice.lines) {
    if (!line.id || !line.description || !Number.isSafeInteger(line.quantity * 1000) || line.quantity <= 0) {
      throw new Error('Invalid invoice line');
    }
    const gross = Math.round(toMils(line.unitPrice) * line.quantity);
    const off = toMils(line.discountAmount ?? 0);
    if (off > gross) throw new Error('Discount exceeds line amount');
    const rate = line.taxRatePercent ?? 0;
    if (!Number.isFinite(rate) || rate < 0 || rate > 100) throw new Error('Invalid tax rate');
    subtotal += gross;
    discount += off;
    tax += Math.round((gross - off) * rate / 100);
  }
  const paid = invoice.payments.reduce((sum, payment) => sum + toMils(payment.amount), 0);
  const total = subtotal - discount + tax;
  if (paid > total) throw new Error('Payments exceed invoice total');
  return {
    subtotal: fromMils(subtotal), discount: fromMils(discount),
    taxableBase: fromMils(subtotal - discount), tax: fromMils(tax),
    total: fromMils(total), paid: fromMils(paid), balance: fromMils(total - paid)
  };
}

export function businessInvoiceReference(type: BusinessType, number: number): string {
  if (!Number.isSafeInteger(number) || number < 1) throw new Error('Invalid invoice sequence');
  const prefixes: Record<BusinessType, string> = {
    restaurant: 'RES', laundry: 'LAU', grocery: 'GRO', workshop: 'WRK'
  };
  return prefixes[type] + '-' + String(number).padStart(6, '0');
}
