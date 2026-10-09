export const OWNER_EMAIL = 'datacore.solutionswork@gmail.com';
export const STORAGE_EMAIL = 'rahmansarifa86@gmail.com';
export const FOLDER_MIME = 'application/vnd.google-apps.folder';
const API = 'https://www.googleapis.com/drive/v3';
const TAG = 'datacoreOwnerStorage';
export type DriveFile = { id: string; name: string; mimeType: string; size?: string; modifiedTime?: string; parents?: string[]; appProperties?: Record<string,string> };
export type DriveAccount = { user: { emailAddress: string }; storageQuota: { limit?: string; usage?: string } };
export function ownerAllowed(user: { email: string | null; emailVerified: boolean } | null): boolean {
  return !!user?.emailVerified && user.email?.toLowerCase() === OWNER_EMAIL;
}
export function bytes(value: string | number = 0): string {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return 'Unknown';
  if (n < 1024) return `${n} B`;
  const units = ['KB','MB','GB','TB']; const i = Math.min(3,Math.floor(Math.log(n)/Math.log(1024))-1);
  return `${(n / 1024 ** (i+1)).toFixed(1)} ${units[i]}`;
}
export function safeUploadURL(raw: string): string {
  const url = new URL(raw);
  if (url.origin !== 'https://www.googleapis.com' || url.pathname !== '/upload/drive/v3/files') throw new Error('Invalid upload destination.');
  return url.href;
}
function quote(s: string): string { return s.replace(/\\/g,'\\\\').replace(/'/g,"\\'"); }

/** Google enforces file access using the user's scoped OAuth token. No shared server credentials. */
export class PrivateDrive {
  private token: string;
  private controller = new AbortController();
  private folders = new Set<string>();
  private visible = new Map<string,DriveFile>();
  constructor(token: string, private allowed: () => boolean, private expired: () => void) { this.token = token; }
  close() { this.token = ''; this.controller.abort(); this.folders.clear(); this.visible.clear(); }
  private async request(url: string, init: RequestInit = {}): Promise<Response> {
    if (!this.allowed() || !this.token || this.controller.signal.aborted) throw new Error('Owner sign-in required.');
    const headers = new Headers(init.headers); headers.set('Authorization',`Bearer ${this.token}`);
    const response = await fetch(url,{...init,headers,signal:this.controller.signal,redirect:'error'});
    if (!this.allowed() || this.controller.signal.aborted) throw new Error('Storage session closed.');
    if (response.status === 401) { this.close(); this.expired(); throw new Error('Google session expired. Connect Drive again.'); }
    if (!response.ok && response.status !== 308) {
      if (response.status === 403) throw new Error('Drive denied access. Check consent, available storage and Drive API configuration.');
      throw new Error(`Drive request failed (${response.status}). Retry after checking your connection.`);
    }
    return response;
  }
  private async json<T>(path: string, init: RequestInit = {}): Promise<T> { return (await this.request(`${API}${path}`,init)).json(); }
  private async listQuery(q: string): Promise<DriveFile[]> {
    const result: DriveFile[] = []; let token = '';
    do {
      const params = new URLSearchParams({q,pageSize:'100',fields:'nextPageToken,files(id,name,mimeType,size,modifiedTime,parents,appProperties)',orderBy:'folder,name'});
      if (token) params.set('pageToken',token);
      const page = await this.json<{files:DriveFile[];nextPageToken?:string}>(`/files?${params}`);
      result.push(...page.files); token = page.nextPageToken || '';
    } while(token);
    return result;
  }
  async connect(): Promise<{account:DriveAccount;root:DriveFile}> {
    const account = await this.json<DriveAccount>('/about?fields=user(emailAddress),storageQuota(limit,usage)');
    if (account.user.emailAddress.toLowerCase() !== STORAGE_EMAIL) { this.close(); throw new Error(`Select ${STORAGE_EMAIL} for storage.`); }
    const roots = await this.listQuery(`trashed = false and 'root' in parents and mimeType = '${FOLDER_MIME}' and appProperties has { key='${TAG}' and value='root' }`);
    if (roots.length > 1) throw new Error('Multiple storage folders found. Resolve duplicates in Google Drive before reconnecting.');
    const root = roots[0] || await this.json<DriveFile>('/files?fields=id,name,mimeType',{
      method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:'DataCore My Private Storage',mimeType:FOLDER_MIME,parents:['root'],appProperties:{[TAG]:'root'}})
    });
    this.folders.add(root.id);
    return {account,root};
  }
  async list(folder: string): Promise<DriveFile[]> {
    if (!this.folders.has(folder)) throw new Error('Folder unavailable.');
    const files = await this.listQuery(`trashed = false and '${quote(folder)}' in parents and appProperties has { key='${TAG}' and value='file' }`);
    this.visible = new Map(files.map(f=>[f.id,f]));
    for(const f of files) if(f.mimeType === FOLDER_MIME) this.folders.add(f.id);
    return files;
  }
  async createFolder(parent: string,name: string): Promise<void> {
    if (!this.folders.has(parent) || !name.trim()) throw new Error('Enter a folder name.');
    await this.json('/files',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:name.trim(),mimeType:FOLDER_MIME,parents:[parent],appProperties:{[TAG]:'file'}})});
  }
  async upload(parent: string,file: File,progress: (percent:number)=>void): Promise<void> {
    if(!this.folders.has(parent)) throw new Error('Folder unavailable.');
    const mime = file.type || 'application/octet-stream';
    if (file.size === 0) {
      await this.json('/files',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:file.name,mimeType:mime,parents:[parent],appProperties:{[TAG]:'file'}})});
      progress(100); return;
    }
    const start = await this.request('https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable',{
      method:'POST',headers:{'Content-Type':'application/json','X-Upload-Content-Type':mime,'X-Upload-Content-Length':String(file.size)},
      body:JSON.stringify({name:file.name,mimeType:mime,parents:[parent],appProperties:{[TAG]:'file'}})
    });
    const location = start.headers.get('Location'); if(!location) throw new Error('Google did not return an upload session.');
    const url = safeUploadURL(location); const chunk = 5 * 1024 * 1024;
    let offset = 0;
    while(offset < file.size) {
      const end = Math.min(offset+chunk,file.size);
      const response = await this.request(url,{method:'PUT',headers:{'Content-Type':mime,'Content-Range':`bytes ${offset}-${end-1}/${file.size}`},body:file.slice(offset,end)});
      if(response.status === 308) {
        const range = response.headers.get('Range'); const matched = range?.match(/^bytes=0-(\d+)$/);
        const next = matched ? Number(matched[1])+1 : 0;
        if(next <= offset || next > end) throw new Error('Upload progress could not be confirmed. Reconnect before retrying.');
        offset = next;
      } else { if(end !== file.size) throw new Error('Upload ended unexpectedly.'); offset = end; }
      progress(Math.round(offset/file.size*100));
    }
  }
  async trash(id: string): Promise<void> {
    if(!this.visible.has(id)) throw new Error('File unavailable.');
    await this.json(`/files/${encodeURIComponent(id)}`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({trashed:true})});
    this.visible.delete(id); this.folders.delete(id);
  }
}
