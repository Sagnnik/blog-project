!/usr/bin/env bash
echo "Starting servers in new terminal windows..."

gnome-terminal -- bash -c "echo 'Starting Uvicorn...'; uvicorn main:app --reload; exec bash"


gnome-terminal -- bash -c "echo 'Starting HTTP Server...'; npx http-server ./uploads -p 8001 --cors; exec bash"

echo "Both servers started in separate windows!"
