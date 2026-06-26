import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import "./index.css";
import { MatrixPage } from "./pages/MatrixPage";
import { LawDetailPage } from "./pages/LawDetailPage";
import { CandidatesPage } from "./pages/CandidatesPage";
import { CandidateDetailPage } from "./pages/CandidateDetailPage";
import { CellReviewPage } from "./pages/CellReviewPage";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MatrixPage />} />
        <Route path="/laws/:id" element={<LawDetailPage />} />
        <Route path="/candidates" element={<CandidatesPage />} />
        <Route path="/candidates/:id" element={<CandidateDetailPage />} />
        <Route path="/matrix-cell/:jurisdictionId/:lawCategoryId" element={<CellReviewPage />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
