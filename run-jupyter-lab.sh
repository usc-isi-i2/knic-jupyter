#!/bin/bash

PORT=5644

jupyter lab --no-browser --allow-root --port $PORT --config=config.py
