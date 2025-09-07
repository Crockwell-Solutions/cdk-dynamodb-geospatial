/*
 * Get Bounding Box Lambda Function
 *
 * This Lambda function is triggered by API Gateway to get locations of interest within a specified bounding box.
 * This is used to display items on the map view
 * It use the most efficient index from the DynamoDB table, based on the size of the bounding box.
 *
 * This software is licensed under the Apache License, Version 2.0 (the "License");
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import {
  logger,
  BoundingBox,
  getBoundingBoxGeoHashes,
  calculateGeoHashPrecision,
  fetchGeoHashItemsFromDynamoDB,
  getDistributedPoints,
  RETURN_HEADERS,
} from '../shared';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

const MAXIMUM_DYNAMODB_RECORDS = parseInt(process.env.MAXIMUM_DYNAMODB_RECORDS || '100');

const client = new DynamoDBClient({});
const ddb = DynamoDBDocumentClient.from(client);

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  logger.info('Processing Bounding Box Query', { event });

  // Ensure all bounding box parameters are provided
  if (
    [
      event.queryStringParameters?.latMin,
      event.queryStringParameters?.lonMin,
      event.queryStringParameters?.latMax,
      event.queryStringParameters?.lonMax,
    ].some((v) => v === undefined)
  ) {
    return {
      statusCode: 400,
      body: JSON.stringify({ message: 'Missing bounding box parameters.' }),
    };
  }

  // Get the query limit from the payload or the default from the environment variable
  const queryLimit = event.queryStringParameters?.limit
    ? parseInt(event.queryStringParameters?.limit)
    : MAXIMUM_DYNAMODB_RECORDS;

  // Setup the bounding box object
  const boundingBox: BoundingBox = {
    latMin: event.queryStringParameters?.latMin ? parseFloat(event.queryStringParameters?.latMin) : 0,
    lonMin: event.queryStringParameters?.lonMin ? parseFloat(event.queryStringParameters?.lonMin) : 0,
    latMax: event.queryStringParameters?.latMax ? parseFloat(event.queryStringParameters?.latMax) : 0,
    lonMax: event.queryStringParameters?.lonMax ? parseFloat(event.queryStringParameters?.lonMax) : 0,
  };

  // Step 1: Calculate the precision and index to use based on the size of the bounding box
  const geospatialConfig = calculateGeoHashPrecision(
    { lat: boundingBox.latMin, lon: boundingBox.lonMin },
    { lat: boundingBox.latMax, lon: boundingBox.lonMax },
  );

  // Step 2: Get all GeoHash prefixes covering the bounding box
  const hashPrefixes = getBoundingBoxGeoHashes(boundingBox, geospatialConfig);
  logger.info('Geohash Prefixes intercepting the bounding box', { count: hashPrefixes.length });

  // Step 3: Query DynamoDB for each geohash prefix
  const results = await fetchGeoHashItemsFromDynamoDB(ddb, hashPrefixes, geospatialConfig, queryLimit);
  logger.info('Queried Results from GeoHashes', { count: results.length });

  // Step 4: Filter results to ensure they are within the bounding box
  const filteredResults = results
    .filter((item) => {
      return (
        item.lat >= boundingBox.latMin! &&
        item.lat <= boundingBox.latMax! &&
        item.lon >= boundingBox.lonMin! &&
        item.lon <= boundingBox.lonMax!
      );
    })
    // Remove attributes that are not required in the payload response
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    .map(({ PK, SK, GSI1PK, GSI1SK, ttl, ...rest }) => rest);
  logger.info('Filtered Results within Bounding Box', { count: filteredResults.length });

  // Step 5: Only return up to the queryLimit number of records, making sure we take a random selection
  // across each of the geohashes to ensure a good distribution of results
  const distributedResults = getDistributedPoints(filteredResults, queryLimit);

  return {
    body: JSON.stringify({
      items: distributedResults,
      count: distributedResults.length,
    }),
    ...RETURN_HEADERS,
  };
};
