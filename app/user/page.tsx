"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { io, Socket } from "socket.io-client";
import ChatPanel from "../messages/ChatPanel";
import PeoplePanel from "../components/PeoplePanel";
import SettingsPanel from "../settings/SettingsPanel";
import VideoCallModal from "../components/VideoCallModal";
import type { UserProfile, Contact, Message } from "../components/types";

const getAvatarColor = (id: string) => {
  const gradients = [
    "from-pink-500 to-rose-500",
    "from-blue-500 to-indigo-500",
    "from-emerald-500 to-teal-500",
    "from-amber-500 to-orange-500",
    "from-purple-500 to-violet-500",
  ];
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % gradients.length;
  return gradients[index];
};

const normalizeContactName = (name: string) => name.trim().toLowerCase();

const dedupeContactsByName = (contacts: Contact[]) => {
  const seen = new Set<string>();

  return contacts.filter((contact) => {
    const key = normalizeContactName(contact.name);
    if (seen.has(key)) return false;

    seen.add(key);
    return true;
  });
};

export default function UserDashboard() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [socket, setSocket] = useState<Socket | null>(null);

  // Default tab is "people" — first screen after login
  const [activeTab, setActiveTab] = useState<"people" | "chat" | "settings">(
    "people",
  );
  const [theme, setTheme] = useState<"light" | "dark">("light");

  const [contacts, setContacts] = useState<Contact[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const [activeChatId, setActiveChatId] = useState<string>("");
  const [newMessageText, setNewMessageText] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [userStatus, setUserStatus] = useState("Exploring JustChat ✨");
  const [mobileChatOpen, setMobileChatOpen] = useState(false);
  const [selectedPeopleId, setSelectedPeopleId] = useState<string>("");

  // Video Calling State
  const [showVideoCallModal, setShowVideoCallModal] = useState(false);
  const [incomingCallData, setIncomingCallData] = useState<{
    from: string;
    callerName: string;
    signal: any;
  } | null>(null);

  // Auth guard + theme init
  useEffect(() => {
    if (typeof window === "undefined") return;
    const session = localStorage.getItem("currentUser");
    if (!session) {
      router.push("/login");
    } else {
      setCurrentUser(JSON.parse(session));
    }

    const isDark =
      document.documentElement.classList.contains("dark") ||
      localStorage.getItem("theme") === "dark";
    setTheme(isDark ? "dark" : "light");
    document.documentElement.classList.toggle("dark", isDark);

    setLoading(false);
  }, [router]);

  // Fetch dynamic contacts from SQLite database
  const fetchContacts = React.useCallback(async () => {
    if (!currentUser) return;
    try {
      const res = await fetch("/api/users");
      const data = await res.json();
      if (Array.isArray(data.users)) {
        const mapped: Contact[] = dedupeContactsByName(
          data.users.map((u: any) => ({
            id: u.id,
            name: u.name,
            email: u.email,
            status: "offline",
            avatarColor: getAvatarColor(u.id),
            gender: "male",
            role: "Member",
            messages: [],
          })),
        );

        setContacts((prev) => {
          return mapped.map((newC) => {
            const existing = prev.find(
              (c) =>
                c.id === newC.id ||
                normalizeContactName(c.name) === normalizeContactName(newC.name),
            );
            return {
              ...newC,
              messages: existing ? existing.messages : [],
              status: existing ? existing.status : newC.status,
            };
          });
        });

        // Set activeChatId and selectedPeopleId if they aren't set yet
        setContacts((currentContacts) => {
          if (currentContacts.length > 0) {
            setActiveChatId(
              (prevActive) => prevActive || currentContacts[0].id,
            );
            setSelectedPeopleId((prevSel) => prevSel || currentContacts[0].id);
          }
          return currentContacts;
        });
      }
    } catch (err) {
      console.error("Failed to load contacts", err);
    }
  }, [currentUser]);

  // Initial contacts fetch
  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  // Sync online status changes to contacts
  useEffect(() => {
    setContacts((prev) =>
      prev.map((c) => ({
        ...c,
        status: onlineUsers.includes(c.id) ? "online" : "offline",
      })),
    );
  }, [onlineUsers]);

  // Load existing messages from backend when component mounts
  // NOTE: This hook MUST be before any early returns to satisfy Rules of Hooks
  useEffect(() => {
    if (!currentUser || !activeChatId) return;
    const loadMessages = async () => {
      try {
        const res = await fetch(`/api/chat?contactId=${activeChatId}`);
        const data = await res.json();
        if (Array.isArray(data.messages)) {
          setContacts((prev) =>
            prev.map((c) =>
              c.id === activeChatId
                ? {
                  ...c,
                  messages: data.messages.map((m: any) => ({
                    id: m.id,
                    sender: m.from === currentUser?.id ? "me" : "them",
                    text: m.text,
                    timestamp: new Date(m.ts).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    }),
                  })),
                }
                : c,
            ),
          );
        }
      } catch (err) {
        console.error("Failed to load messages", err);
      }
    };
    loadMessages();
  }, [currentUser, activeChatId]);

  // Setup Socket.IO
  useEffect(() => {
    if (!currentUser) return;

    // Connect to the separate Socket.IO server
    const newSocket = io("http://localhost:3001");
    setSocket(newSocket);

    newSocket.on("connect", () => {
      newSocket.emit("register", currentUser.id);
    });

    newSocket.on("onlineUsers", (userIds: string[]) => {
      setOnlineUsers(userIds);
    });

    newSocket.on("userOnline", (userId: string) => {
      setOnlineUsers((prev) => {
        if (!prev.includes(userId)) {
          return [...prev, userId];
        }
        return prev;
      });

      // Refetch contacts if the online user is not in the contacts list
      setContacts((prev) => {
        const exists = prev.some((c) => c.id === userId);
        if (!exists && userId !== currentUser.id) {
          setTimeout(() => {
            fetchContacts();
          }, 50);
        }
        return prev;
      });
    });

    newSocket.on("userOffline", (userId: string) => {
      setOnlineUsers((prev) => prev.filter((id) => id !== userId));
    });

    newSocket.on("receiveMessage", (message: any) => {
      setContacts((prev) =>
        prev.map((c) => {
          if (c.id === message.from) {
            // Avoid duplicate messages
            if (c.messages.some((m) => m.id === message.id)) return c;

            return {
              ...c,
              messages: [
                ...c.messages,
                {
                  id: message.id,
                  sender: "them" as const,
                  text: message.text,
                  timestamp: new Date(message.ts).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  }),
                },
              ],
            };
          }
          return c;
        }),
      );
    });

    newSocket.on("incomingCall", (data) => {
      setIncomingCallData(data);
      setShowVideoCallModal(true);
    });

    return () => {
      newSocket.disconnect();
    };
  }, [currentUser, fetchContacts]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="flex flex-col items-center gap-3">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
          <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">
            Loading JustChat...
          </p>
        </div>
      </div>
    );
  }

  if (!currentUser) return null;

  const handleToggleTheme = () => {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    document.documentElement.classList.toggle("dark", next === "dark");
    localStorage.setItem("theme", next);
  };

  const handleLogout = () => {
    localStorage.removeItem("currentUser");
    router.push("/login");
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessageText.trim()) return;

    // Send message to backend API
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: newMessageText, contactId: activeChatId }),
      });
      const data = await res.json();
      if (data.message) {
        const msg = data.message;

        // Emit via Socket.IO
        if (socket) {
          socket.emit("sendMessage", {
            to: activeChatId,
            message: {
              id: msg.id,
              from: currentUser.id,
              text: msg.text,
              ts: msg.ts,
            },
          });
        }

        // Add to the active chat's messages
        setContacts((prev) =>
          prev.map((c) => {
            if (c.id === activeChatId) {
              return {
                ...c,
                messages: [
                  ...c.messages,
                  {
                    id: msg.id,
                    sender: "me" as const,
                    text: msg.text,
                    timestamp: new Date(msg.ts).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    }),
                  },
                ],
              };
            }
            return c;
          }),
        );
      }
    } catch (err) {
      console.error("Failed to send message", err);
    }

    setNewMessageText("");
  };

  return (
    <div className="h-dvh w-full flex flex-col bg-slate-50 dark:bg-slate-950 overflow-hidden text-slate-900 dark:text-slate-100 transition-colors">
      {/* ── TOP NAVBAR ── */}
      <header className="sticky top-0 z-40 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800/80 px-6 pt-[calc(8px+env(safe-area-inset-top,0px))] pb-2 flex items-center justify-between shrink-0 transition-colors">
        {/* Logo */}
        <div className="flex items-center gap-2.5">
          <span className="font-extrabold text-xl tracking-tight text-blue-500">
            JustChat
          </span>
        </div>

        {/* Desktop tab nav — People first */}
        <nav className="hidden md:flex items-center bg-slate-100 dark:bg-slate-800/50  rounded-xl">
          {(["people", "chat", "settings"] as const).map((tab) => {
            const labels: Record<typeof tab, string> = {
              people: "People",
              chat: "Chats",
              settings: "Settings",
            };
            const icons: Record<typeof tab, React.ReactNode> = {
              people: (
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                  />
                </svg>
              ),
              chat: (
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                  />
                </svg>
              ),
              settings: (
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
              ),
            };
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4  rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${activeTab === tab
                    ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm"
                    : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                  }`}
              >
                {icons[tab]}
                {labels[tab]}
              </button>
            );
          })}
        </nav>

        {/* Right actions */}
        <div className="flex items-center gap-3">
          {/* Dark mode toggle */}
          <button
            onClick={handleToggleTheme}
            className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:scale-105 active:scale-95 transition-all cursor-pointer"
            aria-label="Toggle theme"
          >
            {theme === "light" ? (
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
                />
              </svg>
            ) : (
              <svg
                className="w-4 h-4 text-amber-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m12.728 0l-.707-.707M6.343 6.343l-.707-.707M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
            )}
          </button>

          {/* Profile avatar → settings */}
          <button
            onClick={() => setActiveTab("settings")}
            className={`relative h-7 w-7 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-xs font-bold text-white uppercase ring-2 ring-transparent transition-all hover:scale-105 active:scale-95 cursor-pointer ${activeTab === "settings" ? "ring-blue-500" : ""
              }`}
          >
            {currentUser.username ? currentUser.username.substring(0, 1) : "ME"}
            <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-900" />
          </button>
        </div>
      </header>

      {/* ── BODY ── */}
      <div className="flex-1 flex overflow-hidden">
        {activeTab === "people" && (
          <PeoplePanel
            contacts={contacts}
            selectedPeopleId={selectedPeopleId}
            setSelectedPeopleId={setSelectedPeopleId}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            setActiveChatId={setActiveChatId}
            setActiveTab={setActiveTab}
            setMobileChatOpen={setMobileChatOpen}
          />
        )}

        {activeTab === "chat" && (
          <ChatPanel
            contacts={contacts}
            activeChatId={activeChatId}
            setActiveChatId={setActiveChatId}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            mobileChatOpen={mobileChatOpen}
            setMobileChatOpen={setMobileChatOpen}
            newMessageText={newMessageText}
            setNewMessageText={setNewMessageText}
            onSendMessage={handleSendMessage}
            setContacts={setContacts}
            onStartVideoCall={() => setShowVideoCallModal(true)}
          />
        )}

        {activeTab === "settings" && (
          <SettingsPanel
            currentUser={currentUser}
            userStatus={userStatus}
            setUserStatus={setUserStatus}
            theme={theme}
            onToggleTheme={handleToggleTheme}
            onLogout={handleLogout}
          />
        )}
      </div>

      {/* ── MOBILE BOTTOM TAB BAR ── */}
      <nav
        className={`md:hidden bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800/80 pt-3 pb-[calc(12px+env(safe-area-inset-bottom,0px))] px-6 flex justify-between items-center transition-colors shrink-0 ${mobileChatOpen ? "hidden" : "flex"
          }`}
      >
        {(
          [
            {
              tab: "people" as const,
              label: "People",
              badge: false,
              icon: (active: boolean) => (
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={active ? 2.5 : 2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                  />
                </svg>
              ),
            },
            {
              tab: "chat" as const,
              label: "Chats",
              badge: true,
              icon: (active: boolean) => (
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={active ? 2.5 : 2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                  />
                </svg>
              ),
            },
            {
              tab: "settings" as const,
              label: "Settings",
              badge: false,
              icon: (active: boolean) => (
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={active ? 2.5 : 2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
              ),
            },
          ] as const
        ).map(({ tab, label, icon, badge }) => {
          const isActive = activeTab === tab;
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex flex-col items-center gap-1 flex-1 relative transition-all cursor-pointer ${isActive
                  ? "text-blue-600 dark:text-blue-400 scale-105"
                  : "text-slate-400 dark:text-slate-500"
                }`}
            >
              {icon(isActive)}
              <span className="text-[10px] font-extrabold tracking-wide">
                {label}
              </span>
              {badge && (
                <span className="absolute top-0 right-[30%] h-2 w-2 rounded-full bg-rose-500 ring-2 ring-white dark:ring-slate-900 animate-pulse" />
              )}
            </button>
          );
        })}
      </nav>

      {/* Global animations */}
      <style jsx global>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: scale(0.97);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.22s cubic-bezier(0.4, 0, 0.2, 1) forwards;
        }
        .animate-slideUp {
          animation: slideUp 0.25s cubic-bezier(0.4, 0, 0.2, 1) forwards;
        }
      `}</style>

      {/* Video Call Modal Layer */}
      {showVideoCallModal && (
        <VideoCallModal
          socket={socket}
          currentUser={currentUser}
          recipientId={!incomingCallData ? activeChatId : undefined}
          recipientName={
            !incomingCallData
              ? contacts.find((c) => c.id === activeChatId)?.name
              : undefined
          }
          incomingCallData={incomingCallData}
          onClose={() => {
            setShowVideoCallModal(false);
            setIncomingCallData(null);
          }}
        />
      )}
    </div>
  );
}
