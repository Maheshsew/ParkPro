const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');

initializeApp({
  credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)),
});
const db = getFirestore();

const MIN = 60 * 1000;
const TZ_OFFSET_H = 4; // Mauritius = UTC+4
const CLOSING = { hour: 22, minute: 0 }; // keep the same as CLOSING in src/constants/hours.js

const hhmm = (ms) =>
  new Date(ms).toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Indian/Mauritius',
  });

// Closing time (Mauritius) on the day of the booking start
function closingOf(startMs) {
  const local = new Date(startMs + TZ_OFFSET_H * 60 * MIN);
  return Date.UTC(
    local.getUTCFullYear(),
    local.getUTCMonth(),
    local.getUTCDate(),
    CLOSING.hour - TZ_OFFSET_H,
    CLOSING.minute
  );
}

function buildReminders(b) {
  const start = new Date(b.createdAt).getTime();
  const end = new Date(b.expectedDeparture).getTime();
  const closing = closingOf(start);
  const space = b.space.label;
  return [
    {
      key: 'start',
      at: start - 30 * MIN,
      until: start,
      title: 'Parking starts soon',
      body: `Your parking at ${space} starts at ${hhmm(start)}.`,
    },
    {
      key: 'end',
      at: end - 15 * MIN,
      until: end,
      title: 'Parking ending soon',
      body: `Your booking ends around ${hhmm(end)}. Show your QR code to the admin when you leave.`,
    },
    {
      key: 'closing',
      at: closing - 30 * MIN,
      until: closing,
      parkedFrom: start, // only if the booking has already started
      title: 'Parking closes soon',
      body: `Parking closes at ${hhmm(closing)}. If your vehicle is still parked, please leave before closing time.`,
    },
  ];
}

async function sendPush(messages) {
  if (messages.length === 0) return [];
  const res = await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(messages),
  });
  if (!res.ok) throw new Error(`Expo push failed: ${res.status} ${await res.text()}`);
  return (await res.json()).data;
}

// Admin alert (once per waiting booking): a car is past its end time and the next
// booking on that space starts within 30 minutes (or has already started)
async function alertAdmins(now) {
  const spacesSnap = await db.collection('spaces').get();
  const alerts = [];

  for (const s of spacesSnap.docs) {
    const list = s.data().reservations || [];
    const overstay = list.find((r) => r.end < now);
    if (!overstay) continue;

    const next = list
      .filter((r) => r.bookingId !== overstay.bookingId && r.end > now && r.start <= now + 30 * MIN)
      .sort((a, b) => a.start - b.start)[0];
    if (!next) continue;

    const ref = db.collection('bookings').doc(next.bookingId);
    const snap = await ref.get();
    if (!snap.exists || snap.data().overlapAlertSent) continue;

    alerts.push({ spaceId: s.id, overstay, next, ref });
  }
  if (alerts.length === 0) return;

  const adminSnap = await db.collection('adminTokens').get();
  const tokens = adminSnap.docs.flatMap((d) => d.data().tokens || []);
  if (tokens.length === 0) {
    console.log('Overlap found but no admin device registered');
    return;
  }

  const messages = alerts.flatMap((a) =>
    tokens.map((to) => ({
      to,
      title: `Space ${a.spaceId}: possible overlap`,
      body: `${a.overstay.bookingId} should have left at ${hhmm(a.overstay.end)} and is still parked. ${a.next.bookingId} arrives at ${hhmm(a.next.start)}. Open the Parking page to move it.`,
      sound: 'default',
      priority: 'high',
      channelId: 'booking-reminders',
    }))
  );
  await sendPush(messages);

  for (const a of alerts) await a.ref.update({ overlapAlertSent: true });
  console.log('Admin overlap alerts sent:', alerts.length);
}

async function main() {
  const now = Date.now();
  // Checked-out or cancelled bookings are no longer PENDING_PAYMENT, so they are skipped
  const snap = await db.collection('bookings').where('status', '==', 'PENDING_PAYMENT').get();
  console.log('Active bookings:', snap.size);

  for (const doc of snap.docs) {
    const b = doc.data();
    const sent = b.remindersSent || {};

    const due = buildReminders(b).filter(
      (r) =>
        !sent[r.key] &&
        now >= r.at &&
        now < r.until &&
        (r.parkedFrom == null || now >= r.parkedFrom)
    );
    if (due.length === 0) continue;

    const customerRef = db.collection('customers').doc(b.uid);
    const customer = await customerRef.get();
    const tokens = customer.exists ? customer.data().pushTokens || [] : [];

    const messages = due.flatMap((r) =>
      tokens.map((to) => ({
        to,
        title: r.title,
        body: r.body,
        sound: 'default',
        priority: 'high',
        channelId: 'booking-reminders',
      }))
    );

    const tickets = await sendPush(messages);
    for (let i = 0; i < tickets.length; i++) {
      if (tickets[i].details?.error === 'DeviceNotRegistered') {
        await customerRef.update({ pushTokens: FieldValue.arrayRemove(messages[i].to) });
      }
    }

    await doc.ref.update(
      Object.fromEntries(due.map((r) => [`remindersSent.${r.key}`, true]))
    );
    console.log(b.bookingId, 'sent:', due.map((r) => r.key).join(', '), '| devices:', tokens.length);
  }
  await alertAdmins(now);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});