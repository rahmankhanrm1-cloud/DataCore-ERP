import React, { useMemo, useState } from 'react';
import { calculateInvoice, type Invoice, type InvoiceLine, type PaymentMethod } from './billing';
import type { BusinessType } from './businessModules';

type Props = { tenantId: string; businessType: BusinessType };
const names: Record<BusinessType, string> = {
  restaurant: 'Restaurant Bill', laundry: 'Laundry Bill',
  grocery: 'Grocery POS Bill', workshop: 'Workshop Service Invoice'
};
const emptyLine = (): InvoiceLine => ({
  id: String(Date.now()) + '-' + Math.random().toString(36).slice(2),
  description: '', quantity: 1, unitPrice: 0, discountAmount: 0, taxRatePercent: 0
});

/** Draft-only invoice editor. Saving, numbering and receipts require a trusted backend. */
export function BillingScreen({ tenantId, businessType }: Props) {
  const [lines, setLines] = useState<InvoiceLine[]>([emptyLine()]);
  const [method, setMethod] = useState<PaymentMethod>('cash');
  const [amount, setAmount] = useState('0');
  const [error, setError] = useState('');
  const invoice: Invoice = useMemo(() => ({
    id: 'draft', tenantId, businessType, invoiceNumber: 'DRAFT',
    createdAt: new Date().toISOString(), currency: 'KWD', lines, status: 'draft', payments: []
  }), [tenantId, businessType, lines]);
  const totals = useMemo(() => {
    try { return calculateInvoice(invoice); } catch { return null; }
  }, [invoice]);
  const update = (id: string, patch: Partial<InvoiceLine>) =>
    setLines(current => current.map(line => line.id === id ? { ...line, ...patch } : line));
  const numberField = (id: string, field: 'quantity' | 'unitPrice' | 'discountAmount' | 'taxRatePercent', value: string) =>
    update(id, { [field]: Number(value) });
  const validateDraft = () => {
    try {
      if (lines.some(line => !line.description.trim())) throw new Error('Enter every item description');
      const payment = Number(amount);
      if (!Number.isFinite(payment) || payment < 0) throw new Error('Invalid payment');
      const candidate = { ...invoice, payments: payment ? [{ id: 'draft-payment', amount: payment, method, receivedAt: new Date().toISOString() }] : [] };
      calculateInvoice(candidate);
      setError('Draft calculated. Database saving and receipt printing are not yet enabled.');
    } catch (e) { setError(e instanceof Error ? e.message : 'Invalid invoice'); }
  };
  return <main className="p-4 text-slate-100">
    <h1 className="text-xl font-bold mb-2">{names[businessType]}</h1>
    <p className="text-amber-300 mb-4">Draft preview only — not saved to the database.</p>
    {lines.map(line => <div key={line.id} className="rounded-lg bg-slate-800 p-3 mb-3 grid grid-cols-2 gap-2">
      <label className="col-span-2">Item / Service<input aria-label="Item or service" className="block w-full text-slate-900 p-2 rounded" value={line.description} onChange={e => update(line.id, { description: e.target.value })}/></label>
      <label>Quantity<input aria-label="Quantity" type="number" min="0.001" step="0.001" className="block w-full text-slate-900 p-2 rounded" value={line.quantity} onChange={e => numberField(line.id, 'quantity', e.target.value)}/></label>
      <label>Unit price (KWD)<input aria-label="Unit price" type="number" min="0" step="0.001" className="block w-full text-slate-900 p-2 rounded" value={line.unitPrice} onChange={e => numberField(line.id, 'unitPrice', e.target.value)}/></label>
      <label>Discount (KWD)<input type="number" min="0" step="0.001" className="block w-full text-slate-900 p-2 rounded" value={line.discountAmount ?? 0} onChange={e => numberField(line.id, 'discountAmount', e.target.value)}/></label>
      <label>Tax (%)<input type="number" min="0" max="100" step="0.01" className="block w-full text-slate-900 p-2 rounded" value={line.taxRatePercent ?? 0} onChange={e => numberField(line.id, 'taxRatePercent', e.target.value)}/></label>
      <button className="text-red-300 col-span-2" type="button" disabled={lines.length === 1} onClick={() => setLines(current => current.filter(x => x.id !== line.id))}>Remove item</button>
    </div>)}
    <button className="rounded bg-cyan-700 px-3 py-2 mb-4" type="button" onClick={() => setLines(current => [...current, emptyLine()])}>Add item</button>
    <div className="rounded-lg bg-slate-800 p-4 mb-4">
      <p>Subtotal: {totals?.subtotal.toFixed(3) ?? '—'} KWD</p>
      <p>Discount: {totals?.discount.toFixed(3) ?? '—'} KWD</p>
      <p>Tax: {totals?.tax.toFixed(3) ?? '—'} KWD</p>
      <strong>Total: {totals?.total.toFixed(3) ?? '—'} KWD</strong>
    </div>
    <label className="block mb-3">Payment method<select className="block w-full text-slate-900 p-2 rounded" value={method} onChange={e => setMethod(e.target.value as PaymentMethod)}><option value="cash">Cash</option><option value="card">Card</option><option value="bank_transfer">Bank transfer</option><option value="other">Other</option></select></label>
    <label className="block mb-3">Payment amount (KWD)<input className="block w-full text-slate-900 p-2 rounded" type="number" min="0" step="0.001" value={amount} onChange={e => setAmount(e.target.value)}/></label>
    <button className="rounded bg-cyan-700 px-4 py-2" type="button" onClick={validateDraft}>Check draft</button>
    {error && <p role="status" className="mt-3">{error}</p>}
  </main>;
}
