import React, { useState, useEffect, useRef, useCallback } from 'react';
import L from 'leaflet';
import { MapContainer, TileLayer, useMapEvents } from 'react-leaflet';
import WeatherMarkers from './WeatherMarkers';
import { WeatherData, WeatherResponse } from '../types/weather';

interface MapViewProps {
  apiBaseUrl: string;
  apiKey: string;
}

const WeatherMap: React.FC<MapViewProps> = ({ apiBaseUrl, apiKey }) => {
  const [weatherData, setWeatherData] = useState<WeatherData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const lastBoundsRef = useRef<L.LatLngBounds | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const fetchWeatherData = useCallback(
    async (bounds: L.LatLngBounds) => {
      if (!bounds) {
        console.warn('fetchWeatherData called without bounds');
        return;
      }

      if (lastBoundsRef.current?.equals(bounds)) {
        console.log('Bounds unchanged, skipping fetch');
        return;
      }
      lastBoundsRef.current = bounds;

      console.log('Fetching weather data for bounds:', bounds.toBBoxString());

      setLoading(true);
      setError(null);

      try {
        const sw = bounds.getSouthWest();
        const ne = bounds.getNorthEast();
        const url = `${apiBaseUrl}/spatial/bounding-box?latMin=${sw.lat}&lonMin=${sw.lng}&latMax=${ne.lat}&lonMax=${ne.lng}`;

        console.log('API URL:', url);

        const response = await fetch(url, {
          headers: { 'X-API-KEY': apiKey },
        });

        if (!response.ok) {
          throw new Error(`API responded ${response.status}`);
        }

        const data: WeatherResponse = await response.json();
        console.log('Weather API response:', data);

        setWeatherData(data.items || []);
      } catch (err: any) {
        console.error('Error fetching weather data:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    },
    [apiBaseUrl, apiKey]
  );

  // Debounced wrapper
  const debouncedFetch = useCallback(
    (bounds: L.LatLngBounds) => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      debounceTimerRef.current = setTimeout(() => {
        fetchWeatherData(bounds);
      }, 400);
    },
    [fetchWeatherData]
  );

  // Map event listeners
  const MapEvents = () => {
    const map = useMapEvents({
      moveend: () => {
        console.log('moveend fired');
        debouncedFetch(map.getBounds());
      },
      zoomend: () => {
        console.log('zoomend fired');
        debouncedFetch(map.getBounds());
      },
    });

    useEffect(() => {
      console.log('Map mounted, triggering initial fetch');
      requestAnimationFrame(() => map.invalidateSize());
      debouncedFetch(map.getBounds());
    }, [map]);

    return null;
  };

  // 🔥 Guarantee at least one fetch on component mount
  useEffect(() => {
    const defaultBounds = L.latLngBounds(
      L.latLng(30, -10),
      L.latLng(50, 10)
    );
    console.log('Initial effect fired, fetching with default bounds');
    fetchWeatherData(defaultBounds);
  }, [fetchWeatherData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-100">
        <div className="text-xl text-slate-600">Loading weather data...</div>
      </div>
    );
  }

  return (
    <div className="relative h-screen">
      <MapContainer center={[40.0, 0.0]} zoom={5} className="h-full w-full">
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        />
        <WeatherMarkers weatherData={weatherData} />
        <MapEvents />
      </MapContainer>

      {/* Sidebar overlay */}
      <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm rounded-lg p-4 shadow-lg z-[1000]">
        <h1 className="text-xl font-bold text-slate-800 mb-2">Weather Visualization</h1>
        {error ? (
          <div className="text-red-600 text-sm">Error: {error}</div>
        ) : (
          <div className="text-sm text-slate-600">
            {weatherData.length} weather stations loaded
          </div>
        )}
      </div>
    </div>
  );
};

export default WeatherMap;
