"use client";

import type { Contact, Message } from "../types";
import { useRef, useEffect } from "react";

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
  setContacts: React.Dispatch<React.SetStateAction<Contact[]>>;
  onStartVideoCall: () => void;
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
  onStartVideoCall,
}: ChatPanelProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const activeChat = contacts.find((c) => c.id === activeChatId) || contacts[0];

  const filteredContacts = contacts.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.role.toLowerCase().includes(searchQuery.toLowerCase())
  );

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [contacts, activeChatId, mobileChatOpen]);

  return (
    <>
      {/* Sidebar: Chat thread list */}
      <aside
        className={`w-full md:w-80 lg:w-96 border-r border-slate-200/80 dark:border-slate-800/80 flex flex-col shrink-0 bg-white dark:bg-slate-900 transition-colors ${
          mobileChatOpen ? "hidden md:flex" : "flex"
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

        <div className="flex-1 overflow-y-auto px-2 py-2 pb-20 md:pb-4 flex flex-col gap-1">
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
                className={`w-full p-3 rounded-2xl flex items-center gap-3 transition-all text-left cursor-pointer ${
                  isActive
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
                    className={`text-[11px] truncate font-medium ${
                      contact.status === "typing..."
                        ? "text-emerald-500 font-extrabold animate-pulse"
                        : isActive
                        ? "text-slate-600 dark:text-slate-300"
                        : "text-slate-400 dark:text-slate-500"
                    }`}
                  >
                    {contact.status === "typing..."
                      ? "typing..."
                      : lastMessage
                      ? lastMessage.text
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
        className={`flex-1 flex flex-col bg-slate-50 dark:bg-slate-950 transition-colors overflow-hidden ${
          mobileChatOpen ? "flex" : "hidden md:flex"
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
                    className={`text-[10px] font-bold ${
                      activeChat.status === "typing..."
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
                    className={`flex flex-col max-w-[70%] md:max-w-[60%] animate-slideUp ${
                      msg.sender === "me" ? "self-end items-end" : "self-start items-start"
                    }`}
                  >
                    <div
                      className={`p-3.5 rounded-2xl text-xs font-semibold leading-relaxed shadow-sm ${
                        msg.sender === "me"
                          ? "bg-blue-600 text-white rounded-tr-none"
                          : "bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 text-slate-800 dark:text-slate-100 rounded-tl-none"
                      }`}
                    >
                      {msg.text}
                    </div>
                    <span className="text-[9px] text-slate-400 dark:text-slate-500 mt-1 px-1 font-bold">
                      {msg.timestamp}
                    </span>
                  </div>
                ))
              ) : (
                <div className="h-full flex items-center justify-center text-slate-300 dark:text-slate-700 text-xs">
                  No messages yet. Send a message to start!
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input bar */}
            <form
              onSubmit={onSendMessage}
              className="p-4 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800/80 flex gap-3 items-center shrink-0"
            >
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
    </>
  );
}
