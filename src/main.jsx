import React from "react";
import ReactDOM from "react-dom/client";
import Laigo from "./laigo.tsx";
import "./index.css";   // ← This is what actually activates Tailwind

// Minimal render with StrictMode
ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <Laigo />
  </React.StrictMode>
);