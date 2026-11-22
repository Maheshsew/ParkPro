import PushTokenService from './PushTokenService';
import ReminderScheduler from './ReminderScheduler';

export const pushTokens = new PushTokenService(new ReminderScheduler());