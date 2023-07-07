#!/bin/bash

# Port number used for `knic-jupyter`
PORT=5644

# Get the absolute path to the `knic-jupyter` directory
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
SOURCE_FILE="$DIR/src/index.ts"
CHANGELOG="$DIR/src/changelog.txt"
CONFIG="$DIR/config.py"

PRODUCTION_ENDPOINT="https://knic.isi.edu/engine"
DEVELOPMENT_ENDPOINT="http://localhost:5642/knic"

# Check if the user is running Jupyter Lab in develop mode or not
if [ "$1" = "--production" ] ; then
    echo "Running Jupyter Lab in PRODUCTION mode.."
    sed -i "" -e "s|$DEVELOPMENT_ENDPOINT|$PRODUCTION_ENDPOINT|gw $CHANGELOG" "$SOURCE_FILE"
    if [ -s $CHANGELOG ]; then
        cat $CHANGELOG
    fi
    echo "knic-engine endpoint = $PRODUCTION_ENDPOINT"
else
    echo "Running Jupyter Lab in DEVELOPMENT mode.."
    sed -i "" -e "s|$PRODUCTION_ENDPOINT|$DEVELOPMENT_ENDPOINT|gw $CHANGELOG" "$SOURCE_FILE"
    if [ -s $CHANGELOG ]; then
        cat $CHANGELOG
    fi
    echo "knic-engine endpoint = $DEVELOPMENT_ENDPOINT"
fi

# Rebuild Jupyter Lab if knic-engine endpoint changed
if [ -s $CHANGELOG ]; then
    pip install -ve .
fi

# Run Jupyter Lab with our desired PORT and CONFIG file settings
jupyter lab --no-browser --allow-root --port $PORT --config=$CONFIG
