"use client";

import { useState } from "react";

interface ConnectGranolaProps {
  connected: boolean;
  connectUrl: string;
}

export function ConnectGranola({ connected, connectUrl }: ConnectGranolaProps) {
  const [isConnecting, setIsConnecting] = useState(false);

  const handleConnect = () => {
    if (connected || isConnecting) {
      return;
    }

    setIsConnecting(true);
    window.location.assign(connectUrl);
  };

  if (connected) {
    return (
      <div className="rounded-full border border-emerald-300/40 bg-emerald-500/10 px-4 py-2 text-sm font-semibold text-emerald-700 dark:text-emerald-100">
        Granola connected
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={handleConnect}
      disabled={isConnecting}
      className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition duration-200 hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/70 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:bg-slate-100 dark:text-slate-950 dark:hover:bg-white dark:focus-visible:ring-offset-slate-950 disabled:cursor-not-allowed disabled:bg-slate-500"
    >
      {isConnecting ? "Connecting..." : "Connect Granola"}
    </button>
  );
}
