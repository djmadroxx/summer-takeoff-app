import {
  notify,
} from './notifications';

interface ServerNotification {
  id: string;
  userId: string;
  type:
    | 'success'
    | 'error'
    | 'info'
    | 'warning';
  text: string;
  isRead: boolean;
  createdAt: string;
}

interface NotificationMessage {
  type: 'notification';
  notification: ServerNotification;
}

let socket: WebSocket | null = null;

let reconnectTimer:
  | number
  | null = null;

let manuallyClosed = false;

function getWebSocketUrl() {
  const protocol =
    window.location.protocol === 'https:'
      ? 'wss:'
      : 'ws:';

  return `${protocol}//${window.location.host}/api/notifications/ws`;
}

export function connectNotificationSocket() {
  manuallyClosed = false;

  if (
    socket &&
    (
      socket.readyState ===
        WebSocket.OPEN ||
      socket.readyState ===
        WebSocket.CONNECTING
    )
  ) {
    return;
  }

  if (reconnectTimer !== null) {
    window.clearTimeout(
      reconnectTimer,
    );

    reconnectTimer = null;
  }

  const ws = new WebSocket(
    getWebSocketUrl(),
  );

  socket = ws;

  ws.addEventListener(
    'open',
    () => {
      if (socket !== ws) {
        ws.close();
      }
    },
  );

  ws.addEventListener(
    'message',
    (event) => {
      try {
        const data =
          JSON.parse(
            event.data,
          ) as NotificationMessage;

        if (
          data.type !==
          'notification'
        ) {
          return;
        }

        const notification =
          data.notification;

        notify(
          notification.type,
          notification.text,
        );
      } catch {
        // Hibás WebSocket üzenet ignorálása.
      }
    },
  );

  ws.addEventListener(
    'close',
    () => {
      if (socket === ws) {
        socket = null;
      }

      if (
        manuallyClosed
      ) {
        return;
      }

      reconnectTimer =
        window.setTimeout(
          () => {
            reconnectTimer = null;

            connectNotificationSocket();
          },
          3000,
        );
    },
  );

  ws.addEventListener(
    'error',
    () => {
      ws.close();
    },
  );
}

export function disconnectNotificationSocket() {
  manuallyClosed = true;

  if (
    reconnectTimer !== null
  ) {
    window.clearTimeout(
      reconnectTimer,
    );

    reconnectTimer = null;
  }

  if (socket) {
    socket.close();
    socket = null;
  }
}