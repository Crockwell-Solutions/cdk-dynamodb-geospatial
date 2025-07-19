#!/usr/bin/env node

import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { StatefulStack } from '../lib/stateful/stateful-stack';
import { StatelessStack } from '../lib/stateless/stateless-stack';
import { Stage, getStage, getEnvironmentConfig } from '../config';

const stage = getStage(process.env.STAGE as Stage) as Stage;
const envConfig = getEnvironmentConfig(stage);

const app = new cdk.App();

const statefulStack = new StatefulStack(app, 'DynamoDbGeospatialStatefulStack', {
  stage: stage,
  envConfig: envConfig,
});

const statelessStack = new StatelessStack(app, 'DynamoDbGeospatialStatelessStack', {
  stage: stage,
  envConfig: envConfig,
  spatialDataTable: statefulStack.spatialDataTable,
});

// Ensure the stateful stack is deployed before the stateless stack
statelessStack.addDependency(statefulStack);

// Tag all resources in CloudFormation with the stage name
cdk.Tags.of(app).add('service', 'dynamodb-geospatial-backend');
cdk.Tags.of(app).add('stage', `${stage}`);
