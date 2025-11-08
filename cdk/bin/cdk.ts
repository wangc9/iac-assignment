#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import { CdkStack } from "../lib/cdk-stack";
import { EcrStack } from "../lib/ecr-stack";

const app = new cdk.App();

const ecrStack = new EcrStack(app, "EcrStack");

new CdkStack(app, "CdkStack", {
  backendRepo: ecrStack.backendRepo,
  frontendRepo: ecrStack.frontendRepo,
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
});
