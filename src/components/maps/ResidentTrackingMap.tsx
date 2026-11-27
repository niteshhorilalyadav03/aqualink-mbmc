import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { 
  Truck, MapPin, Navigation, Phone, Clock, 
  Maximize2, Minimize2, RotateCcw, ShieldCheck, CheckCircle
} from 'lucide-react';
import { calculateDistanceKm } from '../../lib/fleetData';

interface ResidentTrackingMapProps {
  tankerId?: string;
  driverName?: string;
  driverPhone?: string;
  destinationAddress?: string;
  initialEta?: string;
  heightClass?: string;
}

export default function ResidentTrackingMap({
  tankerId = 'MH-04-AB-1234',
  driverName = 'Suresh Kumar',
  driverPhone = '+91 98200 12345',
  destinationAddress = 'B-402, Shanti Nagar, Mira Road East',
  initialEta = '12 mins',
  heightClass = 'h-64'
}: ResidentTrackingMapProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const tankerMarkerRef = useRef<L.Marker | null>(null);
  const destMarkerRef = useRef<L.Marker | null>(null);
  const routeLineRef = useRef<L.Polyline | null>(null);

  // Coords for Mira Road Resident & En Route Tanker
  const destinationCoords: [number, number] = [19.2825, 72.8610]; // Shanti Nagar
  const routeWaypoints: [number, number][] = [
    [19.2740, 72.8520],
    [19.2765, 72.8545],
    [19.2785, 72.8565],
    [19.2800, 72.8580],
    [19.2815, 72.8595],
    [19.2825, 72.8610]
  ];

  const [currentPos, setCurrentPos] = useState<[number, number]>(routeWaypoints[1]);
  const [waypointIdx, setWaypointIdx] = useState(1);
  const [eta, setEta] = useState(initialEta);
  const [distanceKm, setDistanceKm] = useState(1.4);
  const [speedKmH, setSpeedKmH] = useState(28);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [19.279, 72.857],
        zoom: 15,
        zoomControl: false,
        attributionControl: false
      });

      L.control.zoom({ position: 'bottomright' }).addTo(map);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19
      }).addTo(map);

      // Add polyline path
      const routePolyline = L.polyline(routeWaypoints, {
        color: '#4f46e5',
        weight: 5,
        opacity: 0.8,
        dashArray: '10, 8',
        lineCap: 'round'
      }).addTo(map);
      routeLineRef.current = routePolyline;

      // Add Destination Pin
      const destIcon = L.divIcon({
        className: 'resident-dest-marker',
        html: `
          <div class="flex flex-col items-center">
            <div class="relative">
              <div class="absolute -inset-2 bg-rose-500/20 rounded-full animate-ping"></div>
              <div class="bg-rose-600 text-white p-2 rounded-2xl shadow-xl border-2 border-white ring-2 ring-rose-400 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
              </div>
            </div>
            <div class="bg-slate-900 text-white text-[9px] font-black px-2 py-0.5 rounded-full mt-1 whitespace-nowrap shadow border border-slate-700">
              Delivery Point
            </div>
          </div>
        `,
        iconSize: [40, 50],
        iconAnchor: [20, 30]
      });

      const destMarker = L.marker(destinationCoords, { icon: destIcon }).addTo(map);
      destMarker.bindPopup(`
        <div class="p-2 text-xs font-sans text-slate-800">
          <p class="font-bold text-rose-600">Your Delivery Address</p>
          <p class="font-bold">${destinationAddress}</p>
        </div>
      `);
      destMarkerRef.current = destMarker;

      // Add Tanker Marker
      const tankerIcon = L.divIcon({
        className: 'resident-tanker-marker',
        html: `
          <div class="flex flex-col items-center">
            <div class="relative">
              <div class="absolute -inset-3 bg-blue-500/30 rounded-full animate-ping"></div>
              <div class="bg-blue-600 text-white p-2.5 rounded-2xl shadow-xl border-2 border-white ring-2 ring-blue-400 flex items-center justify-center transform transition-transform">
                <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/>
                  <path d="M15 18H9"/>
                  <path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14"/>
                  <circle cx="17" cy="18" r="2"/>
                  <circle cx="7" cy="18" r="2"/>
                </svg>
              </div>
            </div>
            <div class="bg-blue-600 text-white text-[9px] font-black px-2 py-0.5 rounded-lg mt-1 whitespace-nowrap shadow-md border border-blue-400">
              ${tankerId}
            </div>
          </div>
        `,
        iconSize: [46, 56],
        iconAnchor: [23, 30]
      });

      const tankerMarker = L.marker(routeWaypoints[1], { icon: tankerIcon }).addTo(map);
      tankerMarkerRef.current = tankerMarker;

      // Fit bounds to show both tanker and destination
      map.fitBounds(L.latLngBounds([routeWaypoints[1], destinationCoords]), {
        padding: [40, 40]
      });

      mapInstanceRef.current = map;
    }

    const t = setTimeout(() => {
      mapInstanceRef.current?.invalidateSize();
    }, 200);

    return () => clearTimeout(t);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Simulate real-time tanker movement toward resident destination
  useEffect(() => {
    const timer = setInterval(() => {
      setWaypointIdx(prev => {
        const next = (prev + 1) % routeWaypoints.length;
        const newCoords = routeWaypoints[next];
        setCurrentPos(newCoords);

        if (tankerMarkerRef.current) {
          tankerMarkerRef.current.setLatLng(newCoords);
        }

        const dist = calculateDistanceKm(
          newCoords[0],
          newCoords[1],
          destinationCoords[0],
          destinationCoords[1]
        );
        setDistanceKm(dist);

        // Approximate dynamic ETA based on distance
        const estimatedMinutes = Math.max(2, Math.round(dist * 5));
        setEta(`${estimatedMinutes} mins`);
        setSpeedKmH(Math.floor(22 + Math.random() * 12));

        return next;
      });
    }, 4000);

    return () => clearInterval(timer);
  }, []);

  const handleRecenter = () => {
    if (!mapInstanceRef.current) return;
    mapInstanceRef.current.fitBounds(L.latLngBounds([currentPos, destinationCoords]), {
      padding: [40, 40]
    });
  };

  return (
    <div className={`relative w-full rounded-2xl overflow-hidden border border-indigo-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 shadow-inner ${isFullscreen ? 'fixed inset-0 z-50 rounded-none h-screen border-none' : heightClass}`}>
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      {/* Top Floating Status Pill */}
      <div className="absolute top-2.5 left-2.5 right-2.5 z-10 flex items-center justify-between pointer-events-none">
        <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md px-3 py-1.5 rounded-xl shadow-lg border border-indigo-100 dark:border-slate-800 flex items-center gap-2 pointer-events-auto">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-black uppercase text-indigo-600 tracking-wider">Live GPS</span>
              <span className="text-slate-300">•</span>
              <span className="text-xs font-black text-slate-800 dark:text-white">{eta} away</span>
            </div>
            <p className="text-[10px] text-slate-500 font-medium">Distance: <b>{distanceKm} km</b> • {speedKmH} km/h</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 pointer-events-auto">
          <button
            onClick={handleRecenter}
            title="Recenter Route"
            className="p-1.5 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-xl shadow border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-blue-600"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => {
              setIsFullscreen(!isFullscreen);
              setTimeout(() => mapInstanceRef.current?.invalidateSize(), 300);
            }}
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            className="p-1.5 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-xl shadow border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-blue-600"
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Bottom Floating Quick Contact Bar */}
      <div className="absolute bottom-2.5 left-2.5 right-2.5 z-10 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md px-3 py-2 rounded-xl shadow-lg border border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-blue-100 dark:bg-blue-900/40 text-blue-600 rounded-lg">
            <Truck className="w-4 h-4" />
          </div>
          <div>
            <p className="text-xs font-black text-slate-800 dark:text-white leading-none">{tankerId}</p>
            <p className="text-[10px] text-slate-500 font-medium mt-0.5">Driver: {driverName}</p>
          </div>
        </div>
        {driverPhone && (
          <a
            href={`tel:${driverPhone}`}
            className="bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-bold px-3 py-1.5 rounded-lg shadow-md shadow-indigo-200 dark:shadow-none flex items-center gap-1 transition-all"
          >
            <Phone className="w-3 h-3" /> Call
          </a>
        )}
      </div>
    </div>
  );
}
