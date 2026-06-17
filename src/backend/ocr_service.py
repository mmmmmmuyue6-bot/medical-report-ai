"""
OCR服务 — 从体检报告图片中提取检测指标
多级降级：easyocr → pytesseract → 引导手动输入
"""
import json
import io
from pathlib import Path


def _try_easyocr(image_bytes: bytes) -> str | None:
    """纯Python OCR，无需系统依赖，适合Render部署"""
    try:
        import easyocr
        import numpy as np
        from PIL import Image

        img = Image.open(io.BytesIO(image_bytes))
        img_array = np.array(img)

        reader = easyocr.Reader(['ch_sim', 'en'], gpu=False)
        results = reader.readtext(img_array, detail=0)
        text = ' '.join(results).strip()
        return text if text else None
    except ImportError:
        return None
    except Exception:
        return None


def _try_tesseract(image_bytes: bytes) -> str | None:
    """系统级OCR，速度更快，需安装tesseract"""
    try:
        from PIL import Image
        import pytesseract
        img = Image.open(io.BytesIO(image_bytes)).convert('L')
        text = pytesseract.image_to_string(img, lang='chi_sim+eng')
        return text.strip() if text.strip() else None
    except ImportError:
        return None
    except Exception:
        return None


def _extract_indicators_from_text(raw_text: str) -> dict:
    """LLM 从 OCR 文字中结构化抽取指标"""
    from openai import OpenAI
    from .config import get_llm_config

    cfg = get_llm_config()
    client = OpenAI(api_key=cfg.api_key, base_url=cfg.base_url or None)

    response = client.chat.completions.create(
        model=cfg.model,
        messages=[
            {"role": "system", "content": """从体检报告文本中提取所有检测指标。返回JSON：
{"age":null,"gender":"","indicators":[{"name":"指标中文全称","value":85.0,"unit":"U/L","reference_range":"10-40"}]}
规则：指标名用中文全称/数值保留精度/参考范围如无则留空/尽可能多提取/只返回JSON"""},
            {"role": "user", "content": f"体检报告文本：\n{raw_text[:4000]}"},
        ],
        temperature=0.1, max_tokens=2000,
        response_format={"type": "json_object"},
    )
    content = response.choices[0].message.content.strip()
    if content.startswith("```"):
        lines = content.split("\n")
        content = "\n".join(lines[1:-1] if lines[-1].strip() == "```" else lines[1:])
    return json.loads(content)


MOCK_REPORT = {
    "age": 28, "gender": "男性",
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
    多级降级OCR：
    1. easyocr（纯Python，Render可直接用）
    2. pytesseract（需系统安装，本地更快）
    3. 都不行 → 引导手动输入
    """
    # Step 1: 尝试 OCR 提取文字
    raw_text = _try_easyocr(image_bytes) or _try_tesseract(image_bytes)

    if raw_text:
        # Step 2: LLM 结构化
        try:
            result = _extract_indicators_from_text(raw_text)
            if result.get("indicators"):
                return result
        except Exception:
            pass

    # 全部失败
    raise RuntimeError(
        "OCR引擎未就绪。服务器端：安装 easyocr（pip install easyocr）或 Tesseract。"
        "你也可以直接使用下方的手动输入功能或体验 Demo。"
    )


def parse_text_input(text: str) -> list[dict]:
    """解析手动输入的指标，格式：ALT,85,U/L"""
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
    return MOCK_REPORT
