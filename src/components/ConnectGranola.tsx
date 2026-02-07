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
      <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700">
        Granola connected
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={handleConnect}
      disabled={isConnecting}
      className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-500"
    >
      {isConnecting ? "Connecting..." : "Connect Granola"}
    </button>
  );
}
