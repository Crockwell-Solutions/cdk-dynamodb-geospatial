/*
 * CDK Nested Stack - Lambda Resources
 *
 * This CDK nested stack sets up the Lambda resources for the DynamoDB Geospatial Demo.
 * This contains the Lambda functions and any associated resources such as EventBridge schedules and IAM roles.
 *
 * This software is licensed under the Apache License, Version 2.0 (the "License");
 */

import { Construct } from 'constructs';
import { NestedStack, NestedStackProps } from 'aws-cdk-lib';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { EnvironmentConfig, Stage } from '../../../config';
import { CustomLambda } from '../../constructs';
import { Table } from 'aws-cdk-lib/aws-dynamodb';

interface LambdaResourcesProps extends NestedStackProps {
  stage: Stage;
  envConfig: EnvironmentConfig;
  spatialDataTable: Table;
}

export class LambdaResources extends NestedStack {
  public loadWeatherData: NodejsFunction;
  public getRoute: NodejsFunction;
  public getBoundingBox: NodejsFunction;

  constructor(scope: Construct, id: string, props: LambdaResourcesProps) {
    super(scope, id, props);

    const { envConfig, spatialDataTable } = props;

    // Create the LoadWeatherDataFunction Lambda function
    this.loadWeatherData = new CustomLambda(this, 'LoadWeatherDataFunction', {
      envConfig: envConfig,
      source: 'src/data-loading/load-weather-data.ts',
      environmentVariables: {
        SPATIAL_DATA_TABLE: spatialDataTable.tableName,
        WEATHER_DATA_SOURCE_URL: envConfig.weatherDataSourceUrl,
        WEATHER_DATA_TTL_SECONDS: envConfig.weatherDataTtlSeconds?.toString(),
        PARTITION_KEY_HASH_PRECISION: envConfig.partitionKeyHashPrecision?.toString(),
        PARTITION_KEY_SHARDS: envConfig.partitionKeyShards?.toString(),
        SORT_KEY_HASH_PRECISION: envConfig.sortKeyHashPrecision?.toString(),
        GSI_HASH_PRECISION: envConfig.gsiHashPrecision?.toString(),
      },
    }).lambda;
    spatialDataTable.grantReadWriteData(this.loadWeatherData);

    // Create the ProcessRoute Lambda function
    this.getRoute = new CustomLambda(this, 'GetRouteFunction', {
      envConfig: envConfig,
      source: 'src/api/get-route.ts',
      environmentVariables: {
        SPATIAL_DATA_TABLE: spatialDataTable.tableName,
        PARTITION_KEY_HASH_PRECISION: envConfig.partitionKeyHashPrecision?.toString(),
        PARTITION_KEY_SHARDS: envConfig.partitionKeyShards?.toString(),
        SORT_KEY_HASH_PRECISION: envConfig.sortKeyHashPrecision?.toString(),
        GSI_HASH_PRECISION: envConfig.gsiHashPrecision?.toString(),
        MAXIMUM_DYNAMODB_RECORDS: envConfig.maximumResponseRecords?.toString(),
      },
    }).lambda;
    spatialDataTable.grantReadData(this.getRoute);

    // Create the GetBoundingBox Lambda function
    this.getBoundingBox = new CustomLambda(this, 'GetBoundingBoxFunction', {
      envConfig: envConfig,
      source: 'src/api/get-bounding-box.ts',
      environmentVariables: {
        SPATIAL_DATA_TABLE: spatialDataTable.tableName,
        PARTITION_KEY_HASH_PRECISION: envConfig.partitionKeyHashPrecision?.toString(),
        PARTITION_KEY_SHARDS: envConfig.partitionKeyShards?.toString(),
        SORT_KEY_HASH_PRECISION: envConfig.sortKeyHashPrecision?.toString(),
        GSI_HASH_PRECISION: envConfig.gsiHashPrecision?.toString(),
        MAXIMUM_DYNAMODB_RECORDS: envConfig.maximumResponseRecords?.toString(),
      },
    }).lambda;
    spatialDataTable.grantReadData(this.getBoundingBox);
  }
}
