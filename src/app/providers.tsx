"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { loadFromSupabase, syncAllRecords } from "@/lib/sync";
import { usePokedexStore } from "@/store/pokedexStore";
import { reportAuthError } from "@/lib/authErrors";

// Batches rapid multi-row updates (e.g. bulk toggles) into a single round-trip.
const REALTIME_DEBOUNCE_MS = 2000;
// After we write to Supabase, ignore Realtime events for this window so we
// don't re-fetch data we just pushed ourselves.
const WRITE_COOLDOWN_MS = 6000;

function AuthSync() {
  const mergeProgressSnapshot = usePokedexStore((s) => s.mergeProgressSnapshot);
  const clearAll = usePokedexStore((s) => s.clearAll);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isSyncingRef = useRef(false);
  const lastWriteTimeRef = useRef(0);

  useEffect(() => {
    let active = true;
    let realtimeChannel: ReturnType<typeof supabase.channel> | null = null;

    // Full sync: fetch remote, merge with local, push merged state back.
    // Used on login / tab-focus. Deduped with isSyncingRef so concurrent
    // calls (mount getSession + onAuthStateChange SIGNED_IN) collapse into one.
    const loadAndSync = (userId: string) => {
      if (isSyncingRef.current) return;
      isSyncingRef.current = true;
      loadFromSupabase(userId)
        .then(async (snapshot) => {
          if (!active || !snapshot) return;
          const merged = mergeProgressSnapshot(snapshot);
          await syncAllRecords(merged).catch(reportAuthError);
          // Mark when we last wrote so Realtime self-triggers are suppressed.
          lastWriteTimeRef.current = Date.now();
        })
        .catch(reportAuthError)
        .finally(() => {
          isSyncingRef.current = false;
        });
    };

    // Lightweight sync: fetch remote and merge locally — no write-back.
    // Used for Realtime events. Skipped if we just wrote (self-trigger guard).
    const loadAndApply = (userId: string) => {
      if (Date.now() - lastWriteTimeRef.current < WRITE_COOLDOWN_MS) return;
      loadFromSupabase(userId)
        .then((snapshot) => {
          if (!active || !snapshot) return;
          mergeProgressSnapshot(snapshot);
        })
        .catch(reportAuthError);
    };

    const setupRealtime = (userId: string) => {
      if (realtimeChannel) return;

      const handleChange = (payload: unknown) => {
        console.log("[Realtime] change received:", payload);
        if (!active) return;
        if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = setTimeout(
          () => loadAndApply(userId),
          REALTIME_DEBOUNCE_MS,
        );
      };

      realtimeChannel = supabase
        .channel(`user-data-${userId}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "pokedex", filter: `user_id=eq.${userId}` },
          handleChange,
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "user_settings", filter: `user_id=eq.${userId}` },
          handleChange,
        )
        .subscribe((status, err) => {
          console.log("[Realtime] status:", status, err ?? "");
        });
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
      if (document.visibilityState === "visible") syncCurrentSession();
    };

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
