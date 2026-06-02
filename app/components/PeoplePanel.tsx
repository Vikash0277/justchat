"use client";

import type { Contact } from "../types";

interface PeoplePanelProps {
  contacts: Contact[];
  selectedPeopleId: string;
  setSelectedPeopleId: (id: string) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  setActiveChatId: (id: string) => void;
  setActiveTab: (tab: "people" | "chat" | "settings") => void;
  setMobileChatOpen: (open: boolean) => void;
}

export default function PeoplePanel({
  contacts,
  selectedPeopleId,
  setSelectedPeopleId,
  searchQuery,
  setSearchQuery,
  setActiveChatId,
  setActiveTab,
  setMobileChatOpen,
}: PeoplePanelProps) {
  const filteredContacts = contacts.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.role.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedContact = contacts.find((c) => c.id === selectedPeopleId) || contacts[0];

  const openChat = (id: string) => {
    setActiveChatId(id);
    setActiveTab("chat");
    setMobileChatOpen(true);
  };

  return (
    <>
      {/* Sidebar: Directory list */}
      <aside className="w-full md:w-80 lg:w-96 border-r border-slate-200/80 dark:border-slate-800/80 flex flex-col shrink-0 bg-white dark:bg-slate-900 transition-colors">
        <div className="p-2 flex flex-col gap-3 shrink-0  dark:border-slate-800/60">

          <div className="relative">
            <span className="absolute inset-y-0 left-3 flex items-center text-slate-400 dark:text-slate-500">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </span>
            <input
              type="text"
              placeholder="Search people..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 w-full rounded-xl bg-slate-100 dark:bg-slate-800 border-none pl-9 pr-3 text-xs outline-none focus:ring-1 focus:ring-blue-500 transition-all text-slate-900 dark:text-white"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto  py-2 pb-16 md:pb-4 flex flex-col gap-1">
          {filteredContacts.map((contact) => {
            const isSelected = contact.id === selectedPeopleId;
            return (
              <button
                key={contact.id}
                onClick={() => {
                  setSelectedPeopleId(contact.id);
                  // On mobile jump straight to chat
                  if (typeof window !== "undefined" && window.innerWidth < 768) {
                    openChat(contact.id);
                  }
                }}
                className={`w-full p-2  flex items-center justify-between transition-all text-left cursor-pointer border-b border-slate-100 dark:border-slate-800/60 ${isSelected
                    ? "bg-blue-50 dark:bg-blue-950/30"
                    : "hover:bg-slate-50 dark:hover:bg-slate-800/40"
                  }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div
                    className={`h-7 w-7 rounded-2xl bg-gradient-to-br ${contact.avatarColor} flex items-center justify-center font-bold text-white text-xs relative uppercase shrink-0 shadow-sm`}
                  >
                    {contact.name.substring(0, 1)}
                    {(contact.status === "online" || contact.status === "typing...") && (
                      <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-900" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">{contact.name}</h4>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium truncate">{contact.role}</p>
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    openChat(contact.id);
                  }}
                  className="p-1.5 rounded-xl bg-blue-500 hover:bg-blue-600 text-white transition shadow-sm cursor-pointer shrink-0"
                  aria-label={`Chat with ${contact.name}`}
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </button>
              </button>
            );
          })}
        </div>
      </aside>

      {/* Main: Profile detail card (desktop only) */}
      <main className="hidden md:flex flex-1 flex-col h-full overflow-hidden p-10 justify-center items-center bg-slate-50 dark:bg-slate-950/20">
        {selectedContact ? (
          <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 p-6 flex flex-col gap-6 shadow-sm text-center items-center animate-fadeIn transition-colors">
            <div className="relative">
              <div
                className={`h-24 w-24 rounded-[32px] bg-gradient-to-br ${selectedContact.avatarColor} flex items-center justify-center text-white font-black text-3xl shadow-lg uppercase`}
              >
                {selectedContact.name.substring(0, 2)}
              </div>
              {selectedContact.status === "online" || selectedContact.status === "typing..." ? (
                <span className="absolute bottom-0 right-0 h-5 w-5 rounded-full bg-emerald-500 border-4 border-white dark:border-slate-900 animate-pulse" />
              ) : (
                <span className="absolute bottom-0 right-0 h-5 w-5 rounded-full bg-slate-300 dark:bg-slate-600 border-4 border-white dark:border-slate-900" />
              )}
            </div>

            <div className="flex flex-col gap-1">
              <h3 className="text-lg font-black text-slate-900 dark:text-white">{selectedContact.name}</h3>
              <p className="text-xs text-slate-400 dark:text-slate-500 font-extrabold uppercase tracking-widest">{selectedContact.role}</p>
              <span className="text-[10px] text-slate-400 dark:text-slate-600 font-bold">{selectedContact.email}</span>
            </div>

            <div className="w-full grid grid-cols-2 gap-4 border-y border-slate-100 dark:border-slate-800/80 py-4 text-left">
              <div className="flex flex-col gap-0.5">
                <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Gender</span>
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 capitalize">{selectedContact.gender}</span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Status</span>
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 capitalize">{selectedContact.status}</span>
              </div>
            </div>

            <div className="w-full flex gap-3">
              <button
                onClick={() => openChat(selectedContact.id)}
                className="flex-1 h-10 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-blue-500/10 cursor-pointer transition-all"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                Message
              </button>
              <button className="flex-1 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-300 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-all">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.94.725l.548 2.2a1 1 0 01-.321.988l-1.305.98a10.582 10.582 0 004.872 4.872l.98-1.305a1 1 0 01.988-.321l2.2.548a1 1 0 01.725.94V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                Call Mock
              </button>
            </div>
          </div>
        ) : (
          <p className="text-slate-400 text-sm">Select a person to view their profile</p>
        )}
      </main>
    </>
  );
}
