import React from "react";
import ReactDOM from "react-dom/client";
import { installSupabaseStorage } from "./storageSupabase.js";
import { registerServiceWorker } from "./notifications.js";
import AuthGate from "./AuthGate.jsx";
import App from "./App.jsx";
import "./index.css";

installSupabaseStorage();
registerServiceWorker();

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AuthGate>
      <App />
    </AuthGate>
  </React.StrictMode>
);
