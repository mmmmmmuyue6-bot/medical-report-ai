"""
OCR服务 — 多级降级图片提取
优先级：shell tesseract → pytesseract → 引导手动输入
"""
import json
import io
import subprocess
import tempfile
import os
from pathlib import Path


def _try_shell_tesseract(image_bytes: bytes) -> tuple[str | None, str | None]:
    """直接调tesseract命令。返回 (文字, 错误信息)"""
    try:
        with tempfile.NamedTemporaryFile(suffix='.png', delete=False) as tmp:
            tmp.write(image_bytes)
            tmp_path = tmp.name
        out_base = tmp_path + '_out'
        result = subprocess.run(
            ['tesseract', tmp_path, out_base, '-l', 'chi_sim+eng'],
            capture_output=True, timeout=30, text=True
        )
        text = ''
        result_path = out_base + '.txt'
        if os.path.exists(result_path):
            with open(result_path, 'r', encoding='utf-8') as f:
                text = f.read().strip()
            os.unlink(result_path)
        os.unlink(tmp_path)
        if text:
            return text, None
        else:
            return None, f"tesseract未提取到文字。stdout: {result.stdout[:200]}, stderr: {result.stderr[:200]}"
    except FileNotFoundError:
        return None, "tesseract命令未找到（系统未安装）"
    except subprocess.TimeoutExpired:
        return None, "tesseract执行超时（图片可能过大）"
    except Exception as e:
        return None, f"tesseract异常: {str(e)[:200]}"


def _try_pytesseract(image_bytes: bytes) -> tuple[str | None, str | None]:
    """Python pytesseract 库。返回 (文字, 错误信息)"""
    try:
        from PIL import Image
        import pytesseract
        img = Image.open(io.BytesIO(image_bytes)).convert('L')
        text = pytesseract.image_to_string(img, lang='chi_sim+eng')
        return (text.strip(), None) if text.strip() else (None, "pytesseract提取文字为空")
    except ImportError:
        return None, "pytesseract未安装(pip install pytesseract)"
    except Exception as e:
        return None, f"pytesseract异常: {str(e)[:200]}"


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
    1. shell tesseract 命令
    2. pytesseract Python库
    3. 都失败 → 返回具体错误原因
    """
    text, shell_error = _try_shell_tesseract(image_bytes)
    raw_text = text

    if not raw_text:
        raw_text, py_error = _try_pytesseract(image_bytes)
        if not raw_text:
            raise RuntimeError(
                f"{shell_error or ''}; {py_error or 'pytesseract库也不可用'}。"
                "请使用下方手动输入或体验Demo。"
            )

    if raw_text:
        try:
            result = _extract_indicators_from_text(raw_text)
            if result.get("indicators"):
                return result
        except Exception as e:
            pass  # LLM解析失败

    raise RuntimeError(
        f"OCR提取到文字但LLM解析失败。原始文字: {raw_text[:100]}..."
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
