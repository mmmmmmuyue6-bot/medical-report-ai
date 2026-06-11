import subprocess, os
os.chdir('E:/VScode vibe coding/medical-report-ai/frontend')
p = subprocess.Popen(['npx.cmd', 'vite', '--host', '0.0.0.0', '--port', '5178'],
    stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
print(f'PID: {p.pid}')
