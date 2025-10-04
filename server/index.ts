// This is a placeholder to fix the npm dev script
// The actual backend is now running on Django in the backend folder
// Starting frontend from correct location

import { spawn } from 'child_process';
import path from 'path';

console.log('Starting YarnFlow Inventory Management System...');
console.log('Backend: Django server (backend/simple_server.py)');
console.log('Frontend: Vite development server (frontend/)');

// Start Django backend on port 5000
const backendPath = path.join(process.cwd(), 'backend');
const djangoProcess = spawn('python', ['simple_server.py'], {
  cwd: backendPath,
  stdio: 'inherit',
  env: { ...process.env, PORT: '5000' }
});

// Wait a moment for backend to start
setTimeout(() => {
  // Start Vite frontend on port 3000
  const frontendPath = path.join(process.cwd(), 'frontend');
  const viteProcess = spawn('npx', ['vite', '--host', '0.0.0.0', '--port', '3000'], {
    cwd: frontendPath,
    stdio: 'inherit'
  });

  console.log('\n✅ YarnFlow System Started Successfully!');
  console.log('📊 Frontend (Main): http://localhost:3000 - Replit Preview');
  console.log('⚙️  Backend API: http://localhost:5000');
  console.log('🔐 Login: admin / admin123');

  // Handle shutdown
  process.on('SIGINT', () => {
    console.log('\nShutting down YarnFlow System...');
    djangoProcess.kill();
    viteProcess.kill();
    process.exit();
  });
}, 3000);