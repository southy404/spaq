import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { api } from "../../lib/api";
import { getSocket } from "../../lib/socket";
import {
  ChatMessage,
  ChatMessagesResponseMeta,
  ChatThread,
} from "../../types/chat";
import ChatSidebar from "../../components/chat/ChatSidebar";
import ChatWindow from "../../components/chat/ChatWindow";
import BrandLogo from "../../components/layout/BrandLogo";
import ThemeToggle from "../../components/layout/ThemeToggle";
import MobileConnectModal from "../../components/auth/MobileConnectModal";
import CoachesPage from "../athlete/CoachesPage";
import spaqBotAvatar from "../../assets/spaq-bot-avatar.png";

const AI_THREAD_ID = "SPAQ-bot";

type UiChatThread = ChatThread & {
  isAssistantThread?: boolean;
};

type AiThreadResponse = {
  thread: {
    _id: string;
    type?: "assistant";
    title?: string;
    lastMessage?: string;
    lastMessageAt?: string;
    unreadCount?: number;
  };
  messages: ChatMessage[];
};

const AI_META: ChatMessagesResponseMeta = {
  relationStatus: "active",
  isCoach: false,
  isAthlete: true,
};

function buildAiThread(data?: AiThreadResponse | null): UiChatThread | null {
  if (!data?.thread) return null;

  return {
    _id: AI_THREAD_ID,
    coachId: "",
    athleteId: "",
    relationId: "",
    relationStatus: "active",
    lastMessage:
      data.thread.lastMessage ||
      "Frag mich nach Motivation, Trends oder Verbesserungen.",
    lastMessageAt: data.thread.lastMessageAt || new Date().toISOString(),
    unreadCount: data.thread.unreadCount ?? 0,
    otherUser: {
      _id: AI_THREAD_ID,
      name: data.thread.title || "SPAQ Bot",
      email: "Lokaler KI-Assistent",
      role: "coach",
      avatarUrl: spaqBotAvatar,
    },
    isAssistantThread: true,
  };
}

function getInitials(name?: string) {
  if (!name) return "?";

  const parts = name.trim().split(/\s+/).filter(Boolean);

  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();

  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

export default function ChatPage() {
  const { user, token } = useAuth() as any;

  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [activeThread, setActiveThread] = useState<UiChatThread | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messagesMeta, setMessagesMeta] =
    useState<ChatMessagesResponseMeta | null>(null);

  const [threadsLoading, setThreadsLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [resolvingRequest, setResolvingRequest] = useState(false);

  const [aiThread, setAiThread] = useState<UiChatThread | null>(null);
  const [, setAiMessages] = useState<ChatMessage[]>([]);
  const [aiEnabled, setAiEnabled] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showMobileConnect, setShowMobileConnect] = useState(false);
  const [showCoaches, setShowCoaches] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement | null>(null);

  const currentUserId = user?._id || user?.id || "";
  const currentUserRole = user?.role as "coach" | "athlete" | undefined;
  const isAthlete = currentUserRole === "athlete";
  const isAiThread = activeThread?._id === AI_THREAD_ID;

  const activeThreadIdRef = useRef<string | null>(null);
  const initializedRef = useRef(false);

  useEffect(() => {
    activeThreadIdRef.current = activeThread?._id ?? null;
  }, [activeThread?._id]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        profileMenuRef.current &&
        !profileMenuRef.current.contains(event.target as Node)
      ) {
        setShowProfileMenu(false);
      }
    }

    if (showProfileMenu) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showProfileMenu]);

  const notifyGlobalChatRefresh = () => {
    window.dispatchEvent(new Event("chat:threads:refresh"));
  };

  const sortedThreads = useMemo(() => {
    const combined: UiChatThread[] = [
      ...(aiEnabled && aiThread ? [aiThread] : []),
      ...threads,
    ];

    return [...combined].sort((a, b) => {
      const aTime = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
      const bTime = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
      return bTime - aTime;
    });
  }, [threads, aiEnabled, aiThread]);

  const markThreadAsRead = useCallback(async (threadId: string) => {
    if (!threadId || threadId === AI_THREAD_ID) return;

    try {
      await api.post(`/chat/threads/${threadId}/read`);

      setThreads((prev) =>
        prev.map((thread) =>
          thread._id === threadId ? { ...thread, unreadCount: 0 } : thread
        )
      );

      notifyGlobalChatRefresh();
    } catch (error) {
      console.error("Failed to mark thread as read", error);
    }
  }, []);

  const markAiThreadAsRead = useCallback(async () => {
    try {
      await api.post("/ai/thread/read");

      const now = new Date().toISOString();

      setAiThread((prev) => (prev ? { ...prev, unreadCount: 0 } : prev));

      setAiMessages((prev) =>
        prev.map((message) =>
          message.senderId === AI_THREAD_ID && !message.readAt
            ? { ...message, readAt: now }
            : message
        )
      );

      setMessages((prev) =>
        prev.map((message) =>
          message.senderId === AI_THREAD_ID && !message.readAt
            ? { ...message, readAt: now }
            : message
        )
      );

      setActiveThread((prev) =>
        prev?._id === AI_THREAD_ID ? { ...prev, unreadCount: 0 } : prev
      );

      notifyGlobalChatRefresh();
    } catch (error) {
      console.error("Failed to mark AI thread as read", error);
    }
  }, []);

  const loadAiThread = useCallback(async () => {
    if (!isAthlete) {
      setAiEnabled(false);
      setAiThread(null);
      setAiMessages([]);
      return null;
    }

    try {
      const { data } = await api.get("/ai/thread");
      const payload = (data?.data ?? null) as AiThreadResponse | null;
      const nextAiThread = buildAiThread(payload);

      setAiThread(nextAiThread);
      setAiMessages((payload?.messages ?? []) as ChatMessage[]);
      setAiEnabled(!!nextAiThread);

      return nextAiThread;
    } catch (error) {
      console.error("Failed to load AI thread", error);
      setAiEnabled(false);
      setAiThread(null);
      setAiMessages([]);
      return null;
    }
  }, [isAthlete]);

  const loadThreads = useCallback(
    async (showLoader = false) => {
      try {
        if (showLoader) setThreadsLoading(true);

        const { data } = await api.get("/chat/threads");
        const items = (data.data ?? []) as ChatThread[];
        const currentActiveId = activeThreadIdRef.current;

        const normalizedItems = items.map((thread) =>
          thread._id === currentActiveId
            ? { ...thread, unreadCount: 0 }
            : thread
        );

        setThreads(normalizedItems);

        setActiveThread((prev) => {
          const aiCandidate =
            aiEnabled && aiThread ? (aiThread as UiChatThread) : null;
          const combined: UiChatThread[] = [
            ...(aiCandidate ? [aiCandidate] : []),
            ...normalizedItems,
          ];

          if (combined.length === 0) return null;

          if (!prev) return combined[0];

          const stillExists = combined.find((t) => t._id === prev._id);
          return stillExists ?? combined[0];
        });
      } catch (error) {
        console.error("Failed to load chat threads", error);
      } finally {
        if (showLoader) setThreadsLoading(false);
      }
    },
    [aiEnabled, aiThread]
  );

  const loadMessages = useCallback(
    async (threadId: string, showLoader = false) => {
      if (!threadId) return;

      if (threadId === AI_THREAD_ID) {
        try {
          if (showLoader) setMessagesLoading(true);

          const { data } = await api.get("/ai/thread");
          const payload = (data?.data ?? null) as AiThreadResponse | null;
          const nextAiThread = buildAiThread(payload);

          setAiThread(nextAiThread);
          setAiMessages((payload?.messages ?? []) as ChatMessage[]);
          setAiEnabled(!!nextAiThread);

          setMessages((payload?.messages ?? []) as ChatMessage[]);
          setMessagesMeta(AI_META);
        } catch (error) {
          console.error("Failed to load AI messages", error);
        } finally {
          if (showLoader) setMessagesLoading(false);
        }

        return;
      }

      try {
        if (showLoader) setMessagesLoading(true);

        const { data } = await api.get(`/chat/threads/${threadId}/messages`);
        setMessages((data.data ?? []) as ChatMessage[]);
        setMessagesMeta((data.meta ?? null) as ChatMessagesResponseMeta | null);

        setThreads((prev) =>
          prev.map((thread) =>
            thread._id === threadId
              ? {
                  ...thread,
                  relationStatus:
                    data.meta?.relationStatus ?? thread.relationStatus,
                }
              : thread
          )
        );

        await markThreadAsRead(threadId);
      } catch (error) {
        console.error("Failed to load messages", error);
      } finally {
        if (showLoader) setMessagesLoading(false);
      }
    },
    [markThreadAsRead]
  );

  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      setThreadsLoading(true);

      const loadedAiThread = await loadAiThread();

      try {
        const { data } = await api.get("/chat/threads");
        if (cancelled) return;

        const items = (data.data ?? []) as ChatThread[];
        setThreads(items);

        const combined: UiChatThread[] = [
          ...(loadedAiThread ? [loadedAiThread] : []),
          ...items,
        ];

        setActiveThread((prev) => {
          if (prev) {
            const stillExists = combined.find((t) => t._id === prev._id);
            if (stillExists) return stillExists;
          }

          return combined[0] ?? null;
        });

        initializedRef.current = true;
      } catch (error) {
        console.error("Failed to initialize chat page", error);
      } finally {
        if (!cancelled) setThreadsLoading(false);
      }
    };

    void init();

    return () => {
      cancelled = true;
    };
  }, [loadAiThread]);

  useEffect(() => {
    if (!activeThread?._id) {
      setMessages([]);
      setMessagesMeta(null);
      return;
    }

    void loadMessages(activeThread._id, true);
  }, [activeThread?._id, loadMessages]);

  useEffect(() => {
    if (activeThread?._id !== AI_THREAD_ID) return;

    const hasUnreadAiMessages = messages.some(
      (message) => message.senderId === AI_THREAD_ID && !message.readAt
    );

    const hasUnreadBadge = (aiThread?.unreadCount ?? 0) > 0;

    if (!hasUnreadAiMessages && !hasUnreadBadge) return;

    void markAiThreadAsRead();
  }, [activeThread?._id, messages, aiThread?.unreadCount, markAiThreadAsRead]);

  useEffect(() => {
    if (!activeThread?._id || activeThread._id === AI_THREAD_ID) return;

    setThreads((prev) =>
      prev.map((thread) =>
        thread._id === activeThread._id ? { ...thread, unreadCount: 0 } : thread
      )
    );

    void markThreadAsRead(activeThread._id);
  }, [activeThread?._id, messages.length, markThreadAsRead]);

  useEffect(() => {
    const onRefresh = () => {
      void loadThreads(false);
    };

    window.addEventListener("chat:threads:refresh", onRefresh);
    return () => window.removeEventListener("chat:threads:refresh", onRefresh);
  }, [loadThreads]);

  useEffect(() => {
    if (!activeThread?._id || activeThread._id === AI_THREAD_ID) return;

    const interval = window.setInterval(async () => {
      try {
        const { data } = await api.get(
          `/chat/threads/${activeThread._id}/messages`
        );

        const nextMessages = (data.data ?? []) as ChatMessage[];
        let hasNewForeignMessage = false;

        setMessages((prev) => {
          const prevLast = prev[prev.length - 1];
          const nextLast = nextMessages[nextMessages.length - 1];

          if (
            nextLast &&
            (!prevLast || nextLast._id !== prevLast._id) &&
            nextLast.senderId !== currentUserId
          ) {
            hasNewForeignMessage = true;
          }

          return nextMessages;
        });

        setMessagesMeta((data.meta ?? null) as ChatMessagesResponseMeta | null);

        setThreads((prev) =>
          prev.map((thread) =>
            thread._id === activeThread._id
              ? {
                  ...thread,
                  relationStatus:
                    data.meta?.relationStatus ?? thread.relationStatus,
                }
              : thread
          )
        );

        if (hasNewForeignMessage) {
          await markThreadAsRead(activeThread._id);
        }
      } catch (error) {
        console.error("Failed to refresh active chat messages", error);
      }
    }, 2500);

    return () => window.clearInterval(interval);
  }, [activeThread?._id, currentUserId, markThreadAsRead]);

  useEffect(() => {
    if (!token) return;

    let socket: any;

    try {
      socket = getSocket(token);
    } catch (error) {
      console.error("Failed to create socket", error);
      return;
    }

    const onConnectError = (err: any) => {
      console.error("socket connect error", err);
    };

    const onNewMessage = async (payload: {
      success: boolean;
      data: ChatMessage;
    }) => {
      const message = payload?.data;
      if (!message) return;

      const isActiveRegularThread =
        activeThreadIdRef.current === message.threadId;
      const isOwnMessage = message.senderId === currentUserId;

      if (isActiveRegularThread) {
        setMessages((prev) => {
          const exists = prev.some((m) => m._id === message._id);
          if (exists) return prev;
          return [...prev, message];
        });

        if (!isOwnMessage) {
          await markThreadAsRead(message.threadId);
        }
      }

      setThreads((prev) =>
        prev.map((thread) => {
          if (thread._id !== message.threadId) return thread;

          let nextRelationStatus = thread.relationStatus;

          if (message.meta?.type === "connect_accepted") {
            nextRelationStatus = "active";
          }

          if (message.meta?.type === "connect_declined") {
            nextRelationStatus = "revoked";
          }

          return {
            ...thread,
            lastMessage: message.text,
            lastMessageAt: message.createdAt,
            relationStatus: nextRelationStatus,
            unreadCount:
              isActiveRegularThread || isOwnMessage
                ? 0
                : (thread.unreadCount ?? 0) + 1,
          };
        })
      );
    };

    socket.on("connect_error", onConnectError);
    socket.on("chat:message:new", onNewMessage);

    return () => {
      socket.off("connect_error", onConnectError);
      socket.off("chat:message:new", onNewMessage);
    };
  }, [token, currentUserId, markThreadAsRead]);

  useEffect(() => {
    if (!token || !activeThread?._id || activeThread._id === AI_THREAD_ID)
      return;

    let socket: any;

    try {
      socket = getSocket(token);
      socket.emit("chat:join", { threadId: activeThread._id });
    } catch (error) {
      console.error("Failed to join socket room", error);
      return;
    }

    return () => {
      try {
        socket.emit("chat:leave", { threadId: activeThread._id });
      } catch {
        // ignore
      }
    };
  }, [token, activeThread?._id]);

  const refreshAfterMutation = async () => {
    await loadThreads(false);

    if (activeThreadIdRef.current) {
      await loadMessages(activeThreadIdRef.current, false);
    }
  };

  const handleSendMessage = async (text: string) => {
    if (!activeThread?._id) return;

    if (activeThread._id === AI_THREAD_ID) {
      try {
        setSending(true);

        const optimisticUserMessage: ChatMessage = {
          _id: `temp-user-${Date.now()}`,
          threadId: AI_THREAD_ID,
          senderId: currentUserId,
          receiverId: AI_THREAD_ID,
          text,
          createdAt: new Date().toISOString(),
          meta: { type: "user" },
        };

        setMessages((prev) => [...prev, optimisticUserMessage]);

        const { data } = await api.post("/ai/thread/messages", { text });
        const result = data?.data as
          | {
              userMessage?: ChatMessage;
              assistantMessage?: ChatMessage;
            }
          | undefined;

        if (result?.userMessage || result?.assistantMessage) {
          setMessages((prev) => {
            const withoutTemp = prev.filter(
              (m) => m._id !== optimisticUserMessage._id
            );

            const next = [...withoutTemp];
            if (result.userMessage) next.push(result.userMessage);
            if (result.assistantMessage) next.push(result.assistantMessage);
            return next;
          });

          await loadAiThread();
        } else {
          await loadAiThread();
          setMessages((prev) =>
            prev.filter((m) => m._id !== optimisticUserMessage._id)
          );
        }
      } catch (error) {
        console.error("Failed to send AI message", error);
        setMessages((prev) =>
          prev.filter((m) => !String(m._id).startsWith("temp-user-"))
        );
      } finally {
        setSending(false);
      }

      return;
    }

    if (messagesMeta?.relationStatus !== "active") return;

    try {
      setSending(true);

      const { data } = await api.post(
        `/chat/threads/${activeThread._id}/messages`,
        { text }
      );

      const message = data.data as ChatMessage;

      setMessages((prev) => {
        const exists = prev.some((m) => m._id === message._id);
        if (exists) return prev;
        return [...prev, message];
      });

      setThreads((prev) =>
        prev.map((thread) =>
          thread._id === activeThread._id
            ? {
                ...thread,
                lastMessage: message.text,
                lastMessageAt: message.createdAt,
                unreadCount: 0,
              }
            : thread
        )
      );

      notifyGlobalChatRefresh();
    } catch (error) {
      console.error("Failed to send message", error);
    } finally {
      setSending(false);
    }
  };

  const handleSendPdf = async (file: File) => {
    if (!activeThread?._id || activeThread._id === AI_THREAD_ID) return;

    if (messagesMeta?.relationStatus !== "active") return;

    try {
      setSending(true);

      const formData = new FormData();
      formData.append("file", file);

      const uploadRes = await api.post("/chat/uploads", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      const uploaded = uploadRes.data?.data as
        | {
            url: string;
            filename: string;
            mimeType: string;
            size: number;
          }
        | undefined;

      if (!uploaded) {
        throw new Error("Upload fehlgeschlagen");
      }

      const { data } = await api.post(
        `/chat/threads/${activeThread._id}/messages`,
        {
          text: "",
          attachments: [uploaded],
        }
      );

      const message = data.data as ChatMessage;

      setMessages((prev) => {
        const exists = prev.some((m) => m._id === message._id);
        if (exists) return prev;
        return [...prev, message];
      });

      setThreads((prev) =>
        prev.map((thread) =>
          thread._id === activeThread._id
            ? {
                ...thread,
                lastMessage: message.text || `📎 ${uploaded.filename}`,
                lastMessageAt: message.createdAt,
                unreadCount: 0,
              }
            : thread
        )
      );

      notifyGlobalChatRefresh();
    } catch (error) {
      console.error("Failed to send PDF", error);
    } finally {
      setSending(false);
    }
  };

  const handleAcceptRequest = async () => {
    if (!activeThread?._id || activeThread._id === AI_THREAD_ID) return;

    try {
      setResolvingRequest(true);
      await api.post(`/chat/threads/${activeThread._id}/accept`);
      await refreshAfterMutation();
      notifyGlobalChatRefresh();
    } catch (error) {
      console.error("Failed to accept request", error);
    } finally {
      setResolvingRequest(false);
    }
  };

  const handleDeclineRequest = async () => {
    if (!activeThread?._id || activeThread._id === AI_THREAD_ID) return;

    try {
      setResolvingRequest(true);
      await api.post(`/chat/threads/${activeThread._id}/decline`);
      await refreshAfterMutation();
      notifyGlobalChatRefresh();
    } catch (error) {
      console.error("Failed to decline request", error);
    } finally {
      setResolvingRequest(false);
    }
  };

  const canCoachRespondToRequest =
    !isAiThread &&
    currentUserRole === "coach" &&
    messagesMeta?.relationStatus === "pending" &&
    messages.some(
      (m) => m.meta?.type === "connect_request" && m.meta?.actionRequired
    );

  const canSendNormalMessages =
    isAiThread || messagesMeta?.relationStatus === "active";

  const pendingInfoText = isAiThread
    ? "SPAQ Bot analysiert deine Stats, Trends und mögliche Verbesserungen."
    : messagesMeta?.relationStatus === "pending"
    ? currentUserRole === "coach"
      ? "Offene Verbindungsanfrage. Du kannst sie annehmen oder ablehnen."
      : "Deine Verbindungsanfrage ist gesendet. Du bekommst die Antwort hier im Chat."
    : null;

  const composerPlaceholder = isAiThread
    ? "Frag nach Motivation, Fortschritt oder Verbesserungen..."
    : canSendNormalMessages
    ? "Nachricht schreiben..."
    : messagesMeta?.relationStatus === "pending"
    ? "Normale Nachrichten sind erst nach Annahme möglich"
    : "Dieser Chat ist nicht mehr aktiv";

  const logout = (useAuth() as any).logout;

  if (showCoaches && currentUserRole === "athlete") {
    return <CoachesPage onClose={() => setShowCoaches(false)} />;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-40 border-b border-subtle bg-app/55 backdrop-blur-xl">
        <div className="flex items-center justify-between px-5 py-4 sm:px-6 lg:px-8 xl:px-10">
          {/* LEFT: Logo */}
          <Link to={user?.role === "coach" ? "/coach" : "/athlete"}>
            <BrandLogo imageClassName="h-8 w-auto" />
          </Link>

          {/* RIGHT: Actions */}
          <div className="flex items-center gap-3">
            <div className="relative" ref={profileMenuRef}>
              <button
                onClick={() => setShowProfileMenu((v) => !v)}
                className="flex h-11 w-11 items-center justify-center rounded-2xl border border-subtle bg-surface transition-all hover:border-strong hover:bg-surface-2"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#FFD300] text-sm font-bold text-[#0f0f13]">
                  {getInitials(user?.name)}
                </div>
              </button>

              {showProfileMenu && (
                <div className="absolute right-0 top-full z-50 mt-3 w-64 overflow-hidden rounded-2xl border border-white/15 bg-white/70 shadow-[0_30px_80px_rgba(0,0,0,0.35)] backdrop-blur-2xl dark:border-white/10 dark:bg-white/[0.06]">
                  {/* HEADER */}
                  <div className="border-b border-white/10 px-4 py-4 dark:border-white/10">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#FFD300] text-sm font-bold text-[#0f0f13]">
                        {getInitials(user?.name)}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-medium text-primary">
                          {user?.name}
                        </p>
                        <p className="truncate text-xs text-muted">
                          {user?.email}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* MENU */}
                  <div className="p-2">
                    {currentUserRole === "athlete" && (
                      <>
                        <Link
                          to="/athlete/settings/profile"
                          onClick={() => setShowProfileMenu(false)}
                          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-secondary transition-all hover:bg-white/60 hover:text-primary dark:hover:bg-white/[0.08]"
                        >
                          <svg
                            className="h-4 w-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={1.7}
                              d="M5.121 17.804A9 9 0 1118.88 17.804M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                            />
                          </svg>
                          Profil
                        </Link>

                        <button
                          onClick={() => {
                            setShowProfileMenu(false);
                            setShowCoaches(true);
                          }}
                          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-secondary transition-all hover:bg-white/60 hover:text-primary dark:hover:bg-white/[0.08]"
                        >
                          Coaches
                        </button>

                        <button
                          onClick={() => {
                            setShowProfileMenu(false);
                            setShowMobileConnect(true);
                          }}
                          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-secondary transition-all hover:bg-white/60 hover:text-primary dark:hover:bg-white/[0.08]"
                        >
                          Mobile verbinden
                        </button>

                        <div className="my-2 h-px bg-white/10 dark:bg-white/10" />
                      </>
                    )}

                    {/* THEME */}
                    <div className="flex items-center justify-between rounded-xl px-3 py-2.5">
                      <span className="text-sm text-secondary">Design</span>
                      <ThemeToggle />
                    </div>

                    <div className="my-2 h-px bg-white/10 dark:bg-white/10" />

                    {/* LOGOUT */}
                    <button
                      onClick={logout}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-rose-500 transition-all hover:bg-rose-500/10"
                    >
                      Abmelden
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto flex min-h-0 w-full max-w-7xl flex-1 px-4 py-4 sm:px-6 sm:py-6">
        <div className="flex h-full min-h-0 w-full flex-col gap-5 lg:h-[calc(100vh-120px)] lg:flex-row">
          <div
            className={`${
              activeThread ? "hidden lg:block" : "block"
            } min-h-0 w-full lg:w-[320px] lg:shrink-0`}
          >
            <div className="h-full min-h-0">
              <ChatSidebar
                threads={sortedThreads}
                activeThreadId={activeThread?._id ?? null}
                onSelect={(thread) => setActiveThread(thread as UiChatThread)}
                isLoading={threadsLoading}
              />
            </div>
          </div>

          <div
            className={`${
              activeThread ? "block" : "hidden lg:block"
            } min-h-0 flex-1`}
          >
            <div className="flex h-full min-h-0 flex-col">
              {activeThread && pendingInfoText && (
                <div
                  className={`mb-4 rounded-2xl border px-4 py-3 ${
                    isAiThread
                      ? "border-cyan-400/20 bg-cyan-400/5"
                      : "border-[#FFD300]/20 bg-[#FFD300]/8"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border ${
                        isAiThread
                          ? "border-cyan-400/20 bg-cyan-400/10"
                          : "border-[#FFD300]/20 bg-[#FFD300]/12"
                      }`}
                    >
                      {isAiThread ? (
                        <span className="text-sm text-cyan-500 dark:text-cyan-300">
                          ✦
                        </span>
                      ) : (
                        <svg
                          className="h-4 w-4 text-[#FFD300]"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1.7}
                            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p
                        className={`text-sm font-medium ${
                          isAiThread
                            ? "text-cyan-600 dark:text-cyan-300"
                            : "text-[#c99700] dark:text-[#ffe88a]"
                        }`}
                      >
                        {isAiThread ? "SPAQ Bot" : "Verbindungsstatus"}
                      </p>
                      <p className="mt-1 text-sm text-secondary">
                        {pendingInfoText}
                      </p>
                    </div>
                  </div>

                  {isAiThread && (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {[
                        "Wie lief mein heutiger Tag?",
                        "Wo sehe ich Fortschritt?",
                        "Was sollte ich verbessern?",
                        "Motiviere mich kurz",
                      ].map((prompt) => (
                        <button
                          key={prompt}
                          onClick={() => void handleSendMessage(prompt)}
                          disabled={sending}
                          className="rounded-xl border border-subtle bg-surface px-3 py-2 text-xs text-secondary transition-all hover:border-strong hover:text-primary disabled:opacity-50"
                        >
                          {prompt}
                        </button>
                      ))}
                    </div>
                  )}

                  {canCoachRespondToRequest && (
                    <div className="mt-4 flex flex-wrap gap-3">
                      <button
                        onClick={handleAcceptRequest}
                        disabled={resolvingRequest}
                        className="rounded-xl bg-[#FFD300] px-4 py-2.5 font-medium text-black transition-all hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {resolvingRequest
                          ? "Wird verarbeitet..."
                          : "Akzeptieren"}
                      </button>

                      <button
                        onClick={handleDeclineRequest}
                        disabled={resolvingRequest}
                        className="rounded-xl border border-subtle bg-surface px-4 py-2.5 text-primary transition-all hover:border-strong hover:bg-surface-2 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Ablehnen
                      </button>
                    </div>
                  )}
                </div>
              )}

              <div className="min-h-0 flex-1">
                <ChatWindow
                  thread={activeThread}
                  messages={messages}
                  currentUserId={currentUserId}
                  onSend={handleSendMessage}
                  onSendPdf={handleSendPdf}
                  isLoading={messagesLoading}
                  isSending={sending}
                  onBack={async () => {
                    if (activeThread?._id === AI_THREAD_ID) {
                      await markAiThreadAsRead();
                    } else if (activeThread?._id) {
                      await markThreadAsRead(activeThread._id);
                    }

                    setActiveThread(null);
                  }}
                  disableComposer={!canSendNormalMessages}
                  composerPlaceholder={composerPlaceholder}
                />
              </div>
            </div>
          </div>
        </div>
      </main>
      {showMobileConnect && currentUserRole === "athlete" && (
        <MobileConnectModal onClose={() => setShowMobileConnect(false)} />
      )}
    </div>
  );
}
