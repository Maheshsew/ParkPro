import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'parkpro_reminders';

// Persists { [bookingId]: { uid, ids: [notificationId, ...] } } on this phone.
export default class ReminderStore {
  async _load() {
    try {
      const raw = await AsyncStorage.getItem(KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      return {};
    }
  }

  async _save(map) {
    try {
      await AsyncStorage.setItem(KEY, JSON.stringify(map));
    } catch (e) {}
  }

  async all() {
    return this._load();
  }

  async get(bookingId) {
    const map = await this._load();
    return map[bookingId] || null;
  }

  async set(bookingId, uid, ids) {
    const map = await this._load();
    map[bookingId] = { uid, ids };
    await this._save(map);
  }

  async remove(bookingId) {
    const map = await this._load();
    delete map[bookingId];
    await this._save(map);
  }
}