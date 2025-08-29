import React from 'react';
import { Marker } from 'react-leaflet';
import L from 'leaflet';
import { WeatherData } from '../types/weather';
import TemperatureIcon from './TemperatureIcon';
import WindArrow from './WindArrow';

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
            
            {station.windSpeed && station.windDir && (
              <Marker
                position={position}
                icon={L.divIcon({
                  html: `<div>${WindArrow({ 
                    windSpeed: station.windSpeed, 
                    windDir: station.windDir 
                  })}</div>`,
                  className: 'wind-marker',
                  iconSize: [40, 40],
                  iconAnchor: [20, 20]
                })}
              />
            )}
          </React.Fragment>
        );
      })}
    </>
  );
};

export default WeatherMarkers;