#!/bin/bash

PORT=5644
PASS=""
TOKEN=""
ALLOW_ORIGIN="*"

jupyter lab --no-browser --allow-root \
    --port $PORT \
    --ServerApp.password=$PASS \
    --IdentityProvider.token=$TOKEN \
    --ServerApp.allow_origin=$ALLOW_ORIGIN
