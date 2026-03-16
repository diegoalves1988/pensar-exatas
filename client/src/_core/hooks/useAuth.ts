import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { TRPCClientError } from "@trpc/client";
import { useCallback, useEffect, useMemo, useState } from "react";

type UseAuthOptions = {
  redirectOnUnauthenticated?: boolean;
  redirectPath?: string;
};

export function useAuth(options?: UseAuthOptions) {
  const { redirectOnUnauthenticated = false, redirectPath = getLoginUrl() } =
    options ?? {};
  const utils = trpc.useUtils();

  const getCachedUser = () => {
    if (typeof window === "undefined") return undefined;
    try {
      const raw = localStorage.getItem("manus-runtime-user-info");
      if (!raw) return undefined;
      return JSON.parse(raw);
    } catch {
      return undefined;
    }
  };

  const meQuery = trpc.auth.me.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
    // Avoid re-fetching on every component mount; the localStorage fallback
    // provides instant hydration while the background refresh keeps data fresh.
    staleTime: 60_000,
  });

  // Fallback and instant hydration:
  // 1) use localStorage cached user for immediate header state
  // 2) call /api/me in parallel (do not wait for tRPC)
  const [meFallback, setMeFallback] = useState<any>(() => getCachedUser());
  const [fallbackLoaded, setFallbackLoaded] = useState<boolean>(Boolean(getCachedUser()));
  useEffect(() => {
    let cancelled = false;
    fetch("/api/me", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled) return;
        setMeFallback(data ?? null);
        setFallbackLoaded(true);
      })
      .catch(() => {
        if (cancelled) return;
        setMeFallback(null);
        setFallbackLoaded(true);
      });
    return () => { cancelled = true; };
  }, []);

  const logoutMutation = trpc.auth.logout.useMutation({
    onSuccess: () => {
      utils.auth.me.setData(undefined, null);
    },
  });

  const logout = useCallback(async () => {
    try {
      await logoutMutation.mutateAsync();
    } catch (error: unknown) {
      if (
        error instanceof TRPCClientError &&
        error.data?.code === "UNAUTHORIZED"
      ) {
        // fallback: call /api/auth/logout directly
      }
    } finally {
      // Always try the REST logout as well (clears the cookie)
      try { await fetch("/api/auth/logout", { method: "POST", credentials: "include" }); } catch {}
      utils.auth.me.setData(undefined, null);
      setMeFallback(null);
      await utils.auth.me.invalidate();
    }
  }, [logoutMutation, utils]);

  // Prefer the tRPC query value when it has been explicitly set or fetched
  // (data !== undefined), so that utils.auth.me.setData(undefined, null) on
  // logout propagates null to ALL hook instances rather than falling back to
  // each instance's stale meFallback.
  const resolvedUser = meQuery.data !== undefined ? meQuery.data : (meFallback ?? null);

  const state = useMemo(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(
        "manus-runtime-user-info",
        JSON.stringify(resolvedUser)
      );
    }
    return {
      user: resolvedUser,
      loading: (!meQuery.data && meQuery.isLoading && !fallbackLoaded) || logoutMutation.isPending,
      error: meQuery.error ?? logoutMutation.error ?? null,
      isAuthenticated: Boolean(resolvedUser),
    };
  }, [
    resolvedUser,
    meQuery.error,
    meQuery.isLoading,
    meFallback,
    fallbackLoaded,
    logoutMutation.error,
    logoutMutation.isPending,
  ]);

  useEffect(() => {
    if (!redirectOnUnauthenticated) return;
    if (state.loading) return;
    if (state.user) return;
    if (typeof window === "undefined") return;
    if (window.location.pathname === redirectPath) return;

    window.location.href = redirectPath;
  }, [
    redirectOnUnauthenticated,
    redirectPath,
    state.loading,
    state.user,
  ]);

  return {
    ...state,
    refresh: () => { meQuery.refetch(); setMeFallback(undefined); },
    logout,
  };
}
