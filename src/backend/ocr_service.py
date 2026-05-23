"""
OCR服务 — 从体检报告图片中提取检测指标
使用 LLM 多模态识别（base64 图片），失败时降级为手动输入提示
"""
import json
import base64
import io
from pathlib import Path
from openai import OpenAI
from .config import get_llm_config


def get_client():
    cfg = get_llm_config()
    return OpenAI(api_key=cfg.api_key, base_url=cfg.base_url or None), cfg.model


MOCK_REPORT = {
    "age": 28,
    "gender": "男性",
    "indicators": [
        {"name": "丙氨酸氨基转移酶(ALT)", "value": 85.0, "unit": "U/L", "reference_range": "10-40"},
        {"name": "天门冬氨酸氨基转移酶(AST)", "value": 62.0, "unit": "U/L", "reference_range": "10-40"},
        {"name": "γ-谷氨酰转肽酶(GGT)", "value": 95.0, "unit": "U/L", "reference_range": "10-60"},
        {"name": "总胆固醇(TC)", "value": 6.5, "unit": "mmol/L", "reference_range": "<5.2"},
        {"name": "空腹血糖(GLU)", "value": 6.8, "unit": "mmol/L", "reference_range": "3.9-6.1"},
        {"name": "肌酐(Cr)", "value": 88.0, "unit": "μmol/L", "reference_range": "54-106"},
        {"name": "尿酸(UA)", "value": 485.0, "unit": "μmol/L", "reference_range": "202-416"},
        {"name": "血红蛋白(Hb)", "value": 155.0, "unit": "g/L", "reference_range": "130-175"},
    ],
}

OCR_SYSTEM_PROMPT = """你是一个体检报告数据提取助手。你的任务是从体检报告图片中提取所有检测指标。

## 输出格式
必须返回严格的JSON格式：

{
  "age": 28,
  "gender": "男性",
  "indicators": [
    {"name": "指标中文全称", "value": 85.0, "unit": "U/L", "reference_range": "10-40"}
  ]
}

## 规则
1. 指标名称使用中文全称
2. 数值保留原始精度（小数或整数）
3. 如果图片中没有年龄/性别信息，age和gender设为null
4. 如果图片中无法识别参考范围，reference_range设为空字符串""
5. 提取尽可能多的指标，不要遗漏
6. 只返回JSON，不要有任何额外文字"""


def process_image_ocr(image_bytes: bytes) -> dict:
    """
    使用 LLM 多模态识别体检报告图片
    将图片转为 base64 发送给 LLM，返回提取的指标数据
    """
    client, model = get_client()
    base64_image = base64.b64encode(image_bytes).decode("utf-8")

    try:
        response = client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": OCR_SYSTEM_PROMPT},
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": "请从这张体检报告图片中提取所有检测指标"},
                        {
                            "type": "image_url",
                            "image_url": {"url": f"data:image/jpeg;base64,{base64_image}"},
                        },
                    ],
                },
            ],
            temperature=0.1,
            max_tokens=2000,
        )

        content = response.choices[0].message.content
        # 清理可能的 markdown 代码块包裹
        content = content.strip()
        if content.startswith("```"):
            lines = content.split("\n")
            content = "\n".join(lines[1:-1] if lines[-1].strip() == "```" else lines[1:])
        return json.loads(content)

    except Exception as e:
        error_msg = str(e)
        # 判断是否因为模型不支持图片导致失败
        if "image" in error_msg.lower() or "vision" in error_msg.lower() or "multipart" in error_msg.lower():
            raise RuntimeError("当前模型不支持图片识别。建议：安装Tesseract本地OCR，或手动输入指标数据。")
        raise RuntimeError(f"OCR识别失败: {error_msg}")


def parse_text_input(text: str) -> list[dict]:
    """解析用户手动输入的指标数据，格式：ALT,85,U/L"""
    indicators = []
    for line in text.strip().split("\n"):
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        parts = [p.strip() for p in line.split(",")]
        if len(parts) >= 2:
            indicators.append({
                "name": parts[0],
                "value": float(parts[1]) if parts[1].replace(".", "").replace("-", "").isdigit() else parts[1],
                "unit": parts[2] if len(parts) > 2 else "",
                "reference_range": "",
            })
    return indicators


def get_mock_report() -> dict:
    """返回模拟报告用于 Demo"""
    return MOCK_REPORT
