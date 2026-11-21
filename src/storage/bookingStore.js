import { db } from '../firebase/config';
import {
  doc, getDoc, updateDoc, collection, onSnapshot, runTransaction,
} from 'firebase/firestore';
import { closingOf, validateWindow } from '../constants/hours';

const SOON_MS = 15 * 60 * 1000;

const sameDay = (aMs, bMs) => new Date(aMs).toDateString() === new Date(bMs).toDateString();

// Status of one space for a chosen window [startMs, endMs) (inside one opening day):
//  'green'  = free
//  'yellow' = free soon: from 15 min before the expected departure until closing
//             time (not bookable)
//  'red'    = window overlaps another booking
// Bookings of other days never affect this window.
export function getSlotStatus(reservations, startMs, endMs) {
  let status = 'green';
  for (const r of reservations || []) {
    if (!sameDay(r.start, startMs)) continue;
    if (endMs <= r.start) continue; // window ends before this booking starts

    const yellowFrom = Math.max(r.start, r.end - SOON_MS);
    if (startMs >= yellowFrom) {
      status = 'yellow';
    } else {
      return 'red';
    }
  }
  return status;
}

// The reservation that makes a space red/yellow for this window (null if green)
export function getBlockingReservation(reservations, startMs, endMs) {
  let found = null;
  for (const r of reservations || []) {
    if (!sameDay(r.start, startMs)) continue;
    if (endMs <= r.start) continue;
    const yellowFrom = Math.max(r.start, r.end - SOON_MS);
    if (startMs < yellowFrom) return r; // red booking wins
    found = r; // yellow booking
  }
  return found;
}


// A car is parked right now (booking of today that has started)
export function isOccupiedNow(reservations, nowMs = Date.now()) {
  return (reservations || []).some((r) => sameDay(r.start, nowMs) && r.start <= nowMs);
}

export async function createBooking({ uid, name, email, phone, vehicleReg, space, startTime, expectedDeparture }) {
  const counterRef = doc(db, 'counters', 'bookings');
  const spaceRef = doc(db, 'spaces', space.id);
  const startMs = new Date(startTime).getTime();
  const endMs = new Date(expectedDeparture).getTime();

  if (validateWindow(startMs, endMs)) {
    throw new Error('OUTSIDE_HOURS');
  }

  return runTransaction(db, async (tx) => {
    const counterSnap = await tx.get(counterRef);
    const spaceSnap = await tx.get(spaceRef);
    const reservations = spaceSnap.exists() ? spaceSnap.data().reservations || [] : [];

    // Re-check inside the transaction so two people can't take the same slot
    if (getSlotStatus(reservations, startMs, endMs) !== 'green') {
      throw new Error('SPACE_TAKEN');
    }

    const next = counterSnap.exists() ? counterSnap.data().last + 1 : 1;
    const id = `PP-${next}`;

    tx.set(counterRef, { last: next });
    tx.set(spaceRef, {
      reservations: [...reservations, { bookingId: id, start: startMs, end: endMs }],
    });
    tx.set(doc(db, 'bookings', id), {
      bookingId: id,
      uid,
      name,
      email,
      phone,
      vehicleReg,
      space,
      status: 'PENDING_PAYMENT',
      total: null,
      createdAt: startTime,
      expectedDeparture,
    });

    return id;
  });
}

export async function getBooking(bookingId) {
  const snap = await getDoc(doc(db, 'bookings', bookingId));
  return snap.exists() ? snap.data() : null;
}

// Time parked from the booking start. Billing stops at that day's closing time,
// so a forgotten checkout is never billed past closing.
export function calculateElapsedTime(createdAt) {
  const startMs = new Date(createdAt).getTime();
  const capMs = closingOf(new Date(startMs)).getTime();
  const endMs = Math.min(Date.now(), capMs);
  const totalMinutes = Math.max(1, Math.round((endMs - startMs) / (1000 * 60)));

  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;

  let display;
  if (h === 0) display = `${m} min`;
  else if (m === 0) display = `${h}h`;
  else display = `${h}h ${m}min`;

  return { totalMinutes, decimalHours: totalMinutes / 60, display };
}

export async function completePayment(bookingId, total, minutesParked) {
  const bookingRef = doc(db, 'bookings', bookingId);
  await updateDoc(bookingRef, { total, minutesParked, status: 'PAID' });
  const snap = await getDoc(bookingRef);
  return snap.data();
}

// Sets the booking status and removes its reservation so the slot is free again
async function releaseReservation(bookingId, spaceId, status) {
  const bookingRef = doc(db, 'bookings', bookingId);
  const spaceRef = doc(db, 'spaces', spaceId);

  await runTransaction(db, async (tx) => {
    const spaceSnap = await tx.get(spaceRef);
    tx.update(bookingRef, { status });
    if (spaceSnap.exists()) {
      const list = spaceSnap.data().reservations || [];
      tx.update(spaceRef, { reservations: list.filter((r) => r.bookingId !== bookingId) });
    }
  });
}

// Checkout done
export function vacateSpace(bookingId, spaceId) {
  return releaseReservation(bookingId, spaceId, 'COMPLETED');
}

// No-show cancelled by admin
export function cancelBooking(bookingId, spaceId) {
  return releaseReservation(bookingId, spaceId, 'CANCELLED');
}

// Live map: { A1: { reservations: [...] }, ... }
export function subscribeToSpaces(callback) {
  return onSnapshot(collection(db, 'spaces'), (snapshot) => {
    const map = {};
    snapshot.docs.forEach((d) => {
      map[d.id] = d.data();
    });
    callback(map);
  });
}