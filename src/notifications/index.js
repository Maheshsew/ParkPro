import BookingReminderService from './BookingReminderService';
import PushTokenService from './PushTokenService';
import ReminderScheduler from './ReminderScheduler';

export const bookingReminders = new BookingReminderService();
export const pushTokens = new PushTokenService(new ReminderScheduler());