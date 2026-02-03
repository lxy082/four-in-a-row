@echo off
cd /d %~dp0\dist
python -m http.server 8000
pause
