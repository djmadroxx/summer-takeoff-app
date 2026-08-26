import { db } from './db/index.js';
import { notifications } from './db/schema.js';

export type NotificationType =
  | 'success'
  | 'error'
  | 'info'
  | 'warning';

interface NotificationSocket {
  readyState: number;
  send: (data: string) => void;
  on: (
    event: 'close',
    listener: () => void,
  ) => void;
}

export interface NotificationPayload {
  id: string;
  userId: string;
  type: NotificationType;
  text: string;
  isRead: boolean;
  createdAt: Date;
}

/*
 * Egy felhasználónak több eszköze is lehet
 * egyszerre bejelentkezve.
 */
const userSockets = new Map<
  string,
  Set<NotificationSocket>
>();

export function registerNotificationSocket(
  userId: string,
  socket: NotificationSocket,
) {
  let sockets = userSockets.get(userId);

  if (!sockets) {
    sockets = new Set();
    userSockets.set(userId, sockets);
  }

  sockets.add(socket);

  console.log(
    `[notifications] socket registered for user ${userId}. Active sockets: ${sockets.size}`,
  );

  socket.on('close', () => {
    sockets?.delete(socket);

    console.log(
      `[notifications] socket closed for user ${userId}. Active sockets: ${sockets?.size ?? 0}`,
    );

    if (
      sockets &&
      sockets.size === 0
    ) {
      userSockets.delete(userId);
    }
  });
}

export async function sendNotify(
  userId: string,
  type: NotificationType,
  text: string,
) {
  /*
   * 1. Mentés az adatbázisba.
   *
   * Ez akkor is megmarad, ha a user offline.
   */
  const result = await db
    .insert(notifications)
    .values({
      userId,
      type,
      text,
    })
    .returning({
      id: notifications.id,
      userId: notifications.userId,
      type: notifications.type,
      text: notifications.text,
      isRead: notifications.isRead,
      createdAt: notifications.createdAt,
    });

  const notification = result[0];

  if (!notification) {
    throw new Error(
      'Az értesítés létrehozása sikertelen.',
    );
  }

  /*
   * 2. Ha online a user, azonnal elküldjük
   * minden csatlakoztatott eszközére.
   */
  const sockets = userSockets.get(userId);

  if (sockets) {
    const payload = JSON.stringify({
      type: 'notification',
      notification,
    });

    for (const socket of sockets) {
      try {
        /*
         * WebSocket.OPEN = 1
         */
        if (socket.readyState === 1) {
          socket.send(payload);
        }
      } catch {
        /*
         * Egy hibás kapcsolat ne akadályozza
         * a többi eszköz értesítését.
         */
      }
    }
  }

  return notification;
}