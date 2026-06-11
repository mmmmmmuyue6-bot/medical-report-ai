@echo off
cd /d "E:\VScode vibe coding\medical-report-ai"
echo Starting backend on port 8003...
uvicorn src.backend.main:app --host 0.0.0.0 --port 8003
pause
