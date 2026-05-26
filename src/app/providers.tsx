"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { loadFromSupabase, syncAllRecords } from "@/lib/sync";
import { usePokedexStore } from "@/store/pokedexStore";
import { reportAuthError } from "@/lib/authErrors";

// How long to wait after a Realtime event before fetching — batches rapid
// multi-row updates (e.g. bulk toggles) into a single round-trip.
const REALTIME_DEBOUNCE_MS = 2000;

function AuthSync() {
  const mergeProgressSnapshot = usePokedexStore((s) => s.mergeProgressSnapshot);
  const clearAll = usePokedexStore((s) => s.clearAll);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let active = true;
    let realtimeChannel: ReturnType<typeof supabase.channel> | null = null;

    // Full sync: fetch remote, merge with local, push merged state back.
    // Used on login / tab-focus to reconcile any divergence.
    const loadAndSync = (userId: string) => {
      loadFromSupabase(userId)
        .then((snapshot) => {
          if (!active || !snapshot) return;
          const merged = mergeProgressSnapshot(snapshot);
          void syncAllRecords(merged).catch(reportAuthError);
        })
        .catch(reportAuthError);
    };

    // Lightweight sync: fetch remote and merge locally — no write-back.
    // Used for Realtime events so we don't trigger a second Realtime event
    // by writing the same data back to Supabase.
    const loadAndApply = (userId: string) => {
      loadFromSupabase(userId)
        .then((snapshot) => {
          if (!active || !snapshot) return;
          mergeProgressSnapshot(snapshot);
        })
        .catch(reportAuthError);
    };

    const setupRealtime = (userId: string) => {
      if (realtimeChannel) return; // already subscribed for this user

      realtimeChannel = supabase
        .channel(`user-data-${userId}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "pokedex",
            filter: `user_id=eq.${userId}`,
          },
          () => {
            if (!active) return;
            if (debounceTimerRef.current)
              clearTimeout(debounceTimerRef.current);
            debounceTimerRef.current = setTimeout(
              () => loadAndApply(userId),
              REALTIME_DEBOUNCE_MS,
            );
          },
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "user_settings",
            filter: `user_id=eq.${userId}`,
          },
          () => {
            if (!active) return;
            if (debounceTimerRef.current)
              clearTimeout(debounceTimerRef.current);
            debounceTimerRef.current = setTimeout(
              () => loadAndApply(userId),
              REALTIME_DEBOUNCE_MS,
            );
          },
        )
        .subscribe();
    };

    const syncCurrentSession = () => {
      supabase.auth
        .getSession()
        .then(({ data: { session } }) => {
          if (!active) return;
          if (session?.user) {
            loadAndSync(session.user.id);
            setupRealtime(session.user.id);
          }
        })
        .catch(reportAuthError);
    };

    const syncVisibleSession = () => {
      if (document.visibilityState === "visible") {
        syncCurrentSession();
      }
    };

    // Load data for already-logged-in user on mount, then refresh when an
    // existing tab becomes active so progress changed elsewhere appears here.
    syncCurrentSession();
    window.addEventListener("focus", syncCurrentSession);
    document.addEventListener("visibilitychange", syncVisibleSession);

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session?.user) {
        loadAndSync(session.user.id);
        setupRealtime(session.user.id);
      }
      if (event === "SIGNED_OUT") {
        clearAll();
        realtimeChannel?.unsubscribe();
        realtimeChannel = null;
      }
    });

    return () => {
      active = false;
      window.removeEventListener("focus", syncCurrentSession);
      document.removeEventListener("visibilitychange", syncVisibleSession);
      subscription.unsubscribe();
      realtimeChannel?.unsubscribe();
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [mergeProgressSnapshot, clearAll]);

  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: { queries: { staleTime: 60 * 1000 } },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <AuthSync />
      {children}
    </QueryClientProvider>
  );
}
