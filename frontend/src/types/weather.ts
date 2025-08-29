export interface WeatherData {
  dataTimestamp: number;
  visibility: string;
  lon: string;
  temperature: string;
  windSpeed: string;
  windDir?: string;
  recordTimestamp: number;
  lat: string;
  type: string;
}

export interface WeatherResponse {
  items: WeatherData[];
}