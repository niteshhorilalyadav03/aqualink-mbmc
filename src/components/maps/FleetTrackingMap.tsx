import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { 
  Truck, Navigation, Droplets, Phone, ShieldCheck, 
  Maximize2, Minimize2, Play, Pause, RotateCcw, 
  Layers, MapPin, Gauge, Radio
} from 'lucide-react';
import { INITIAL_FLEET, WATER_DEPOTS, TankerFleet, calculateDistanceKm } from '../../lib/fleetData';

interface FleetTrackingMapProps {
  heightClass?: string;
  selectedTankerId?: string;
  onSelectTanker?: (tanker: TankerFleet | null) => void;
  showControls?: boolean;
}

export default function FleetTrackingMap({
  heightClass = 'h-[460px]',
  selectedTankerId,
  onSelectTanker,
  showControls = true
}: FleetTrackingMapProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<{ [key: string]: L.Marker }>({});
  const polylinesRef = useRef<L.Polyline[]>([]);
  const depotMarkersRef = useRef<L.Marker[]>([]);

  const [fleet, setFleet] = useState<TankerFleet[]>(INITIAL_FLEET);
  const [selectedTanker, setSelectedTanker] = useState<TankerFleet | null>(null);
  const [isLiveSimulating, setIsLiveSimulating] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'All' | 'En Route' | 'Delivering' | 'Available' | 'Refilling'>('All');
  const [showRoutes, setShowRoutes] = useState(true);
  const [showDepots, setShowDepots] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Sync external selectedTankerId
  useEffect(() => {
    if (selectedTankerId) {
      const found = fleet.find(t => t.id === selectedTankerId);
      if (found) {
        setSelectedTanker(found);
        if (mapInstanceRef.current) {
          mapInstanceRef.current.setView([found.lat, found.lng], 15, { animate: true });
        }
      }
    }
  }, [selectedTankerId, fleet]);

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [19.284, 72.862],
        zoom: 14,
        zoomControl: false,
        attributionControl: false
      });

      L.control.zoom({ position: 'bottomright' }).addTo(map);

      // OpenStreetMap tile layer with high clarity
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        subdomains: ['a', 'b', 'c']
      }).addTo(map);

      mapInstanceRef.current = map;
    }

    const timer = setTimeout(() => {
      mapInstanceRef.current?.invalidateSize();
    }, 200);

    return () => {
      clearTimeout(timer);
    };
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

  // Live GPS movement simulation
  useEffect(() => {
    if (!isLiveSimulating) return;

    const interval = setInterval(() => {
      setFleet(prevFleet => {
        return prevFleet.map(tanker => {
          if (tanker.status !== 'En Route' || !tanker.routeWaypoints || tanker.routeWaypoints.length < 2) {
            return tanker;
          }

          const waypoints = tanker.routeWaypoints;
          let currIdx = tanker.currentWaypointIndex ?? 0;
          let nextIdx = (currIdx + 1) % waypoints.length;

          // Tiny step towards next waypoint
          const target = waypoints[nextIdx];
          const latDiff = (target[0] - tanker.lat) * 0.18;
          const lngDiff = (target[1] - tanker.lng) * 0.18;

          const newLat = tanker.lat + latDiff;
          const newLng = tanker.lng + lngDiff;

          // Check if close to waypoint
          const dist = Math.hypot(target[0] - newLat, target[1] - newLng);
          if (dist < 0.0003) {
            currIdx = nextIdx;
          }

          // Calculate heading angle
          const angleDeg = ((Math.atan2(lngDiff, latDiff) * 180) / Math.PI + 360) % 360;

          return {
            ...tanker,
            lat: newLat,
            lng: newLng,
            heading: Math.round(angleDeg),
            currentWaypointIndex: currIdx,
            speedKmH: Math.floor(22 + Math.random() * 14)
          };
        });
      });
    }, 3000);

    return () => clearInterval(interval);
  }, [isLiveSimulating]);

  // Update Markers and Routes on Map
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Clear existing polylines
    polylinesRef.current.forEach(p => p.remove());
    polylinesRef.current = [];

    // Clear depot markers
    depotMarkersRef.current.forEach(d => d.remove());
    depotMarkersRef.current = [];

    // Render Water Depots if enabled
    if (showDepots) {
      WATER_DEPOTS.forEach(depot => {
        const depotIcon = L.divIcon({
          className: 'depot-marker-wrapper',
          html: `
            <div class="relative group cursor-pointer flex flex-col items-center">
              <div class="bg-cyan-600 text-white p-2 rounded-xl shadow-lg border-2 border-white ring-2 ring-cyan-400/50 flex items-center justify-center transform hover:scale-110 transition-transform">
                <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 fill-white" viewBox="0 0 24 24"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/></svg>
              </div>
              <div class="bg-slate-900/90 text-white text-[9px] font-black px-2 py-0.5 rounded-full mt-1 whitespace-nowrap shadow border border-slate-700 backdrop-blur-sm">
                ${depot.name.split(' ')[0]} Hub
              </div>
            </div>
          `,
          iconSize: [40, 50],
          iconAnchor: [20, 25]
        });

        const marker = L.marker([depot.lat, depot.lng], { icon: depotIcon }).addTo(map);
        marker.bindPopup(`
          <div class="p-3 text-slate-900 font-sans max-w-xs">
            <div class="flex items-center gap-1.5 text-cyan-600 font-bold text-xs uppercase mb-1">
              <span>● ${depot.type}</span>
            </div>
            <h4 class="font-black text-sm text-slate-900 leading-tight mb-2">${depot.name}</h4>
            <div class="flex justify-between items-center bg-cyan-50 p-2 rounded-lg text-xs font-semibold mb-2">
              <span class="text-cyan-800">Capacity</span>
              <span class="text-cyan-900 font-bold">${depot.currentCapacityPercent}%</span>
            </div>
            <div class="text-[11px] text-slate-500 font-medium">
              Active Pumps: <b>${depot.activePumps}</b> • Ready for Refill
            </div>
          </div>
        `);
        depotMarkersRef.current.push(marker);
      });
    }

    // Filter fleet
    const displayedFleet = fleet.filter(t => {
      if (statusFilter === 'All') return true;
      return t.status === statusFilter;
    });

    // Remove old tanker markers that are not in displayedFleet
    Object.keys(markersRef.current).forEach(id => {
      if (!displayedFleet.some(t => t.id === id)) {
        markersRef.current[id].remove();
        delete markersRef.current[id];
      }
    });

    // Update or add tanker markers
    displayedFleet.forEach(tanker => {
      const isSelected = selectedTanker?.id === tanker.id;

      // Status color styles
      let colorClass = 'bg-blue-600';
      let ringClass = 'ring-blue-400';
      let pulseColor = 'bg-blue-400';

      if (tanker.status === 'Delivering') {
        colorClass = 'bg-emerald-600';
        ringClass = 'ring-emerald-400';
        pulseColor = 'bg-emerald-400';
      } else if (tanker.status === 'Refilling') {
        colorClass = 'bg-amber-500';
        ringClass = 'ring-amber-400';
        pulseColor = 'bg-amber-400';
      } else if (tanker.status === 'Available') {
        colorClass = 'bg-indigo-600';
        ringClass = 'ring-indigo-400';
        pulseColor = 'bg-indigo-400';
      }

      const iconHtml = `
        <div class="relative cursor-pointer flex flex-col items-center group">
          ${tanker.status === 'En Route' ? `<div class="absolute -inset-2 rounded-full ${pulseColor} opacity-40 animate-ping"></div>` : ''}
          <div class="${colorClass} text-white p-2 rounded-2xl shadow-xl border-2 border-white ring-2 ${ringClass} flex items-center justify-center transform transition-transform duration-300 ${isSelected ? 'scale-125 ring-4 ring-offset-2' : 'hover:scale-110'}">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/>
              <path d="M15 18H9"/>
              <path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14"/>
              <circle cx="17" cy="18" r="2"/>
              <circle cx="7" cy="18" r="2"/>
            </svg>
          </div>
          <div class="bg-slate-950/90 text-white text-[9px] font-black px-2 py-0.5 rounded-full mt-1 whitespace-nowrap shadow-md border border-slate-700 flex items-center gap-1 backdrop-blur-md">
            <span>${tanker.id.slice(-4)}</span>
            <span class="w-1.5 h-1.5 rounded-full ${tanker.status === 'Delivering' ? 'bg-emerald-400' : tanker.status === 'Refilling' ? 'bg-amber-400' : 'bg-blue-400'}"></span>
          </div>
        </div>
      `;

      const customIcon = L.divIcon({
        className: 'tanker-marker-custom',
        html: iconHtml,
        iconSize: [44, 52],
        iconAnchor: [22, 26]
      });

      if (markersRef.current[tanker.id]) {
        // Smoothly update position
        markersRef.current[tanker.id].setLatLng([tanker.lat, tanker.lng]);
        markersRef.current[tanker.id].setIcon(customIcon);
      } else {
        const marker = L.marker([tanker.lat, tanker.lng], { icon: customIcon }).addTo(map);
        marker.on('click', () => {
          setSelectedTanker(tanker);
          if (onSelectTanker) onSelectTanker(tanker);
          map.setView([tanker.lat, tanker.lng], 15, { animate: true });
        });
        markersRef.current[tanker.id] = marker;
      }

      // Draw route and destination if tanker is en route and routes are enabled
      if (showRoutes && tanker.routeWaypoints && tanker.routeWaypoints.length > 0) {
        const routeLine = L.polyline(tanker.routeWaypoints, {
          color: tanker.status === 'Delivering' ? '#10b981' : '#3b82f6',
          weight: 4,
          opacity: 0.75,
          dashArray: '8, 8',
          lineCap: 'round'
        }).addTo(map);

        polylinesRef.current.push(routeLine);

        // Destination drop marker if exists
        if (tanker.destination) {
          const destIcon = L.divIcon({
            className: 'dest-marker-custom',
            html: `
              <div class="relative cursor-pointer flex flex-col items-center">
                <div class="bg-rose-600 text-white p-1.5 rounded-xl shadow-lg border-2 border-white ring-2 ring-rose-400 flex items-center justify-center animate-bounce">
                  <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
                </div>
                <div class="bg-slate-900/90 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-md mt-0.5 shadow whitespace-nowrap">
                  ${tanker.destination.name.split(' ')[0]}
                </div>
              </div>
            `,
            iconSize: [30, 40],
            iconAnchor: [15, 30]
          });

          const destMarker = L.marker([tanker.destination.lat, tanker.destination.lng], { icon: destIcon }).addTo(map);
          destMarker.bindPopup(`
            <div class="p-2 text-slate-900 font-sans text-xs">
              <p class="font-bold text-rose-600">Delivery Destination</p>
              <p class="font-black text-slate-900">${tanker.destination.name}</p>
              <p class="text-slate-500 text-[11px] mt-0.5">${tanker.destination.address}</p>
              <p class="text-blue-600 font-bold mt-1 text-[11px]">Assigned: ${tanker.id}</p>
            </div>
          `);
          depotMarkersRef.current.push(destMarker);
        }
      }
    });
  }, [fleet, statusFilter, showRoutes, showDepots, selectedTanker, onSelectTanker]);

  // Recenter map on active fleet
  const handleRecenter = () => {
    if (!mapInstanceRef.current) return;
    mapInstanceRef.current.setView([19.284, 72.862], 14, { animate: true });
    setSelectedTanker(null);
    if (onSelectTanker) onSelectTanker(null);
  };

  return (
    <div className={`relative w-full rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-900 shadow-md ${isFullscreen ? 'fixed inset-0 z-50 rounded-none h-screen border-none' : heightClass}`}>
      {/* Map Element */}
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      {/* Top Floating Control Bar */}
      {showControls && (
        <div className="absolute top-3 left-3 right-3 z-10 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
          {/* Status Filters */}
          <div className="flex items-center gap-1.5 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md px-3 py-1.5 rounded-2xl shadow-lg border border-slate-200/80 dark:border-slate-700/80 pointer-events-auto overflow-x-auto max-w-full">
            <Radio className="w-3.5 h-3.5 text-blue-600 animate-pulse hidden sm:block shrink-0" />
            {(['All', 'En Route', 'Delivering', 'Available', 'Refilling'] as const).map(status => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-xl transition-all whitespace-nowrap ${
                  statusFilter === status
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {status}
              </button>
            ))}
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-2 pointer-events-auto">
            {/* Live GPS Simulation Toggle */}
            <button
              onClick={() => setIsLiveSimulating(!isLiveSimulating)}
              title={isLiveSimulating ? 'Pause GPS Telemetry' : 'Resume GPS Telemetry'}
              className={`p-2 rounded-xl backdrop-blur-md shadow-lg border transition-all flex items-center gap-1.5 text-xs font-bold ${
                isLiveSimulating
                  ? 'bg-emerald-600 text-white border-emerald-500'
                  : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
              }`}
            >
              {isLiveSimulating ? (
                <>
                  <Pause className="w-3.5 h-3.5" />
                  <span className="text-[10px] uppercase font-black tracking-widest hidden sm:inline">Live</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5" />
                  <span className="text-[10px] uppercase font-black tracking-widest hidden sm:inline">Paused</span>
                </>
              )}
            </button>

            {/* Toggle Routes */}
            <button
              onClick={() => setShowRoutes(!showRoutes)}
              title="Toggle Route Polylines"
              className={`p-2 rounded-xl backdrop-blur-md shadow-lg border transition-all text-xs ${
                showRoutes
                  ? 'bg-blue-600 text-white border-blue-500'
                  : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
              }`}
            >
              <Layers className="w-4 h-4" />
            </button>

            {/* Recenter */}
            <button
              onClick={handleRecenter}
              title="Recenter Map"
              className="p-2 rounded-xl bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 backdrop-blur-md shadow-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            {/* Fullscreen Toggle */}
            <button
              onClick={() => {
                setIsFullscreen(!isFullscreen);
                setTimeout(() => mapInstanceRef.current?.invalidateSize(), 300);
              }}
              title={isFullscreen ? 'Exit Fullscreen' : 'View Fullscreen'}
              className="p-2 rounded-xl bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 backdrop-blur-md shadow-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          </div>
        </div>
      )}

      {/* Bottom Selected Tanker Card Overlay */}
      {selectedTanker && (
        <div className="absolute bottom-3 left-3 right-3 sm:right-auto sm:w-96 z-10 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl p-4 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 bg-blue-100 dark:bg-blue-900/40 text-blue-600 rounded-xl">
                <Truck className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-display font-black text-slate-900 dark:text-white text-base leading-tight">
                    {selectedTanker.id}
                  </h4>
                  <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                    selectedTanker.status === 'Delivering' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400' :
                    selectedTanker.status === 'Refilling' ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400' :
                    'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400'
                  }`}>
                    {selectedTanker.status}
                  </span>
                </div>
                <p className="text-xs text-slate-500 font-medium">Driver: <b className="text-slate-800 dark:text-slate-200">{selectedTanker.driverName}</b></p>
              </div>
            </div>
            <button
              onClick={() => setSelectedTanker(null)}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-sm font-bold p-1"
            >
              ✕
            </button>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-3 gap-2 py-2 border-y border-slate-100 dark:border-slate-800 mb-3 text-center">
            <div className="bg-slate-50 dark:bg-slate-800/60 p-2 rounded-xl">
              <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Water Level</div>
              <div className="text-sm font-black text-blue-600 dark:text-blue-400 mt-0.5">
                {selectedTanker.waterLevel}%
              </div>
            </div>
            <div className="bg-slate-50 dark:bg-slate-800/60 p-2 rounded-xl">
              <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Speed</div>
              <div className="text-sm font-black text-slate-800 dark:text-white mt-0.5">
                {selectedTanker.speedKmH} km/h
              </div>
            </div>
            <div className="bg-slate-50 dark:bg-slate-800/60 p-2 rounded-xl">
              <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Purity</div>
              <div className="text-sm font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
                {selectedTanker.purity}%
              </div>
            </div>
          </div>

          {/* Destination info if en route */}
          {selectedTanker.destination && (
            <div className="mb-3 text-xs bg-blue-50/70 dark:bg-blue-950/30 p-2.5 rounded-xl border border-blue-100 dark:border-blue-900/50">
              <div className="flex items-center gap-1.5 text-blue-600 font-bold text-[10px] uppercase tracking-wider">
                <MapPin className="w-3 h-3" /> Heading to:
              </div>
              <p className="font-bold text-slate-900 dark:text-white mt-0.5 truncate">{selectedTanker.destination.name}</p>
              <p className="text-slate-500 text-[11px] truncate">{selectedTanker.destination.address}</p>
            </div>
          )}

          {/* Action Row */}
          <div className="flex gap-2">
            <a
              href={`tel:${selectedTanker.driverPhone}`}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-md shadow-blue-200 dark:shadow-none"
            >
              <Phone className="w-3.5 h-3.5" /> Call Driver
            </a>
            <button
              onClick={() => {
                if (mapInstanceRef.current) {
                  mapInstanceRef.current.setView([selectedTanker.lat, selectedTanker.lng], 16, { animate: true });
                }
              }}
              className="px-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl transition-all flex items-center gap-1"
            >
              <Navigation className="w-3.5 h-3.5 text-blue-600" /> Focus
            </button>
          </div>
        </div>
      )}

      {/* Water Quality & Fleet Status Pill in Bottom Right */}
      <div className="absolute bottom-3 right-3 z-10 hidden sm:flex items-center gap-2 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md px-3 py-1.5 rounded-full border border-slate-200/80 dark:border-slate-700/80 shadow-md text-[10px] font-bold text-slate-600 dark:text-slate-300">
        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
        <span>Mira-Bhayandar Sector 4 • {fleet.length} Tankers Active</span>
      </div>
    </div>
  );
}
