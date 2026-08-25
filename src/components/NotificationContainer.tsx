import {
  AlertCircle,
  CheckCircle2,
  X,
} from 'lucide-react';

import {
  closeNotification,
  subscribeToNotifications,
  type AppNotification,
} from '../lib/notifications';

import {
  useEffect,
  useState,
} from 'react';

export function NotificationContainer() {
  const [
    notifications,
    setNotifications,
  ] = useState<AppNotification[]>([]);

  useEffect(() => {
    return subscribeToNotifications(
      setNotifications,
    );
  }, []);

  return (
    <div className="notification-container">
      {notifications.map(
        (notification) => (
          <div
            key={notification.id}
            className={`token-notification ${
              notification.type === 'success'
                ? 'success'
                : 'error'
            }`}
            role="alert"
          >
            <div className="token-notification-icon">
              {notification.type ===
              'success' ? (
                <CheckCircle2 size={20} />
              ) : (
                <AlertCircle size={20} />
              )}
            </div>

            <span>
              {notification.message}
            </span>

            <button
              type="button"
              onClick={() =>
                closeNotification(
                  notification.id,
                )
              }
              aria-label="Értesítés bezárása"
            >
              <X size={17} />
            </button>
          </div>
        ),
      )}
    </div>
  );
}