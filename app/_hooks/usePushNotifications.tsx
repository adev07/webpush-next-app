import { useEffect, useState } from "react";
import useLocalStorage from "./useLocalStorage";
import useUserAgent from "./useUserAgent";

// Backend API URL for push subscription
const BACKEND_API_URL = "https://yuki-memberless-marilynn.ngrok-free.dev";
// Hardcoded member ID for now (you can make this dynamic later)
const MEMBER_ID = "674d59075693a4fcae81b864";

const useServiceWorker = ({ vapidPublicKey }: { vapidPublicKey?: string }) => {
  const { isMobile, isStandalone } = useUserAgent();
  const [notificationsSupported, setNotificationsSupported] = useState(false);
  const [isLoadingSubscription, setIsLoadingSubscription] = useState(false);

  const [userSubscription, setUserSubscription] = useLocalStorage(
    "user-subscription",
    ""
  );

  const [notificationsEnabled, setNotificationsEnabled] =
    useState<boolean>(false);

  useEffect(() => {
    setNotificationsSupported(
      "Notification" in window &&
        "serviceWorker" in navigator &&
        "PushManager" in window
    );
  }, []);

  // Send subscription to backend API
  const sendSubscriptionToBackend = async (subscription: PushSubscription) => {
    try {
      const subscriptionJSON = subscription.toJSON();
      
      const payload = {
        memberId: MEMBER_ID,
        subscription: {
          endpoint: subscriptionJSON.endpoint,
          keys: {
            p256dh: subscriptionJSON.keys?.p256dh,
            auth: subscriptionJSON.keys?.auth,
          },
        },
      };

      console.log("Sending subscription to backend:", payload);

      const response = await fetch(`${BACKEND_API_URL}/push-subscription/subscribe`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Backend responded with status: ${response.status}`);
      }

      const result = await response.json();
      console.log("Backend subscription response:", result);
      return result;
    } catch (error) {
      console.error("Error sending subscription to backend:", error);
      throw error;
    }
  };

  // This will retrieve a new subscription from the PushManager that we can tie to a user
  const subscribeToPushManager = async (reg: ServiceWorkerRegistration) => {
    try {
      const options = {
        applicationServerKey: vapidPublicKey,
        userVisibleOnly: true,
      };
      return await reg.pushManager.subscribe(options).then(
        async (sub: PushSubscription) => {
          // Send subscription to backend API
          await sendSubscriptionToBackend(sub);
          // Also save locally for reference
          setUserSubscription(JSON.stringify(sub));
          setNotificationsEnabled(true);
        },
        (error) => {
          console.error("Error", error);
        }
      );
    } catch (err) {
      console.error("Error", err);
    }
  };

  // This is called when a user clicks a 'Subscribe' button on your site
  const subscribe = async () => {
    if (!notificationsSupported) {
      alert("Notifications not supported in this browser");
    }
    setIsLoadingSubscription(true);
    // The service worker should already be registered, but this is a safeguard
    await navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .then(
        async function (reg) {
          await reg.update();

          var serviceWorker;
          if (reg.installing) {
            serviceWorker = reg.installing;
          } else if (reg.waiting) {
            serviceWorker = reg.waiting;
          } else if (reg.active) {
            serviceWorker = reg.active;
          }

          if (serviceWorker) {
            // If service worker was already activated, we can simply subscribe to push notifications
            if (serviceWorker.state == "activated") {
              console.log("Service worker was already activated");
              await subscribeToPushManager(reg);
            }
            // Otherwise, we will wait for the service worker to activate, request permission, and then subscribe
            serviceWorker.addEventListener("statechange", async function (e) {
              const sw = e.target as ServiceWorker;
              if (sw.state == "activated") {
                console.log("Service worker newly activated");
                await window?.Notification.requestPermission();
                await subscribeToPushManager(reg);
              }
            });
          }
        },
        function (err) {
          console.error("Unsuccessful service worker registration", err);
        }
      )
      .finally(() => {
        setIsLoadingSubscription(false);
      });
  };

  return {
    userSubscription,
    notificationsEnabled,
    isMobile,
    isStandalone,
    notificationsSupported,
    subscribe,
    isLoadingSubscription,
  };
};

export default useServiceWorker;
