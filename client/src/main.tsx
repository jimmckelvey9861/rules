import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import "./index.css";
import { RulesExplorerPage } from "./pages/RulesExplorerPage";
import { RuleDetailPage } from "./pages/RuleDetailPage";
import { SchedulerPage } from "./pages/SchedulerPage";
import { ComplianceWorkbench } from "./pages/ComplianceWorkbench";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<RulesExplorerPage />} />
        <Route path="/rules/*" element={<RuleDetailPage />} />
        <Route path="/scheduler" element={<SchedulerPage />} />
        <Route path="/workbench" element={<ComplianceWorkbench />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
