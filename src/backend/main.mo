import Map "mo:core/Map";
import Time "mo:core/Time";
import Array "mo:core/Array";
import Order "mo:core/Order";
import Runtime "mo:core/Runtime";
import Iter "mo:core/Iter";
import Int "mo:core/Int";

actor {
  type LocationId = Nat;

  type LocationEntry = {
    latitude : Float;
    longitude : Float;
    timestamp : Time.Time;
    locationLabel : ?Text;
  };

  module LocationEntry {
    public func compare(location1 : LocationEntry, location2 : LocationEntry) : Order.Order {
      Int.compare(location2.timestamp, location1.timestamp);
    };
  };

  var nextLocationId : LocationId = 0;

  let locations = Map.empty<LocationId, LocationEntry>();

  public shared ({ caller }) func addLocation(latitude : Float, longitude : Float, locationLabel : ?Text) : async LocationId {
    let locationId = nextLocationId;
    let entry : LocationEntry = {
      latitude;
      longitude;
      timestamp = Time.now();
      locationLabel;
    };
    locations.add(locationId, entry);
    nextLocationId += 1;
    locationId;
  };

  public query ({ caller }) func getLocations() : async [LocationEntry] {
    locations.values().toArray().sort();
  };

  public shared ({ caller }) func deleteLocation(locationId : LocationId) : async () {
    if (not locations.containsKey(locationId)) {
      Runtime.trap("Location does not exist");
    };
    locations.remove(locationId);
  };

  public query ({ caller }) func getLocationById(locationId : LocationId) : async LocationEntry {
    switch (locations.get(locationId)) {
      case (null) { Runtime.trap("Location does not exist") };
      case (?location) { location };
    };
  };
};
