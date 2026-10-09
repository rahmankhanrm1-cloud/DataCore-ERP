import React,{useEffect,useState} from 'react';
import {addDoc,onSnapshot,serverTimestamp} from 'firebase/firestore';
import {auth} from '../firebase';
import {erpCollection} from '../tenant';
import type {BusinessType} from './businessModules';

type Item={id:string;name:string;category:string;price:number;currency:string;active:boolean};
const catalog:Record<BusinessType,{page:string;collection:string;title:string}>={
 restaurant:{page:'Menu',collection:'menuItems',title:'Restaurant menu'},
 laundry:{page:'Services',collection:'services',title:'Laundry services'},
 grocery:{page:'Products',collection:'products',title:'Grocery products'},
 workshop:{page:'Spare Parts',collection:'parts',title:'Workshop parts'}
};
export function CatalogScreen({tenantId,businessType}:{tenantId:string;businessType:BusinessType}){
 const config=catalog[businessType];
 const [name,setName]=useState('');const [category,setCategory]=useState('');
 const [price,setPrice]=useState('0');const [currency,setCurrency]=useState('KWD');
 const [items,setItems]=useState<Item[]>([]);const [message,setMessage]=useState('');
 useEffect(()=>{
  if(auth.currentUser?.uid!==tenantId){setMessage('Please sign in');return;}
  return onSnapshot(erpCollection(config.collection),snap=>setItems(snap.docs.map(d=>({id:d.id,...d.data()} as Item)).slice(0,100)),e=>setMessage(e.message));
 },[tenantId,config.collection]);
 async function save(){
  try{
   if(auth.currentUser?.uid!==tenantId)throw new Error('Please sign in');
   const amount=Number(price);
   if(!name.trim()||!Number.isFinite(amount)||amount<0)throw new Error('Enter a name and valid price');
   await addDoc(erpCollection(config.collection),{tenantId,businessType,name:name.trim(),category:category.trim(),price:amount,currency,active:true,createdAt:serverTimestamp()});
   setName('');setCategory('');setPrice('0');setMessage('Saved');
  }catch(e){setMessage(e instanceof Error?e.message:'Save failed');}
 }
 return <section className="bg-slate-800 rounded p-4 space-y-3">
 <h2 className="text-xl font-bold">{config.title}</h2>
 <label className="block">Name<input className="block w-full p-2 text-slate-900" value={name} onChange={e=>setName(e.target.value)}/></label>
 <label className="block">Category<input className="block w-full p-2 text-slate-900" value={category} onChange={e=>setCategory(e.target.value)}/></label>
 <label className="block">Price<input type="number" min="0" step="0.001" className="block w-full p-2 text-slate-900" value={price} onChange={e=>setPrice(e.target.value)}/></label>
 <label className="block">Currency<select className="block w-full p-2 text-slate-900" value={currency} onChange={e=>setCurrency(e.target.value)}>{['KWD','INR','USD'].map(c=><option key={c}>{c}</option>)}</select></label>
 <button type="button" className="rounded bg-cyan-700 p-2" onClick={save}>Save item</button>
 {message&&<p role="status">{message}</p>}
 <h3 className="font-semibold">Saved items</h3>
 {items.map(i=><p className="border-t border-slate-600 py-2" key={i.id}>{i.name} · {i.category} · {i.price} {i.currency}</p>)}
 </section>;
}
