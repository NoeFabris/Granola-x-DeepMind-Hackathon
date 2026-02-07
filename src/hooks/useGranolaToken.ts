"use client";

import { useEffect, useState } from "react";

const GRANOLA_TOKEN_STORAGE_KEY = "granola_access_token";

interface UseGranolaTokenResult {
  token: string | null;
  hasToken: boolean;
  isLoading: boolean;
  setToken: (token: string) => void;
  clearToken: () => void;
}

export function useGranolaToken(): UseGranolaTokenResult {
  const [token, setTokenState] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    try {
      const storedToken = window.localStorage.getItem(GRANOLA_TOKEN_STORAGE_KEY);
      setTokenState(storedToken && storedToken.trim().length > 0 ? storedToken : null);
    } catch {
      setTokenState(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const setToken = (nextToken: string) => {
    const normalizedToken = nextToken.trim();

    if (!normalizedToken) {
      return;
    }

    setTokenState(normalizedToken);

    try {
      window.localStorage.setItem(GRANOLA_TOKEN_STORAGE_KEY, normalizedToken);
    } catch {}
  };

  const clearToken = () => {
    setTokenState(null);

    try {
      window.localStorage.removeItem(GRANOLA_TOKEN_STORAGE_KEY);
    } catch {}
  };

  return {
    token,
    hasToken: typeof token === "string" && token.trim().length > 0,
    isLoading,
    setToken,
    clearToken,
  };
}
