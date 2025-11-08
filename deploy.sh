#!/bin/bash
set -e

PROFILE_ARG=""

if [ -n "$1" ]; then
  PROFILE_ARG="--profile $1"
fi

ECR_STACK_NAME="EcrStack"
STACK_NAME="CdkStack"
AWS_REGION=$(aws configure get region $PROFILE_ARG)
ACCOUNT_ID=$(aws sts get-caller-identity --query Account $PROFILE_ARG --output text)

echo "--- Creating ECR repositories ---"
cd cdk
npm install
cdk deploy $ECR_STACK_NAME --require-approval never $PROFILE_ARG
cd ..

echo "--- Fetching ECR repository URIs from CDK outputs ---"
BACKEND_ECR_URI=$(aws cloudformation describe-stacks --stack-name $ECR_STACK_NAME --query "Stacks[0].Outputs[?OutputKey=='BackendEcrRepoUri'].OutputValue" --output text $PROFILE_ARG)
FRONTEND_ECR_URI=$(aws cloudformation describe-stacks --stack-name $ECR_STACK_NAME --query "Stacks[0].Outputs[?OutputKey=='FrontendEcrRepoUri'].OutputValue" --output text $PROFILE_ARG)

if [ -z "$BACKEND_ECR_URI" ] || [ -z "$FRONTEND_ECR_URI" ]; then
  echo "Error: Failed to fetch ECR repository URIs from CDK outputs."
  exit 1
fi

echo "--- Building and pushing Backend image ---"
cd server
aws ecr get-login-password --region $AWS_REGION $PROFILE_ARG | docker login --username AWS --password-stdin $ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com
docker build -t server-image .
docker tag server-image:latest $BACKEND_ECR_URI:latest
docker push $BACKEND_ECR_URI:latest
cd ..

echo "--- Building and pushing Frontend image ---"
cd web
aws ecr get-login-password --region $AWS_REGION $PROFILE_ARG | docker login --username AWS --password-stdin $ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com
docker build -t web-image .
docker tag web-image:latest $FRONTEND_ECR_URI:latest
docker push $FRONTEND_ECR_URI:latest
cd ..

echo "--- Running final CDK deploy to update services ---"
cd cdk
cdk deploy $STACK_NAME --require-approval never $PROFILE_ARG
cd ..

echo "--- DEPLOYMENT COMPLETE ---"
CLOUDFRONT_URL=$(aws cloudformation describe-stacks --stack-name $STACK_NAME --query "Stacks[0].Outputs[?OutputKey=='CloudFrontUrl'].OutputValue" --output text $PROFILE_ARG)
echo "Access the application at: $CLOUDFRONT_URL"
