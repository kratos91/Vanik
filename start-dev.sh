#!/bin/bash
# Development startup script for Django backend + Vite frontend

echo "Starting Django backend..."
cd backend
python simple_server.py &
BACKEND_PID=$!
cd ..

echo "Waiting for backend to start..."
sleep 3

echo "Starting Vite frontend development server..."
cd frontend
npx vite --host 0.0.0.0 --port 3000 &
FRONTEND_PID=$!
cd ..

echo "Application started!"
echo "Frontend: http://localhost:3000"
echo "Backend: http://localhost:5000"

# Wait for any process to exit
wait $BACKEND_PID $FRONTEND_PID