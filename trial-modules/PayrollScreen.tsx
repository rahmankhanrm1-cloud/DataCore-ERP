import React, { useEffect, useState } from 'react';
import { addDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { auth } from '../firebase';
import { erpCollection } from '../tenant';
import { calculateNetPay } from './employeeAttendance';
import type { BusinessType } from './businessModules';

type PayrollRow={id:string;employeeId:string;month:string;currency:string;basePay:number;overtimePay:number;allowances:number;deductions:number;netPay:number};
export function PayrollScreen({tenantId,businessType}:{tenantId:string;businessType:BusinessType}) {
 const [employeeId,setEmployeeId]=useState('');
 const [month,setMonth]=useState(new Date().toISOString().slice(0,7));
 const [currency,setCurrency]=useState('KWD');
 const [basePay,setBasePay]=useState('0');
 const [overtimePay,setOvertimePay]=useState('0');
 const [allowances,setAllowances]=useState('0');
 const [deductions,setDeductions]=useState('0');
 const [rows,setRows]=useState<PayrollRow[]>([]);
 const [message,setMessage]=useState('');
 useEffect(()=>{
   if(auth.currentUser?.uid!==tenantId){setMessage('Please sign in again');return;}
   return onSnapshot(erpCollection('payroll'),snap=>setRows(snap.docs.map(d=>({id:d.id,...d.data()} as PayrollRow)).slice(0,50)),e=>setMessage(e.message));
 },[tenantId]);
 const values={basePay:Number(basePay),overtimePay:Number(overtimePay),allowances:Number(allowances),deductions:Number(deductions)};
 let net=0;let error='';
 try{net=calculateNetPay(values);}catch(e){error=e instanceof Error?e.message:'Invalid amount';}
 async function save(){
   try{
     if(auth.currentUser?.uid!==tenantId)throw new Error('Please sign in again');
     if(!employeeId.trim()||!/^\d{4}-\d{2}$/.test(month))throw new Error('Employee ID and month required');
     const netPay=calculateNetPay(values);
     await addDoc(erpCollection('payroll'),{tenantId,businessType,employeeId:employeeId.trim(),month,currency,...values,netPay,paid:false,createdAt:serverTimestamp()});
     setMessage('Payroll record saved');
   }catch(e){setMessage(e instanceof Error?e.message:'Could not save payroll');}
 }
 return <section className="p-4 rounded bg-slate-800 space-y-3">
 <h2 className="font-bold text-xl">Employee Payroll</h2>
 <label className="block">Employee ID<input className="block w-full p-2 text-slate-900" value={employeeId} onChange={e=>setEmployeeId(e.target.value)}/></label>
 <label className="block">Month<input type="month" className="block w-full p-2 text-slate-900" value={month} onChange={e=>setMonth(e.target.value)}/></label>
 <label className="block">Currency<select className="block w-full p-2 text-slate-900" value={currency} onChange={e=>setCurrency(e.target.value)}>{['KWD','INR','USD'].map(c=><option key={c}>{c}</option>)}</select></label>
 {([['Base pay',basePay,setBasePay],['Overtime pay',overtimePay,setOvertimePay],['Allowances',allowances,setAllowances],['Deductions',deductions,setDeductions]] as const).map(([label,value,setter])=><label className="block" key={label}>{label}<input type="number" min="0" step="0.001" className="block w-full p-2 text-slate-900" value={value} onChange={e=>setter(e.target.value)}/></label>)}
 <p role="status">{error||('Net pay: '+net.toFixed(currency==='KWD'?3:2)+' '+currency)}</p>
 <button type="button" onClick={save} disabled={!!error} className="rounded bg-cyan-700 p-2">Save payroll record</button>
 {message&&<p role="alert">{message}</p>}
 <h3 className="font-semibold">Recent payroll records</h3>
 {rows.map(r=><p key={r.id} className="border-t border-slate-600 py-2">{r.month} · {r.employeeId} · {r.netPay} {r.currency}</p>)}
 </section>;
}
