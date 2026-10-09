import type { BusinessType } from './businessModules';

export type CurrencyCode = 'KWD' | 'INR' | 'USD';
export const CURRENCY_DECIMALS: Record<CurrencyCode, number> = { KWD: 3, INR: 2, USD: 2 };

export type PaymentMethod = 'cash' | 'card' | 'bank_transfer' | 'other';
export type InvoiceStatus = 'draft' | 'unpaid' | 'partial' | 'paid' | 'void';
export type InvoiceLine = {
  id: string; description: string; quantity: number; unitPrice: number;
  discountAmount?: number; taxRatePercent?: number;
};
export type Invoice = {
  id: string; tenantId: string; businessType: BusinessType; invoiceNumber: string;
  customerId?: string; createdAt: string; currency: CurrencyCode;
  lines: InvoiceLine[]; status: InvoiceStatus;
  payments: Array<{ id: string; amount: number; method: PaymentMethod; receivedAt: string }>;
  reference?: string;
};
export type InvoiceTotals = {
  subtotal: number; discount: number; taxableBase: number;
  tax: number; total: number; paid: number; balance: number;
};

const toMils = (value: number, scale: number) => {
  if (!Number.isFinite(value) || value < 0) throw new Error('Invalid nonnegative amount');
  return Math.round(value * scale);
};
const fromMils = (value: number, scale: number) => value / scale;

export function calculateInvoice(invoice: Invoice): InvoiceTotals {
  if (!invoice.tenantId || !invoice.id || !invoice.invoiceNumber) throw new Error('Missing invoice identity');
  if (!['restaurant', 'laundry', 'grocery', 'workshop'].includes(invoice.businessType)) throw new Error('Invalid business type');
  const decimals = CURRENCY_DECIMALS[invoice.currency];
  if (decimals === undefined) throw new Error('Unsupported currency');
  const scale = 10 ** decimals;
  let subtotal = 0, discount = 0, tax = 0;
  for (const line of invoice.lines) {
    if (!line.id || !line.description || !Number.isSafeInteger(line.quantity * 1000) || line.quantity <= 0) {
      throw new Error('Invalid invoice line');
    }
    const gross = Math.round(toMils(line.unitPrice, scale) * line.quantity);
    const off = toMils(line.discountAmount ?? 0, scale);
    if (off > gross) throw new Error('Discount exceeds line amount');
    const rate = line.taxRatePercent ?? 0;
    if (!Number.isFinite(rate) || rate < 0 || rate > 100) throw new Error('Invalid tax rate');
    subtotal += gross;
    discount += off;
    tax += Math.round((gross - off) * rate / 100);
  }
  const paid = invoice.payments.reduce((sum, payment) => sum + toMils(payment.amount, scale), 0);
  const total = subtotal - discount + tax;
  if (paid > total) throw new Error('Payments exceed invoice total');
  return {
    subtotal: fromMils(subtotal, scale), discount: fromMils(discount, scale),
    taxableBase: fromMils(subtotal - discount, scale), tax: fromMils(tax, scale),
    total: fromMils(total, scale), paid: fromMils(paid, scale), balance: fromMils(total - paid, scale)
  };
}

export function businessInvoiceReference(type: BusinessType, number: number): string {
  if (!Number.isSafeInteger(number) || number < 1) throw new Error('Invalid invoice sequence');
  const prefixes: Record<BusinessType, string> = {
    restaurant: 'RES', laundry: 'LAU', grocery: 'GRO', workshop: 'WRK'
  };
  return prefixes[type] + '-' + String(number).padStart(6, '0');
}
