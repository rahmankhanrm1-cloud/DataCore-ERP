import assert from 'node:assert/strict';
import { PrivateDrive, ownerAllowed, safeUploadURL, FOLDER_MIME } from './drive';

assert.equal(ownerAllowed(null),false);
assert.equal(ownerAllowed({email:'customer@example.com',emailVerified:true}),false);
assert.equal(ownerAllowed({email:'datacore.solutionswork@gmail.com',emailVerified:false}),false);
assert.equal(ownerAllowed({email:'datacore.solutionswork@gmail.com',emailVerified:true}),true);
assert.throws(()=>safeUploadURL('https://attacker.example/upload/drive/v3/files'));
assert.throws(()=>safeUploadURL('http://www.googleapis.com/upload/drive/v3/files'));
assert.throws(()=>safeUploadURL('https://www.googleapis.com/another/path'));

async function tests() {
  const account = {user:{emailAddress:'rahmansarifa86@gmail.com'},storageQuota:{limit:'5497558138880',usage:'100'}};
  const root = {id:'root-id',name:'DataCore My Private Storage',mimeType:FOLDER_MIME};
  let requests:{url:string;init:RequestInit}[]=[];
  const json = (value:unknown)=>new Response(JSON.stringify(value),{status:200});
  globalThis.fetch = async (input,init={})=>{requests.push({url:String(input),init});return json({user:{emailAddress:'wrong@example.com'},storageQuota:{}});};
  const wrong = new PrivateDrive('test',()=>true,()=>{});
  await assert.rejects(()=>wrong.connect(),/Select/);
  assert.equal(requests.length,1,'wrong account must not list or create files');
  requests=[];
  let allowed=true;
  globalThis.fetch = async (input,init={})=>{
    const url=String(input);requests.push({url,init});
    assert.equal(new Headers(init.headers).get('Authorization'),'Bearer test');
    if(url.includes('/about?'))return json(account);
    if(url.includes('value%3D%27root%27'))return json({files:[root]});
    if(url.includes('uploadType=resumable'))return new Response('',{status:200,headers:{Location:'https://www.googleapis.com/upload/drive/v3/files?upload_id=test'}});
    if(init.method==='PUT'){
      const range=new Headers(init.headers).get('Content-Range');
      if(range==='bytes 0-5242879/5242883')return new Response('',{status:308,headers:{Range:'bytes=0-5242879'}});
      assert.equal(range,'bytes 5242880-5242882/5242883');return json({id:'upload'});
    }
    if(url.includes('pageToken=next'))return json({files:[{id:'two',name:'Two',mimeType:'text/plain'}]});
    return json({files:[{id:'one',name:'One',mimeType:'text/plain'}],nextPageToken:'next'});
  };
  const drive=new PrivateDrive('test',()=>allowed,()=>{});
  const connected=await drive.connect();assert.equal(connected.root.id,'root-id');
  const files=await drive.list('root-id');assert.equal(files.length,2,'all listing pages returned');
  await assert.rejects(()=>drive.list('unrelated'),/Folder unavailable/);
  await assert.rejects(()=>drive.trash('unrelated'),/File unavailable/);
  const progress:number[]=[];
  await drive.upload('root-id',new File([new Uint8Array(5242883)],'large.bin'),p=>progress.push(p));
  assert.equal(progress.at(-1),100);assert.equal(requests.filter(r=>r.init.method==='PUT').length,2);
  const count=requests.length;allowed=false;
  await assert.rejects(()=>drive.list('root-id'),/Owner sign-in required/);
  assert.equal(requests.length,count,'logout blocks requests');
  drive.close();allowed=true;
  await assert.rejects(()=>drive.connect(),/Owner sign-in required/);
  let expired=false;
  globalThis.fetch=async ()=>new Response('',{status:401});
  const expiry=new PrivateDrive('test',()=>true,()=>{expired=true;});
  await assert.rejects(()=>expiry.connect(),/session expired/);assert(expired);
  console.log('PASS: owner authorization, account mismatch, token destination, pagination, chunked uploads, logout and token expiry');
}
tests().catch(e=>{console.error(e);process.exit(1);});
