import { useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { pushTokens } from './index';

export default function ReminderListener() {
  const { user, isAdmin } = useAuth();

  // Save this device's push token (customer or admin)
  useEffect(() => {
    if (user) pushTokens.register(user.uid, isAdmin);
  }, [user?.uid, isAdmin]);

  return null;
}