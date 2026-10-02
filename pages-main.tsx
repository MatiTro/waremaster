import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./app/globals.css";
import "./app/responsive.css";
import "./app/operations-design.css";
import "./app/home-refresh.css";
import "./app/portal-design.css";
import Home from "./app/page";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Home />
  </StrictMode>,
);
