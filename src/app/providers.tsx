"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { loadFromSupabase, syncAllRecords } from "@/lib/sync";
import { usePokedexStore } from "@/store/pokedexStore";
import { reportAuthError } from "@/lib/authErrors";

const REALTIME_DEBOUNCE_MS = 2000;
const POLL_INTERVAL_MS = 10_000;

function AuthSync() {
  const setProgressSnapshot = usePokedexStore((s) => s.setProgressSnapshot);
  const mergeProgressSnapshot = usePokedexStore((s) => s.mergeProgressSnapshot);
  const clearAll = usePokedexStore((s) => s.clearAll);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mergedSignInsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    let active = true;
    let realtimeChannel: ReturnType<typeof supabase.channel> | null = null;

    // Fetch remote state and apply as the source of truth.
    // No write-back: individual user actions write to Supabase immediately.
    // already write to Supabase immediately on every toggle.
    const loadAndApply = (userId: string) => {
      loadFromSupabase(userId)
        .then((snapshot) => {
          if (!active || !snapshot) return;
          setProgressSnapshot(snapshot);
        })
        .catch(reportAuthError);
    };

    const loadMergeAndSync = (userId: string) => {
      loadFromSupabase(userId)
        .then(async (snapshot) => {
          if (!active || !snapshot) return;
          const merged = mergeProgressSnapshot(snapshot);
          await syncAllRecords(merged);
        })
        .catch(reportAuthError);
    };

    const startPolling = (userId: string) => {
      if (pollTimerRef.current) return;
      pollTimerRef.current = setInterval(() => {
        if (active) loadAndApply(userId);
      }, POLL_INTERVAL_MS);
    };

    const setupRealtime = (userId: string) => {
      if (realtimeChannel) return;

      const handleChange = () => {
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
          {
            event: "*",
            schema: "public",
            table: "pokedex",
            filter: `user_id=eq.${userId}`,
          },
          handleChange,
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "user_settings",
            filter: `user_id=eq.${userId}`,
          },
          handleChange,
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "user_games",
            filter: `user_id=eq.${userId}`,
          },
          handleChange,
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "user_game_dex",
            filter: `user_id=eq.${userId}`,
          },
          handleChange,
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "user_game_home_boxes",
            filter: `user_id=eq.${userId}`,
          },
          handleChange,
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "user_shiny_hunts",
            filter: `user_id=eq.${userId}`,
          },
          handleChange,
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "user_recent_catches",
            filter: `user_id=eq.${userId}`,
          },
          handleChange,
        )
        .subscribe();
    };

    const syncCurrentSession = () => {
      supabase.auth
        .getSession()
        .then(({ data: { session } }) => {
          if (!active) return;
          if (session?.user) {
            loadAndApply(session.user.id);
            setupRealtime(session.user.id);
            startPolling(session.user.id);
          }
        })
        .catch(reportAuthError);
    };

    syncCurrentSession();
    window.addEventListener("focus", syncCurrentSession);
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") syncCurrentSession();
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session?.user) {
        if (!mergedSignInsRef.current.has(session.user.id)) {
          mergedSignInsRef.current.add(session.user.id);
          loadMergeAndSync(session.user.id);
        } else {
          loadAndApply(session.user.id);
        }
        setupRealtime(session.user.id);
        startPolling(session.user.id);
      }
      if (event === "SIGNED_OUT") {
        clearAll();
        mergedSignInsRef.current.clear();
        realtimeChannel?.unsubscribe();
        realtimeChannel = null;
        if (pollTimerRef.current) {
          clearInterval(pollTimerRef.current);
          pollTimerRef.current = null;
        }
      }
    });

    return () => {
      active = false;
      window.removeEventListener("focus", syncCurrentSession);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      subscription.unsubscribe();
      realtimeChannel?.unsubscribe();
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, [setProgressSnapshot, mergeProgressSnapshot, clearAll]);

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
