import React from 'react';

const getTemperatureColor = (temp: string): string => {
  const temperature = parseFloat(temp);
  if (temperature < 10) return '#3B82F6'; // cold - blue
  if (temperature < 20) return '#06B6D4'; // cool - cyan
  if (temperature < 25) return '#10B981'; // mild - green
  if (temperature < 30) return '#F59E0B'; // warm - amber
  return '#EF4444'; // hot - red
};

interface TemperatureIconProps {
  temperature: string;
}

const TemperatureIcon = ({ temperature }: TemperatureIconProps): string => {
  const color = getTemperatureColor(temperature);
  const temp = Math.round(parseFloat(temperature));
  
  const iconHtml = `
    <div style="
      background-color: ${color};
      border-radius: 50%;
      width: 50px;
      height: 50px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: bold;
      font-size: 14px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      border: 3px solid white;
    ">
      ${temp}°
    </div>
  `;
  
  return iconHtml;
};

export default TemperatureIcon;