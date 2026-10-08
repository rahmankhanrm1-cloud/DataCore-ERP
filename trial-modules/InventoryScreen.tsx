import React,{useEffect,useState} from 'react';
import {addDoc,onSnapshot,serverTimestamp,query,limit} from 'firebase/firestore';
import {auth} from '../firebase';
import {erpCollection} from '../tenant';
import type {BusinessType} from './businessModules';

type Stock={id:string;item:string;movement:string;quantity:number;unit:string;note:string};
export function InventoryScreen({tenantId,businessType}:{tenantId:string;businessType:BusinessType}){
 const [item,setItem]=useState('');const [quantity,setQuantity]=useState('1');
 const [unit,setUnit]=useState('piece');const [movement,setMovement]=useState('in');
 const [note,setNote]=useState('');const [rows,setRows]=useState<Stock[]>([]);
 const [message,setMessage]=useState('');
 useEffect(()=>{
  if(auth.currentUser?.uid!==tenantId){setMessage('Please sign in');return;}
  return onSnapshot(query(erpCollection('stockMovements'),limit(100)),s=>setRows(s.docs.map(d=>({id:d.id,...d.data()} as Stock)),e=>setMessage(e.message));
 },[tenantId]);
 async function save(){
  try{
   if(auth.currentUser?.uid!==tenantId)throw new Error('Please sign in');
   const count=Number(quantity);
   if(!item.trim()||!Number.isFinite(count)||count<=0)throw new Error('Item and positive quantity required');
   await addDoc(erpCollection('stockMovements'),{tenantId,businessType,item:item.trim(),quantity:count,unit:unit.trim(),movement,note:note.trim(),createdAt:serverTimestamp()});
   setItem('');setQuantity('1');setNote('');setMessage('Stock movement saved');
  }catch(e){setMessage(e instanceof Error?e.message:'Save failed');}
 }
 const recentBalance=rows.reduce<Record<string,number>>((a,r)=>{a[r.item]=(a[r.item]||0)+(r.movement==='in'?r.quantity:-r.quantity);return a;},{});
 return <section className="bg-slate-800 p-4 rounded space-y-3">
 <h2 className="text-xl font-bold">Inventory movements</h2>
 <label className="block">Item<input className="block p-2 w-full text-slate-900" value={item} onChange={e=>setItem(e.target.value)}/></label>
 <label className="block">Movement<select className="block p-2 w-full text-slate-900" value={movement} onChange={e=>setMovement(e.target.value)}><option value="in">Stock in</option><option value="out">Stock out</option></select></label>
 <label className="block">Quantity<input type="number" min="0.001" step="0.001" className="block p-2 w-full text-slate-900" value={quantity} onChange={e=>setQuantity(e.target.value)}/></label>
 <label className="block">Unit<input className="block p-2 w-full text-slate-900" value={unit} onChange={e=>setUnit(e.target.value)}/></label>
 <label className="block">Notes<input className="block p-2 w-full text-slate-900" value={note} onChange={e=>setNote(e.target.value)}/></label>
 <button type="button" className="bg-cyan-700 rounded p-2" onClick={save}>Save movement</button>
 {message&&<p role="status">{message}</p>}
 <h3 className="font-semibold">Net movements (up to 100 records; not authoritative stock balances)</h3>
 {Object.entries(recentBalance).map(([name,value])=><p key={name} className="border-t border-slate-600 py-1">{name}: {value}</p>)}
 </section>;
}
