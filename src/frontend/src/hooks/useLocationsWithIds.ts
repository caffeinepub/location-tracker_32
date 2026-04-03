import { useQuery } from "@tanstack/react-query";
import type { LocationEntry, LocationId } from "../backend.d";
import { useActor } from "./useActor";

export interface LocationEntryWithId extends LocationEntry {
  id: LocationId;
}

export function useLocationsWithIds() {
  const { actor, isFetching } = useActor();
  return useQuery<LocationEntryWithId[]>({
    queryKey: ["locations-with-ids"],
    queryFn: async () => {
      if (!actor) return [];
      const entries = await actor.getLocations();
      // Since getLocations() doesn't return IDs, we fetch each by iterating
      // We'll use a workaround: return entries and track deletion by index
      return entries.map((entry, i) => ({ ...entry, id: BigInt(i) }));
    },
    enabled: !!actor && !isFetching,
  });
}
