"""
OCR服务 — easyocr纯Python实现，无需系统依赖
"""
import json
import io
from pathlib import Path


def _do_ocr(image_bytes: bytes) -> str:
    """easyocr提取文字，首次调用会下载模型"""
    import easyocr
    import numpy as np
    from PIL import Image

    img = Image.open(io.BytesIO(image_bytes))
    img_array = np.array(img)

    reader = easyocr.Reader(['ch_sim', 'en'], gpu=False)
    results = reader.readtext(img_array, detail=0)
    text = ' '.join(results).strip()
    if not text:
        raise RuntimeError("OCR未在图片中检测到文字，请确保图片清晰。也可使用手动输入。")
    return text


def _extract_indicators(raw_text: str) -> dict:
    """LLM结构化抽取指标"""
    from openai import OpenAI
    from .config import get_llm_config
    cfg = get_llm_config()
    client = OpenAI(api_key=cfg.api_key, base_url=cfg.base_url or None)
    resp = client.chat.completions.create(
        model=cfg.model,
        messages=[
            {"role": "system", "content": "从文本中提取体检指标。返回JSON：{\"indicators\":[{\"name\":\"指标名\",\"value\":85.0,\"unit\":\"U/L\"}]}。只返回JSON。"},
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
    result = _extract_indicators(text)
    if not result.get("indicators"):
        raise RuntimeError("OCR提取到文字但解析失败，请使用手动输入。")
    return result


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