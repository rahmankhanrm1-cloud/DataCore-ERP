import React,{useEffect,useState} from 'react';
import {addDoc,onSnapshot,serverTimestamp} from 'firebase/firestore';
import {auth} from '../firebase';
import {erpCollection} from '../tenant';
import type {BusinessType} from './businessModules';

const collections:Record<BusinessType,string>={restaurant:'orders',laundry:'laundryOrders',grocery:'sales',workshop:'jobCards'};
type WorkOrder={id:string;customer:string;description:string;status:string;amount:number;currency:string};
export function WorkOrdersScreen({tenantId,businessType}:{tenantId:string;businessType:BusinessType}){
 const [customer,setCustomer]=useState('');const [description,setDescription]=useState('');
 const [amount,setAmount]=useState('0');const [currency,setCurrency]=useState('KWD');
 const [rows,setRows]=useState<WorkOrder[]>([]);const [message,setMessage]=useState('');
 useEffect(()=>{
  if(auth.currentUser?.uid!==tenantId){setMessage('Please sign in');return;}
  return onSnapshot(erpCollection(collections[businessType]),s=>setRows(s.docs.map(d=>({id:d.id,...d.data()} as WorkOrder)).slice(0,100)),e=>setMessage(e.message));
 },[tenantId,businessType]);
 async function save(){
  try{
   if(auth.currentUser?.uid!==tenantId)throw new Error('Please sign in');
   const value=Number(amount);
   if(!description.trim()||!Number.isFinite(value)||value<0)throw new Error('Description and valid amount required');
   await addDoc(erpCollection(collections[businessType]),{tenantId,businessType,customer:customer.trim(),description:description.trim(),amount:value,currency,status:'open',createdAt:serverTimestamp()});
   setCustomer('');setDescription('');setAmount('0');setMessage('Record saved');
  }catch(e){setMessage(e instanceof Error?e.message:'Save failed');}
 }
 return <section className="bg-slate-800 p-4 rounded space-y-3">
 <h2 className="font-bold text-xl">{businessType==='workshop'?'Job Cards':businessType==='grocery'?'Sales':'Orders'}</h2>
 <label className="block">Customer / reference<input className="block p-2 w-full text-slate-900" value={customer} onChange={e=>setCustomer(e.target.value)}/></label>
 <label className="block">Description<input className="block p-2 w-full text-slate-900" value={description} onChange={e=>setDescription(e.target.value)}/></label>
 <label className="block">Amount<input type="number" min="0" step="0.001" className="block p-2 w-full text-slate-900" value={amount} onChange={e=>setAmount(e.target.value)}/></label>
 <label className="block">Currency<select className="block p-2 w-full text-slate-900" value={currency} onChange={e=>setCurrency(e.target.value)}>{['KWD','INR','USD'].map(c=><option key={c}>{c}</option>)}</select></label>
 <button type="button" className="bg-cyan-700 rounded p-2" onClick={save}>Save record</button>
 {message&&<p role="status">{message}</p>}
 <h3 className="font-semibold">Recent records</h3>
 {rows.map(r=><p key={r.id} className="border-t border-slate-600 py-2">{r.customer} · {r.description} · {r.amount} {r.currency} · {r.status}</p>)}
 </section>;
}
