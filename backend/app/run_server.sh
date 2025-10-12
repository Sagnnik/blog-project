@echo off
echo Starting servers...

:: Start uvicorn in a new window
start "Uvicorn Server" cmd /k uvicorn main:app --reload

:: Start http-server in a new window
start "HTTP Server" cmd /k npx http-server ./uploads -p 8001 --cors

echo Both servers started in separate windows
echo Close the windows to stop the servers