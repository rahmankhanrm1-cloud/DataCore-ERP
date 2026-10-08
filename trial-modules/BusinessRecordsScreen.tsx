import React,{useEffect,useState} from 'react';
import {addDoc,onSnapshot,serverTimestamp} from 'firebase/firestore';
import {auth} from '../firebase';
import {erpCollection} from '../tenant';
import type {BusinessType} from './businessModules';

type RecordItem={id:string;title:string;details:string;status:string;reference:string};
const collectionByPage:Record<string,string>={
 'Tables':'restaurantTables','Kitchen Tickets':'kitchenTickets','Recipes':'recipes','Ingredients':'ingredients',
 'Customer Intake':'customerIntake','Garment Tracking':'garmentTracking','Workflow':'laundryWorkflow','Pickup & Delivery':'deliveries',
 'Suppliers':'suppliers','Returns':'returns','Expiry Tracking':'expiryTracking','Vehicles & Equipment':'vehicles',
 'Inspections':'inspections','Estimates':'estimates','Service Jobs':'serviceJobs',
 'Price List':'priceList','Barcode POS':'posTransactions','Reports':'reports','Settings':'businessSettings'
};
export function BusinessRecordsScreen({tenantId,businessType,page}:{tenantId:string;businessType:BusinessType;page:string}){
 const collection=collectionByPage[page];
 const [title,setTitle]=useState('');const [details,setDetails]=useState('');const [reference,setReference]=useState('');
 const [rows,setRows]=useState<RecordItem[]>([]);const [message,setMessage]=useState('');
 useEffect(()=>{
  if(!collection)return;
  if(auth.currentUser?.uid!==tenantId){setMessage('Please sign in');return;}
  return onSnapshot(erpCollection(collection),s=>setRows(s.docs.map(d=>({id:d.id,...d.data()} as RecordItem)).slice(0,100)),e=>setMessage(e.message));
 },[tenantId,collection]);
 async function save(){
  try{
   if(!collection||auth.currentUser?.uid!==tenantId)throw new Error('Access denied');
   if(!title.trim())throw new Error('Title is required');
   await addDoc(erpCollection(collection),{tenantId,businessType,page,title:title.trim(),details:details.trim(),reference:reference.trim(),status:'open',createdAt:serverTimestamp()});
   setTitle('');setDetails('');setReference('');setMessage('Record saved');
  }catch(e){setMessage(e instanceof Error?e.message:'Save failed');}
 }
 return <section className="bg-slate-800 p-4 rounded space-y-3">
 <h2 className="text-xl font-bold">{page}</h2>
 <p className="text-sm text-slate-300">Basic record register. Specialized workflows are not yet implemented.</p>
 <label className="block">Title<input className="block p-2 w-full text-slate-900" value={title} onChange={e=>setTitle(e.target.value)}/></label>
 <label className="block">Reference<input className="block p-2 w-full text-slate-900" value={reference} onChange={e=>setReference(e.target.value)}/></label>
 <label className="block">Details<textarea className="block p-2 w-full text-slate-900" value={details} onChange={e=>setDetails(e.target.value)}/></label>
 <button type="button" className="bg-cyan-700 rounded p-2" onClick={save}>Save record</button>
 {message&&<p role="status">{message}</p>}
 <h3 className="font-semibold">Recent records</h3>
 {rows.map(r=><p key={r.id} className="border-t border-slate-600 py-2">{r.title} · {r.reference} · {r.status}<span className="block text-sm">{r.details}</span></p>)}
 </section>;
}
