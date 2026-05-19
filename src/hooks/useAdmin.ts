import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export function useCurrentUserProfile() {
  return useQuery({
    queryKey: ["current-user-profile"],
    queryFn: () => api.getCurrentUserProfile(),
    staleTime: 60_000,
  });
}

export function useIsAdmin() {
  const query = useCurrentUserProfile();
  return {
    ...query,
    isAdmin: query.data?.role === "admin",
  };
}
