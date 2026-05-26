"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { loadFromSupabase } from "@/lib/sync";
import { usePokedexStore } from "@/store/pokedexStore";
import { reportAuthError } from "@/lib/authErrors";

const REALTIME_DEBOUNCE_MS = 2000;

function AuthSync() {
  const mergeProgressSnapshot = usePokedexStore((s) => s.mergeProgressSnapshot);
  const clearAll = usePokedexStore((s) => s.clearAll);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let active = true;
    let realtimeChannel: ReturnType<typeof supabase.channel> | null = null;

    const loadAndMerge = (userId: string) => {
      console.log("[Sync] loadAndMerge called, active=", active);
      loadFromSupabase(userId)
        .then((snapshot) => {
          console.log("[Sync] loadFromSupabase returned, active=", active, "snapshot=", snapshot ? "ok" : "null");
          if (!active || !snapshot) return;
          const before = usePokedexStore.getState().gameDex;
          console.log("[Sync] gameDex BEFORE merge (keys):", Object.keys(before));
          mergeProgressSnapshot(snapshot);
          const after = usePokedexStore.getState().gameDex;
          console.log("[Sync] gameDex AFTER merge (keys):", Object.keys(after));
          console.log("[Sync] snapshot.gameDex (keys):", Object.keys(snapshot.gameDex));
        })
        .catch((err) => {
          console.error("[Sync] loadAndMerge error:", err);
          reportAuthError(err);
        });
    };

    const setupRealtime = (userId: string) => {
      if (realtimeChannel) return;

      const handleChange = (payload: unknown) => {
        console.log("[Realtime] change received:", payload);
        if (!active) return;
        if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = setTimeout(
          () => loadAndMerge(userId),
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
            loadAndMerge(session.user.id);
            setupRealtime(session.user.id);
          }
        })
        .catch(reportAuthError);
    };

    syncCurrentSession();
    window.addEventListener("focus", syncCurrentSession);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") syncCurrentSession();
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session?.user) {
        loadAndMerge(session.user.id);
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
