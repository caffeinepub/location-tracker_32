import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export type Time = bigint;
export interface LocationEntry {
    latitude: number;
    longitude: number;
    timestamp: Time;
    locationLabel?: string;
}
export type LocationId = bigint;
export interface backendInterface {
    addLocation(latitude: number, longitude: number, locationLabel: string | null): Promise<LocationId>;
    deleteLocation(locationId: LocationId): Promise<void>;
    getLocationById(locationId: LocationId): Promise<LocationEntry>;
    getLocations(): Promise<Array<LocationEntry>>;
}
