"use client";

import { useEffect } from "react";

export function PwaRegistry() {
  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      window.addEventListener("load", () => {
        navigator.serviceWorker
          .register("/sw.js")
          .then((registration) => {
            // Proactively check for newer versions on every page load
            registration.update();

            // When a new service worker update is ready, claim control immediately
            registration.addEventListener("updatefound", () => {
              const newWorker = registration.installing;
              if (newWorker) {
                newWorker.addEventListener("statechange", () => {
                  if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
                    console.log("[ContriTrack] New deployment detected. Updated to latest version.");
                  }
                });
              }
            });
          })
          .catch((error) => {
            console.error("PWA Service Worker registration failed:", error);
          });
      });
    }
  }, []);

  return null;
}
