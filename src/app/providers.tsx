"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { loadFromSupabase, syncAllRecords } from "@/lib/sync";
import { usePokedexStore } from "@/store/pokedexStore";
import { reportAuthError } from "@/lib/authErrors";

function AuthSync() {
  const mergeProgressSnapshot = usePokedexStore((s) => s.mergeProgressSnapshot);
  const clearAll = usePokedexStore((s) => s.clearAll);

  useEffect(() => {
    let active = true;

    const loadAndSync = (userId: string) => {
      loadFromSupabase(userId)
        .then((snapshot) => {
          if (!active || !snapshot) return;
          const merged = mergeProgressSnapshot(snapshot);
          void syncAllRecords(merged).catch(reportAuthError);
        })
        .catch(reportAuthError);
    };

    const syncCurrentSession = () => {
      supabase.auth
        .getSession()
        .then(({ data: { session } }) => {
          if (active && session?.user) loadAndSync(session.user.id);
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
      }
      if (event === "SIGNED_OUT") {
        clearAll();
      }
    });

    return () => {
      active = false;
      window.removeEventListener("focus", syncCurrentSession);
      document.removeEventListener("visibilitychange", syncVisibleSession);
      subscription.unsubscribe();
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
