#!/bin/bash

PORT=5644

# Get the absolute path to the `knic-jupyter` directory
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
CONFIG="$DIR/config.py"

jupyter lab --no-browser --allow-root --port $PORT --config=$CONFIG
