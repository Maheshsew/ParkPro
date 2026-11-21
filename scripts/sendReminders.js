const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');

initializeApp({
  credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)),
});
const db = getFirestore();

const MIN = 60 * 1000;
const TZ_OFFSET_H = 4; // Mauritius = UTC+4
const CLOSING_HOUR = 17;

const hhmm = (ms) =>
  new Date(ms).toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Indian/Mauritius',
  });

// 17:00 Mauritius time on the day of the booking start
function closingOf(startMs) {
  const local = new Date(startMs + TZ_OFFSET_H * 60 * MIN);
  return Date.UTC(
    local.getUTCFullYear(),
    local.getUTCMonth(),
    local.getUTCDate(),
    CLOSING_HOUR - TZ_OFFSET_H,
    0
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
      body: `Parking closes at ${CLOSING_HOUR}:00. If your vehicle is still parked, please leave before closing time.`,
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
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});