#!/bin/bash
# ==========================================
# 就医全流程AI导航 — 生产部署启动脚本
# 同时服务前端静态文件 + 后端 API
# ==========================================

cd "$(dirname "$0")"

echo "=== 就医全流程AI导航 ==="
echo "启动后端服务器（端口 8000）..."

# 确保已构建前端
if [ ! -d "frontend/dist" ]; then
    echo "前端未构建，正在构建..."
    cd frontend && npm install && npm run build && cd ..
fi

# 启动服务
uvicorn src.backend.main:app --host 0.0.0.0 --port 8000
