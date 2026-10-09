import React,{useEffect,useState} from 'react';
import {addDoc,onSnapshot,serverTimestamp} from 'firebase/firestore';
import {auth} from '../firebase';
import {erpCollection} from '../tenant';
import type {BusinessType} from './businessModules';
type Employee={id:string;name:string;role:string;employeeCode:string;currency:string;basePay:number;active:boolean};
export function EmployeesScreen({tenantId,businessType}:{tenantId:string;businessType:BusinessType}){
 const [name,setName]=useState('');const [role,setRole]=useState('');
 const [code,setCode]=useState('');const [currency,setCurrency]=useState('KWD');
 const [pay,setPay]=useState('0');const [rows,setRows]=useState<Employee[]>([]);
 const [message,setMessage]=useState('');
 useEffect(()=>{if(auth.currentUser?.uid!==tenantId){setMessage('Sign in required');return;}
 return onSnapshot(erpCollection('employees'),s=>setRows(s.docs.map(d=>({id:d.id,...d.data()} as Employee)).slice(0,100)),e=>setMessage(e.message));},[tenantId]);
 async function save(){try{
 if(auth.currentUser?.uid!==tenantId)throw new Error('Sign in required');
 if(!name.trim()||!code.trim())throw new Error('Name and employee ID required');
 const basePay=Number(pay);if(!Number.isFinite(basePay)||basePay<0)throw new Error('Invalid salary');
 if(rows.some(r=>r.employeeCode===code.trim()))throw new Error('Employee ID already exists');
 await addDoc(erpCollection('employees'),{tenantId,businessType,name:name.trim(),role:role.trim(),employeeCode:code.trim(),currency,basePay,active:true,createdAt:serverTimestamp()});
 setMessage('Employee saved');setName('');setCode('');setRole('');
 }catch(e){setMessage(e instanceof Error?e.message:'Save failed');}}
 return <section className="bg-slate-800 p-4 rounded space-y-3">
 <h2 className="text-xl font-bold">Employees</h2>
 <label className="block">Employee name<input className="block p-2 w-full text-slate-900" value={name} onChange={e=>setName(e.target.value)}/></label>
 <label className="block">Employee ID<input className="block p-2 w-full text-slate-900" value={code} onChange={e=>setCode(e.target.value)}/></label>
 <label className="block">Role<input className="block p-2 w-full text-slate-900" value={role} onChange={e=>setRole(e.target.value)}/></label>
 <label className="block">Currency<select className="block p-2 w-full text-slate-900" value={currency} onChange={e=>setCurrency(e.target.value)}>{['KWD','INR','USD'].map(c=><option key={c}>{c}</option>)}</select></label>
 <label className="block">Base salary<input type="number" min="0" step="0.001" className="block p-2 w-full text-slate-900" value={pay} onChange={e=>setPay(e.target.value)}/></label>
 <button type="button" className="bg-cyan-700 rounded p-2" onClick={save}>Save employee</button>
 {message&&<p role="status">{message}</p>}
 <h3 className="font-semibold">Employee directory</h3>
 {rows.map(r=><p key={r.id} className="border-t border-slate-600 py-2">{r.employeeCode} — {r.name} — {r.role} — {r.basePay} {r.currency}</p>)}
 </section>;
}
