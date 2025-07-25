/*
 * Optimise Route Lambda Function
 *
 * This Lambda function is triggered by API Gateway to process a geospatial operation route
 * It assesses the impact of the route on populated areas, noise levels, and weather conditions.
 * Core logic for the algorithm is contained in the shared route-engine module.
 *
 * This software is licensed under the Apache License, Version 2.0 (the "License");
 */

import {
  logger,
  Point,
  getRouteGeoHashes,
  //getPointsNearRoute,
  fetchGeoHashItemsFromDynamoDB,
  getRouteDistance,
  RETURN_HEADERS,
} from '../shared';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

const client = new DynamoDBClient({});
const ddb = DynamoDBDocumentClient.from(client);

// Load environment variables
const PARTITION_KEY_HASH_PRECISION = parseFloat(process.env.PARTITION_KEY_HASH_PRECISION || '5');

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

  // Step 1: Get all GeoHash prefixes covering the route
  const hashPrefixes = getRouteGeoHashes(startPoint, endPoint, PARTITION_KEY_HASH_PRECISION);
  logger.info('Geohash Prefixes intercepting the route', { count: hashPrefixes.length });

  // Step 2: Query DynamoDB for items in the geohashes
  const results = await fetchGeoHashItemsFromDynamoDB(ddb, hashPrefixes);
  logger.info('Queried Results from GeoHashes', { count: results.length });

  // Step 3: Evaluate the route
  const routeDistance = await getRouteDistance([startPoint, endPoint]);
  //const routePointsOfInterest = getPointsNearRoute([startPoint, endPoint], results);

  logger.info('Route Evaluation Complete', {
    routeDistance: routeDistance,
  });

  return {
    body: JSON.stringify({
      route: [startPoint, endPoint],
      routeDistance: routeDistance,
    }),
    ...RETURN_HEADERS,
  };
};
