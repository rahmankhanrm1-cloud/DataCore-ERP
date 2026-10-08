import React,{useEffect,useState} from 'react';
import {addDoc,onSnapshot,serverTimestamp} from 'firebase/firestore';
import {auth} from '../firebase';
import {erpCollection} from '../tenant';
import type {BusinessType} from './businessModules';

type Purchase={id:string;supplier:string;description:string;quantity:number;unitPrice:number;currency:string;total:number};
export function PurchasesScreen({tenantId,businessType}:{tenantId:string;businessType:BusinessType}){
 const [supplier,setSupplier]=useState('');const [description,setDescription]=useState('');
 const [quantity,setQuantity]=useState('1');const [unitPrice,setUnitPrice]=useState('0');
 const [currency,setCurrency]=useState('KWD');const [rows,setRows]=useState<Purchase[]>([]);
 const [message,setMessage]=useState('');
 useEffect(()=>{
  if(auth.currentUser?.uid!==tenantId){setMessage('Please sign in');return;}
  return onSnapshot(erpCollection('purchases'),s=>setRows(s.docs.map(d=>({id:d.id,...d.data()} as Purchase)).slice(0,100)),e=>setMessage(e.message));
 },[tenantId]);
 async function save(){
  try{
   if(auth.currentUser?.uid!==tenantId)throw new Error('Please sign in');
   const q=Number(quantity),p=Number(unitPrice);
   if(!description.trim()||!Number.isFinite(q)||q<=0||!Number.isFinite(p)||p<0)throw new Error('Valid item, quantity and price required');
   await addDoc(erpCollection('purchases'),{tenantId,businessType,supplier:supplier.trim(),description:description.trim(),quantity:q,unitPrice:p,total:Number((q*p).toFixed(currency==='KWD'?3:2)),currency,createdAt:serverTimestamp()});
   setSupplier('');setDescription('');setQuantity('1');setUnitPrice('0');setMessage('Purchase saved');
  }catch(e){setMessage(e instanceof Error?e.message:'Save failed');}
 }
 return <section className="bg-slate-800 p-4 rounded space-y-3">
 <h2 className="font-bold text-xl">Purchases</h2>
 <label className="block">Supplier<input className="block p-2 w-full text-slate-900" value={supplier} onChange={e=>setSupplier(e.target.value)}/></label>
 <label className="block">Item / description<input className="block p-2 w-full text-slate-900" value={description} onChange={e=>setDescription(e.target.value)}/></label>
 <label className="block">Quantity<input type="number" min="0.001" step="0.001" className="block p-2 w-full text-slate-900" value={quantity} onChange={e=>setQuantity(e.target.value)}/></label>
 <label className="block">Unit price<input type="number" min="0" step="0.001" className="block p-2 w-full text-slate-900" value={unitPrice} onChange={e=>setUnitPrice(e.target.value)}/></label>
 <label className="block">Currency<select className="block p-2 w-full text-slate-900" value={currency} onChange={e=>setCurrency(e.target.value)}>{['KWD','INR','USD'].map(c=><option key={c}>{c}</option>)}</select></label>
 <button type="button" className="bg-cyan-700 rounded p-2" onClick={save}>Save purchase</button>
 {message&&<p role="status">{message}</p>}
 <h3 className="font-semibold">Recent purchases</h3>
 {rows.map(r=><p key={r.id} className="border-t border-slate-600 py-2">{r.supplier} · {r.description} × {r.quantity} · {r.total} {r.currency}</p>)}
 </section>;
}
