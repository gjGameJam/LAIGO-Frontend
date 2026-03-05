import React from "react";
import ReactDOM from "react-dom/client";
import Laigo from "./Laigo.tsx";
import "./index.css";   // ← This is what actually activates Tailwind

// Minimal render wit StrictMode
ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <Laigo />
  </React.StrictMode>
);