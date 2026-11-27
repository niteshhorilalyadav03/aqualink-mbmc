export interface TankerFleet {
  id: string;
  driverName: string;
  driverPhone: string;
  capacity: string;
  waterLevel: number; // percentage 0-100
  purity: number; // percentage
  status: 'En Route' | 'Delivering' | 'Available' | 'Refilling';
  speedKmH: number;
  lat: number;
  lng: number;
  heading: number;
  assignedBookingId?: string;
  destination?: {
    name: string;
    address: string;
    lat: number;
    lng: number;
  };
  routeWaypoints?: [number, number][];
  currentWaypointIndex?: number;
}

export interface WaterDepot {
  id: string;
  name: string;
  type: 'Treatment Plant' | 'Primary Reservoir' | 'Booster Station';
  lat: number;
  lng: number;
  currentCapacityPercent: number;
  activePumps: number;
}

export const WATER_DEPOTS: WaterDepot[] = [
  {
    id: 'DEPOT-1',
    name: 'Mira-Bhayandar Municipal Water Treatment Plant',
    type: 'Treatment Plant',
    lat: 19.2980,
    lng: 72.8530,
    currentCapacityPercent: 94,
    activePumps: 6
  },
  {
    id: 'DEPOT-2',
    name: 'Central Sector 4 Storage Reservoir',
    type: 'Primary Reservoir',
    lat: 19.2865,
    lng: 72.8590,
    currentCapacityPercent: 88,
    activePumps: 4
  },
  {
    id: 'DEPOT-3',
    name: 'Beverly Park Booster Station',
    type: 'Booster Station',
    lat: 19.2750,
    lng: 72.8660,
    currentCapacityPercent: 78,
    activePumps: 3
  }
];

export const INITIAL_FLEET: TankerFleet[] = [
  {
    id: 'MH-04-WT-8821',
    driverName: 'Vijay Singh',
    driverPhone: '+91 98200 88210',
    capacity: '5,000L',
    waterLevel: 85,
    purity: 99.8,
    status: 'En Route',
    speedKmH: 26,
    lat: 19.2835,
    lng: 72.8625,
    heading: 85,
    assignedBookingId: 'BKG-1001',
    destination: {
      name: 'Rahul Sharma',
      address: 'B-402, Shanti Nagar C.H.S., Mira Road East',
      lat: 19.2825,
      lng: 72.8610
    },
    routeWaypoints: [
      [19.2865, 72.8590],
      [19.2855, 72.8605],
      [19.2842, 72.8618],
      [19.2835, 72.8625],
      [19.2830, 72.8618],
      [19.2825, 72.8610]
    ],
    currentWaypointIndex: 3
  },
  {
    id: 'MH-04-AB-1234',
    driverName: 'Suresh Kumar',
    driverPhone: '+91 98200 12345',
    capacity: '1,000L',
    waterLevel: 92,
    purity: 99.9,
    status: 'En Route',
    speedKmH: 31,
    lat: 19.2800,
    lng: 72.8570,
    heading: 45,
    assignedBookingId: 'BKG-1002',
    destination: {
      name: 'Priya Patel',
      address: 'Sector 4, Shrishti Complex, Mira Road',
      lat: 19.2870,
      lng: 72.8640
    },
    routeWaypoints: [
      [19.2760, 72.8540],
      [19.2780, 72.8555],
      [19.2800, 72.8570],
      [19.2825, 72.8595],
      [19.2850, 72.8620],
      [19.2870, 72.8640]
    ],
    currentWaypointIndex: 2
  },
  {
    id: 'MH-04-5566',
    driverName: 'Rajesh Yadav',
    driverPhone: '+91 98200 55661',
    capacity: '10,000L',
    waterLevel: 45,
    purity: 99.7,
    status: 'Delivering',
    speedKmH: 0,
    lat: 19.2745,
    lng: 72.8675,
    heading: 190,
    assignedBookingId: 'BKG-1005',
    destination: {
      name: 'Vikram Singh',
      address: 'D-304, Naya Nagar, Mira Road',
      lat: 19.2745,
      lng: 72.8675
    },
    routeWaypoints: [
      [19.2800, 72.8650],
      [19.2770, 72.8665],
      [19.2745, 72.8675]
    ],
    currentWaypointIndex: 2
  },
  {
    id: 'MH-04-CD-9021',
    driverName: 'Amit Verma',
    driverPhone: '+91 98200 90214',
    capacity: '2,000L',
    waterLevel: 100,
    purity: 100,
    status: 'Available',
    speedKmH: 0,
    lat: 19.2865,
    lng: 72.8590,
    heading: 0
  },
  {
    id: 'MH-04-KL-7711',
    driverName: 'Ganesh Shinde',
    driverPhone: '+91 98200 77118',
    capacity: '5,000L',
    waterLevel: 15,
    purity: 99.6,
    status: 'Refilling',
    speedKmH: 8,
    lat: 19.2975,
    lng: 72.8535,
    heading: 320,
    destination: {
      name: 'Municipal Water Plant',
      address: 'Station Bay 3, Mira Treatment Facility',
      lat: 19.2980,
      lng: 72.8530
    }
  },
  {
    id: 'MH-04-EF-3344',
    driverName: 'Mohd. Salim',
    driverPhone: '+91 98200 33442',
    capacity: '10,000L',
    waterLevel: 96,
    purity: 99.8,
    status: 'En Route',
    speedKmH: 34,
    lat: 19.2895,
    lng: 72.8710,
    heading: 215,
    assignedBookingId: 'BKG-1012',
    destination: {
      name: 'Unique Greens Complex',
      address: 'I-905, Unique Greens, Beverly Park, Mira Road',
      lat: 19.2855,
      lng: 72.8690
    },
    routeWaypoints: [
      [19.2930, 72.8735],
      [19.2910, 72.8720],
      [19.2895, 72.8710],
      [19.2875, 72.8700],
      [19.2855, 72.8690]
    ],
    currentWaypointIndex: 2
  }
];

export function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Radius of earth in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}
