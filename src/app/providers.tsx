"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { ProgressPersistence } from "@/components/pokemon/ProgressPersistence";

function LocalApiHealthBanner() {
  const { data, isError } = useQuery({
    queryKey: ["local-api-health"],
    queryFn: api.health,
    retry: 1,
    staleTime: 30 * 1000,
  });

  if (!isError && data?.seeded !== false) return null;

  return (
    <div className="bg-amber-100 px-4 py-2 text-center text-sm font-medium text-amber-900 dark:bg-amber-950 dark:text-amber-200">
      Local database not running — start with npm run backend
    </div>
  );
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: { queries: { staleTime: 60 * 1000 } },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <LocalApiHealthBanner />
      <ProgressPersistence />
      {children}
    </QueryClientProvider>
  );
}
