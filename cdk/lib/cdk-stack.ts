import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as rds from "aws-cdk-lib/aws-rds";
import * as ecr from "aws-cdk-lib/aws-ecr";
import * as ecs_patterns from "aws-cdk-lib/aws-ecs-patterns";
import * as ecs from "aws-cdk-lib/aws-ecs";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as origins from "aws-cdk-lib/aws-cloudfront-origins";

export interface MainStackProps extends cdk.StackProps {
  backendRepo: ecr.IRepository;
  frontendRepo: ecr.IRepository;
}

export class CdkStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: MainStackProps) {
    super(scope, id, props);

    const { backendRepo, frontendRepo } = props;

    const vpc = new ec2.Vpc(this, "AppVPC", { maxAzs: 2 });

    vpc.addInterfaceEndpoint("EcrApiEndpoint", {
      service: ec2.InterfaceVpcEndpointAwsService.ECR,
      subnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
    });
    vpc.addInterfaceEndpoint("EcrDockerEndpoint", {
      service: ec2.InterfaceVpcEndpointAwsService.ECR_DOCKER,
      subnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
    });
    vpc.addGatewayEndpoint("S3Endpoint", {
      service: ec2.GatewayVpcEndpointAwsService.S3,
      subnets: [{ subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS }],
    });

    const uploadBucket = new s3.Bucket(this, "UploadBucket", {
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      publicReadAccess: true,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ACLS_ONLY,
      cors: [
        {
          allowedMethods: [
            s3.HttpMethods.PUT,
            s3.HttpMethods.POST,
            s3.HttpMethods.GET,
          ],
          allowedOrigins: ["*"],
          allowedHeaders: ["*"],
        },
      ],
    });

    const dbInstance = new rds.DatabaseInstance(this, "Database", {
      engine: rds.DatabaseInstanceEngine.postgres({
        version: rds.PostgresEngineVersion.VER_17_6,
      }),
      instanceType: ec2.InstanceType.of(
        ec2.InstanceClass.T4G,
        ec2.InstanceSize.MICRO
      ),
      vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
      databaseName: "appdb",
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const backendService =
      new ecs_patterns.ApplicationLoadBalancedFargateService(
        this,
        "BackendService",
        {
          vpc,
          taskSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
          cpu: 256,
          memoryLimitMiB: 512,
          taskImageOptions: {
            image: ecs.ContainerImage.fromEcrRepository(backendRepo),
            containerPort: 3000,
            secrets: {
              DB_HOST: ecs.Secret.fromSecretsManager(
                dbInstance.secret!,
                "host"
              ),
              DB_PORT: ecs.Secret.fromSecretsManager(
                dbInstance.secret!,
                "port"
              ),
              DB_NAME: ecs.Secret.fromSecretsManager(
                dbInstance.secret!,
                "dbname"
              ),
              DB_USER: ecs.Secret.fromSecretsManager(
                dbInstance.secret!,
                "username"
              ),
              DB_PASSWORD: ecs.Secret.fromSecretsManager(
                dbInstance.secret!,
                "password"
              ),
            },
            environment: {
              UPLOAD_BUCKET_NAME: uploadBucket.bucketName,
              AWS_REGION: this.region,
            },
          },
          publicLoadBalancer: true,
        }
      );
    dbInstance.connections.allowDefaultPortFrom(
      backendService.service.connections
    );
    uploadBucket.grantPut(backendService.taskDefinition.taskRole);

    backendService.loadBalancer.connections.allowFromAnyIpv4(
      ec2.Port.tcp(80),
      "Allow HTTP from anywhere"
    );

    backendService.targetGroup.configureHealthCheck({
      path: "/api",
      interval: cdk.Duration.seconds(60),
      healthyThresholdCount: 2,
      unhealthyThresholdCount: 2,
      timeout: cdk.Duration.seconds(30),
    });

    const frontendService =
      new ecs_patterns.ApplicationLoadBalancedFargateService(
        this,
        "FrontendService",
        {
          vpc,
          taskSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
          cpu: 256,
          memoryLimitMiB: 512,
          healthCheckGracePeriod: cdk.Duration.seconds(120),
          taskImageOptions: {
            image: ecs.ContainerImage.fromEcrRepository(frontendRepo),
            containerPort: 3001,
          },
        }
      );
    frontendService.targetGroup.configureHealthCheck({
      path: "/test",
      interval: cdk.Duration.seconds(60),
      healthyThresholdCount: 2,
      unhealthyThresholdCount: 2,
      timeout: cdk.Duration.seconds(30),
    });

    const distribution = new cloudfront.Distribution(this, "CloudFrontDist", {
      defaultBehavior: {
        origin: new origins.HttpOrigin(
          frontendService.loadBalancer.loadBalancerDnsName,
          {
            protocolPolicy: cloudfront.OriginProtocolPolicy.HTTP_ONLY,
          }
        ),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
        originRequestPolicy:
          cloudfront.OriginRequestPolicy.ALL_VIEWER_EXCEPT_HOST_HEADER,
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
      },
      additionalBehaviors: {
        "/api/*": {
          origin: new origins.HttpOrigin(
            backendService.loadBalancer.loadBalancerDnsName,
            {
              protocolPolicy: cloudfront.OriginProtocolPolicy.HTTP_ONLY,
            }
          ),
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.HTTPS_ONLY,
          allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
          cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
        },
      },
    });

    new cdk.CfnOutput(this, "S3BucketName", { value: uploadBucket.bucketName });
    new cdk.CfnOutput(this, "BackendEcrRepoUrl", {
      value: backendRepo.registryUri,
    });

    new cdk.CfnOutput(this, "BackendLoadBalancerDnsName", {
      description:
        "The public DNS name of the backend Application Load Balancer",
      value: backendService.loadBalancer.loadBalancerDnsName,
    });
    new cdk.CfnOutput(this, "CloudFrontUrl", {
      value: `https://${distribution.distributionDomainName}`,
    });
  }
}
