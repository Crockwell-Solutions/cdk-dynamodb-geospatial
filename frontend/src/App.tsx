import React from 'react';
import WeatherMap from './components/WeatherMap';

import output from './cdk-output.json'

// use the output from the CDK stack deployment
const REST_API_URL = output.DynamoDbGeospatialStatelessStack.restApiUrl;
const REST_API_KEY = output.DynamoDbGeospatialStatelessStack.restApiKey;

const App: React.FC = () => {
  return (
    <div className="App">
      <WeatherMap
        apiBaseUrl={REST_API_URL}
        apiKey={REST_API_KEY}
      />
    </div>
  );
};

export default App;