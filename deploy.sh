#!/usr/bin/env bash
set -e

mkdir -p public
echo "www.myfriendsaretulpas.com" > public/CNAME

echo "[*] Building client bundle..."
npm run build

echo "[*] Deploying dist to gh-pages..."
cd dist
git init -q
git checkout -B gh-pages -q
git add -A
git commit -m "deploy: update live site" -q
git push -f https://github.com/JesuChristo-hash/Sacrificial-Scales.git gh-pages
cd ..

echo "[*] Syncing source code to origin/main (forced)..."
git add .
git commit -m "chore: sync stable build" -q
git push -f origin main

echo "[✓] Deployment complete."
