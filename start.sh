#!/bin/bash
set -e

echo "=== 就医AI导航 启动 ==="

# 尝试安装tesseract
if command -v tesseract &> /dev/null; then
    echo "[OCR] Tesseract 已存在: $(which tesseract)"
else
    echo "[OCR] 正在安装 Tesseract..."
    apt-get update -qq 2>&1 | tail -1
    apt-get install -y -qq tesseract-ocr 2>&1 | tail -3
    if command -v tesseract &> /dev/null; then
        echo "[OCR] Tesseract 安装成功: $(which tesseract)"
    else
        echo "[OCR] Tesseract 安装失败，OCR功能不可用"
    fi
fi

echo "=== 启动服务 ==="
exec uvicorn src.backend.main:app --host 0.0.0.0 --port ${PORT:-8000}
