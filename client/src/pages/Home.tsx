import { useState, useEffect, useRef, useContext } from "react";
import { useAuth } from "@/hooks/useAuth";
import Layout from "@/components/Layout";
import { AppReadyContext } from "@/App";
import React from "react";
import { useLocation } from "wouter";
import { SettingsPopup } from "@/components/SettingsPopup";
import InvitePopup from "@/components/InvitePopup";
import Header from "@/components/Header";
import WithdrawalPopup from "@/components/WithdrawalPopup";
import MenuPopup from "@/components/MenuPopup";
import FarmingPanel from "@/components/FarmingPanel";

export default function Home() {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  const signalAppReady = useContext(AppReadyContext);
  const readySignaled = useRef(false);

  useEffect(() => {
    if (!readySignaled.current && !isLoading && user) {
      readySignaled.current = true;
      signalAppReady();
    }
  }, [isLoading, user, signalAppReady]);

  const [withdrawPopupOpen, setWithdrawPopupOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [roadmapOpen, setRoadmapOpen] = useState(false);
  const headerRef = useRef<HTMLDivElement>(null);
  const [headerHeight, setHeaderHeight] = useState(56);

  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;
    const update = () => setHeaderHeight(el.offsetHeight);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const balance = Math.floor(parseFloat((user as any)?.balance || "0"));

  return (
    <Layout>
      {!roadmapOpen && (
        <Header
          ref={headerRef}
          onMenuOpen={() => setMenuOpen(true)}
          onInviteOpen={() => setInviteOpen(true)}
          onWithdrawOpen={() => setWithdrawPopupOpen(true)}
        />
      )}

      <main
        className="w-full"
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          paddingTop: headerHeight,
          overflow: "hidden",
        }}
      >
        <FarmingPanel
          onWalletOpen={() => setWithdrawPopupOpen(true)}
          onInviteOpen={() => setInviteOpen(true)}
          onRoadmapChange={setRoadmapOpen}
        />
      </main>

      {settingsOpen && <SettingsPopup onClose={() => setSettingsOpen(false)} />}
      {inviteOpen && <InvitePopup onClose={() => setInviteOpen(false)} />}
      {menuOpen && (
        <MenuPopup
          onClose={() => setMenuOpen(false)}
          onOpenInvite={() => { setMenuOpen(false); setInviteOpen(true); }}
          onOpenWithdraw={() => { setMenuOpen(false); setWithdrawPopupOpen(true); }}
        />
      )}
      <WithdrawalPopup
        open={withdrawPopupOpen}
        onOpenChange={setWithdrawPopupOpen}
        tonBalance={balance}
      />
    </Layout>
  );
}
