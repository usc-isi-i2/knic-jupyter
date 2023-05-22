#!/bin/bash

PORT=5644

# Get the absolute path to the `knic-jupyter` directory
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
SOURCE="$DIR/src/index.ts"
CONFIG="$DIR/config.py"
DEVELOP=$1

PRODUCTION_ENDPOINT="https://knic.isi.edu/engine"
DEVELOPMENT_ENDPOINT="http://localhost:5642/knic"

# Rebuild Jupyter Lab library to work with `knic-engine` running on localhost
if [ "$DEVELOP" = "--develop" ] ; then
    echo "Running Jupyter Lab in DEVELOPMENT mode.."
    echo "Changing 'src/index.ts' file to rebuild with our new location for knic-engine: $DEVELOPMENT_ENDPOINT"
    sed -i -e "s|$PRODUCTION_ENDPOINT|$DEVELOPMENT_ENDPOINT|g" "$SOURCE"
    sed -n '50p' $DIR/src/index.ts
else
    echo "Running Jupyter Lab in PRODUCTION mode.."
    echo "Changing 'src/index.ts' file to rebuild with our new location for knic-engine: $PRODUCTION_ENDPOINT"
    sed -i -e "s|$DEVELOPMENT_ENDPOINT|$PRODUCTION_ENDPOINT|g" "$SOURCE"
    sed -n '50p' $DIR/src/index.ts
fi

pip install -ve .
jupyter lab --no-browser --allow-root --port $PORT --config=$CONFIG
