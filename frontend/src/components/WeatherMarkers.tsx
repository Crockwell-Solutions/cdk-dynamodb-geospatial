import React from 'react';
import { Marker } from 'react-leaflet';
import L from 'leaflet';
import { WeatherData } from '../types/weather';
import TemperatureIcon from './TemperatureIcon';

interface WeatherMarkersProps {
  weatherData: WeatherData[];
}

const WeatherMarkers: React.FC<WeatherMarkersProps> = ({ weatherData }) => {
  return (
    <>
      {weatherData.map((station, index) => {
        const position: [number, number] = [parseFloat(station.lat), parseFloat(station.lon)];
        
        return (
          <React.Fragment key={index}>
            <Marker
              position={position}
              icon={L.divIcon({
                html: `<div>${TemperatureIcon({ temperature: station.temperature })}</div>`,
                className: 'weather-marker',
                iconSize: [60, 60],
                iconAnchor: [30, 30]
              })}
            />
          </React.Fragment>
        );
      })}
    </>
  );
};

export default WeatherMarkers;