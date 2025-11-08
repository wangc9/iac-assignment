#!/bin/bash
set -e

PROFILE_ARG=""

if [ -n "$1" ]; then
  PROFILE_ARG="--profile $1"
fi

echo "--- Destroying all stacks ---"
cd cdk
cdk destroy --all $PROFILE_ARG
cd ..

echo "Finished"
