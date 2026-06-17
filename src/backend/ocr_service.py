"""
OCR服务 — 从图片提取体检指标（依赖tesseract）
"""
import json
import io
import os
import tempfile
from pathlib import Path


def _do_ocr(image_bytes: bytes) -> str | None:
    """多层尝试OCR提取文字"""
    # 方法1: pytesseract
    try:
        from PIL import Image
        import pytesseract
        img = Image.open(io.BytesIO(image_bytes)).convert('L')
        text = pytesseract.image_to_string(img, lang='eng')
        if text.strip():
            return text.strip()
    except Exception:
        pass

    # 方法2: 直接调tesseract命令
    try:
        import subprocess
        with tempfile.NamedTemporaryFile(suffix='.png', delete=False) as f:
            f.write(image_bytes)
            tmp = f.name
        out = tmp + '_out'
        subprocess.run(['tesseract', tmp, out, '-l', 'eng'], capture_output=True, timeout=30)
        txt_path = out + '.txt'
        if os.path.exists(txt_path):
            with open(txt_path, 'r', encoding='utf-8') as f:
                text = f.read().strip()
            os.unlink(txt_path)
        os.unlink(tmp)
        if text.strip():
            return text.strip()
    except FileNotFoundError:
        raise RuntimeError(
            "OCR引擎未安装。服务器启动时自动安装可能失败，请联系管理员。"
            "你也可以使用下方手动输入功能，或点击「体验 Demo」。"
        )
    except Exception as e:
        raise RuntimeError(f"OCR执行异常: {str(e)[:200]}")

    return None


def _extract_indicators(raw_text: str) -> dict:
    """LLM从OCR文字中结构化抽取指标"""
    from openai import OpenAI
    from .config import get_llm_config
    cfg = get_llm_config()
    client = OpenAI(api_key=cfg.api_key, base_url=cfg.base_url or None)
    resp = client.chat.completions.create(
        model=cfg.model,
        messages=[
            {"role": "system", "content": """从文本中提取体检指标。返回JSON：
{"indicators":[{"name":"指标名","value":85.0,"unit":"U/L"}]}
只返回JSON"""},
            {"role": "user", "content": f"文本：\n{raw_text[:4000]}"},
        ],
        temperature=0.1, max_tokens=2000,
        response_format={"type": "json_object"},
    )
    content = resp.choices[0].message.content.strip()
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
    text = _do_ocr(image_bytes)
    if not text:
        raise RuntimeError("OCR未提取到文字，请确保图片清晰且包含可识别文本。也可使用手动输入。")
    try:
        result = _extract_indicators(text)
        if result.get("indicators"):
            return result
    except Exception:
        pass
    raise RuntimeError(f"OCR提取到文字但解析失败: {text[:100]}...")


def parse_text_input(text: str) -> list[dict]:
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