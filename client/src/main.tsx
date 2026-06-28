import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import "./index.css";
import { RulesExplorerPage } from "./pages/RulesExplorerPage";
import { RuleDetailPage } from "./pages/RuleDetailPage";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<RulesExplorerPage />} />
        <Route path="/rules/:id" element={<RuleDetailPage />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
