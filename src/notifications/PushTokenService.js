import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { doc, updateDoc, setDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db } from '../firebase/config';

export default class PushTokenService {
  constructor(scheduler) {
    this.scheduler = scheduler;
    this.token = null;
    this.isAdmin = false;
  }

  async getToken() {
    if (!(await this.scheduler.prepare())) return null;
    const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
    const { data } = await Notifications.getExpoPushTokenAsync({ projectId });
    return data;
  }

  // Customer: customers/{uid}.pushTokens    Admin: adminTokens/{uid}.tokens
  async register(uid, isAdmin = false) {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
      const token = await this.getToken();
      if (!token) return;
      this.token = token;
      this.isAdmin = isAdmin;
      if (isAdmin) {
        await setDoc(doc(db, 'adminTokens', uid), { tokens: arrayUnion(token) }, { merge: true });
      } else {
        await updateDoc(doc(db, 'customers', uid), { pushTokens: arrayUnion(token) });
      }
      console.log('PUSH: saved', isAdmin ? '(admin)' : '(customer)');
    } catch (e) {
      console.log('PUSH TOKEN ERROR:', e.message);
    }
  }

  async unregister(uid) {
    if (!this.token) return;
    try {
      if (this.isAdmin) {
        await updateDoc(doc(db, 'adminTokens', uid), { tokens: arrayRemove(this.token) });
      } else {
        await updateDoc(doc(db, 'customers', uid), { pushTokens: arrayRemove(this.token) });
      }
    } catch (e) {}
    this.token = null;
  }
}