import { useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../context/AuthContext';
import { scheduler } from './index';
import { subscribeToActiveBooking, subscribeToSpaces, getOverlap } from '../storage/bookingStore';
import { closingOf, closingLabel } from '../constants/hours';

const MIN = 60 * 1000;
const ALERTED_KEY = 'alertedOverlapBookings';

const hhmm = (ms) =>
  new Date(ms).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

// The three customer reminders for one booking (same rules as the old GitHub script)
function buildReminders(b) {
  const start = new Date(b.createdAt).getTime();
  const end = new Date(b.expectedDeparture).getTime();
  const closing = closingOf(new Date(start)).getTime();
  const space = b.space.label;
  return [
    {
      at: start - 30 * MIN,
      title: 'Parking starts soon',
      body: `Your parking at ${space} starts at ${hhmm(start)}.`,
    },
    {
      at: end - 15 * MIN,
      title: 'Parking ending soon',
      body: `Your booking ends around ${hhmm(end)}. Show your QR code to the admin when you leave.`,
    },
    {
      // never before the booking has started
      at: Math.max(closing - 30 * MIN, start),
      title: 'Parking closes soon',
      body: `Parking closes at ${closingLabel}. If your vehicle is still parked, please leave before closing time.`,
    },
  ];
}

export default function ReminderListener() {
  const { user, isAdmin } = useAuth();

  // CUSTOMER: keep the phone's scheduled notifications in sync with the active booking.
  // Booking created / moved -> reschedule. Checked out / cancelled -> everything removed.
  useEffect(() => {
    if (!user || isAdmin) return;
    let stopped = false;
    let chain = Promise.resolve(); // runs syncs one after another

    const sync = async (booking) => {
      if (stopped || !(await scheduler.prepare())) return;
      await scheduler.cancelAll();
      if (!booking) return;
      const now = Date.now();
      for (const r of buildReminders(booking)) {
        if (r.at > now) await scheduler.schedule(r.title, r.body, new Date(r.at));
      }
    };

    const unsubscribe = subscribeToActiveBooking(user.uid, (booking) => {
      chain = chain.then(() => sync(booking)).catch((e) => console.log('REMINDER ERROR:', e.message));
    });
    return () => {
      stopped = true;
      unsubscribe();
    };
  }, [user?.uid, isAdmin]);

  // ADMIN (app open): notify once per waiting booking when a car has overstayed
  // and the next booking on that space is about to start.
  useEffect(() => {
    if (!user || !isAdmin) return;
    // Booking IDs that already produced an alert. Saved on the phone so a restart
    // of the app does not alert for the same overlap again.
    const alerted = new Set();
    let spaces = {};
    let stopped = false;
    const loaded = AsyncStorage.getItem(ALERTED_KEY)
      .then((raw) => JSON.parse(raw || '[]').forEach((id) => alerted.add(id)))
      .catch(() => {});

    const check = async () => {
      await loaded; // never check before the saved record is read
      if (stopped) return;
      for (const [spaceId, data] of Object.entries(spaces)) {
        const overlap = getOverlap(data.reservations);
        if (!overlap || alerted.has(overlap.waiting.bookingId)) continue;

        // Record it BEFORE any await, so the snapshot and the 30 s timer
        // can never both send the same alert
        alerted.add(overlap.waiting.bookingId);
        AsyncStorage.setItem(ALERTED_KEY, JSON.stringify([...alerted])).catch(() => {});

        if (!(await scheduler.prepare())) return;
        await scheduler.notifyNow(
          `Space ${spaceId}: possible overlap`,
          `${overlap.overstay.bookingId} should have left at ${hhmm(overlap.overstay.end)} and is still parked. ` +
            `${overlap.waiting.bookingId} arrives at ${hhmm(overlap.waiting.start)}. Open the Parking page to move it.`
        );
      }
    };

    const unsubscribe = subscribeToSpaces((map) => {
      spaces = map;
      check();
    });
    const timer = setInterval(check, 30 * 1000); // time passing can create an overlap too
    return () => {
      stopped = true;
      unsubscribe();
      clearInterval(timer);
    };
  }, [user?.uid, isAdmin]);

  return null;
}
