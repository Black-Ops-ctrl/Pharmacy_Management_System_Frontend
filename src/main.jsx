import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import AppRoutes from "./routes/AppRoutes";
import { AuthProvider } from "./context/AuthContext";
import { CompanyProvider } from "./context/CompanyContext";
import { ToastProvider } from "./context/ToastContext";
import SessionTimeoutModal from "./components/auth/SessionTimeoutModal";
import "./index.css";

const NOISE = /message channel closed|listener indicated an asynchronous response|Receiving end does not exist|Extension context invalidated/i;
window.addEventListener("unhandledrejection", (e) => {
  const r = e.reason;
  if (NOISE.test(String((r && r.message) || r || ""))) e.preventDefault();
});
window.addEventListener("error", (e) => {
  if (NOISE.test(String(e.message || ""))) e.preventDefault();
});

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <CompanyProvider>
          <ToastProvider>
            <AppRoutes />
            <SessionTimeoutModal />
          </ToastProvider>
        </CompanyProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>
);
