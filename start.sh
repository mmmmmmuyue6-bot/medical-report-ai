#!/bin/bash
# 安装tesseract（如果不存在）
if ! command -v tesseract &> /dev/null; then
    echo "正在安装 Tesseract OCR..."
    apt-get update -qq && apt-get install -y -qq tesseract-ocr tesseract-ocr-chi-sim 2>/dev/null
    echo "Tesseract 安装完成: $(which tesseract)"
else
    echo "Tesseract 已安装: $(which tesseract)"
fi

# 启动服务
exec uvicorn src.backend.main:app --host 0.0.0.0 --port ${PORT:-8000}
