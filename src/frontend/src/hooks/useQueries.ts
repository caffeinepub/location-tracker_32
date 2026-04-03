import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { LocationEntry, LocationId } from "../backend.d";
import { useActor } from "./useActor";

export function useGetLocations() {
  const { actor, isFetching } = useActor();
  return useQuery<Array<LocationEntry & { id: LocationId }>>({
    queryKey: ["locations"],
    queryFn: async () => {
      if (!actor) return [];
      const entries = await actor.getLocations();
      // backend returns array; we need IDs — fetch them with indices as IDs
      // Actually getLocations doesn't return IDs, so we'll store index as key
      return entries.map((entry, i) => ({ ...entry, id: BigInt(i) }));
    },
    enabled: !!actor && !isFetching,
  });
}

export function useAddLocation() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      latitude,
      longitude,
      locationLabel,
    }: {
      latitude: number;
      longitude: number;
      locationLabel: string | null;
    }) => {
      if (!actor) throw new Error("Not connected");
      return actor.addLocation(latitude, longitude, locationLabel);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["locations"] });
    },
  });
}

export function useDeleteLocation() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (locationId: LocationId) => {
      if (!actor) throw new Error("Not connected");
      return actor.deleteLocation(locationId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["locations"] });
    },
  });
}
