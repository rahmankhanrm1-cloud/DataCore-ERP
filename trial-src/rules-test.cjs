const { initializeTestEnvironment, assertSucceeds, assertFails } = require('@firebase/rules-unit-testing');
const { doc, getDoc, setDoc, Timestamp } = require('firebase/firestore');
(async () => {
 const env = await initializeTestEnvironment({projectId:'demo-datacore-trial',firestore:{host:'127.0.0.1',port:8080,rules:require('fs').readFileSync('firestore.rules','utf8')}});
 try {
  const now=Timestamp.now();
  const active=Timestamp.fromMillis(Date.now()-60*60*1000);
  const expired=Timestamp.fromMillis(Date.now()-73*60*60*1000);
  await env.withSecurityRulesDisabled(async c=>{
   const db=c.firestore();
   await setDoc(doc(db,'trialAccounts','alice'),{status:'active',createdAt:active});
   await setDoc(doc(db,'trialAccounts','expired'),{status:'active',createdAt:expired});
   await setDoc(doc(db,'trialAccounts','revoked'),{status:'revoked',createdAt:active});
   await setDoc(doc(db,'products','legacy'),{name:'owner'});
   await setDoc(doc(db,'tenants','alice','products','a'),{name:'alice'});
   await setDoc(doc(db,'tenants','expired','products','e'),{name:'expired'});
  });
  const as=(uid,email)=>env.authenticatedContext(uid,email?{email,firebase:{sign_in_provider:'password'}}:{}).firestore();
  const alice=as('alice','alice@example.com');
  const bob=as('bob','bob@example.com');
  const old=as('expired','expired@example.com');
  const revoked=as('revoked','revoked@example.com');
  const owner=as('owner','datacore.solutionswork@gmail.com');
  const anon=env.unauthenticatedContext().firestore();
  await assertSucceeds(getDoc(doc(alice,'tenants','alice','products','a')));
  await assertSucceeds(setDoc(doc(alice,'tenants','alice','products','new'),{name:'new'}));
  await assertFails(getDoc(doc(bob,'tenants','alice','products','a')));
  await assertFails(getDoc(doc(old,'tenants','expired','products','e')));
  await assertFails(getDoc(doc(revoked,'tenants','revoked','products','x')));
  await assertFails(getDoc(doc(alice,'products','legacy')));
  await assertFails(getDoc(doc(anon,'products','legacy')));
  await assertFails(setDoc(doc(alice,'trialAccounts','alice'),{status:'active',createdAt:now}));
  await assertSucceeds(getDoc(doc(owner,'products','legacy')));
  await assertSucceeds(getDoc(doc(owner,'trialAccounts','alice')));
  await assertFails(getDoc(doc(owner,'tenants','alice','products','a')));
  console.log('PASS: 11 security assertions (active, expired, revoked, cross-tenant, owner, anonymous, self-provision)');
 } finally {await env.cleanup();}
})().catch(e=>{console.error(e);process.exit(1)});
