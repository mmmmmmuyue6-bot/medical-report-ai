"""
检查项目解释服务 — 搜索 + 详情 + AI增强解释
"""
import json
from pathlib import Path
from openai import OpenAI
from .config import get_llm_config


def get_client():
    cfg = get_llm_config()
    return OpenAI(api_key=cfg.api_key, base_url=cfg.base_url or None), cfg.model


def load_exam_kb() -> dict:
    path = Path(__file__).parent.parent.parent / "research" / "exam_knowledge.json"
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def search_exams(query: str) -> list[dict]:
    kb = load_exam_kb()
    results = []
    q = query.strip().lower()
    for key, entry in kb.get("exams", {}).items():
        all_text = key + " " + " ".join(entry.get("aliases", [])) + " " + entry.get("category", "")
        if q in all_text.lower():
            results.append({
                "key": key, "name": key,
                "category": entry.get("category", ""),
                "one_liner": entry.get("one_liner", ""),
                "pain_level": entry.get("pain_level", 0),
                "cost_range": entry.get("cost_range", ""),
            })
    return results


def get_exam_detail(name: str) -> dict | None:
    kb = load_exam_kb()
    for key, entry in kb.get("exams", {}).items():
        if name in [key] + entry.get("aliases", []):
            return {"key": key, **entry}
    return None


def get_categories() -> dict:
    kb = load_exam_kb()
    return kb.get("categories", {})


def get_exams_by_category(category: str) -> list[dict]:
    kb = load_exam_kb()
    results = []
    for key, entry in kb.get("exams", {}).items():
        if entry.get("category") == category:
            results.append({
                "key": key, "name": key,
                "one_liner": entry.get("one_liner", ""),
                "pain_level": entry.get("pain_level", 0),
                "cost_range": entry.get("cost_range", ""),
            })
    return results


EXAM_AI_PROMPT = """你是医学检查项目解释助手。你的任务是补充知识库中缺失或不足的信息，而不是复述已有内容。

## ⚠️ 核心规则：避免与知识库重复
1. 仔细阅读下方提供的知识库数据
2. 对于知识库已经说清楚的字段，**输出空字符串""或空数组[]**
3. 只在知识库**没有覆盖**或**信息明显不足**时，才输出补充内容
4. 如果某个字段知识库完全没提，你可以自由发挥

## 标注规则
- 知识库已覆盖 → 输出空字符串 ""
- 你补充的新内容 → 字段末尾加 [AI补充]
- 列表字段（steps、preparation）每项不需要加标签

## 输出格式（严格JSON）
{"explanation":"知识库已有则留空，否则写通俗解释 [AI补充]","principle":"","purpose":"","steps":[],"pain_description":"","preparation":[],"cost_note":"","result_wait":"","key_points":[],"faq":[{"q":"问题","a":"回答 [AI补充]"}],"disclaimer":"以上补充内容由AI生成，仅供参考"}"""


def explain_exam_with_ai(exam_name: str) -> dict:
    client, model = get_client()
    detail = get_exam_detail(exam_name)
    if not detail:
        # KB完全没收录：AI自由发挥，不加KB上下文以免误导
        kb_context = f"知识库中未收录 {exam_name}。请根据你的医学知识生成完整解释，所有字段都需要填写。"
    else:
        kb_context = f"知识库已有数据（请仔细阅读，只补充其中缺失或不足的部分）：\n{json.dumps(detail, ensure_ascii=False)[:2000]}"

    response = client.chat.completions.create(
        model=model,
        messages=[
            {"role": "system", "content": EXAM_AI_PROMPT},
            {"role": "user", "content": f"检查项目：{exam_name}\n{kb_context}"},
        ],
        temperature=0.5,
        response_format={"type": "json_object"},
        max_tokens=1500,
    )
    return json.loads(response.choices[0].message.content)


# --- 疾病→检查 功能 ---

def load_disease_kb() -> dict:
    path = Path(__file__).parent.parent.parent / "research" / "disease_treatment.json"
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def search_disease_exams(query: str) -> list[dict]:
    """搜索病种（双向模糊匹配），返回该病种需要的检查"""
    kb = load_disease_kb()
    results = []
    q = query.strip()
    for key, entry in kb.get("diseases", {}).items():
        # 双向匹配：query在key中 OR key在query中 OR 任一分词匹配
        matched = q in key or key in q
        if not matched:
            # 逐字匹配：query中的字至少有60%在key中
            hits = sum(1 for c in q if c in key)
            matched = hits >= len(q) * 0.5
        if matched:
            results.append({
                "disease": key,
                "category": entry.get("category", ""),
                "exams": entry.get("typical_exams", []),
                "treatment_paths": entry.get("treatment_paths", []),
                "hospitalization": entry.get("hospitalization_scenario", ""),
            })
    return results


DISEASE_EXAM_AI_PROMPT = """你是医学检查项目推荐助手。根据疾病名称，列出该疾病通常需要做的检查项目。

## 输出格式（严格JSON）
{
  "ai_summary": "该疾病的简要说明 [AI分析]",
  "ai_supplement_exams": [
    {"name":"检查名","purpose":"为什么要做 [AI补充，需核实]","frequency":"建议频率 [AI补充，需核实]","cost_estimate":"费用范围","cost_source":"[价格参考]或[AI估算]"}
  ],
  "important_notes": ["注意事项 [AI分析]"],
  "disclaimer": "以上检查建议由AI基于医学知识生成，实际以医生处方为准。标注[AI补充]的检查建议需自行核实。"
}"""


def analyze_disease_exams_with_ai(disease_name: str) -> dict:
    """AI补充某病种需要的检查"""
    client, model = get_client()
    kb = load_disease_kb()
    kb_entry = kb.get("diseases", {}).get(disease_name)
    kb_context = "未在知识库中找到该病种。" if not kb_entry else f"知识库已有检查：{json.dumps(kb_entry.get('typical_exams',[]), ensure_ascii=False)[:1500]}"

    response = client.chat.completions.create(
        model=model,
        messages=[
            {"role": "system", "content": DISEASE_EXAM_AI_PROMPT},
            {"role": "user", "content": f"请分析 {disease_name} 需要做哪些检查。{kb_context}"},
        ],
        temperature=0.4,
        response_format={"type": "json_object"},
        max_tokens=1500,
    )
    return json.loads(response.choices[0].message.content)


def ai_search_exam(query: str) -> dict:
    """AI搜索检查项目（KB无结果时的兜底）"""
    client, model = get_client()
    response = client.chat.completions.create(
        model=model,
        messages=[
            {"role": "system", "content": "你是医学检查项目搜索助手。用户输入检查名称（可能是简称或俗称），请返回对应的正规检查名称和简要说明。输出JSON：{\"name\":\"正式名称\",\"one_liner\":\"一句话说明 [AI搜索]\",\"category\":\"分类\"}。如果无法确定，name为空字符串。"},
            {"role": "user", "content": f"搜索：{query}"},
        ],
        temperature=0.3,
        response_format={"type": "json_object"},
        max_tokens=500,
    )
    return json.loads(response.choices[0].message.content)
