import React,{useEffect,useState} from 'react';
import {addDoc,onSnapshot,serverTimestamp} from 'firebase/firestore';
import {auth} from '../firebase';
import {erpCollection} from '../tenant';
import type {BusinessType} from './businessModules';

type Customer={id:string;name:string;phone:string;email:string;notes:string};
export function CustomersScreen({tenantId,businessType}:{tenantId:string;businessType:BusinessType}){
 const [name,setName]=useState('');const [phone,setPhone]=useState('');
 const [email,setEmail]=useState('');const [notes,setNotes]=useState('');
 const [rows,setRows]=useState<Customer[]>([]);const [message,setMessage]=useState('');
 useEffect(()=>{
  if(auth.currentUser?.uid!==tenantId){setMessage('Please sign in');return;}
  return onSnapshot(erpCollection('customers'),s=>setRows(s.docs.map(d=>({id:d.id,...d.data()} as Customer)).slice(0,100)),e=>setMessage(e.message));
 },[tenantId]);
 async function save(){
  try{
   if(auth.currentUser?.uid!==tenantId)throw new Error('Please sign in');
   if(!name.trim())throw new Error('Customer name required');
   await addDoc(erpCollection('customers'),{tenantId,businessType,name:name.trim(),phone:phone.trim(),email:email.trim(),notes:notes.trim(),createdAt:serverTimestamp()});
   setName('');setPhone('');setEmail('');setNotes('');setMessage('Customer saved');
  }catch(e){setMessage(e instanceof Error?e.message:'Save failed');}
 }
 return <section className="bg-slate-800 p-4 rounded space-y-3">
 <h2 className="font-bold text-xl">Customers</h2>
 <label className="block">Name<input className="block p-2 w-full text-slate-900" value={name} onChange={e=>setName(e.target.value)}/></label>
 <label className="block">Phone<input type="tel" className="block p-2 w-full text-slate-900" value={phone} onChange={e=>setPhone(e.target.value)}/></label>
 <label className="block">Email<input type="email" className="block p-2 w-full text-slate-900" value={email} onChange={e=>setEmail(e.target.value)}/></label>
 <label className="block">Notes<textarea className="block p-2 w-full text-slate-900" value={notes} onChange={e=>setNotes(e.target.value)}/></label>
 <button type="button" className="bg-cyan-700 rounded p-2" onClick={save}>Save customer</button>
 {message&&<p role="status">{message}</p>}
 <h3 className="font-semibold">Customer directory</h3>
 {rows.map(r=><p key={r.id} className="border-t border-slate-600 py-2">{r.name} · {r.phone} · {r.email}</p>)}
 </section>;
}
