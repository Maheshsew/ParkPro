export const OPENING = { hour: 8, minute: 0 };
export const CLOSING = { hour: 22, minute: 0 };

const HOUR_MS = 3600 * 1000;
const pad = (n) => String(n).padStart(2, '0');
const label = (t) => `${pad(t.hour)}:${pad(t.minute)}`;

export const openingLabel = label(OPENING);
export const closingLabel = label(CLOSING);
export const hoursLabel = `${openingLabel} - ${closingLabel}`;

export function openingOf(date) {
  const d = new Date(date);
  d.setHours(OPENING.hour, OPENING.minute, 0, 0);
  return d;
}

export function closingOf(date) {
  const d = new Date(date);
  d.setHours(CLOSING.hour, CLOSING.minute, 0, 0);
  return d;
}

// Latest possible start so that at least 1 hour fits before closing
export function latestStartOf(date) {
  return new Date(closingOf(date).getTime() - HOUR_MS);
}

export function isOpenNow(nowMs = Date.now()) {
  const d = new Date(nowMs);
  return nowMs >= openingOf(d).getTime() && nowMs < closingOf(d).getTime();
}

// The whole booking must fit inside one opening day
export function validateWindow(startMs, endMs) {
  const s = new Date(startMs);
  if (startMs < openingOf(s).getTime() || endMs > closingOf(s).getTime()) {
    return 'OUTSIDE_HOURS';
  }
  return null;
}