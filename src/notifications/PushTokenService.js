import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { doc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db } from '../firebase/config';

export default class PushTokenService {
    constructor(scheduler) {
    this.scheduler = scheduler;
    this.token = null;
    }

    async getToken() {
    if (!(await this.scheduler.prepare())) return null;
    const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
    const { data } = await Notifications.getExpoPushTokenAsync({ projectId });
    return data;
    }

    async register(uid) {
    console.log('PUSH: register called for', uid);
    try {
        const token = await this.getToken();
        console.log('PUSH: token =', token);
        if (!token) return;
        this.token = token;
        await updateDoc(doc(db, 'customers', uid), { pushTokens: arrayUnion(token) });
        console.log('PUSH: saved to Firestore');
    } catch (e) {
        console.log('PUSH TOKEN ERROR:', e.message);
    }
    }

    async unregister(uid) {
    if (!this.token) return;
    try {
        await updateDoc(doc(db, 'customers', uid), { pushTokens: arrayRemove(this.token) });
    } catch (e) {}
    this.token = null;
    }
}