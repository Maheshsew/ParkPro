import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

const CHANNEL_ID = 'booking-reminders';

export default class ReminderScheduler {
  constructor() {
    this.ready = false;
  }

  // Show notifications as a banner even while the app is open
  static configureForeground() {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });
  }

  // Creates the Android channel and asks for permission (once)
  async prepare() {
    if (this.ready) return true;

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
        name: 'Booking reminders',
        importance: Notifications.AndroidImportance.HIGH,
      });
    }

    let { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') {
      ({ status } = await Notifications.requestPermissionsAsync());
    }

    this.ready = status === 'granted';
    return this.ready;
  }

  // Fires at a future date. Returns the notification ID
  async schedule(title, body, date) {
    return Notifications.scheduleNotificationAsync({
      content: { title, body, sound: 'default' },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date,
        channelId: CHANNEL_ID,
      },
    });
  }

  // Fires right now
  async notifyNow(title, body) {
    return Notifications.scheduleNotificationAsync({
      content: { title, body, sound: 'default' },
      trigger: { channelId: CHANNEL_ID },
    });
  }

  async cancelAll() {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
    } catch (e) {}
  }
}
