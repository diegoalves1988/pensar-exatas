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

  const meQuery = trpc.auth.me.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
  });

  // Fallback: call /api/me directly when tRPC errors (production/serverless)
  const [meFallback, setMeFallback] = useState<any>(undefined); // undefined = loading, null = no user
  useEffect(() => {
    // Only kick in when tRPC errored or returned null with a completed request
    if (meQuery.isLoading) return;
    if (meQuery.data) return; // tRPC worked fine
    let cancelled = false;
    fetch("/api/me", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => { if (!cancelled) setMeFallback(data ?? null); })
      .catch(() => { if (!cancelled) setMeFallback(null); });
    return () => { cancelled = true; };
  }, [meQuery.isLoading, meQuery.data, meQuery.error]);

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

  const resolvedUser = meQuery.data ?? meFallback ?? null;

  const state = useMemo(() => {
    localStorage.setItem(
      "manus-runtime-user-info",
      JSON.stringify(resolvedUser)
    );
    return {
      user: resolvedUser,
      loading: meQuery.isLoading || (meFallback === undefined && !meQuery.data) || logoutMutation.isPending,
      error: meQuery.error ?? logoutMutation.error ?? null,
      isAuthenticated: Boolean(resolvedUser),
    };
  }, [
    resolvedUser,
    meQuery.error,
    meQuery.isLoading,
    meFallback,
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
