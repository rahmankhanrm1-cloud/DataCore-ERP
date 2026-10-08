import React, { useEffect, useState } from 'react';
import { addDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { auth } from '../firebase';
import { erpCollection } from '../tenant';
import { validateAttendance, type AttendanceRecord, type AttendanceStatus } from './employeeAttendance';
import type { BusinessType } from './businessModules';

export function AttendanceScreen({tenantId,businessType}:{tenantId:string;businessType:BusinessType}) {
 const [employeeId,setEmployeeId]=useState('');
 const [date,setDate]=useState(new Date().toISOString().slice(0,10));
 const [status,setStatus]=useState<AttendanceStatus>('present');
 const [message,setMessage]=useState('');
 const [records,setRecords]=useState<AttendanceRecord[]>([]);
 useEffect(()=>{
 if (auth.currentUser?.uid !== tenantId) { setRecords([]); setMessage('Please sign in again'); return; }
 return onSnapshot(erpCollection('attendance'),snap=>{
   setRecords(snap.docs.map(d=>d.data() as AttendanceRecord).slice(0,50));
 },err=>setMessage(err.message));
 },[tenantId]);
 async function save() {
   try {
     if(auth.currentUser?.uid!==tenantId) throw new Error('Please sign in again');
     const record:AttendanceRecord={id:crypto.randomUUID(),tenantId,businessType,employeeId:employeeId.trim(),workDate:date,status,breakMinutes:0,overtimeMinutes:0,recordedBy:tenantId};
     validateAttendance(record);
     await addDoc(erpCollection('attendance'),{...record,createdAt:serverTimestamp()});
     setMessage('Attendance saved');setEmployeeId('');
   } catch(e) {setMessage(e instanceof Error?e.message:'Save failed');}
 }
 return <section className="p-4 bg-slate-800 rounded space-y-3">
 <h2 className="text-xl font-bold">Attendance</h2>
 <label className="block">Employee ID<input className="block w-full p-2 text-slate-900" value={employeeId} onChange={e=>setEmployeeId(e.target.value)}/></label>
 <label className="block">Date<input type="date" className="block w-full p-2 text-slate-900" value={date} onChange={e=>setDate(e.target.value)}/></label>
 <label className="block">Status<select className="block w-full p-2 text-slate-900" value={status} onChange={e=>setStatus(e.target.value as AttendanceStatus)}>{(['present','absent','half_day','leave','holiday'] as const).map(x=><option key={x}>{x}</option>)}</select></label>
 <button className="bg-cyan-700 p-2 rounded" type="button" onClick={save}>Save Attendance</button>
 {message&&<p role="status">{message}</p>}
 <h3 className="font-semibold">Recent records</h3>
 {records.map(r=><p key={r.id}>{r.workDate} — {r.employeeId} — {r.status}</p>)}
 </section>;
}

