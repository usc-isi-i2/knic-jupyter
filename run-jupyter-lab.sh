#!/bin/bash

PORT=5644

# Get the absolute path to the `knic-jupyter` directory
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
CONFIG="$DIR/config.py"
DEVELOP=$1

PRODUCTION_ENDPOINT="https://knic.isi.edu/engine"
DEVELOPMENT_ENDPOINT="http://localhost:5642/knic"

# Rebuild Jupyter Lab library to work with `knic-engine` running on localhost
if [ "$DEVELOP" = "--develop" ] ; then
    echo "Running Jupyter Lab in DEVELOPMENT mode.."
    echo "Changing 'src/index.ts' file to rebuild with our new location for knic-engine: $DEVELOPMENT_ENDPOINT"
    sed "s|$PRODUCTION_ENDPOINT|$DEVELOPMENT_ENDPOINT|g" $DIR/src/index.ts >> $DIR/src/temp.ts
    mv $DIR/src/temp.ts $DIR/src/index.ts
    pip install -ve .
    jupyter lab --no-browser --allow-root --port $PORT --config=$CONFIG
else
    echo "Running Jupyter Lab in PRODUCTION mode.."
    echo "Changing 'src/index.ts' file to rebuild with our new location for knic-engine: $PRODUCTION_ENDPOINT"
    sed "s|$DEVELOPMENT_ENDPOINT|$PRODUCTION_ENDPOINT|g" $DIR/src/index.ts >> $DIR/src/temp.ts
    mv $DIR/src/temp.ts $DIR/src/index.ts
    pip install -ve .
    jupyter lab --no-browser --allow-root --port $PORT --config=$CONFIG
fi
