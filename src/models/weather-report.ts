/*
 * Weather Class Object
 *
 * This class is used to represent a weather report object.
 * It is initialized with a METAR report and provides methods to validate the data,
 * extract relevant information, and convert it to a format suitable for DynamoDB.
 *
 * This software is licensed under the Apache License, Version 2.0 (the "License");
 */

import * as geohash from 'ngeohash';
import { isNumeric, roundTo, getRandomShardPrefix } from '../shared';

const PARTITION_KEY_HASH_PRECISION = parseInt(process.env.PARTITION_KEY_HASH_PRECISION || '1');
const PARTITION_KEY_SHARDS = parseInt(process.env.PARTITION_KEY_SHARDS || '10');
const SORT_KEY_HASH_PRECISION = parseInt(process.env.SORT_KEY_HASH_PRECISION || '8');
const GSI_HASH_PRECISION = parseInt(process.env.GSI_HASH_PRECISION || '4');

/**
 * The definition of the weather report object
 */
export class WeatherReport {
  isValid: boolean = true;
  lat: number;
  lon: number;
  geoHash: string;
  dataTimestamp: number;
  recordTimestamp: number;
  ttl: number;
  temperature?: number;
  windSpeed?: number;
  windDir?: number;
  visibility?: number;
  precipitationLevel?: number;

  /**
   * Initialize the weather object from a METAR weather report
   * @param {any} metar - The METAR object
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(metar: any) {
    // Run some validation checks on the data
    this.isValid = true;
    if (metar['latitude'] && metar['longitude'] && metar['temp_c']) {
      if (isNumeric(metar['latitude'][0])) {
        if (metar['latitude'][0] < -90 || metar['latitude'][0] > 90) this.isValid = false;
      } else {
        this.isValid = false;
      }
      if (isNumeric(metar['longitude'][0])) {
        if (metar['longitude'][0] < -180 || metar['longitude'][0] > 180) this.isValid = false;
      } else {
        this.isValid = false;
      }
      if (isNumeric(metar['temp_c'][0])) {
        if (metar['temp_c'][0] < -100 || metar['temp_c'][0] > 100) this.isValid = false;
      } else {
        this.isValid = false;
      }
    } else {
      this.isValid = false;
    }

    // If the validation checks pass, set the object parameters
    if (this.isValid == true) {
      // Set the coords
      this.lat = metar['latitude'][0];
      this.lon = metar['longitude'][0];

      // Set the timestamps
      this.dataTimestamp = Math.floor(new Date(metar['observation_time'][0]).getTime() / 1000);
      this.recordTimestamp = Math.floor(Date.now() / 1000);
      this.ttl = Math.floor(Date.now() / 1000) + 86400;

      // Set the weather information
      if (metar['temp_c']) if (isNumeric(metar['temp_c'][0])) this.temperature = metar['temp_c'][0];
      if (metar['wind_speed_kt'])
        if (isNumeric(metar['wind_speed_kt'][0])) this.windSpeed = metar['wind_speed_kt'][0] * 0.5144;
      if (metar['wind_dir_degrees'])
        if (isNumeric(metar['wind_dir_degrees'][0])) this.windDir = metar['wind_dir_degrees'][0];
      if (metar['visibility_statute_mi'])
        if (isNumeric(metar['visibility_statute_mi'][0])) {
          this.visibility = Math.min(metar['visibility_statute_mi'][0] * 1609.34, 10000);
        } else if (metar['visibility_statute_mi'][0].startsWith('6+')) {
          this.visibility = 10000;
        } else if (metar['visibility_statute_mi'][0].startsWith('10')) {
          this.visibility = 10000;
        }

      // Override the wind direction if there is no wind speed and the direction is 0
      if (this.windDir == 0 && !this.windSpeed) this.windDir = undefined;

      // Round the numbers
      if (this.temperature) this.temperature = roundTo(this.temperature, 1);
      if (this.windSpeed) this.windSpeed = roundTo(this.windSpeed, 1);
      if (this.visibility) this.visibility = roundTo(this.visibility, 0);
    }
  }

  /**
   * @returns {JSON} - The JSON object in format required to upload to DynamoDB
   */
  getDynamoDBJson() {
    if (!this.isValid) {
      return undefined;
    }

    const fullGeoHash = geohash.encode(this.lat, this.lon, SORT_KEY_HASH_PRECISION);
    return {
      // PK represents the partition key for the item: Random shard key prefix + geohash of the lat/lon
      PK: `${getRandomShardPrefix(PARTITION_KEY_SHARDS)}#${geohash.encode(this.lat, this.lon, PARTITION_KEY_HASH_PRECISION)}`,
      SK: fullGeoHash,
      GSI1PK: geohash.encode(this.lat, this.lon, GSI_HASH_PRECISION),
      GSI1SK: fullGeoHash,
      geoHash: fullGeoHash,
      lat: this.lat,
      lon: this.lon,
      type: 'Weather',
      dataTimestamp: this.dataTimestamp,
      recordTimestamp: this.recordTimestamp,
      ttl: this.ttl,
      ...(this.temperature && { temperature: this.temperature }),
      ...(this.windSpeed && { windSpeed: this.windSpeed }),
      ...(this.windDir && { windDir: this.windDir }),
      ...(this.visibility && { visibility: this.visibility }),
      ...(this.precipitationLevel && { precipitationLevel: this.precipitationLevel }),
    };
  }
}
