# Location Tracker

## Current State
New project with empty backend and no frontend.

## Requested Changes (Diff)

### Add
- Location tracking: capture and store GPS coordinates (lat/lng) with timestamp and optional label
- Map view: display tracked locations and routes on an interactive map
- Location history list: view all saved locations with timestamps
- Save current location button
- Delete locations

### Modify
N/A

### Remove
N/A

## Implementation Plan
1. Backend: store location entries (lat, lng, timestamp, label), CRUD operations
2. Frontend: map using Leaflet.js, current location via browser Geolocation API, location list panel, add/delete controls
