import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;
let lastToken: string | null = null;

function getBaseSocketUrl() {
  const raw = import.meta.env.VITE_API_URL?.trim();

  if (!raw) {
    return "http://localhost:5000";
  }

  return raw.replace(/\/api\/?$/, "");
}

export function getSocket(token: string) {
  const baseUrl = getBaseSocketUrl();

  if (socket && lastToken === token) {
    return socket;
  }

  if (socket) {
    socket.disconnect();
    socket = null;
  }

  lastToken = token;

  socket = io(baseUrl, {
    transports: ["websocket", "polling"],
    autoConnect: true,
    auth: {
      token,
    },
  });

  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
    lastToken = null;
  }
}
