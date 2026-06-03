"use client";

import type { Contact, Message } from "../types";
import { useRef, useEffect, useState } from "react";
import CameraModal from "../components/CameraModal";

interface ChatPanelProps {
  contacts: Contact[];
  activeChatId: string;
  setActiveChatId: (id: string) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  mobileChatOpen: boolean;
  setMobileChatOpen: (open: boolean) => void;
  newMessageText: string;
  setNewMessageText: (text: string) => void;
  onSendMessage: (e: React.FormEvent) => void;
  onSendMedia: (file: File) => void;
  onDeleteMessage: (messageId: string) => void;
  setContacts: React.Dispatch<React.SetStateAction<Contact[]>>;
  onStartVideoCall: () => void;
}

function MediaCountdown({ ts }: { ts?: number }) {
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    if (!ts) return;
    const TEN_MINUTES = 10 * 60 * 1000;

    const update = () => {
      const elapsed = Date.now() - ts;
      const left = Math.max(0, TEN_MINUTES - elapsed);
      setRemaining(left);
    };
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [ts]);

  if (remaining === null || remaining <= 0) return null;

  const minutes = Math.floor(remaining / 60000);
  const seconds = Math.floor((remaining % 60000) / 1000);

  return (
    <span className="inline-flex items-center gap-1 text-[9px] text-amber-500 dark:text-amber-400 font-bold mt-0.5">
      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      {minutes}:{seconds.toString().padStart(2, "0")}
    </span>
  );
}

function LightboxModal({
  url,
  type,
  onClose,
}: {
  url: string;
  type: "image" | "video";
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[90] bg-black/90 flex items-center justify-center animate-fadeIn cursor-pointer"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition cursor-pointer z-10"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
      {type === "image" ? (
        <img
          src={url}
          alt="Full size"
          className="max-h-[85vh] max-w-[90vw] rounded-2xl shadow-2xl object-contain"
          onClick={(e) => e.stopPropagation()}
        />
      ) : (
        <video
          src={url}
          controls
          autoPlay
          className="max-h-[85vh] max-w-[90vw] rounded-2xl shadow-2xl object-contain"
          onClick={(e) => e.stopPropagation()}
        />
      )}
    </div>
  );
}

export default function ChatPanel({
  contacts,
  activeChatId,
  setActiveChatId,
  searchQuery,
  setSearchQuery,
  mobileChatOpen,
  setMobileChatOpen,
  newMessageText,
  setNewMessageText,
  onSendMessage,
  onSendMedia,
  onDeleteMessage,
  onStartVideoCall,
}: ChatPanelProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const activeChat = contacts.find((c) => c.id === activeChatId) || contacts[0];

  const filteredContacts = contacts.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.role.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [lightbox, setLightbox] = useState<{ url: string; type: "image" | "video" } | null>(null);
  const [hoveredMsgId, setHoveredMsgId] = useState<string | null>(null);
  const [uploadingMedia, setUploadingMedia] = useState(false);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [contacts, activeChatId, mobileChatOpen]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const MAX_SIZE = 10 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      alert("File exceeds 10MB limit.");
      return;
    }

    onSendMedia(file);
    setShowAttachMenu(false);
    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleCameraCapture = (file: File) => {
    onSendMedia(file);
    setShowCamera(false);
  };

  return (
    <>
      {/* Sidebar: Chat thread list */}
      <aside
        className={`w-full md:w-80 lg:w-96 border-r border-slate-200/80 dark:border-slate-800/80 flex flex-col shrink-0 bg-white dark:bg-slate-900 transition-colors ${mobileChatOpen ? "hidden md:flex" : "flex"
          }`}
      >
        <div className="p-4 flex flex-col gap-3 shrink-0 border-b border-slate-100 dark:border-slate-800/60">
          <div className="relative">
            <span className="absolute inset-y-0 left-3 flex items-center text-slate-400 dark:text-slate-500">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </span>
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 w-full rounded-xl bg-slate-100 dark:bg-slate-800 border-none pl-9 pr-3 text-xs outline-none focus:ring-1 focus:ring-blue-500 transition-all text-slate-900 dark:text-white"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-2 py-2 pb-16 md:pb-4 flex flex-col gap-1">
          {filteredContacts.map((contact) => {
            const lastMessage = contact.messages[contact.messages.length - 1];
            const isActive = contact.id === activeChatId;
            return (
              <button
                key={contact.id}
                onClick={() => {
                  setActiveChatId(contact.id);
                  setMobileChatOpen(true);
                }}
                className={`w-full p-3 rounded-2xl flex items-center gap-3 transition-all text-left cursor-pointer ${isActive
                    ? "bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/50"
                    : "border border-transparent hover:bg-slate-50 dark:hover:bg-slate-800/40"
                  }`}
              >
                <div
                  className={`h-11 w-11 rounded-2xl bg-gradient-to-br ${contact.avatarColor} flex items-center justify-center font-bold text-white text-sm relative uppercase shrink-0 shadow-sm`}
                >
                  {contact.name.substring(0, 2)}
                  {(contact.status === "online" || contact.status === "typing...") && (
                    <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-900" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline mb-0.5">
                    <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate pr-2">{contact.name}</h4>
                    <span className="text-[9px] text-slate-400 dark:text-slate-500 shrink-0 font-medium">
                      {lastMessage?.timestamp ?? ""}
                    </span>
                  </div>
                  <p
                    className={`text-[11px] truncate font-medium ${contact.status === "typing..."
                        ? "text-emerald-500 font-extrabold animate-pulse"
                        : isActive
                          ? "text-slate-600 dark:text-slate-300"
                          : "text-slate-400 dark:text-slate-500"
                      }`}
                  >
                    {contact.status === "typing..."
                      ? "typing..."
                      : lastMessage
                        ? lastMessage.mediaUrl
                          ? lastMessage.mediaType === "video"
                            ? "🎬 Video"
                            : "📷 Photo"
                          : lastMessage.text
                        : "No messages yet"}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </aside>

      {/* Main: Active chat window */}
      <main
        className={`flex-1 flex flex-col bg-slate-50 dark:bg-slate-950 transition-colors overflow-hidden ${mobileChatOpen ? "flex" : "hidden md:flex"
          }`}
      >
        {activeChat ? (
          <>
            {/* Chat header */}
            <div className="bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800/80 px-6 py-3 flex items-center justify-between transition-colors shrink-0">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setMobileChatOpen(false)}
                  className="md:hidden p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 cursor-pointer"
                  aria-label="Back"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <div
                  className={`h-10 w-10 rounded-2xl bg-gradient-to-br ${activeChat.avatarColor} flex items-center justify-center font-extrabold text-white text-xs uppercase shadow-sm`}
                >
                  {activeChat.name.substring(0, 2)}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">{activeChat.name}</h3>
                  <p
                    className={`text-[10px] font-bold ${activeChat.status === "typing..."
                        ? "text-emerald-500 animate-pulse"
                        : "text-slate-400 dark:text-slate-500"
                      }`}
                  >
                    {activeChat.status === "typing..." ? "typing a message..." : activeChat.status}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700/80 text-slate-600 dark:text-slate-300 transition-all cursor-pointer">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.94.725l.548 2.2a1 1 0 01-.321.988l-1.305.98a10.582 10.582 0 004.872 4.872l.98-1.305a1 1 0 01.988-.321l2.2.548a1 1 0 01.725.94V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                </button>
                <button
                  onClick={onStartVideoCall}
                  className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700/80 text-slate-600 dark:text-slate-300 transition-all cursor-pointer"
                  title="Start Video Call"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4 bg-slate-50/50 dark:bg-slate-950/20">
              {activeChat.messages.length > 0 ? (
                activeChat.messages.map((msg: Message) => (
                  <div
                    key={msg.id}
                    className={`flex flex-col max-w-[70%] md:max-w-[60%] animate-slideUp ${msg.sender === "me" ? "self-end items-end" : "self-start items-start"
                      }`}
                    onMouseEnter={() => setHoveredMsgId(msg.id)}
                    onMouseLeave={() => setHoveredMsgId(null)}
                  >
                    <div className="relative group">
                      <div
                        className={`p-3.5 rounded-2xl text-xs font-semibold leading-relaxed shadow-sm ${msg.sender === "me"
                            ? "bg-blue-600 text-white rounded-tr-none"
                            : "bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 text-slate-800 dark:text-slate-100 rounded-tl-none"
                          }`}
                      >
                        {/* Media rendering */}
                        {msg.mediaUrl && msg.mediaType === "image" && (
                          <img
                            src={msg.mediaUrl}
                            alt="Shared image"
                            className="max-w-full max-h-[300px] object-contain rounded-xl mb-2 cursor-pointer hover:opacity-90 transition"
                            onClick={() =>
                              setLightbox({ url: msg.mediaUrl!, type: "image" })
                            }
                          />
                        )}
                        {msg.mediaUrl && msg.mediaType === "video" && (
                          <video
                            src={msg.mediaUrl}
                            controls
                            className="max-w-full max-h-60 rounded-xl mb-2"
                            onClick={(e) => e.stopPropagation()}
                          />
                        )}
                        {msg.text && msg.text !== "[Media expired and deleted]" ? (
                          msg.text
                        ) : msg.text === "[Media expired and deleted]" ? (
                          <span className="italic text-[11px] opacity-70">
                            Media expired and was deleted
                          </span>
                        ) : null}
                      </div>

                      {/* Delete button (appears on hover) */}
                      {hoveredMsgId === msg.id && msg.sender === "me" && (
                        <button
                          onClick={() => onDeleteMessage(msg.id)}
                          className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-rose-500 hover:bg-rose-600 text-white flex items-center justify-center shadow-md transition cursor-pointer animate-fadeIn"
                          title="Delete message"
                        >
                          <svg
                            className="w-3 h-3"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2.5}
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
                          </svg>
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className="text-[9px] text-slate-400 dark:text-slate-500 mt-1 px-1 font-bold">
                        {msg.timestamp}
                      </span>
                      {msg.mediaUrl && msg.publicId && (
                        <MediaCountdown ts={msg.ts} />
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="h-full flex items-center justify-center text-slate-300 dark:text-slate-700 text-xs">
                  No messages yet. Send a message to start!
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Upload in progress indicator */}
            {uploadingMedia && (
              <div className="px-6 py-2 bg-blue-50 dark:bg-blue-950/30 border-t border-blue-100 dark:border-blue-900/50 flex items-center gap-2">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
                <span className="text-xs text-blue-600 dark:text-blue-400 font-bold">
                  Uploading media...
                </span>
              </div>
            )}

            {/* Input bar */}
            <form
              onSubmit={onSendMessage}
              className="p-4 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800/80 flex gap-3 items-center shrink-0 relative"
            >
              {/* Attach button */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowAttachMenu(!showAttachMenu)}
                  className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 transition cursor-pointer"
                >
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
                      d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
                    />
                  </svg>
                </button>

                {/* Attachment menu dropdown */}
                {showAttachMenu && (
                  <div className="absolute bottom-12 left-0 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-700 p-2 flex flex-col gap-1 min-w-[160px] animate-slideUp z-20">
                    <button
                      type="button"
                      onClick={() => {
                        fileInputRef.current?.click();
                        setShowAttachMenu(false);
                      }}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 transition cursor-pointer text-left"
                    >
                      <svg
                        className="w-4 h-4 text-blue-500"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                        />
                      </svg>
                      Photo / Video
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowCamera(true);
                        setShowAttachMenu(false);
                      }}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 transition cursor-pointer text-left"
                    >
                      <svg
                        className="w-4 h-4 text-emerald-500"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                      </svg>
                      Camera
                    </button>
                  </div>
                )}
              </div>

              {/* Hidden file input */}
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*,video/*"
                onChange={handleFileSelect}
                className="hidden"
              />

              <input
                type="text"
                placeholder={`Message ${activeChat.name.split(" ")[0]}...`}
                value={newMessageText}
                onChange={(e) => setNewMessageText(e.target.value)}
                className="flex-1 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 border-none px-4 text-xs outline-none focus:ring-1 focus:ring-blue-500 transition-all dark:text-white"
              />
              <button
                type="submit"
                disabled={!newMessageText.trim()}
                className="h-10 w-10 rounded-xl bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center shadow-md shadow-blue-500/10 disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 disabled:active:scale-100 transition-all cursor-pointer"
              >
                <svg className="w-4 h-4 rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </form>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center p-8">
            <div className="h-14 w-14 rounded-2xl bg-slate-100 dark:bg-slate-900 flex items-center justify-center text-slate-300 dark:text-slate-700 shadow-inner">
              <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <h3 className="text-sm font-bold text-slate-600 dark:text-slate-400">Welcome to JustChat</h3>
            <p className="text-xs text-slate-400 dark:text-slate-500 max-w-xs leading-relaxed">
              Select a thread from the conversations list to start chatting.
            </p>
          </div>
        )}
      </main>

      {/* Camera modal */}
      {showCamera && (
        <CameraModal
          onCapture={handleCameraCapture}
          onClose={() => setShowCamera(false)}
        />
      )}

      {/* Lightbox overlay */}
      {lightbox && (
        <LightboxModal
          url={lightbox.url}
          type={lightbox.type}
          onClose={() => setLightbox(null)}
        />
      )}
    </>
  );
}
