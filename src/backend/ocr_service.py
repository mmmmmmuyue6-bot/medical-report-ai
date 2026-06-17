"""
OCR服务 — 从体检报告图片中提取检测指标
优先使用本地 OCR（pytesseract），不可用时降级引导手动输入
"""
import json
import base64
import io
from pathlib import Path


def _try_tesseract(image_bytes: bytes) -> str | None:
    """尝试使用 pytesseract 提取文字，不可用时返回 None"""
    try:
        from PIL import Image
        import pytesseract
        img = Image.open(io.BytesIO(image_bytes))
        # 预处理：转灰度 + 增强对比度，提高识别率
        img = img.convert('L')
        text = pytesseract.image_to_string(img, lang='chi_sim+eng')
        return text.strip() if text.strip() else None
    except ImportError:
        return None
    except Exception:
        return None


def _extract_indicators_from_text(raw_text: str) -> dict:
    """用 LLM 从 OCR 提取的原始文本中结构化抽取指标"""
    from openai import OpenAI
    from .config import get_llm_config

    cfg = get_llm_config()
    client = OpenAI(api_key=cfg.api_key, base_url=cfg.base_url or None)

    response = client.chat.completions.create(
        model=cfg.model,
        messages=[
            {"role": "system", "content": """从体检报告文本中提取所有检测指标。返回JSON格式：
{
  "age": 28,
  "gender": "男性",
  "indicators": [
    {"name": "指标中文全称", "value": 85.0, "unit": "U/L", "reference_range": "10-40"}
  ]
}
规则：1)指标名用中文全称 2)数值保留原始精度 3)参考范围如无则留空 4)尽可能多提取 5)只返回JSON"""},
            {"role": "user", "content": f"体检报告文本：\n{raw_text[:4000]}"},
        ],
        temperature=0.1,
        max_tokens=2000,
        response_format={"type": "json_object"},
    )
    content = response.choices[0].message.content.strip()
    if content.startswith("```"):
        lines = content.split("\n")
        content = "\n".join(lines[1:-1] if lines[-1].strip() == "```" else lines[1:])
    return json.loads(content)


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


def process_image_ocr(image_bytes: bytes) -> dict:
    """
    图片OCR识别主流程：
    1. 尝试本地 pytesseract OCR 提取文字
    2. 成功 → LLM 从文字中结构化抽取指标
    3. 失败 → 返回明确错误提示
    """
    # Step 1: OCR 文字提取
    raw_text = _try_tesseract(image_bytes)

    if raw_text:
        # Step 2: LLM 结构化
        try:
            result = _extract_indicators_from_text(raw_text)
            if result.get("indicators"):
                return result
        except Exception:
            pass  # LLM 解析失败，继续抛 OCR 错误

    # OCR 不可用
    raise RuntimeError(
        "图片识别需要安装 Tesseract OCR。"
        "Windows: 下载安装 tesseract-ocr，勾选中文语言包。"
        "Mac: brew install tesseract tesseract-lang。"
        "Linux: apt install tesseract-ocr tesseract-ocr-chi-sim。"
        "或直接使用下方手动输入功能。"
    )


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
