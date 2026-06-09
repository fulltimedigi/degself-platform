import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

if (!window.location.hash) {
  window.location.hash = "#/";
}

// degself brand is always dark
document.documentElement.classList.add("dark");

// Register service worker for offline shell (PWA)
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  });
}

createRoot(document.getElementById("root")!).render(<App />);
