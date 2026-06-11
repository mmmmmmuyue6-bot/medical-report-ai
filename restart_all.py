import subprocess, os, sys, time

# Start backend
os.chdir('E:/VScode vibe coding/medical-report-ai')
subprocess.Popen([r'C:\Users\Lenovo\AppData\Local\Programs\Python\Python314\python.exe',
    '-m', 'uvicorn', 'src.backend.main:app', '--host', '0.0.0.0', '--port', '8003',
    '--log-level', 'error'])

# Start frontend
os.chdir('E:/VScode vibe coding/medical-report-ai/frontend')
subprocess.Popen(['npx.cmd', 'vite', '--host', '0.0.0.0', '--port', '5178', '--force'])

time.sleep(6)
print('Both servers started (fresh, no cache)')
print('Frontend: http://localhost:5178')
print('Backend: http://localhost:8003')
