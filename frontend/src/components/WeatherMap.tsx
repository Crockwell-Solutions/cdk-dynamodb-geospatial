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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const lastBoundsRef = useRef<L.LatLngBounds | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const initialLoadRef = useRef(false);

  const fetchWeatherData = useCallback(
    async (bounds: L.LatLngBounds) => {
      if (!bounds) return;

      if (lastBoundsRef.current?.equals(bounds)) return;
      lastBoundsRef.current = bounds;

      setLoading(true);
      setError(null);

      try {
        const sw = bounds.getSouthWest();
        const ne = bounds.getNorthEast();
        const url = `${apiBaseUrl}spatial/bounding-box?latMin=${sw.lat}&lonMin=${sw.lng}&latMax=${ne.lat}&lonMax=${ne.lng}`;

        const response = await fetch(url, {
          headers: { 'X-API-KEY': apiKey },
        });

        if (!response.ok) {
          throw new Error(`API responded ${response.status}`);
        }

        const data: WeatherResponse = await response.json();
        setWeatherData(data.items || []);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    },
    [apiBaseUrl, apiKey]
  );

  const debouncedFetch = useCallback(
    (bounds: L.LatLngBounds) => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      debounceTimerRef.current = setTimeout(() => {
        fetchWeatherData(bounds);
      }, 300);
    },
    [fetchWeatherData]
  );

  const MapEvents = () => {
    const map = useMapEvents({
      moveend: () => debouncedFetch(map.getBounds()),
      zoomend: () => debouncedFetch(map.getBounds()),
    });

    useEffect(() => {
      if (!initialLoadRef.current) {
        initialLoadRef.current = true;
        debouncedFetch(map.getBounds());
      }
    }, [map]);

    return null;
  };

  return (
    <div className="relative h-screen">
      <MapContainer 
        center={[40.0, 0.0]} 
        zoom={5} 
        className="h-full w-full"
        key="weather-map"
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        />
        <WeatherMarkers weatherData={weatherData} />
        <MapEvents />
      </MapContainer>

      <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm rounded-lg p-4 shadow-lg z-[1000]">
        <h1 className="text-xl font-bold text-slate-800 mb-2">Geospatial Data Demonstrator</h1>
        {loading && <div className="text-blue-600 text-sm">Loading...</div>}
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
