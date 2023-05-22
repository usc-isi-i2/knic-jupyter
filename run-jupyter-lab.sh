#!/bin/bash

# Port number used for `knic-jupyter`
PORT=5644

# Get the absolute path to the `knic-jupyter` directory
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
SOURCE="$DIR/src/index.ts"
CONFIG="$DIR/config.py"

PRODUCTION_ENDPOINT="https://knic.isi.edu/engine"
DEVELOPMENT_ENDPOINT="http://localhost:5642/knic"

# Check if the user is running Jupyter Lab in develop mode or not
if [ "$1" = "--develop" ] ; then
    echo "Running Jupyter Lab in DEVELOPMENT mode.."
    sed -i -e "s|$PRODUCTION_ENDPOINT|$DEVELOPMENT_ENDPOINT|gw changelog.txt" "$SOURCE"
    if [ -s changelog.txt ]; then
        cat changelog.txt
    fi
    echo "knic-engine endpoint = $DEVELOPMENT_ENDPOINT"
else
    echo "Running Jupyter Lab in PRODUCTION mode.."
    sed -i -e "s|$DEVELOPMENT_ENDPOINT|$PRODUCTION_ENDPOINT|gw changelog.txt" "$SOURCE"
    if [ -s changelog.txt ]; then
        cat changelog.txt
    fi
    echo "knic-engine endpoint = $PRODUCTION_ENDPOINT"
fi

# Rebuild Jupyter Lab if knic-engine endpoint changed
if [ -s changelog.txt ]; then
    pip install -ve .
fi

# Run Jupyter Lab with our desired PORT and CONFIG file settings
jupyter lab --no-browser --allow-root --port $PORT --config=$CONFIG
