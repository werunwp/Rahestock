#!/bin/bash
echo "Building the application..."
npm ci
npm run build
echo "Build completed successfully"
