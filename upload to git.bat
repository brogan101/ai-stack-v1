@echo off
title Sovereign OS - GitHub Sync
echo ======================================================
echo    Sovereign AI OS - GitHub Sync Tool
echo ======================================================
echo.

:: Change directory to the folder where the bat file is located
cd /d %~dp0

echo [1/5] Verifying .gitignore...
:: This ensures we don't upload gigabytes of node_modules
if not exist .gitignore (
    echo .gitignore missing! Creating a Sovereign-standard gitignore...
    echo node_modules/ > .gitignore
    echo dist/ >> .gitignore
    echo .env >> .gitignore
    echo *.log >> .gitignore
    echo .bak >> .gitignore
    echo .DS_Store >> .gitignore
    echo "C:\Users\broga\Desktop\LOCAL AI\runtime" >> .gitignore
    echo.
) else (
    echo .gitignore exists. Skipping creation.
)

echo [2/5] Adding all changes...
git add .

echo [3/5] Committing changes...
:: Using a timestamped commit message for better tracking
set timestamp=%date% %time%
git commit -m "Sovereign Update: %timestamp%"

echo [4/5] Synchronizing with GitHub...
:: Remove origin if it exists to avoid conflicts, then re-add
git remote remove origin 2>nul
git remote add origin https://github.com/brogan101/ai-stack-v1.git

echo [5/5] Pushing to main branch...
git branch -M main
git push -u origin main

echo.
echo ======================================================
echo ✅ SYNC COMPLETE! 
echo Your Sovereign OS is now backed up to GitHub.
echo ======================================================
pause
