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
    pause
    exit /b %ERRORLEVEL%
)

:: 3. Ship static assets to gh-pages
echo [*] Deploying dist to gh-pages...
cd dist
git init -q
git checkout -B gh-pages -q
git add -A
git commit -m "deploy: nightly update" -q
git push -f https://github.com/JesuChristo-hash/Sacrificial-Scales.git gh-pages
if %ERRORLEVEL% NEQ 0 (
    echo [!] Failed to push to gh-pages. Halting deployment.
    cd ..
    pause
    exit /b %ERRORLEVEL%
)
cd ..

:: 4. Back up source code to main (force overwrite remote)
echo [*] Syncing source code to origin/main (forced)...
git add .
git commit -m "chore: sync stable build" -q
git push -f origin main
if %ERRORLEVEL% NEQ 0 (
    echo [!] Failed to force push to origin/main.
    pause
    exit /b %ERRORLEVEL%
)

echo [✓] Deployment complete. Site will reflect changes shortly.
pause