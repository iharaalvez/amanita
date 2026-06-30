"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createContext, useContext, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { loadFromSupabase, syncAllRecords } from "@/lib/sync";
import {
  usePokedexStore,
  hasPendingWrites,
  hadRecentLocalWrite,
} from "@/store/pokedexStore";
import { reportAuthError } from "@/lib/authErrors";

const REALTIME_DEBOUNCE_MS = 2000;

const SyncStateContext = createContext<boolean>(false);
export function useSyncState(): boolean {
  return useContext(SyncStateContext);
}

function AuthSync({
  onSyncingChange,
}: {
  onSyncingChange: (syncing: boolean) => void;
}) {
  const mergeProgressSnapshot = usePokedexStore((s) => s.mergeProgressSnapshot);
  const clearAll = usePokedexStore((s) => s.clearAll);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const focusDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mergedSignInsRef = useRef<Set<string>>(new Set());
  const initialSyncDoneRef = useRef(false);

  useEffect(() => {
    let active = true;
    let realtimeChannel: ReturnType<typeof supabase.channel> | null = null;

    const markInitialSyncDone = () => {
      if (!initialSyncDoneRef.current) {
        initialSyncDoneRef.current = true;
        onSyncingChange(false);
      }
    };

    // Cold-start only: fetch remote and apply it as the source of truth.
    // If a previous failed bulk sync left remote hunts empty, keep local hunts.
    const loadAndApply = (userId: string) => {
      if (hasPendingWrites()) {
        markInitialSyncDone();
        return;
      }
      loadFromSupabase(userId)
        .then(async (snapshot) => {
          if (!active || !snapshot) return;
          const localHuntCount = usePokedexStore.getState().shinyHunts.length;
          const remoteHuntCount = snapshot.shinyHunts?.length ?? 0;
          if (localHuntCount > 0 && remoteHuntCount === 0) {
            const merged = mergeProgressSnapshot(snapshot);
            await syncAllRecords(merged);
            return;
          }
          mergeProgressSnapshot(snapshot);
        })
        .catch(reportAuthError)
        .finally(markInitialSyncDone);
    };

    // Mid-session: fetch remote and MERGE into local. Local wins on conflicts.
    // Used for realtime events and window focus — never clobbers local changes.
    const loadAndMerge = (userId: string) => {
      loadFromSupabase(userId)
        .then((snapshot) => {
          if (!active || !snapshot) return;
          mergeProgressSnapshot(snapshot);
        })
        .catch(reportAuthError);
    };

    // First sign-in: merge local + remote and write merged result back to DB.
    // Reconciles offline/pre-login changes made before signing in.
    const loadMergeAndSync = (userId: string) => {
      loadFromSupabase(userId)
        .then(async (snapshot) => {
          if (!active || !snapshot) return;
          const merged = mergeProgressSnapshot(snapshot);
          await syncAllRecords(merged);
        })
        .catch(reportAuthError)
        .finally(markInitialSyncDone);
    };

    const setupRealtime = (userId: string) => {
      if (realtimeChannel) return;

      const handleChange = () => {
        if (!active) return;
        // Skip reloads triggered by our own writes — local state is already up
        // to date and we'd just be making 7 unnecessary SELECT calls.
        if (hadRecentLocalWrite()) return;
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
            table: "user_home_box_layouts",
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
            if (!initialSyncDoneRef.current) {
              // Cold start: restore the server snapshot, with hunt recovery.
              onSyncingChange(true);
              loadAndApply(session.user.id);
            } else {
              // Window focus / visibility change: delay 500ms so that any
              // click that triggered the focus event can call touchLocalWrite()
              // first. If a local write just happened, skip the reload entirely
              // — local state is already authoritative.
              if (focusDebounceRef.current)
                clearTimeout(focusDebounceRef.current);
              focusDebounceRef.current = setTimeout(() => {
                if (!active || hadRecentLocalWrite()) return;
                loadAndMerge(session.user.id);
              }, 500);
            }
            setupRealtime(session.user.id);
          } else {
            markInitialSyncDone();
          }
        })
        .catch((err) => {
          reportAuthError(err);
          markInitialSyncDone();
        });
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
          if (!initialSyncDoneRef.current) onSyncingChange(true);
          loadMergeAndSync(session.user.id);
        } else {
          // Re-login (token refresh or explicit re-auth): treat as cold start.
          loadAndApply(session.user.id);
        }
        setupRealtime(session.user.id);
      }
      if (event === "SIGNED_OUT") {
        clearAll();
        mergedSignInsRef.current.clear();
        initialSyncDoneRef.current = false;
        realtimeChannel?.unsubscribe();
        realtimeChannel = null;
        if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      }
    });

    return () => {
      active = false;
      window.removeEventListener("focus", syncCurrentSession);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      subscription.unsubscribe();
      realtimeChannel?.unsubscribe();
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      if (focusDebounceRef.current) clearTimeout(focusDebounceRef.current);
    };
  }, [mergeProgressSnapshot, clearAll, onSyncingChange]);

  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: { queries: { staleTime: 60 * 1000 } },
      }),
  );
  const [isSyncing, setIsSyncing] = useState(false);

  return (
    <SyncStateContext.Provider value={isSyncing}>
      <QueryClientProvider client={queryClient}>
        <AuthSync onSyncingChange={setIsSyncing} />
        {children}
      </QueryClientProvider>
    </SyncStateContext.Provider>
  );
}
