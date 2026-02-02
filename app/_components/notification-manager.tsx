"use client";

import { useEffect, useState } from "react";
import useServiceWorker from "../_hooks/usePushNotifications";
import { useAuth } from "../_context/AuthContext";

import { NotificationIcon, Off, On } from "../_icons/other-icons";
import InstallationPrompt from "./installation-prompt";
import { siteConfig } from "@/lib/site-config";
import { API_BASE_URL } from "@/lib/api-config";

export const NotificationManager = ({
  vapidPublicKey,
}: {
  vapidPublicKey?: string;
}) => {
  const { user, widgets } = useAuth();
  const {
    userSubscription,
    notificationsEnabled,
    isMobile,
    isStandalone,
    notificationsSupported,
    isLoadingSubscription,
    subscribe,
  } = useServiceWorker({ vapidPublicKey });
  const [isLoadingSendNotification, setIsLoadingSendNotification] =
    useState(false);
  
  // Get widget ID and actor type from auth data
  const widgetId = widgets?.[0]?._id || null;
  const userRole = user?.user?.role;
  const actorType = userRole === "member" ? "agent" : "admin";

  // Example of clearing the app badge
  // This will clear it whenever they re-open the app
  useEffect(() => {
    try {
      navigator.clearAppBadge();
    } catch {}
  }, []);

  return (
    <div className="flex flex-col gap-4 items-center w-full p-4">
      <div className="flex flex-col gap-4 bg-zinc-800 p-2 rounded-md text-sm w-full font-semibold">
        <div className="flex justify-between">
          <span className="text-lg text-zinc-100">PWA</span>
          <InstallationPrompt
            manifest-url="/manifest.webmanifest"
            description={`Install ${siteConfig.name} to your device.`}
          />
        </div>

        <div className="flex justify-between">
          <span>Mobile Device: </span>
          {isMobile ? <On /> : <Off />}
        </div>
        <div className="flex justify-between">
          <span>App Installed: </span>
          {isStandalone ? <On /> : <Off />}
        </div>
        {isStandalone && !notificationsSupported && (
          <span className="text-red-400 text-xs">
            Notifications are not supported on your current device
          </span>
        )}
      </div>

      <div className="flex flex-col gap-4 bg-zinc-800 p-2 rounded-md text-sm w-full font-semibold">
        <div className="flex justify-between">
          <span className="text-lg text-zinc-100">Notifications</span>
          <div className="flex gap-2 items-center">
            <button
              className={`text-sm items-center bg-[#f79e5d] text-zinc-800 font-semibold rounded flex gap-2 px-4 py-3 min-h-[44px] min-w-[44px] active:scale-95 transition-transform ${
                isLoadingSubscription ? "animate-pulse opacity-70" : ""
              }`}
              disabled={isLoadingSubscription}
              onClick={async (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (!isStandalone || !notificationsSupported) {
                  alert(
                    "To enable notifications, you must be on the installed app."
                  );
                } else {
                  try {
                    await subscribe();
                  } catch (err) {
                    console.error("Subscribe error:", err);
                    alert("There was an error enabling notifications.");
                  }
                }
              }}
            >
              <NotificationIcon />
              Enable
            </button>
          </div>
        </div>
        <div
          className={`flex justify-between items-center ${
            isLoadingSubscription ? "animate-pulse" : ""
          }`}
        >
          <span>Notifications Enabled:</span>
          {notificationsEnabled ? <On /> : <Off />}
        </div>
        {notificationsEnabled && !userSubscription && (
          <span className="text-red-400 text-xs">
            There was an issue subscribing the user to notifications
          </span>
        )}
      </div>
      <button
        className={`text-sm items-center w-full bg-[#f79e5d] text-zinc-800 font-semibold py-2 rounded flex justify-center px-4 ${
          isLoadingSendNotification ? "animate-pulse" : ""
        }`}
        disabled={isLoadingSendNotification}
        onClick={async (e) => {
          if (!userSubscription || !notificationsEnabled) {
            alert("Please enable notifications.");
          } else {
            setIsLoadingSendNotification(true);
            try {
              const payload = {
                actorId: widgetId,
                actorType: actorType,
                widgetId: widgetId,
                notification: {
                  title: "Hello There!",
                  body: "This is a push notification.",
                  icon: "/logo.png",
                  badge: "/badge.png",
                },
              };

              console.log("Sending notification via backend:", payload);

              const response = await fetch(
                `${API_BASE_URL}/push-subscription/send`,
                {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    "ngrok-skip-browser-warning": "true",
                  },
                  body: JSON.stringify(payload),
                }
              );

              if (!response.ok) {
                throw new Error(`Backend responded with status: ${response.status}`);
              }

              const result = await response.json();
              console.log("Notification sent successfully:", result);
            } catch (error) {
              console.error("Error sending notification:", error);
              alert("Failed to send notification. Check console for details.");
            } finally {
              setIsLoadingSendNotification(false);
            }
          }
        }}
      >
        <span className="col-span-2  text-start ">Send Test Notification</span>
      </button>
    </div>
  );
};
