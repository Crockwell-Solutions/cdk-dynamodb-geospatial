# Weather Visualization Frontend

A React application that visualizes weather data on an interactive map with animated wind arrows and temperature indicators.

## Features

- **Interactive Map**: Built with React Leaflet for smooth map interactions
- **Temperature Visualization**: Color-coded circular icons showing temperature values
- **Animated Wind Arrows**: Dynamic arrows that show wind direction and speed with smooth animations
- **Flat Design**: Clean, modern UI with Tailwind CSS
- **Real-time Data**: Fetches weather data from the backend API

## Temperature Color Scheme

- **Blue** (#3B82F6): < 10°C (Cold)
- **Cyan** (#06B6D4): 10-19°C (Cool) 
- **Green** (#10B981): 20-24°C (Mild)
- **Amber** (#F59E0B): 25-29°C (Warm)
- **Red** (#EF4444): ≥ 30°C (Hot)

## Wind Animation

- Arrow size scales with wind speed (larger = faster wind)
- Animation speed increases with wind speed
- Arrows point in the direction of wind flow
- Smooth flowing animation with opacity changes

## Development

```bash
npm install
npm start
```

The app will connect to the deployed backend API using configuration from `src/cdk-output.json`.