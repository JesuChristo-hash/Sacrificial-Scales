@echo off
setlocal

:: 1. Lock down the custom domain (avoids trailing spaces)
if not exist public mkdir public
(echo www.myfriendsaretulpas.com)>public\CNAME

:: 2. Compile production bundle
echo [*] Building client bundle...
call npm run build
if %ERRORLEVEL% NEQ 0 (
    echo [!] Build failed. Halting deployment.
    exit /b %ERRORLEVEL%
)

:: 3. Ship static assets to gh-pages
echo [*] Deploying dist to gh-pages...
cd dist
git init -q
git checkout -B gh-pages -q
git add -A
git commit -m "deploy: update live site" -q
git push -f https://github.com/JesuChristo-hash/Sacrificial-Scales.git gh-pages
cd ..

:: 4. Back up source code to main
echo [*] Syncing source code to origin/main...
git add .
git commit -m "chore: sync stable build" -q
git push origin main

echo [✓] Deployment complete. Site will reflect changes shortly.
pause