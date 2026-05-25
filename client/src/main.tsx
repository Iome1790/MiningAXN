import { Component, ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { TonConnectUIProvider } from "@tonconnect/ui-react";
import App from "./App";
import "./index.css";

document.addEventListener("contextmenu", (e) => e.preventDefault());

document.addEventListener("DOMContentLoaded", () => {
  document.body.style.webkitUserSelect = "none";
  document.body.style.userSelect = "none";
  document.body.style.webkitTouchCallout = "none";
});

// ── Root Error Boundary ───────────────────────────────────────────
// Catches any crash (including TonConnect init failure) so the app
// never goes fully black. On crash: shows a Reload button.
class RootErrorBoundary extends Component<
  { children: ReactNode },
  { crashed: boolean }
> {
  state = { crashed: false };
  static getDerivedStateFromError() { return { crashed: true }; }
  componentDidCatch(err: unknown) { console.error("[RootErrorBoundary]", err); }
  render() {
    if (this.state.crashed) {
      return (
        <div style={{
          minHeight: "100vh", background: "#000",
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
          padding: 24, gap: 16,
        }}>
          <img src="/axn-logo.svg" alt="AXN" style={{ width: 64, opacity: 0.6 }} />
          <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 14, textAlign: "center", margin: 0 }}>
            Something went wrong. Please reload.
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: "12px 32px", background: "#2563eb", border: "none",
              borderRadius: 12, color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer",
            }}
          >
            Reload App
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// ── TonConnect Provider Error Boundary ───────────────────────────
// If TonConnectUIProvider itself throws during init, this boundary
// catches it and renders children WITHOUT the provider instead of
// crashing the whole app. Wallet's ConnectWalletSection will show
// its own "unavailable" fallback in that case.
class TonConnectProviderBoundary extends Component<
  { children: ReactNode },
  { crashed: boolean }
> {
  state = { crashed: false };
  static getDerivedStateFromError() { return { crashed: true }; }
  componentDidCatch(err: unknown) { console.warn("[TonConnect init]", err); }
  render() {
    if (this.state.crashed) {
      // Provider failed — render app without TonConnect
      return <>{this.props.children}</>;
    }
    return this.props.children;
  }
}

// ── Manifest URL ──────────────────────────────────────────────────
// window.location.origin is safe here: TonConnect only fetches the
// manifest lazily (not during provider init), so dev/prod both work.
const MANIFEST_URL = `${window.location.origin}/tonconnect-manifest.json`;

// ── Render ────────────────────────────────────────────────────────
createRoot(document.getElementById("root")!).render(
  <RootErrorBoundary>
    <TonConnectProviderBoundary>
      <TonConnectUIProvider
        manifestUrl={MANIFEST_URL}
        actionsConfiguration={{
          // Tells TonConnect wallets to return to the Mini App in Telegram
          // instead of opening an external browser — required for TWA flows
          twaReturnUrl: "https://t.me/MoneyAXNbot",
        }}
      >
        <App />
      </TonConnectUIProvider>
    </TonConnectProviderBoundary>
  </RootErrorBoundary>
);
