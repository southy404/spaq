import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api } from "../lib/api";
import { useAuth } from "./useAuth";
import { getSocket } from "../lib/socket";
import { ChatThread } from "../types/chat";

type AiThreadResponse = {
  thread?: {
    _id: string;
    unreadCount?: number;
    lastMessage?: string;
    lastMessageAt?: string;
    title?: string;
  };
};

type ChatMessagePayload = {
  data?: {
    threadId?: string;
    senderId?: string;
    text?: string;
    createdAt?: string;
  };
};

const POLL_INTERVAL_MS = 10000;
const SOCKET_ENABLED = false;

export function useChatUnread() {
  const { token, user } = useAuth() as any;

  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [aiUnread, setAiUnread] = useState(0);

  const isMountedRef = useRef(true);
  const isLoadingRef = useRef(false);

  const currentUserId = user?._id || user?.id || "";
  const isAthlete = user?.role === "athlete";

  const applyThreadData = useCallback(
    (chatThreads: ChatThread[], aiResult?: AiThreadResponse | null) => {
      if (!isMountedRef.current) return;

      setThreads(Array.isArray(chatThreads) ? chatThreads : []);

      if (isAthlete && aiResult?.thread) {
        setAiUnread(aiResult.thread.unreadCount ?? 0);
      } else {
        setAiUnread(0);
      }
    },
    [isAthlete]
  );

  const resetState = useCallback(() => {
    if (!isMountedRef.current) return;
    setThreads([]);
    setAiUnread(0);
  }, []);

  const loadThreads = useCallback(async () => {
    if (!user) {
      resetState();
      return;
    }

    if (isLoadingRef.current) return;
    isLoadingRef.current = true;

    try {
      const requests: Promise<any>[] = [api.get("/chat/threads")];

      if (isAthlete) {
        requests.push(api.get("/ai/thread"));
      }

      const results = await Promise.all(requests);
      const chatData = results[0]?.data?.data ?? [];
      const aiData = isAthlete
        ? (results[1]?.data?.data as AiThreadResponse | undefined) ?? null
        : null;

      applyThreadData(chatData, aiData);
    } catch (error) {
      console.error("Failed to load unread chat threads", error);
    } finally {
      isLoadingRef.current = false;
    }
  }, [user, isAthlete, applyThreadData, resetState]);

  const refreshThreads = useCallback(() => {
    void loadThreads();
  }, [loadThreads]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    void loadThreads();
  }, [loadThreads]);

  useEffect(() => {
    if (!SOCKET_ENABLED) return;
    if (!token || !user) return;

    let socket: ReturnType<typeof getSocket> | null = null;

    try {
      socket = getSocket(token);
    } catch (error) {
      console.error("Failed to initialize chat socket", error);
      return;
    }

    const refreshFromServer = () => {
      void loadThreads();
    };

    const onNewMessage = (payload: ChatMessagePayload) => {
      const message = payload?.data;
      if (!message?.threadId) return;

      const isOwnMessage = message.senderId === currentUserId;

      setThreads((prev) => {
        const exists = prev.some((thread) => thread._id === message.threadId);

        if (!exists) {
          queueMicrotask(() => {
            void loadThreads();
          });
          return prev;
        }

        return prev.map((thread) =>
          thread._id === message.threadId
            ? {
                ...thread,
                lastMessage: message.text ?? thread.lastMessage,
                lastMessageAt: message.createdAt ?? thread.lastMessageAt,
                unreadCount: isOwnMessage
                  ? thread.unreadCount ?? 0
                  : (thread.unreadCount ?? 0) + 1,
              }
            : thread
        );
      });
    };

    socket.on("connect", refreshFromServer);
    socket.on("chat:message:new", onNewMessage);

    return () => {
      if (!socket) return;
      socket.off("connect", refreshFromServer);
      socket.off("chat:message:new", onNewMessage);
    };
  }, [token, user, currentUserId, loadThreads]);

  useEffect(() => {
    const onRefresh = () => {
      void loadThreads();
    };

    window.addEventListener("chat:threads:refresh", onRefresh);

    return () => {
      window.removeEventListener("chat:threads:refresh", onRefresh);
    };
  }, [loadThreads]);

  useEffect(() => {
    if (!user) return;

    const interval = window.setInterval(() => {
      void loadThreads();
    }, POLL_INTERVAL_MS);

    return () => {
      window.clearInterval(interval);
    };
  }, [user, loadThreads]);

  const totalUnread = useMemo(() => {
    const threadUnread = threads.reduce(
      (sum, thread) => sum + (thread.unreadCount ?? 0),
      0
    );

    return threadUnread + aiUnread;
  }, [threads, aiUnread]);

  return {
    threads,
    totalUnread,
    aiUnread,
    setThreads,
    refreshThreads,
  };
}
