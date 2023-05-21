#!/bin/bash

PORT=5644

# Get the absolute path to the `knic-jupyter` directory
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
CONFIG="$DIR/config.py"
DEVELOP=$1

# Rebuild Jupyter Lab library to work with `knic-engine` running on localhost
if [ "$DEVELOP" = "--develop" ] ; then
    echo "Running Jupyter Lab in development mode.."
    echo "Changing location of knic-engine to 'http://localhost:5642/knic'.."
    echo "Running the 'npm run build:lib' command to rebuild with new location.."
    jupyter lab --no-browser --allow-root --port $PORT --config=$CONFIG
else
    echo "Running Jupyter Lab in production mode.."
    echo "Location of knic-engine is set to 'https://knic.isi.edu/engine'.."
    npm run build:lib
    jupyter lab --no-browser --allow-root --port $PORT --config=$CONFIG
fi
