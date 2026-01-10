export type {};

declare const self: ServiceWorkerGlobalScope;

self.addEventListener("push", async (event) => {
  try {
    console.log("PUSH", { event });
    const data = await event.data?.json();
    
    // Backend sends: { notification: { title, body, icon, badge } }
    const notification = data.notification || data;
    
    event?.waitUntil(
      self.registration.showNotification(notification.title, {
        body: notification.body,
        icon: notification.icon || "/icon/icon_sm.png",
        badge: notification.badge,
      })
    );
  } catch (error) {
    console.error("PUSH ERROR", { error });
  }
});
