export type NotificationType = 'success' | 'error' | 'info' | 'warning';

export interface AppNotification {
  id: number;
  type: NotificationType;
  message: string;
}

type Listener = (
  notifications: AppNotification[],
) => void;

let notifications: AppNotification[] = [];
let nextId = 1;

const listeners = new Set<Listener>();

function emit() {
  listeners.forEach((listener) => {
    listener([...notifications]);
  });
}

export function subscribeToNotifications(
  listener: Listener,
) {
  listeners.add(listener);

  listener([...notifications]);

  return () => {
    listeners.delete(listener);
  };
}

export function notify(
  type: NotificationType,
  message: string,
  duration = 3500,
) {
  const id = nextId++;

  notifications = [
    ...notifications,
    {
      id,
      type,
      message,
    },
  ];

  emit();

  window.setTimeout(() => {
    notifications = notifications.filter(
      (notification) =>
        notification.id !== id,
    );

    emit();
  }, duration);

  return id;
}

export function closeNotification(
  id: number,
) {
  notifications = notifications.filter(
    (notification) =>
      notification.id !== id,
  );

  emit();
}

export function clearNotifications() {
  notifications = [];
  emit();
}