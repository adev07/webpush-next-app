import { useEffect, useState } from "react";
import useLocalStorage from "./useLocalStorage";
import useUserAgent from "./useUserAgent";
import { useAuth } from "../_context/AuthContext";

// Backend API URL for push subscription
const BACKEND_API_URL = "https://yuki-memberless-marilynn.ngrok-free.dev";

const useServiceWorker = ({ vapidPublicKey }: { vapidPublicKey?: string }) => {
  const { isMobile, isStandalone } = useUserAgent();
  const { user, widgets } = useAuth();
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
      
      // Get widget ID from the first widget
      const widgetId = widgets?.[0]?._id || null;
      
      // Determine actorType based on user role
      // If role is "user" -> actorType is "admin"
      // If role is "member" -> actorType is "agent"
      const userRole = user?.user?.role;
      const actorType = userRole === "member" ? "agent" : "admin";
      
      const payload = {
        actorId: widgetId,
        actorType: actorType,
        widgetId: widgetId,
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
          "ngrok-skip-browser-warning": "true",
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

  // Convert base64 VAPID key to Uint8Array (required for iOS)
  const urlBase64ToUint8Array = (base64String: string): Uint8Array => {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, "+")
      .replace(/_/g, "/");
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  };

  // This will retrieve a new subscription from the PushManager that we can tie to a user
  const subscribeToPushManager = async (reg: ServiceWorkerRegistration) => {
    console.log("subscribeToPushManager called with registration:", reg);
    console.log("VAPID public key:", vapidPublicKey);
    
    try {
      // Check if already subscribed
      const existingSubscription = await reg.pushManager.getSubscription();
      console.log("Existing subscription:", existingSubscription);
      
      if (existingSubscription) {
        console.log("Already subscribed, sending to backend...");
        await sendSubscriptionToBackend(existingSubscription);
        setUserSubscription(JSON.stringify(existingSubscription));
        setNotificationsEnabled(true);
        return;
      }
      
      // Convert VAPID key for iOS compatibility
      if (!vapidPublicKey) {
        throw new Error("VAPID public key is missing");
      }
      
      const applicationServerKey = urlBase64ToUint8Array(vapidPublicKey);
      console.log("Converted application server key:", applicationServerKey);
      
      const options: PushSubscriptionOptionsInit = {
        applicationServerKey: applicationServerKey as BufferSource,
        userVisibleOnly: true,
      };
      
      console.log("Subscribing to push manager with options:", options);
      const subscription = await reg.pushManager.subscribe(options);
      console.log("Push subscription created:", subscription);
      
      // Send subscription to backend API
      await sendSubscriptionToBackend(subscription);
      
      // Save locally for reference
      setUserSubscription(JSON.stringify(subscription));
      setNotificationsEnabled(true);
      
      console.log("Successfully subscribed to push notifications");
    } catch (err) {
      console.error("Error in subscribeToPushManager:", err);
      throw err; // Re-throw to be caught by the caller
    }
  };

  // This is called when a user clicks a 'Subscribe' button on your site
  const subscribe = async () => {
    let step = "init";
    
    try {
      step = "checking support";
      if (!notificationsSupported) {
        alert("Notifications not supported in this browser");
        return;
      }
      
      setIsLoadingSubscription(true);
      
      // IMPORTANT: On iOS, we MUST request permission FIRST before any push subscription
      // This must happen in response to a user gesture (button click)
      step = "requesting permission";
      const permission = await Notification.requestPermission();
      
      if (permission !== "granted") {
        alert(`Notification permission: ${permission}. Please enable notifications in your device settings.`);
        setIsLoadingSubscription(false);
        return;
      }
      
      // Register service worker
      step = "registering service worker";
      const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
      await reg.update();
      
      // Wait for the service worker to be ready
      step = "waiting for service worker ready";
      const registration = await navigator.serviceWorker.ready;
      
      // Check VAPID key
      step = "checking VAPID key";
      if (!vapidPublicKey) {
        throw new Error("VAPID public key is missing. Check NEXT_PUBLIC_VAPID_PUBLIC_KEY env variable.");
      }
      
      // Now subscribe to push notifications
      step = "subscribing to push manager";
      await subscribeToPushManager(registration);
      
      alert("Notifications enabled successfully!");
      
    } catch (err: any) {
      const errorMessage = err?.message || err?.toString() || "Unknown error";
      console.error("Error in subscribe flow:", err);
      alert(`Error at step "${step}": ${errorMessage}`);
    } finally {
      setIsLoadingSubscription(false);
    }
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
