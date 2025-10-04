#!/bin/bash
cd backend
python simple_server.py &
echo $! > ../backend.pid
echo "Django backend started on port 5000"