import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as ecr from "aws-cdk-lib/aws-ecr";

export class EcrStack extends cdk.Stack {
  public readonly backendRepo: ecr.IRepository;
  public readonly frontendRepo: ecr.IRepository;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    this.backendRepo = new ecr.Repository(this, "BackendRepo", {
      repositoryName: "my-app-backend-repo", // Give it a fixed, predictable name
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      emptyOnDelete: true,
    });

    this.frontendRepo = new ecr.Repository(this, "FrontendRepo", {
      repositoryName: "my-app-frontend-repo", // Give it a fixed, predictable name
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      emptyOnDelete: true,
    });

    new cdk.CfnOutput(this, "BackendEcrRepoUri", {
      value: this.backendRepo.repositoryUri,
    });
    new cdk.CfnOutput(this, "FrontendEcrRepoUri", {
      value: this.frontendRepo.repositoryUri,
    });
  }
}
