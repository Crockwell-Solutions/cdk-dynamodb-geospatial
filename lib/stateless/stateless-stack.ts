/*
 * CDK Stack - Stateless Resources
 *
 * This CDK stack sets up the stateless backend resources for the DynamoDB Geospatial Demo.
 * This contains the Lambda functions, API Gateway, and EventBridge resources.
 * This is completed using nested stacks
 *
 * This software is licensed under the Apache License, Version 2.0 (the "License");
 */

import { CfnOutput, Stack, StackProps, Aspects } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { AwsSolutionsChecks, NagSuppressions } from 'cdk-nag';
import { EnvironmentConfig, Stage } from '@config';
import { LambdaResources } from './nested/lambda-stack';
import { ApiResources } from './nested/api-stack';
import { Table } from 'aws-cdk-lib/aws-dynamodb';

export interface StatelessStackProps extends StackProps {
  stage: Stage;
  envConfig: EnvironmentConfig;
  spatialDataTable: Table;
}

export class StatelessStack extends Stack {
  public lambdaResources: LambdaResources;
  public apiResources: ApiResources;

  constructor(scope: Construct, id: string, props: StatelessStackProps) {
    super(scope, id, props);
    const { stage, envConfig } = props;

    // Create the lambda resources nested stack
    this.lambdaResources = new LambdaResources(this, 'LambdaResources', {
      stage: stage,
      envConfig: envConfig,
      spatialDataTable: props.spatialDataTable,
    });

    // Create the API Gateway resources nested stack with CloudFront URL for CORS
    this.apiResources = new ApiResources(this, 'ApiResources', {
      stage: stage,
      envConfig: envConfig,
      getRoute: this.lambdaResources.getRoute,
      getBoundingBox: this.lambdaResources.getBoundingBox,
    });

    // cdk nag check and suppressions
    Aspects.of(this).add(new AwsSolutionsChecks({ verbose: true }));
    NagSuppressions.addStackSuppressions(
      this,
      [
        {
          id: 'AwsSolutions-IAM4',
          reason: 'Use of managed policies is not required for this stack',
        },
        {
          id: 'AwsSolutions-IAM5',
          reason: 'Use of wildcard policies has been accepted for this stack',
        },
        {
          id: 'AwsSolutions-L1',
          reason: 'Lambda function is use the latest runtime and is not using deprecated features',
        },
        {
          id: 'AwsSolutions-APIG1',
          reason: 'API Gateway logging is not required for this proof-of-concept project',
        },
        {
          id: 'AwsSolutions-APIG2',
          reason: 'API Gateway is not using request validation for this proof-of-concept project',
        },
        {
          id: 'AwsSolutions-APIG3',
          reason: 'API Gateway WAF is not required for this proof-of-concept project',
        },
        {
          id: 'AwsSolutions-APIG4',
          reason: 'API Gateway is not using full authorisation for this proof-of-concept project',
        },
        {
          id: 'AwsSolutions-SMG4',
          reason: 'API Gateway API Key does not need to be rotated for this proof-of-concept project',
        },
        {
          id: 'AwsSolutions-APIG6',
          reason: 'API Gateway logging is not required for this proof-of-concept project',
        },
        {
          id: 'AwsSolutions-COG4',
          reason: 'API Gateway is not using Cognito for authentication in this proof-of-concept project',
        },
      ],
      true,
    );

    // Output the Events API details
    new CfnOutput(this, 'restApiUrl', { value: this.apiResources.api.url });
    new CfnOutput(this, 'restApiKey', { value: this.apiResources.apiKeyValue });
  }
}
