import { auth } from './firebase';
const OWNER_EMAIL = 'datacore.solutionswork@gmail.com';
export const isOwner = () => auth.currentUser?.email?.toLowerCase() === OWNER_EMAIL;
export function erpPath(collectionName: string): string[] {
  const user = auth.currentUser;
  if (!user) throw new Error('Sign in required');
  return isOwner() ? [collectionName] : ['tenants', user.uid, collectionName];
}
