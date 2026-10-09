import React, { useEffect, useMemo, useState } from 'react';
import { addDoc, onSnapshot, query, limit, serverTimestamp } from 'firebase/firestore';
import { auth } from '../firebase';
import { erpCollection } from '../tenant';
import { calculateInvoice, type Invoice, type InvoiceLine, type PaymentMethod, CURRENCY_DECIMALS, type CurrencyCode } from './billing';
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
  const [currency, setCurrency] = useState<CurrencyCode>('KWD');
  const [method, setMethod] = useState<PaymentMethod>('cash');
  const [amount, setAmount] = useState('0');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [history, setHistory] = useState<Array<{id:string; currency:string; status:string; total:number; paid:number; balance:number; lines:InvoiceLine[]; payments:Array<{amount:number;method:string}>}>>([]);
  const [historyError, setHistoryError] = useState('');
  const [receipt, setReceipt] = useState<{id:string; currency:string; status:string; total:number; paid:number; balance:number; lines:InvoiceLine[]; payments:Array<{amount:number;method:string}>}|null>(null);
  useEffect(() => {
    if (auth.currentUser?.uid !== tenantId) { setHistory([]); setHistoryError('Please sign in again'); return; }
    const invoices = erpCollection('invoices');
    return onSnapshot(query(invoices, limit(50)), snapshot => {
      setHistory(snapshot.docs.map(d => {
        const value = d.data();
        return {id:d.id, currency:String(value.currency ?? ''), status:String(value.status ?? ''),
          total:Number(value.totals?.total ?? 0), paid:Number(value.totals?.paid ?? 0),
          balance:Number(value.totals?.balance ?? 0), lines:Array.isArray(value.lines)?value.lines:[], payments:Array.isArray(value.payments)?value.payments:[]};
      }));
      setHistoryError('');
    }, e => setHistoryError(e.message));
  }, [tenantId]);
  const invoice: Invoice = useMemo(() => ({
    id: 'draft', tenantId, businessType, invoiceNumber: 'DRAFT',
    createdAt: new Date().toISOString(), currency, lines, status: 'draft', payments: []
  }), [tenantId, businessType, currency, lines]);
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
  const saveInvoice = async () => {
    if (saving) return;
    if (auth.currentUser?.uid !== tenantId) { setError('Please sign in again'); return; }
    setSaving(true);
    try {
      if (lines.some(line => !line.description.trim())) throw new Error('Enter every item description');
      const payment = Number(amount);
      if (!Number.isFinite(payment) || payment < 0) throw new Error('Invalid payment');
      const payments = payment ? [{ id: crypto.randomUUID(), amount: payment, method, receivedAt: new Date().toISOString() }] : [];
      const candidate: Invoice = { ...invoice, id: crypto.randomUUID(), invoiceNumber: 'PENDING', payments };
      const totals = calculateInvoice(candidate);
      const saved = await addDoc(erpCollection('invoices'), {
        businessType, tenantId, currency, lines, payments,
        status: totals.balance === 0 ? 'paid' : payments.length ? 'partial' : 'unpaid',
        createdAt: serverTimestamp(), totals
      });
      setError('Invoice saved: ' + saved.id + '. Formal sequential invoice numbering and receipts are not yet enabled.');
      setLines([emptyLine()]);
      setAmount('0');
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not save invoice'); }
    finally { setSaving(false); }
  };
  return <main className="p-4 text-slate-100">
    <h1 className="text-xl font-bold mb-2">{names[businessType]}</h1>
    <p className="text-amber-300 mb-4">Trial billing — database save requires deployed Firestore permissions.</p>
    <label className="block mb-3">Billing currency<select aria-label="Billing currency" className="block w-full text-slate-900 p-2 rounded" value={currency} onChange={e => setCurrency(e.target.value as CurrencyCode)}><option value="KWD">KWD — Kuwaiti Dinar</option><option value="INR">INR — Indian Rupee</option><option value="USD">USD — US Dollar</option></select></label>
    {lines.map(line => <div key={line.id} className="rounded-lg bg-slate-800 p-3 mb-3 grid grid-cols-2 gap-2">
      <label className="col-span-2">Item / Service<input aria-label="Item or service" className="block w-full text-slate-900 p-2 rounded" value={line.description} onChange={e => update(line.id, { description: e.target.value })}/></label>
      <label>Quantity<input aria-label="Quantity" type="number" min="0.001" step={1 / (10 ** CURRENCY_DECIMALS[currency])} className="block w-full text-slate-900 p-2 rounded" value={line.quantity} onChange={e => numberField(line.id, 'quantity', e.target.value)}/></label>
      <label>Unit price ({currency})<input aria-label="Unit price" type="number" min="0" step={1 / (10 ** CURRENCY_DECIMALS[currency])} className="block w-full text-slate-900 p-2 rounded" value={line.unitPrice} onChange={e => numberField(line.id, 'unitPrice', e.target.value)}/></label>
      <label>Discount ({currency})<input type="number" min="0" step={1 / (10 ** CURRENCY_DECIMALS[currency])} className="block w-full text-slate-900 p-2 rounded" value={line.discountAmount ?? 0} onChange={e => numberField(line.id, 'discountAmount', e.target.value)}/></label>
      <label>Tax (%)<input type="number" min="0" max="100" step="0.01" className="block w-full text-slate-900 p-2 rounded" value={line.taxRatePercent ?? 0} onChange={e => numberField(line.id, 'taxRatePercent', e.target.value)}/></label>
      <button className="text-red-300 col-span-2" type="button" disabled={lines.length === 1} onClick={() => setLines(current => current.filter(x => x.id !== line.id))}>Remove item</button>
    </div>)}
    <button className="rounded bg-cyan-700 px-3 py-2 mb-4" type="button" onClick={() => setLines(current => [...current, emptyLine()])}>Add item</button>
    <div className="rounded-lg bg-slate-800 p-4 mb-4">
      <p>Subtotal: {totals?.subtotal.toFixed(CURRENCY_DECIMALS[currency]) ?? '—'} {currency}</p>
      <p>Discount: {totals?.discount.toFixed(CURRENCY_DECIMALS[currency]) ?? '—'} {currency}</p>
      <p>Tax: {totals?.tax.toFixed(CURRENCY_DECIMALS[currency]) ?? '—'} {currency}</p>
      <strong>Total: {totals?.total.toFixed(CURRENCY_DECIMALS[currency]) ?? '—'} {currency}</strong>
    </div>
    <label className="block mb-3">Payment method<select className="block w-full text-slate-900 p-2 rounded" value={method} onChange={e => setMethod(e.target.value as PaymentMethod)}><option value="cash">Cash</option><option value="card">Card</option><option value="bank_transfer">Bank transfer</option><option value="other">Other</option></select></label>
    <label className="block mb-3">Payment amount ({currency})<input className="block w-full text-slate-900 p-2 rounded" type="number" min="0" step="0.001" value={amount} onChange={e => setAmount(e.target.value)}/></label>
    <button className="rounded bg-cyan-700 px-4 py-2" type="button" onClick={validateDraft}>Check draft</button>
    <button className="rounded bg-emerald-700 px-4 py-2 ml-2 disabled:opacity-50" type="button" disabled={saving || !totals} onClick={saveInvoice}>{saving ? 'Saving...' : 'Save invoice'}</button>
    {error && <p role="status" className="mt-3">{error}</p>}
    <section className="mt-6 rounded bg-slate-800 p-4">
      <h2 className="font-bold mb-2">Saved invoices / payment history (latest 50)</h2>
      {historyError && <p role="alert" className="text-amber-300">History unavailable: {historyError}</p>}
      {!historyError && history.length === 0 && <p>No saved invoices found.</p>}
      {history.map(item => <div key={item.id} className="border-t border-slate-600 py-3 text-sm">
        <p className="break-all">Invoice ID: {item.id}</p>
        <p>{item.status} · Total {item.total} {item.currency} · Paid {item.paid} · Due {item.balance}</p>
        <button type="button" className="underline text-cyan-300" onClick={()=>setReceipt(item)}>View receipt</button>
      </div>)}
    </section>
    {receipt && <section className="mt-5 bg-white text-black rounded p-4" aria-label="Invoice receipt">
      <h2 className="font-bold text-xl">{names[businessType]} — Receipt</h2>
      <p className="break-all">Invoice reference: {receipt.id}</p>
      <p>Status: {receipt.status}</p>
      {receipt.lines.map((line,i)=><p key={line.id||i}>{line.description} × {line.quantity} — {line.unitPrice} {receipt.currency}</p>)}
      <hr className="my-2"/>
      <p>Total: {receipt.total} {receipt.currency}</p><p>Paid: {receipt.paid} {receipt.currency}</p><p>Balance: {receipt.balance} {receipt.currency}</p>
      {receipt.payments.map((p,i)=><p key={i}>Payment: {p.amount} {receipt.currency} ({p.method})</p>)}
      <p className="text-xs mt-2">Trial invoice record. Not a payment processor confirmation.</p>
      <button type="button" className="underline mr-4" onClick={()=>setReceipt(null)}>Close</button>
      <button type="button" className="underline" onClick={()=>window.print()}>Print / Save PDF</button>
    </section>}
  </main>;
}

