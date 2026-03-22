#!/usr/bin/env bash
set -euo pipefail

echo "Installing dependencies..."
npm install

echo "Running Expo doctor..."
npx expo-doctor

echo "Project is ready. Start with one of:"
echo "  npm run start"
echo "  npm run web"
echo "  npm run dev"
