"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { loadFromSupabase } from "@/lib/sync";
import { usePokedexStore } from "@/store/pokedexStore";

function AuthSync() {
  const setProgressSnapshot = usePokedexStore((s) => s.setProgressSnapshot);
  const clearAll = usePokedexStore((s) => s.clearAll);

  useEffect(() => {
    // Load data for already-logged-in user on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        loadFromSupabase(session.user.id).then((snapshot) => {
          if (snapshot) setProgressSnapshot(snapshot);
        });
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session?.user) {
        loadFromSupabase(session.user.id).then((snapshot) => {
          if (snapshot) setProgressSnapshot(snapshot);
        });
      }
      if (event === "SIGNED_OUT") {
        clearAll();
      }
    });

    return () => subscription.unsubscribe();
  }, [setProgressSnapshot, clearAll]);

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
