"use client";

import { useCallback, useEffect, useState } from "react";

type AdminSessionSnapshot = {
  authenticated: boolean;
  loading: boolean;
  role?: string;
  label?: string;
  error: string;
};

const initialState: AdminSessionSnapshot = {
  authenticated: false,
  loading: true,
  error: "",
};

export const useAdminSession = () => {
  const [state, setState] = useState<AdminSessionSnapshot>(initialState);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/session/status", {
        cache: "no-store",
      });

      if (!response.ok) {
        setState({
          authenticated: false,
          loading: false,
          error: "",
        });
        return;
      }

      const body = (await response.json()) as {
        authenticated: boolean;
        session?: { role?: string; label?: string };
      };

      setState({
        authenticated: Boolean(body.authenticated),
        loading: false,
        role: body.session?.role,
        label: body.session?.label,
        error: "",
      });
    } catch {
      setState({
        authenticated: false,
        loading: false,
        error: "Impossibile verificare la sessione admin.",
      });
    }
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void refresh();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [refresh]);

  const login = useCallback(async (pin: string) => {
    setState((current) => ({ ...current, loading: true, error: "" }));

    try {
      const response = await fetch("/api/admin/session/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ pin }),
      });

      const body = (await response.json().catch(() => null)) as
        | {
            error?: string;
            session?: { role?: string; label?: string };
          }
        | null;

      if (!response.ok) {
        setState({
          authenticated: false,
          loading: false,
          error: body?.error || "Accesso admin non riuscito.",
        });
        return false;
      }

      setState({
        authenticated: true,
        loading: false,
        role: body?.session?.role,
        label: body?.session?.label,
        error: "",
      });
      return true;
    } catch {
      setState({
        authenticated: false,
        loading: false,
        error: "Errore di connessione durante l'accesso admin.",
      });
      return false;
    }
  }, []);

  const logout = useCallback(async () => {
    await fetch("/api/admin/session/logout", {
      method: "POST",
      cache: "no-store",
    }).catch(() => null);

    setState({
      authenticated: false,
      loading: false,
      error: "",
    });
  }, []);

  return {
    ...state,
    login,
    logout,
    refresh,
  };
};
