"use client";

import Image from "next/image";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { NotificationManager } from "../_components/notification-manager";
import { DebugOverlay } from "../_components/debug-overlay";
import { useAuth } from "../_context/AuthContext";

export default function DashboardPage() {
  const { user, widgets, logout, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/");
    }
  }, [isAuthenticated, isLoading, router]);

  const handleLogout = () => {
    logout();
    router.push("/");
  };

  // Show loading while checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-zinc-800 to-zinc-900">
        <div className="flex flex-col items-center gap-4">
          <svg
            className="animate-spin h-10 w-10 text-blue-500"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <p className="text-zinc-400">Loading...</p>
        </div>
      </div>
    );
  }

  // Don't render if not authenticated (will redirect)
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-zinc-800 to-zinc-900">
        <div className="flex flex-col items-center gap-4">
          <svg
            className="animate-spin h-10 w-10 text-blue-500"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <p className="text-zinc-400">Redirecting...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-800 to-zinc-900 text-zinc-300 pb-64">
      {/* Debug Overlay - shows console logs on screen */}
      <DebugOverlay />
      
      {/* Header */}
      <header className="w-full px-4 py-4 flex items-center justify-between max-w-[1024px] mx-auto">
        <div className="flex items-center gap-3">
          <Image
            src="/icon/icon_xl"
            alt="App Logo"
            width={40}
            height={40}
            priority
          />
          <span className="font-semibold text-lg text-white">Helpdesk</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-zinc-400 hidden sm:block">
            {user?.user?.email}
          </span>
          <button
            onClick={handleLogout}
            className="px-4 py-2 text-sm bg-zinc-700 hover:bg-zinc-600 text-zinc-200 rounded-lg transition-colors flex items-center gap-2"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
              />
            </svg>
            Logout
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex flex-col items-center pt-12 px-4 max-w-[1024px] mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-white mb-2">
            Enable Notifications
          </h1>
          <p className="text-zinc-400">
            Subscribe to push notifications to stay updated
          </p>
        </div>

        <NotificationManager vapidPublicKey={process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY} />
      </main>
    </div>
  );
}
