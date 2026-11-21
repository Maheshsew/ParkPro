import { closingOf, closingLabel } from '../constants/hours';
import ReminderScheduler from './ReminderScheduler';
import ReminderStore from './ReminderStore';

const MINUTE = 60 * 1000;

// Minutes before each event
export const REMINDER_OFFSETS = {
  beforeStart: 30,
  beforeEnd: 15,
  beforeClosing: 30,
};

const hhmm = (d) => d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

export default class BookingReminderService {
  constructor(scheduler = new ReminderScheduler(), store = new ReminderStore()) {
    this.scheduler = scheduler;
    this.store = store;
  }

  // The three reminders of a booking: { title, body, at }
  buildReminders({ spaceLabel, start, end }) {
    const closing = closingOf(start);
    return [
      {
        title: 'Parking starts soon',
        body: `Your parking at ${spaceLabel} starts at ${hhmm(start)}.`,
        at: new Date(start.getTime() - REMINDER_OFFSETS.beforeStart * MINUTE),
      },
      {
        title: 'Parking ending soon',
        body: `Your booking ends around ${hhmm(end)}. Show your QR code to the admin when you leave.`,
        at: new Date(end.getTime() - REMINDER_OFFSETS.beforeEnd * MINUTE),
      },
      {
        title: 'Parking closes soon',
        body: `Parking closes at ${closingLabel}. If your vehicle is still parked, please leave before closing time.`,
        at: new Date(closing.getTime() - REMINDER_OFFSETS.beforeClosing * MINUTE),
      },
    ];
  }

  // Called right after a successful booking
  async scheduleForBooking({ bookingId, uid, spaceLabel, start, end }) {
    const allowed = await this.scheduler.prepare();
    if (!allowed) return;

    const ids = [];
    for (const r of this.buildReminders({ spaceLabel, start, end })) {
      if (r.at.getTime() <= Date.now() + 5000) continue; // already in the past
        console.log('REMINDER SCHEDULED:', r.title, 'for', r.at.toLocaleTimeString());
        ids.push(await this.scheduler.schedule(r.title, r.body, r.at));
    }

    if (ids.length > 0) {
      await this.store.set(bookingId, uid, ids);
    }
  }

  // Cancels the pending reminders of one booking
  async cancelForBooking(bookingId) {
    const entry = await this.store.get(bookingId);
    if (!entry) return;
    for (const id of entry.ids) {
      await this.scheduler.cancel(id);
    }
    await this.store.remove(bookingId);
  }

  // Cancels the reminders of every booking of this user (used on logout)
  async cancelForUser(uid) {
    const entries = await this.store.all();
    for (const [bookingId, entry] of Object.entries(entries)) {
      if (entry.uid === uid) await this.cancelForBooking(bookingId);
    }
  }

  // Called with the customer's current bookings: any booking that is no longer
  // active (paid, completed or cancelled) loses its reminders
  async sync(bookings) {
    const entries = await this.store.all();
    for (const b of bookings) {
      if (b.status !== 'PENDING_PAYMENT' && entries[b.bookingId]) {
        await this.cancelForBooking(b.bookingId);
      }
    }
  }
}