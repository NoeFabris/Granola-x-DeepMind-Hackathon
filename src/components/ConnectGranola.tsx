"use client";

import { useState } from "react";

interface ConnectGranolaProps {
  connected: boolean;
  onConnect?: (token: string) => void;
  onDisconnect?: () => void;
}

export function ConnectGranola({ connected, onConnect, onDisconnect }: ConnectGranolaProps) {
  const [token, setToken] = useState("");
  const [showGuide, setShowGuide] = useState(false);

  if (connected) {
    return (
      <div className="flex items-center gap-2">
        <div className="rounded-full border border-emerald-300/40 bg-emerald-500/10 px-4 py-2 text-sm font-semibold text-emerald-700 dark:text-emerald-100">
          Granola connected
        </div>
        {onDisconnect && (
          <button
            type="button"
            onClick={onDisconnect}
            className="rounded-full border border-rose-300/40 bg-rose-500/10 px-3 py-2 text-xs font-medium text-rose-700 transition-colors hover:bg-rose-500/20 dark:text-rose-100"
          >
            Disconnect
          </button>
        )}
      </div>
    );
  }

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = token.trim();
    if (trimmed.length > 0 && onConnect) {
      onConnect(trimmed);
      setToken("");
    }
  };

  return (
    <div className="w-full">
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <input
            type="password"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="Paste your Granola access token"
            className="flex-1 rounded-lg border border-amber-300/40 bg-amber-500/5 px-4 py-2 text-sm text-[color:var(--app-fg)] placeholder:text-[color:var(--app-muted)] focus:border-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-400"
          />
          <button
            type="submit"
            disabled={token.trim().length === 0}
            className="rounded-lg border border-emerald-400/60 bg-emerald-500/20 px-4 py-2 text-sm font-semibold text-emerald-700 transition-colors hover:bg-emerald-500/30 disabled:cursor-not-allowed disabled:opacity-50 dark:text-emerald-100"
          >
            Connect
          </button>
        </div>

        <button
          type="button"
          onClick={() => setShowGuide(!showGuide)}
          className="self-start text-xs text-[color:var(--app-muted)] underline-offset-2 hover:underline"
        >
          {showGuide ? "Hide setup guide" : "How to get your access token?"}
        </button>

        {showGuide && (
          <div className="rounded-xl border border-[color:var(--panel-border)] bg-white/60 p-4 text-sm text-[color:var(--app-muted)] dark:bg-white/5">
            <h4 className="mb-2 font-semibold text-[color:var(--app-fg)]">
              How to get your Granola access token:
            </h4>
            <ol className="list-inside list-decimal space-y-2">
              <li>Open Terminal on the same machine where Granola is installed.</li>
              <li>
                Run:
                <code className="mt-1 block rounded bg-black/10 px-2 py-1 text-xs text-[color:var(--app-fg)]">
                  cat &quot;$HOME/Library/Application Support/Granola/supabase.json&quot; | jq -r
                  &nbsp;&apos;.workos_tokens | fromjson | .access_token&apos;
                </code>
              </li>
              <li>
                If that is empty, run:
                <code className="mt-1 block rounded bg-black/10 px-2 py-1 text-xs text-[color:var(--app-fg)]">
                  cat &quot;$HOME/Library/Application Support/Granola/supabase.json&quot; | jq -r
                  &nbsp;&apos;.cognito_tokens | fromjson | .access_token&apos;
                </code>
              </li>
              <li>
                On Linux, use <code>$HOME/.config/Granola/supabase.json</code> with the same jq query.
              </li>
              <li>Paste the access token above and click Connect.</li>
            </ol>
            <p className="mt-3 text-xs">
              Your token is stored in your browser&apos;s local storage and only used for requests to
              your Granola account.
            </p>
          </div>
        )}
      </form>
    </div>
  );
}
