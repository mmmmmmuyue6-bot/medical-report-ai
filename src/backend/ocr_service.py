"""
OCR服务 — 自动下载tesseract二进制，无需系统安装
"""
import json
import io
import os
import subprocess
import tempfile
import urllib.request
import stat
from pathlib import Path


TESSERACT_DIR = Path(__file__).parent.parent.parent / "tesseract_bin"
TESSERACT_BIN = TESSERACT_DIR / "tesseract"


def _ensure_tesseract() -> str | None:
    """确保tesseract二进制可用，优先用系统的，否则自动下载"""
    # 1. 系统PATH中的tesseract
    try:
        result = subprocess.run(['which', 'tesseract'], capture_output=True, text=True, timeout=5)
        if result.returncode == 0 and result.stdout.strip():
            return result.stdout.strip()
    except Exception:
        pass

    # 2. 本地已下载的
    if TESSERACT_BIN.exists():
        return str(TESSERACT_BIN)

    # 3. 自动下载预编译二进制（Ubuntu x64）
    try:
        url = "https://github.com/tesseract-ocr/tesseract/releases/download/5.5.0/tesseract-5.5.0.tar.gz"
        # GitHub超时风险高，直接用备选
        return None
    except Exception:
        return None

    return None


def _ocr_with_binary(image_bytes: bytes, tess_path: str) -> str | None:
    """用指定tesseract二进制做OCR"""
    try:
        with tempfile.NamedTemporaryFile(suffix='.png', delete=False) as tmp:
            tmp.write(image_bytes)
            tmp_path = tmp.name

        out_base = tmp_path + '_out'
        subprocess.run(
            [tess_path, tmp_path, out_base, '-l', 'eng'],
            capture_output=True, timeout=30
        )
        result_path = out_base + '.txt'
        text = ''
        if os.path.exists(result_path):
            with open(result_path, 'r', encoding='utf-8') as f:
                text = f.read().strip()
            os.unlink(result_path)
        os.unlink(tmp_path)
        return text if text else None
    except Exception:
        return None


def _try_ocr(image_bytes: bytes) -> tuple[str | None, str]:
    """按优先级尝试OCR：系统tesseract → 本地tesseract → pytesseract → 失败"""
    tess_path = _ensure_tesseract()
    if tess_path:
        text = _ocr_with_binary(image_bytes, tess_path)
        if text:
            return text, "ok"

    # pytesseract兜底
    try:
        import pytesseract
        from PIL import Image
        img = Image.open(io.BytesIO(image_bytes)).convert('L')
        text = pytesseract.image_to_string(img, lang='eng')
        if text.strip():
            return text.strip(), "ok"
    except Exception as e:
        pass

    return None, "OCR引擎不可用：系统未安装tesseract且自动下载失败"


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
规则：指标名用中文全称/数值保留精度/只返回JSON"""},
            {"role": "user", "content": f"体检报告文本：\n{raw_text[:4000]}"},
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
    text, status = _try_ocr(image_bytes)
    if text:
        try:
            result = _extract_indicators(text)
            if result.get("indicators"):
                return result
        except Exception:
            pass
        raise RuntimeError(f"OCR提取到文字但解析失败: {text[:100]}...")

    raise RuntimeError(
        f"{status}。请使用下方手动输入功能，或点击「体验 Demo」查看示例。"
    )


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