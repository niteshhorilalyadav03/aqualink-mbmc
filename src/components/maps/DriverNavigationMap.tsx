import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { 
  Navigation, MapPin, Truck, Phone, CheckCircle, 
  Maximize2, Minimize2, Play, Pause, RotateCcw, 
  Compass, ArrowUpRight, AlertCircle, ShieldAlert
} from 'lucide-react';
import { calculateDistanceKm } from '../../lib/fleetData';

interface DeliveryStop {
  id: string;
  orderId: string;
  recipientName: string;
  address: string;
  phone: string;
  volume: string;
  lat: number;
  lng: number;
  isPriority?: boolean;
  status: 'Pending' | 'In Progress' | 'Completed';
}

interface DriverNavigationMapProps {
  vehicleId?: string;
  activeOrders?: any[];
  onOrderDelivered?: (orderId: string) => void;
  heightClass?: string;
}

export default function DriverNavigationMap({
  vehicleId = 'MH-04-WT-8821',
  activeOrders = [],
  onOrderDelivered,
  heightClass = 'h-80 sm:h-96'
}: DriverNavigationMapProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const driverMarkerRef = useRef<L.Marker | null>(null);
  const stopMarkersRef = useRef<L.Marker[]>([]);
  const polylineRef = useRef<L.Polyline | null>(null);

  // Default driver stops around Mira Road
  const [stops, setStops] = useState<DeliveryStop[]>([
    {
      id: 'STOP-1',
      orderId: 'BKG-1001',
      recipientName: 'Rahul Sharma',
      address: 'B-402, Shanti Nagar C.H.S., Mira Road East',
      phone: '+91 98765 43210',
      volume: '1000L',
      lat: 19.2825,
      lng: 72.8610,
      isPriority: true,
      status: 'In Progress'
    },
    {
      id: 'STOP-2',
      orderId: 'BKG-1002',
      recipientName: 'Priya Patel',
      address: 'Sector 4, Shrishti Complex, Mira Road',
      phone: '+91 98765 43211',
      volume: '5000L',
      lat: 19.2870,
      lng: 72.8640,
      isPriority: false,
      status: 'Pending'
    },
    {
      id: 'STOP-3',
      orderId: 'BKG-1004',
      recipientName: 'Sneha Desai',
      address: 'C-205, Silver Park, Mira Road',
      phone: '+91 98765 43213',
      volume: '1000L',
      lat: 19.2770,
      lng: 72.8550,
      isPriority: false,
      status: 'Pending'
    }
  ]);

  const [activeStopIndex, setActiveStopIndex] = useState(0);
  const [isNavigating, setIsNavigating] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Driver route path
  const driverRoute: [number, number][] = [
    [19.2865, 72.8590], // Depot start
    [19.2850, 72.8600],
    [19.2838, 72.8612],
    [19.2825, 72.8610], // Stop 1 (Rahul Sharma)
    [19.2840, 72.8625],
    [19.2855, 72.8632],
    [19.2870, 72.8640], // Stop 2 (Priya Patel)
    [19.2830, 72.8600],
    [19.2800, 72.8570],
    [19.2770, 72.8550]  // Stop 3 (Silver Park)
  ];

  const [routeStep, setRouteStep] = useState(1);
  const [driverPos, setDriverPos] = useState<[number, number]>(driverRoute[1]);
  const [currentSpeed, setCurrentSpeed] = useState(24);

  const activeStop = stops[activeStopIndex] || stops[0];

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: driverRoute[1],
        zoom: 15,
        zoomControl: false,
        attributionControl: false
      });

      L.control.zoom({ position: 'bottomright' }).addTo(map);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19
      }).addTo(map);

      // Route line
      const line = L.polyline(driverRoute, {
        color: '#2563eb',
        weight: 6,
        opacity: 0.8,
        dashArray: '6, 8',
        lineCap: 'round',
        lineJoin: 'round'
      }).addTo(map);
      polylineRef.current = line;

      // Driver Vehicle Marker
      const driverIcon = L.divIcon({
        className: 'driver-truck-marker',
        html: `
          <div class="relative flex flex-col items-center">
            <div class="absolute -inset-3 bg-blue-500/30 rounded-full animate-ping"></div>
            <div class="bg-blue-600 text-white p-2.5 rounded-2xl shadow-2xl border-2 border-white ring-4 ring-blue-400/60 flex items-center justify-center transform transition-transform">
              <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 fill-white" viewBox="0 0 24 24">
                <path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z"/>
              </svg>
            </div>
            <div class="bg-slate-900 text-white text-[9px] font-black px-2 py-0.5 rounded-full mt-1 shadow-md border border-slate-700 whitespace-nowrap">
              ${vehicleId}
            </div>
          </div>
        `,
        iconSize: [46, 56],
        iconAnchor: [23, 28]
      });

      const driverMarker = L.marker(driverRoute[1], { icon: driverIcon }).addTo(map);
      driverMarkerRef.current = driverMarker;

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

  // Update Delivery Stop Markers
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Clear old stop markers
    stopMarkersRef.current.forEach(m => m.remove());
    stopMarkersRef.current = [];

    stops.forEach((stop, index) => {
      const isCurrentTarget = index === activeStopIndex;
      const isDone = stop.status === 'Completed';

      const stopHtml = `
        <div class="relative cursor-pointer flex flex-col items-center group">
          <div class="${
            isDone
              ? 'bg-emerald-600 ring-emerald-300'
              : isCurrentTarget
              ? 'bg-rose-600 ring-rose-400 animate-bounce'
              : 'bg-slate-700 ring-slate-400'
          } text-white font-black text-xs w-7 h-7 rounded-xl shadow-xl border-2 border-white ring-2 flex items-center justify-center">
            ${isDone ? '✓' : index + 1}
          </div>
          <div class="bg-slate-900/90 text-white text-[9px] font-black px-2 py-0.5 rounded-full mt-1 whitespace-nowrap shadow border border-slate-700 backdrop-blur-sm">
            ${stop.recipientName.split(' ')[0]} • ${stop.volume}
          </div>
        </div>
      `;

      const marker = L.marker([stop.lat, stop.lng], {
        icon: L.divIcon({
          className: 'driver-stop-marker',
          html: stopHtml,
          iconSize: [36, 46],
          iconAnchor: [18, 23]
        })
      }).addTo(map);

      marker.on('click', () => {
        setActiveStopIndex(index);
        map.setView([stop.lat, stop.lng], 16, { animate: true });
      });

      marker.bindPopup(`
        <div class="p-3 font-sans text-xs text-slate-900 max-w-xs">
          <div class="flex items-center justify-between mb-1">
            <span class="font-black text-blue-600">STOP #${index + 1}</span>
            <span class="text-[10px] font-bold px-1.5 py-0.5 rounded ${stop.isPriority ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-700'}">
              ${stop.volume}
            </span>
          </div>
          <p class="font-black text-slate-900 text-sm">${stop.recipientName}</p>
          <p class="text-slate-500 text-[11px] mt-0.5">${stop.address}</p>
          <div class="mt-2 pt-2 border-t flex justify-between items-center">
            <a href="tel:${stop.phone}" class="text-blue-600 font-bold hover:underline">Call Customer</a>
            <span class="font-semibold text-slate-400">${stop.status}</span>
          </div>
        </div>
      `);

      stopMarkersRef.current.push(marker);
    });
  }, [stops, activeStopIndex]);

  // Simulate Drive progress
  useEffect(() => {
    if (!isNavigating) return;

    const interval = setInterval(() => {
      setRouteStep(prevStep => {
        const next = (prevStep + 1) % driverRoute.length;
        const nextPos = driverRoute[next];
        setDriverPos(nextPos);

        if (driverMarkerRef.current) {
          driverMarkerRef.current.setLatLng(nextPos);
        }

        // Randomize realistic vehicle speed
        setCurrentSpeed(Math.floor(22 + Math.random() * 16));

        // Check if arrived at any stop
        stops.forEach((stop, idx) => {
          const dist = calculateDistanceKm(nextPos[0], nextPos[1], stop.lat, stop.lng);
          if (dist < 0.15 && idx === activeStopIndex && stop.status !== 'Completed') {
            // Reached stop
            setCurrentSpeed(0);
          }
        });

        return next;
      });
    }, 3500);

    return () => clearInterval(interval);
  }, [isNavigating, activeStopIndex, stops]);

  const handleRecenter = () => {
    if (!mapInstanceRef.current) return;
    mapInstanceRef.current.setView(driverPos, 16, { animate: true });
  };

  const handleMarkDelivered = () => {
    setStops(prev =>
      prev.map((s, idx) => (idx === activeStopIndex ? { ...s, status: 'Completed' } : s))
    );
    if (onOrderDelivered && activeStop) {
      onOrderDelivered(activeStop.orderId);
    }
    // Advance to next stop
    if (activeStopIndex < stops.length - 1) {
      setActiveStopIndex(activeStopIndex + 1);
    }
  };

  const distanceToTarget = calculateDistanceKm(
    driverPos[0],
    driverPos[1],
    activeStop.lat,
    activeStop.lng
  );
  const etaMinutes = Math.max(1, Math.round(distanceToTarget * 4));

  return (
    <div className={`relative w-full rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-900 shadow-xl ${isFullscreen ? 'fixed inset-0 z-50 rounded-none h-screen border-none' : heightClass}`}>
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      {/* Top Turn-by-Turn Guidance Banner */}
      <div className="absolute top-3 left-3 right-3 z-10 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 pointer-events-none">
        <div className="bg-slate-900/95 text-white backdrop-blur-md px-4 py-2.5 rounded-2xl shadow-2xl border border-slate-700/80 flex items-center gap-3 pointer-events-auto">
          <div className="bg-blue-600 p-2 rounded-xl text-white shadow-lg shadow-blue-500/30 shrink-0">
            <ArrowUpRight className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase text-blue-400 tracking-wider">Turn Guidance</span>
              <span className="text-slate-500">•</span>
              <span className="text-xs font-bold text-slate-300">In 200m</span>
            </div>
            <p className="text-sm font-black text-white leading-tight">Turn right toward {activeStop.recipientName}'s block</p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 pointer-events-auto self-end sm:self-auto">
          <button
            onClick={() => setIsNavigating(!isNavigating)}
            title={isNavigating ? 'Pause Navigation Simulation' : 'Resume Navigation Simulation'}
            className={`px-3 py-2 rounded-xl font-bold text-xs shadow-lg backdrop-blur-md border transition-all flex items-center gap-1.5 ${
              isNavigating
                ? 'bg-blue-600 text-white border-blue-500'
                : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700'
            }`}
          >
            {isNavigating ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            <span className="text-[11px] font-black uppercase">{isNavigating ? 'Simulating' : 'Start'}</span>
          </button>

          <button
            onClick={handleRecenter}
            title="Recenter On Tanker"
            className="p-2 bg-white/95 dark:bg-slate-900/95 text-slate-700 dark:text-slate-200 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
          >
            <Compass className="w-4 h-4 text-blue-600" />
          </button>

          <button
            onClick={() => {
              setIsFullscreen(!isFullscreen);
              setTimeout(() => mapInstanceRef.current?.invalidateSize(), 300);
            }}
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            className="p-2 bg-white/95 dark:bg-slate-900/95 text-slate-700 dark:text-slate-200 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Bottom Driver Active Destination Sheet */}
      <div className="absolute bottom-3 left-3 right-3 z-10 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl p-4 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-900/40 text-blue-600 flex items-center justify-center shrink-0 border border-blue-200 dark:border-blue-800">
            <MapPin className="w-6 h-6 text-blue-600" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase text-blue-600 tracking-wider">
                Stop #{activeStopIndex + 1} of {stops.length}
              </span>
              {activeStop.isPriority && (
                <span className="bg-red-100 text-red-700 text-[9px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-wider">
                  Priority
                </span>
              )}
            </div>
            <h4 className="font-display font-black text-slate-900 dark:text-white text-base truncate">
              {activeStop.recipientName} ({activeStop.volume})
            </h4>
            <p className="text-xs text-slate-500 truncate">{activeStop.address}</p>
          </div>
        </div>

        {/* Live Distance, Speed & Actions */}
        <div className="flex items-center justify-between w-full md:w-auto gap-4 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100 dark:border-slate-800">
          <div className="text-left md:text-right">
            <div className="text-xs font-black text-slate-900 dark:text-white">
              {distanceToTarget} km • <span className="text-blue-600">{etaMinutes} min ETA</span>
            </div>
            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
              Speed: {currentSpeed} km/h
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={`tel:${activeStop.phone}`}
              className="p-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl transition-all shadow-sm"
              title="Call Recipient"
            >
              <Phone className="w-4 h-4 text-blue-600" />
            </a>

            <button
              onClick={handleMarkDelivered}
              disabled={activeStop.status === 'Completed'}
              className={`px-4 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-md ${
                activeStop.status === 'Completed'
                  ? 'bg-emerald-100 text-emerald-700 cursor-default'
                  : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-200 active:scale-95'
              }`}
            >
              <CheckCircle className="w-4 h-4" />
              <span>{activeStop.status === 'Completed' ? 'Delivered' : 'Mark Arrived'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
