/*
 * Get Route Lambda Function
 *
 * This Lambda function is triggered by API Gateway to get locations of interest along a specified route.
 * This can be used to display items on the map view
 * It uses the most efficient index from the DynamoDB table, based on the size of the bounding box.
 *
 * This software is licensed under the Apache License, Version 2.0 (the "License");
 */

import {
  logger,
  Point,
  getRouteGeoHashes,
  fetchGeoHashItemsFromDynamoDB,
  getRouteDistance,
  calculateGeoHashPrecision,
  RETURN_HEADERS,
  getDistributedPoints,
  getPointsNearRoute,
} from '../shared';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

const client = new DynamoDBClient({});
const ddb = DynamoDBDocumentClient.from(client);

// Load environment variables
const MAXIMUM_DYNAMODB_RECORDS = parseInt(process.env.MAXIMUM_DYNAMODB_RECORDS || '100');

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  logger.info('Processing Geospatial Operation Get Route', { event });

  // Ensure all route parameters are provided
  if (
    [
      event.queryStringParameters?.latStart,
      event.queryStringParameters?.lonStart,
      event.queryStringParameters?.latEnd,
      event.queryStringParameters?.lonEnd,
    ].some((v) => v === undefined)
  ) {
    return {
      statusCode: 400,
      body: JSON.stringify({ message: 'Missing route parameters.' }),
    };
  }

  // Setup the start and end points
  const startPoint: Point = {
    lat: event.queryStringParameters?.latStart ? parseFloat(event.queryStringParameters?.latStart) : 0,
    lon: event.queryStringParameters?.lonStart ? parseFloat(event.queryStringParameters?.lonStart) : 0,
  };
  const endPoint: Point = {
    lat: event.queryStringParameters?.latEnd ? parseFloat(event.queryStringParameters?.latEnd) : 0,
    lon: event.queryStringParameters?.lonEnd ? parseFloat(event.queryStringParameters?.lonEnd) : 0,
  };

  // Get the query limit from the payload or the default from the environment variable
  const queryLimit = event.queryStringParameters?.limit
    ? parseInt(event.queryStringParameters?.limit)
    : MAXIMUM_DYNAMODB_RECORDS;

  // Step 1: Calculate the precision and index to use based on the route length
  const geospatialConfig = calculateGeoHashPrecision(
    { lat: startPoint.lat, lon: startPoint.lon },
    { lat: endPoint.lat, lon: endPoint.lon },
  );

  // Step 2: Get all GeoHash prefixes covering the route
  const hashPrefixes = getRouteGeoHashes(startPoint, endPoint, geospatialConfig);
  logger.info('Geohash Prefixes intercepting the route', { count: hashPrefixes.length });

  // Step 3: Query DynamoDB for items in the geohashes
  const results = await fetchGeoHashItemsFromDynamoDB(ddb, hashPrefixes, geospatialConfig, queryLimit);
  logger.info('Queried Results from GeoHashes', { count: results.length });

  // Step 4: Evaluate the route
  const routeDistance = await getRouteDistance([startPoint, endPoint]);
  const routePointsOfInterest = getPointsNearRoute(startPoint, endPoint, results);

  // Step 5: Filter results to ensure they are within the bounding box
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const filteredResults = routePointsOfInterest.map(({ PK, SK, GSI1PK, GSI1SK, ttl, ...rest }) => rest);
  logger.info('Filtered Results within Bounding Box', { count: filteredResults.length });

  // Step 6: Only return up to the queryLimit number of records, making sure we take a random selection
  // across each of the geohashes to ensure a good distribution of results
  const distributedResults = getDistributedPoints(filteredResults, queryLimit);

  return {
    body: JSON.stringify({
      items: distributedResults,
      count: distributedResults.length,
      distance: routeDistance,
    }),
    ...RETURN_HEADERS,
  };
};
