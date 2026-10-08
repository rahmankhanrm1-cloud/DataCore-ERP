import React, { useEffect, useState } from 'react';
import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { collection, doc, getDocs, setDoc, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';
import config from '../../firebase-applet-config.json';

type Trial = { id: string; email: string; businessType: string; expiresAt?: Timestamp; status: string };
const TYPES = ['Grocery', 'Car Workshop', 'Restaurant', 'Laundry'];
export function TrialManager() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [businessType, setBusinessType] = useState(TYPES[0]);
  const [items, setItems] = useState<Trial[]>([]);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const refresh = async () => {
    try { const s = await getDocs(collection(db, 'trialAccounts'));
      setItems(s.docs.map(d => ({ id: d.id, ...d.data() } as Trial)));
    } catch (e) { setMessage(String(e)); }
  };
  useEffect(() => { refresh(); }, []);
  const create = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true); setMessage('');
    const secondary = initializeApp(config, `trial-provision-${Date.now()}`);
    try {
      const secondaryAuth = getAuth(secondary);
      const result = await createUserWithEmailAndPassword(secondaryAuth, email.trim(), password);
      const expiresAt = Timestamp.fromMillis(Date.now() + 72 * 60 * 60 * 1000);
      await setDoc(doc(db, 'trialAccounts', result.user.uid), {
        email: email.trim().toLowerCase(), businessType, status: 'active',
        createdAt: Timestamp.now(), expiresAt
      });
      await signOut(secondaryAuth);
      setEmail(''); setPassword(''); setMessage('Trial account created. Share credentials privately.');
      await refresh();
    } catch (err) { setMessage(`Setup failed: ${String(err)}. Check Firebase Auth before retrying.`); }
    finally { await deleteApp(secondary); setBusy(false); }
  };
  const revoke = async (id: string) => {
    if (!confirm('Stop this trial immediately?')) return;
    try { await updateDoc(doc(db, 'trialAccounts', id), { status: 'revoked' }); await refresh(); }
    catch (err) { setMessage(String(err)); }
  };
  return <div className="space-y-5 max-w-2xl">
    <h2 className="text-xl font-bold">Customer Free Trials (72 hours)</h2>
    <p className="text-sm text-slate-400">Admin only. No payments or subscriptions.</p>
    <form onSubmit={create} className="space-y-3 bg-slate-900 p-4 rounded-xl">
      <input type="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="Customer email" className="w-full p-3 rounded bg-slate-800" />
      <input type="password" minLength={12} required value={password} onChange={e=>setPassword(e.target.value)} placeholder="Temporary password (12+ characters)" className="w-full p-3 rounded bg-slate-800" />
      <select value={businessType} onChange={e=>setBusinessType(e.target.value)} className="w-full p-3 rounded bg-slate-800">{TYPES.map(t=><option key={t}>{t}</option>)}</select>
      <button disabled={busy} className="bg-cyan-700 rounded px-4 py-3 disabled:opacity-50">{busy ? 'Creating...' : 'Create 3-Day Trial'}</button>
    </form>
    {message && <p className="text-sm text-amber-300">{message}</p>}
    {items.map(t=><div key={t.id} className="p-4 bg-slate-900 rounded-xl flex justify-between gap-2">
      <div className="text-sm break-all"><b>{t.email}</b><p>{t.businessType} · {t.status} · Expires {t.expiresAt?.toDate?.().toLocaleString() || 'Unknown'}</p></div>
      {t.status === 'active' && <button onClick={()=>revoke(t.id)} className="text-rose-400">Revoke</button>}
    </div>)}
  </div>;
}
