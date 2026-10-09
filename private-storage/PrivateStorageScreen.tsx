import React, { useEffect, useRef, useState } from 'react';
import { Capacitor, registerPlugin } from '@capacitor/core';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../firebase';
import { bytes, FOLDER_MIME, ownerAllowed, PrivateDrive, STORAGE_EMAIL, type DriveAccount, type DriveFile } from './drive';

const OwnerDrive = registerPlugin<{authorize():Promise<{accessToken:string}>}>('OwnerDrive');
const button = 'bg-cyan-800 rounded-xl px-4 py-3 text-sm disabled:opacity-40';
export function PrivateStorageScreen() {
  const client = useRef<PrivateDrive | null>(null);
  const epoch = useRef(0);
  const [account,setAccount] = useState<DriveAccount | null>(null);
  const [path,setPath] = useState<DriveFile[]>([]);
  const [files,setFiles] = useState<DriveFile[]>([]);
  const [busy,setBusy] = useState(false);
  const [message,setMessage] = useState('');
  const [progress,setProgress] = useState<number | null>(null);
  const [search,setSearch] = useState('');
  const [folderName,setFolderName] = useState('');
  const allowed = () => ownerAllowed(auth.currentUser);
  const disconnect = () => {
    epoch.current++; client.current?.close(); client.current=null;
    setAccount(null); setFiles([]); setPath([]); setProgress(null); setBusy(false);
  };
  useEffect(()=>{
    const unsub = onAuthStateChanged(auth,()=>{if(!allowed()) disconnect();});
    return ()=>{unsub();epoch.current++;client.current?.close();client.current=null;};
  },[]);
  async function run(action:()=>Promise<void>) {
    if(busy || !allowed()) return;
    const version=epoch.current; setBusy(true);setMessage('');
    try { await action(); }
    catch(e) { if(epoch.current===version) setMessage(e instanceof Error?e.message:'Storage request failed.'); }
    finally { if(epoch.current===version){setBusy(false);setProgress(null);} }
  }
  const refresh = async (folder=path[path.length-1]) => {
    const c=client.current;if(!c || !folder) return;
    const result=await c.list(folder.id);if(client.current===c)setFiles(result);
  };
  const connect = () => run(async()=>{
    if(!Capacitor.isNativePlatform()) throw new Error('Connect Google Drive from the DataCore ERP Android app.');
    const version=epoch.current;
    const result=await OwnerDrive.authorize();
    if(!allowed() || epoch.current!==version) return;
    client.current?.close();
    const c=new PrivateDrive(result.accessToken,allowed,()=>{disconnect();setMessage('Google session expired. Connect again.');});
    client.current=c;
    try {
      const connected=await c.connect(); const listed=await c.list(connected.root.id);
      if(client.current!==c)return;
      setAccount(connected.account);setPath([connected.root]);setFiles(listed);
    } catch(e) { if(client.current===c){c.close();client.current=null;}throw e; }
  });
  const enter = (next:DriveFile[])=>run(async()=>{const c=client.current;if(!c)return;const listed=await c.list(next[next.length-1].id);if(client.current===c){setPath(next);setFiles(listed);setSearch('');}});

  if(!allowed()) return <p className="p-4 text-amber-300">Private Storage requires the verified ERP owner account. Sign in with Google as datacore.solutionswork@gmail.com.</p>;
  return <section className="space-y-5 max-w-4xl">
    <div><h1 className="text-2xl font-bold">My Private Storage</h1><p className="text-slate-400 mt-2 text-sm">Your personal files in {STORAGE_EMAIL}. Storage uses your existing Google plan.</p></div>
    {!account ? <div className="space-y-4 p-5 bg-slate-900 rounded-2xl">
      <p className="text-sm">Select {STORAGE_EMAIL} in the Google account picker, then approve Drive access. Your ERP login stays unchanged. Only files created by this storage feature are listed.</p>
      <button className={button} disabled={busy} onClick={connect}>{busy?'Connecting…':'Connect My Google Drive'}</button>
    </div> : <>
      <div className="p-4 bg-slate-900 rounded-xl space-y-2"><p className="break-all text-sm">{account.user.emailAddress}</p><p className="text-cyan-300">Google account usage: {bytes(account.storageQuota.usage)} / {account.storageQuota.limit?bytes(account.storageQuota.limit):'Limit unavailable'}</p><p className="text-xs text-slate-400">Includes Gmail, Photos and Drive. This is the quota reported by Google when connected.</p><button disabled={busy} className="text-sm underline" onClick={disconnect}>Disconnect from this session</button></div>
      <nav className="flex flex-wrap gap-2" aria-label="Storage folders">{path.map((f,i)=><button key={f.id} disabled={busy} onClick={()=>enter(path.slice(0,i+1))} className="text-cyan-300 text-sm underline break-all">{i===0?'My Storage':f.name} /</button>)}</nav>
      <div className="flex flex-wrap gap-3">
        <label className={button + ' cursor-pointer'}>Upload Files<input className="hidden" type="file" multiple disabled={busy} onChange={e=>{
          const selected=Array.from(e.target.files || []);e.target.value='';
          void run(async()=>{const c=client.current;const folder=path[path.length-1];if(!c||!folder)return;
            for(const file of selected){setMessage(`Uploading ${file.name}`);await c.upload(folder.id,file,p=>{if(client.current===c)setProgress(p);});}
            await refresh();if(client.current===c)setMessage('Upload complete.');
          });
        }}/></label>
        <button disabled={busy} className={button} onClick={()=>run(()=>refresh())}>Refresh Files</button>
        <a className="px-4 py-3 text-sm underline" href="https://drive.google.com/drive/u/?authuser=rahmansarifa86%40gmail.com" target="_blank" rel="noreferrer">Open Google Drive</a>
      </div>
      <form className="flex flex-wrap gap-2" onSubmit={e=>{e.preventDefault();void run(async()=>{await client.current?.createFolder(path[path.length-1].id,folderName);setFolderName('');await refresh();});}}>
        <input className="bg-slate-800 rounded-xl p-3 min-w-0" value={folderName} onChange={e=>setFolderName(e.target.value)} placeholder="New folder name" maxLength={200} disabled={busy}/>
        <button className={button} disabled={busy || !folderName.trim()}>Create Folder</button>
      </form>
      <input className="w-full bg-slate-800 rounded-xl p-3" placeholder="Search this folder" aria-label="Search this folder" value={search} onChange={e=>setSearch(e.target.value)}/>
      <div className="space-y-2">{files.filter(f=>f.name.toLowerCase().includes(search.toLowerCase())).map(f=><div key={f.id} className="bg-slate-900 p-4 rounded-xl flex flex-wrap justify-between gap-3">
        <div className="min-w-0"><p className="break-all font-medium">{f.mimeType===FOLDER_MIME?'📁 ':'📄 '}{f.name}</p><p className="text-xs text-slate-400">{f.size?bytes(f.size):f.mimeType===FOLDER_MIME?'Folder':'File'}</p></div>
        <div className="flex gap-3 text-sm">{f.mimeType===FOLDER_MIME?<button disabled={busy} className="text-cyan-300" onClick={()=>enter([...path,f])}>Open</button>:<a className="text-cyan-300" href={`https://drive.google.com/file/d/${encodeURIComponent(f.id)}/view?authuser=${encodeURIComponent(STORAGE_EMAIL)}`} target="_blank" rel="noreferrer">Open / Download in Drive</a>}
          <button disabled={busy} className="text-rose-300" onClick={()=>{if(window.confirm(`Move ${f.name} to Google Drive Trash?`))void run(async()=>{await client.current?.trash(f.id);await refresh();});}}>Trash</button>
        </div>
      </div>)}{files.length===0 && <p className="text-slate-400 p-4">This folder is empty. Upload your first file.</p>}</div>
    </>}
    {progress!==null && <div><progress className="w-full" value={progress} max={100}/><p className="text-sm">{progress}% — Keep this screen open until upload completes.</p></div>}
    {message && <p role="status" className="text-amber-300 text-sm break-words">{message}</p>}
  </section>;
}
