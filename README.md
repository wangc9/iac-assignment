# Cloud Assignment for the OP Kiitorata Trainee Programme

## Introduction

This folder containers a simple full-stack application for the cloud assignment, which can be deployed using AWS CDK. The deployed application should be able to handle upload and retrieve of photos. The structure of the assignment is as follow:

- The `web` folder contains the frontend part of the application.

  The frontend part utilises Next.js and uses Tanstack Query for data fetching.

- The `server` folder contains the backend part of the application.

  The backend part utilises Nest.js together with Postgres for record storage and Kysely for query building.

- The `cdk` folder contains the IaC for deploying the application to AWS.

  The IaC utilises AWS CDK and deploys the following resources:

  - A VPC for isolating the resources.
  - An S3 bucket for storing photos.
  - A RDS instance for storing photo records.
  - Two ECR repositories for storing the frontend and backend Docker images.
  - An ECS cluster for running the frontend and backend containers.
  - A CloudFront distribution acting as the entry point of the application.

## Usage

### Deployment

To deploy the application, there are several prerequsities that the application assumes to have been fulfilled beforehand:

- Installation of Node.js (v22 or above).
- Installation of AWS CDK. (More detail can be found in [AWS CDK Documentation](https://docs.aws.amazon.com/cdk/v2/guide/getting-started.html))
- Configuration of AWS credentials, use `aws configure` to add a credential profile that have sufficient permissions to deploy the application.
- Installation of Docker.

With all the aforementioned prerequisites fulfilled, the application can be deployed by running the following commands:

```bash
# Make sure the bash script has enough permission to execute
chmod +x deploy.sh

# Run bash script
./deploy.sh
```

The script uses the default AWS credentials. If you want to use a specific profile, use the following command instead:

```bash
# Make sure the bash script has enough permission to execute
chmod +x deploy.sh

# Run bash script
./deploy.sh [YOUR_PROFILE]
```

Note that the deployment process may take a while, as it involves building Docker images and deploying several time-consuming resources (e.g. RDS instance, ECS cluster).

Once the deployment process is completed, the application should be available from the address printed in the terminal "Access the application at: ...".

### Usage

The deployed application provides the following functionalities:

- Upload photos: Users can upload photos to the application by clicking the "Upload photo" button.
- All uploaded photos will be listed at the same page.

### Destroy

To destroy the deployed application, run the following command:

```bash
# Make sure the bash script has enough permission to execute
chmod +x destroy.sh

# Run bash script
./destroy.sh
```

Like the deploy script, if you want to use a specific profile other than the default one, use the following command instead:

```bash
# Make sure the bash script has enough permission to execute
chmod +x destroy.sh

# Run bash script
./destroy.sh [YOUR_PROFILE]
```

Note that the destruction process may take a while, as it involves deleting several time-consuming resources.

## Possible Improvements

- For simplicity, the s3 bucket has been configured to allow public access. To be used in a real production environment, instead of allowing direct public access, a presigned url could help when retrieving objects.
- The backend and frontend services are not configured to scale automatically.
- There is no firewall configured for the services.
