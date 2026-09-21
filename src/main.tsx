import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./styles.css";
import "./styles/admin.css";
import { registerMediaServiceWorker } from "./services/mediaServiceWorker";

// Registra o Service Worker dedicado para interceptação e cache de mídia
void registerMediaServiceWorker();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
