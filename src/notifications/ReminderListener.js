import { useEffect, useRef } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../context/AuthContext';
import { bookingReminders, pushTokens } from './index';

export default function ReminderListener() {
  const { user } = useAuth();
  const previousUid = useRef(null);

  // Live: when a booking of this customer is checked out or cancelled, cancel its reminders
  useEffect(() => {
    if (!user) return undefined;
    const q = query(collection(db, 'bookings'), where('uid', '==', user.uid));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => bookingReminders.sync(snapshot.docs.map((d) => d.data())),
      (e) => console.log('REMINDER SYNC ERROR:', e.message)
    );
    return unsubscribe;
  }, [user?.uid]);

  // On logout: cancel that user's reminders
  useEffect(() => {
    if (!user && previousUid.current) {
      bookingReminders.cancelForUser(previousUid.current);
    }
    previousUid.current = user ? user.uid : null;
  }, [user]);

  // Save this device's push token for the logged-in customer
  useEffect(() => {
    if (user) pushTokens.register(user.uid);
  }, [user?.uid]);

  return null;
}