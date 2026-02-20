@echo off
cd /d "%~dp0"
call npx tsx src/cli.ts all
pause
