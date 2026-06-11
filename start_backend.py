import subprocess, os
os.chdir('E:/VScode vibe coding/medical-report-ai')
print(f'Starting backend from: {os.getcwd()}')
subprocess.run(['python', '-m', 'uvicorn', 'src.backend.main:app', '--host', '0.0.0.0', '--port', '8003'])
