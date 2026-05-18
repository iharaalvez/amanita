"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { loadFromSupabase, syncAllRecords } from "@/lib/sync";
import { usePokedexStore } from "@/store/pokedexStore";

function AuthSync() {
  const mergeProgressSnapshot = usePokedexStore((s) => s.mergeProgressSnapshot);
  const clearAll = usePokedexStore((s) => s.clearAll);

  useEffect(() => {
    // Load data for already-logged-in user on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        loadFromSupabase(session.user.id).then((snapshot) => {
          if (snapshot) {
            const merged = mergeProgressSnapshot(snapshot);
            void syncAllRecords(merged);
          }
        });
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session?.user) {
        loadFromSupabase(session.user.id).then((snapshot) => {
          if (snapshot) {
            const merged = mergeProgressSnapshot(snapshot);
            void syncAllRecords(merged);
          }
        });
      }
      if (event === "SIGNED_OUT") {
        clearAll();
      }
    });

    return () => subscription.unsubscribe();
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
