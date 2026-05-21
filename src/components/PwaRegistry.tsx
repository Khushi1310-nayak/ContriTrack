"use client";

import { useEffect } from "react";

export function PwaRegistry() {
  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      window.addEventListener("load", () => {
        navigator.serviceWorker
          .register("/sw.js")
          .then((registration) => {
            console.log("PWA Service Worker registered with scope:", registration.scope);
            
            // Periodically check for updates (every hour)
            setInterval(() => {
              registration.update();
            }, 1000 * 60 * 60);
          })
          .catch((error) => {
            console.error("PWA Service Worker registration failed:", error);
          });
      });
    }
  }, []);

  return null;
}
