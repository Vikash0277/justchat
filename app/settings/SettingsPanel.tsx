"use client";

import type { UserProfile } from "../types";

interface SettingsPanelProps {
  currentUser: UserProfile;
  userStatus: string;
  setUserStatus: (s: string) => void;
  theme: "light" | "dark";
  onToggleTheme: () => void;
  onLogout: () => void;
}

export default function SettingsPanel({
  currentUser,
  userStatus,
  setUserStatus,
  theme,
  onToggleTheme,
  onLogout,
}: SettingsPanelProps) {
  return (
    <>
      {/* Sidebar: Settings panels */}
      <aside className="w-full md:w-80 lg:w-96 border-r border-slate-200/80 dark:border-slate-800/80 flex flex-col shrink-0 bg-white dark:bg-slate-900 transition-colors overflow-y-auto">


        <div className="flex-1 overflow-y-auto px-4 py-4 pb-16 md:pb-4 flex flex-col gap-4">
          {/* Profile gradient card */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white flex flex-col gap-3 shadow-md relative overflow-hidden">
            <div className="absolute -right-6 -bottom-6 w-20 h-20 bg-white/10 rounded-full blur-xl pointer-events-none" />
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-xl bg-white/20 backdrop-blur-md border border-white/20 flex items-center justify-center text-sm font-extrabold uppercase shadow-sm">
                {currentUser.username ? currentUser.username.substring(0, 2) : "ME"}
              </div>
              <div>
                <h4 className="text-xs font-extrabold tracking-wide">{currentUser.username || "Guest User"}</h4>
                <p className="text-[9px] text-blue-100 truncate w-36 font-semibold">{currentUser.email || "guest@justchat.com"}</p>
              </div>
            </div>
            <div className="border-t border-white/10 pt-2 flex justify-between items-center text-[9px] font-bold text-blue-100">
              <span>{currentUser.isGuest ? "Guest Access" : "Registered User"}</span>
              <span className="bg-emerald-500 px-1.5 py-0.5 rounded-full text-[8px] animate-pulse uppercase tracking-wider">Online</span>
            </div>
          </div>

          {/* Custom status */}
          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700/50 flex flex-col gap-2">
            <label className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Custom Status</label>
            <input
              type="text"
              value={userStatus}
              onChange={(e) => setUserStatus(e.target.value)}
              placeholder="What's on your mind?"
              className="h-8 w-full rounded-lg bg-white dark:bg-slate-900 border-none px-2.5 text-xs outline-none focus:ring-1 focus:ring-blue-500 text-slate-700 dark:text-slate-200"
            />
          </div>

          {/* User details */}
          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700/50 flex flex-col gap-2.5 text-xs text-slate-600 dark:text-slate-300">
            <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">User Details</span>
            <div className="flex justify-between">
              <span className="text-slate-400">Gender</span>
              <span className="font-bold capitalize text-slate-700 dark:text-slate-200">{currentUser.gender || "Unspecified"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Age</span>
              <span className="font-bold text-slate-700 dark:text-slate-200">{currentUser.age || "Unspecified"}</span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-slate-400">Location</span>
              <span className="font-bold text-slate-700 dark:text-slate-200">
                {currentUser.state && currentUser.country
                  ? `${currentUser.state}, ${currentUser.country}`
                  : "Unspecified"}
              </span>
            </div>
          </div>

          {/* Dark mode toggle */}
          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700/50 flex flex-col gap-2.5">
            <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Preferences</span>
            <div className="flex justify-between items-center text-xs">
              <span className="font-bold text-slate-700 dark:text-slate-200">Dark Mode</span>
              <button
                onClick={onToggleTheme}
                className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out outline-none ${theme === "dark" ? "bg-blue-600" : "bg-slate-200 dark:bg-slate-700"
                  }`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${theme === "dark" ? "translate-x-5" : "translate-x-0"
                    }`}
                />
              </button>
            </div>
          </div>

          {/* Logout */}
          <button
            onClick={onLogout}
            className="w-full h-10 rounded-2xl bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-950/40 text-xs font-extrabold flex items-center justify-center gap-2 border border-rose-100/50 dark:border-rose-900/30 transition shadow-sm cursor-pointer"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Log Out
          </button>
        </div>
      </aside>

      {/* Main: Desktop settings detail */}
      <main className="hidden md:flex flex-1 flex-col h-full overflow-hidden p-10 justify-center items-center bg-slate-50 dark:bg-slate-950/20">
        <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 p-6 flex flex-col gap-6 shadow-sm transition-colors">
          <h3 className="text-base font-black text-slate-800 dark:text-slate-100">Preferences & Profile Info</h3>

          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-2xl bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-sm font-extrabold shadow-sm uppercase">
              {currentUser.username ? currentUser.username.substring(0, 2) : "ME"}
            </div>
            <div>
              <h4 className="text-sm font-extrabold tracking-wide text-slate-800 dark:text-slate-200">{currentUser.username || "Guest User"}</h4>
              <p className="text-xs text-slate-400 dark:text-slate-500 font-semibold">{currentUser.email || "guest@justchat.com"}</p>
            </div>
          </div>

          <div className="flex flex-col gap-3 text-xs bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl">
            <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Metadata Summary</span>
            {[
              ["Status", userStatus],
              ["Age", currentUser.age || "Unspecified"],
              ["Gender", currentUser.gender || "Unspecified"],
              ["Location", currentUser.state && currentUser.country ? `${currentUser.state}, ${currentUser.country}` : "Unspecified"],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between border-b border-slate-100 dark:border-slate-700/50 pb-1.5 last:border-none last:pb-0">
                <span className="text-slate-400">{label}</span>
                <span className="font-semibold text-slate-700 dark:text-slate-200 capitalize">{value}</span>
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">System Options</span>
            <div className="flex justify-between items-center text-xs">
              <div className="flex flex-col">
                <span className="font-bold text-slate-700 dark:text-slate-200">Dark Mode</span>
                <span className="text-[10px] text-slate-400">Toggle dark-mode class</span>
              </div>
              <button
                onClick={onToggleTheme}
                className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out outline-none ${theme === "dark" ? "bg-blue-600" : "bg-slate-200 dark:bg-slate-700"
                  }`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${theme === "dark" ? "translate-x-5" : "translate-x-0"
                    }`}
                />
              </button>
            </div>
          </div>

          <button
            onClick={onLogout}
            className="w-full h-11 rounded-2xl bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-950/40 text-xs font-extrabold flex items-center justify-center gap-2 border border-rose-100/50 dark:border-rose-900/30 transition shadow-sm cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Log Out
          </button>
        </div>
      </main>
    </>
  );
}
