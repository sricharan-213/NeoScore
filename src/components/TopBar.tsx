import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  BellRing,
  ChevronDown,
  LogOut,
  Moon,
  RadioTower,
  ScrollText,
  ShieldAlert,
  Sun,
  WifiOff,
} from "lucide-react";
import { RISK_ON_CHROME } from "@/lib/risk";
import type { WardSnapshot } from "@/lib/store";
import { useSession, signOut } from "@/lib/session";
import { useTheme, toggleTheme } from "@/lib/theme";
import { cn, formatClock, formatSince } from "@/lib/utils";
import { Brand } from "./Brand";

function WardClock() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  return <span className="tnum text-[12px] text-white/70">{formatClock(now)}</span>;
}

function StatChip({
  color,
  label,
  value,
  title,
}: {
  color?: string;
  label: string;
  value: number;
  title?: string;
}) {
  return (
    <div
      className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-2 py-1"
      title={title}
    >
      {color && (
        <span className="h-2 w-2 rounded-full" style={{ background: color }} aria-hidden="true" />
      )}
      <span className="tnum text-[13px] font-semibold leading-none text-white">{value}</span>
      <span className="text-[10px] uppercase tracking-[0.12em] text-white/55">{label}</span>
    </div>
  );
}

export function TopBar({
  ward,
  wardName,
  onOpenAlarms,
}: {
  ward: WardSnapshot;
  wardName: string;
  onOpenAlarms: () => void;
}) {
  const session = useSession();
  const theme = useTheme();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const alertAge = now - ward.lastTelemetryAt;
  const syncTone = !ward.socketConnected
    ? "text-[#FF6B6B] border-[#FF6B6B]/40 bg-[#FF6B6B]/10"
    : ward.stale > 0 || ward.offline > 0
      ? "text-white/75 border-white/15 bg-white/[0.05]"
      : "text-white/85 border-white/15 bg-white/[0.05]";

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-chrome text-white shadow-[0_10px_30px_-20px_rgba(0,0,0,0.9)]">
      <div className="mx-auto flex h-14 max-w-[1800px] items-center gap-3 px-3 sm:px-5">
        <Link to="/ward" className="shrink-0">
          <Brand onChrome />
        </Link>

        <span className="hidden h-7 w-px bg-white/10 md:block" />
        <div className="hidden min-w-0 md:block">
          <div className="truncate text-[13px] font-semibold">{wardName}</div>
          <div className="text-[10px] uppercase tracking-[0.14em] text-white/50">
            Command center · live
          </div>
        </div>

        <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
          {/* Ward-wide alert count */}
          <button
            type="button"
            onClick={onOpenAlarms}
            aria-label={`${ward.unacknowledgedAlarms} unacknowledged alarms`}
            className={cn(
              "flex items-center gap-1.5 rounded-lg border px-2 py-1 transition-colors",
              ward.unacknowledgedAlarms > 0
                ? "border-[#FF6B6B]/60 bg-[#FF6B6B]/20 text-white hover:bg-[#FF6B6B]/30"
                : "border-white/10 bg-white/[0.04] text-white/70 hover:bg-white/[0.08]",
            )}
          >
            {ward.unacknowledgedAlarms > 0 ? (
              <BellRing className="h-4 w-4 animate-soft-pulse" aria-hidden="true" />
            ) : (
              <ShieldAlert className="h-4 w-4" aria-hidden="true" />
            )}
            <span className="tnum text-[14px] font-semibold leading-none">
              {ward.unacknowledgedAlarms}
            </span>
            <span className="hidden text-[10px] uppercase tracking-[0.12em] sm:inline">
              alarms
            </span>
          </button>

          <div className="hidden items-center gap-1.5 lg:flex">
            <StatChip
              color={RISK_ON_CHROME.SEVERE}
              label="sev"
              value={ward.severe}
              title="Beds in the severe band (NIPS 5–7)"
            />
            <StatChip
              color={RISK_ON_CHROME.MODERATE}
              label="mod"
              value={ward.moderate}
              title="Beds in the moderate band (NIPS 3–4)"
            />
            <StatChip
              color={RISK_ON_CHROME.NORMAL}
              label="norm"
              value={ward.normal}
              title="Beds in the normal band (NIPS 0–2)"
            />
          </div>

          {/* Connection / sync status */}
          <div
            className={cn("flex items-center gap-1.5 rounded-lg border px-2 py-1", syncTone)}
            title={`WebSocket ${ward.socketConnected ? "connected" : "degraded"} · ${ward.socketLatencyMs}ms round-trip · last packet ${formatSince(alertAge)}`}
          >
            {ward.socketConnected ? (
              <RadioTower className="h-3.5 w-3.5" aria-hidden="true" />
            ) : (
              <WifiOff className="h-3.5 w-3.5" aria-hidden="true" />
            )}
            <span className="tnum hidden text-[11px] sm:inline">
              {ward.live}/{ward.total} live
            </span>
            <span className="tnum text-[11px] text-white/55">{ward.socketLatencyMs}ms</span>
          </div>

          <span className="hidden h-7 w-px bg-white/10 sm:block" />
          <WardClock />

          <Link
            to="/audit"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 text-white/70 transition-colors hover:bg-white/[0.08] hover:text-white"
            title="Acknowledgement audit log"
          >
            <ScrollText className="h-4 w-4" aria-hidden="true" />
          </Link>

          <button
            type="button"
            onClick={toggleTheme}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 text-white/70 transition-colors hover:bg-white/[0.08] hover:text-white"
            title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
            aria-label="Toggle colour theme"
          >
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>

          <div className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              className="flex items-center gap-2 rounded-lg border border-white/10 py-1 pl-1 pr-2 text-left transition-colors hover:bg-white/[0.08]"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
            >
              <span className="flex h-6 w-6 items-center justify-center rounded-md bg-accent/25 text-[11px] font-semibold text-white">
                {session?.name?.slice(0, 1) ?? "?"}
              </span>
              <span className="hidden sm:block">
                <span className="block text-[11px] font-medium leading-tight text-white">
                  {session?.name ?? "Unattributed"}
                </span>
                <span className="block font-mono text-[10px] leading-tight text-white/50">
                  {session?.nurseId ?? "—"}
                </span>
              </span>
              <ChevronDown className="h-3.5 w-3.5 text-white/50" aria-hidden="true" />
            </button>
            {menuOpen && (
              <>
              <div
                className="fixed inset-0 z-40"
                aria-hidden="true"
                onClick={() => setMenuOpen(false)}
              />
              <div
                role="menu"
                className="absolute right-0 top-10 z-50 w-56 overflow-hidden rounded-lg border border-line bg-panel text-ink shadow-panel animate-fade-in"
              >
                <div className="border-b border-line px-3 py-2">
                  <div className="text-[12px] font-semibold">{session?.name}</div>
                  <div className="font-mono text-[11px] text-muted">{session?.nurseId}</div>
                  <div className="mt-1 text-[10px] uppercase tracking-wide text-muted">
                    {session?.role} · {session?.ward}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    signOut();
                    navigate("/auth");
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-[12px] text-muted transition-colors hover:bg-canvas hover:text-ink"
                >
                  <LogOut className="h-3.5 w-3.5" /> End shift / sign out
                </button>
              </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
