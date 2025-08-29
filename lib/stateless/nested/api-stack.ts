/*
 * CDK Nested Stack - API Resources
 *
 * This CDK nested stack sets up the API resources for the DynamoDB Geospatial Demo.
 * This contains the API Gateway and routes for querying spatial data.
 *
 * This software is licensed under the Apache License, Version 2.0 (the "License");
 */

import { Construct } from 'constructs';
import { NestedStack, NestedStackProps, RemovalPolicy } from 'aws-cdk-lib';
import { RestApi, LambdaIntegration, ApiKey, UsagePlan, ApiKeySourceType } from 'aws-cdk-lib/aws-apigateway';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { EnvironmentConfig, Stage } from '../../../config';
import { StringParameter } from 'aws-cdk-lib/aws-ssm';
import {
  AwsCustomResource,
  AwsCustomResourcePolicy,
  AwsSdkCall,
  PhysicalResourceId,
} from 'aws-cdk-lib/custom-resources';
import { Effect, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { LogGroup, RetentionDays } from 'aws-cdk-lib/aws-logs';

interface ApiResourcesProps extends NestedStackProps {
  stage: Stage;
  envConfig: EnvironmentConfig;
  getRoute: NodejsFunction;
  getBoundingBox: NodejsFunction;
  allowedOrigins?: string[];
}

export class ApiResources extends NestedStack {
  public api: RestApi;
  public apiKeyValue: string;

  constructor(scope: Construct, id: string, props: ApiResourcesProps) {
    super(scope, id, props);

    const { getRoute, getBoundingBox } = props;

    // Create the API Gateway
    this.api = new RestApi(this, 'DynamoDBGeospatialDemoApi', {
      restApiName: 'DynamoDB Geospatial Demo API',
      description: 'API for DynamoDB Geospatial Demo operations',
      apiKeySourceType: ApiKeySourceType.HEADER,
      defaultCorsPreflightOptions: {
        allowOrigins: ['*'],
        allowMethods: ['GET', 'POST', 'OPTIONS'],
        allowHeaders: [
          'Content-Type',
          'Authorization',
          'X-Amz-Date',
          'X-Api-Key',
          'X-Amz-Security-Token',
          'X-Amz-User-Agent',
        ],
      },
    });

    // Create API Key
    const apiKey = new ApiKey(this, 'DynamoDBGeospatialDemoApiKey', {
      apiKeyName: `dynamodb-geospatial-demo-api-key-${props.stage}`,
      description: `API Key for DynamoDB Geospatial Demo - ${props.stage}`,
    });

    // Create Usage Plan
    const usagePlan = new UsagePlan(this, 'DynamoDBGeospatialDemoUsagePlan', {
      name: `dynamodb-geospatial-demo-usage-plan-${props.stage}`,
      description: `Usage Plan for DynamoDB Geospatial Demo - ${props.stage}`,
      apiStages: [
        {
          api: this.api,
          stage: this.api.deploymentStage,
        },
      ],
    });

    // Associate API Key with Usage Plan
    usagePlan.addApiKey(apiKey);

    // Get the API Key value
    const apiKeyFetch: AwsSdkCall = {
      service: 'APIGateway',
      action: 'getApiKey',
      parameters: {
        apiKey: apiKey.keyId,
        includeValue: true,
      },
      physicalResourceId: PhysicalResourceId.of(`APIKey:${apiKey.keyId}`),
    };

    const apiKeyCr = new AwsCustomResource(this, 'ApiKeyCr', {
      policy: AwsCustomResourcePolicy.fromStatements([
        new PolicyStatement({
          effect: Effect.ALLOW,
          resources: [apiKey.keyArn],
          actions: ['apigateway:GET'],
        }),
      ]),
      logGroup: new LogGroup(this, 'ApiKeyCrLogGroup', {
        logGroupName: '/aws/api/ApiKeyCrLogGroup',
        retention: RetentionDays.THREE_MONTHS,
        removalPolicy: RemovalPolicy.DESTROY,
      }),
      onCreate: apiKeyFetch,
      onUpdate: apiKeyFetch,
    });

    apiKeyCr.node.addDependency(apiKey);
    this.apiKeyValue = apiKeyCr.getResponseField('value');

    // Add spatial queries resource
    const spatial = this.api.root.addResource('spatial');

    // Add bounding box query endpoint
    const boundingBox = spatial.addResource('bounding-box');
    boundingBox.addMethod('GET', new LambdaIntegration(getBoundingBox), {
      apiKeyRequired: true,
    });

    // Add route queries resource
    const getRouteResource = spatial.addResource('route');
    getRouteResource.addMethod('GET', new LambdaIntegration(getRoute), {
      apiKeyRequired: true,
    });

    // Save the API URL and key to the System Manager Parameter Store
    new StringParameter(this, 'ApiUrlParameter', {
      parameterName: props.envConfig.apiUrlParameterName || '/dynamoDbGeospatial/apiUrl',
      stringValue: this.api.url,
    });
  }
}
