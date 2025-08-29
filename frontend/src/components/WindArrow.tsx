import React from 'react';

interface WindArrowProps {
  windSpeed: string;
  windDir: string;
}

const WindArrow = ({ windSpeed, windDir }: WindArrowProps): string => {
  const speed = parseFloat(windSpeed);
  const direction = parseFloat(windDir);
  
  // Scale arrow size based on wind speed (2-20px)
  const arrowSize = Math.max(2, Math.min(20, speed * 1.5));
  
  // Animation duration based on wind speed (faster = shorter duration)
  const animationDuration = Math.max(1, 4 - (speed / 5));
  
  const arrowHtml = `
    <div style="
      width: ${arrowSize}px;
      height: ${arrowSize}px;
      transform: rotate(${direction}deg);
      animation: windFlow ${animationDuration}s ease-in-out infinite;
      display: flex;
      align-items: center;
      justify-content: center;
    ">
      <svg width="${arrowSize}" height="${arrowSize}" viewBox="0 0 24 24" fill="none">
        <path 
          d="M12 2L22 12L12 22L12 16L2 16L2 8L12 8L12 2Z" 
          fill="#1F2937" 
          stroke="white" 
          stroke-width="1"
          opacity="0.8"
        />
      </svg>
    </div>
    
    <style>
      @keyframes windFlow {
        0% { transform: rotate(${direction}deg) translateX(0px); opacity: 0.6; }
        50% { opacity: 1; }
        100% { transform: rotate(${direction}deg) translateX(8px); opacity: 0.3; }
      }
    </style>
  `;
  
  return arrowHtml;
};

export default WindArrow;