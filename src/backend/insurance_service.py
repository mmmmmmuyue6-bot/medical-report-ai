"""
医保查询服务 — 药品/检查查询 + 疾病费用评估（AI增强）
"""
import json
from pathlib import Path
from openai import OpenAI
from .config import get_llm_config


def get_client():
    cfg = get_llm_config()
    return OpenAI(api_key=cfg.api_key, base_url=cfg.base_url or None), cfg.model


def load_disease_kb() -> dict:
    path = Path(__file__).parent.parent.parent / "research" / "disease_treatment.json"
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def load_insurance_rules() -> dict:
    path = Path(__file__).parent.parent.parent / "research" / "insurance_rules.json"
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def load_exam_kb() -> dict:
    path = Path(__file__).parent.parent.parent / "research" / "exam_knowledge.json"
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def search_disease(query: str) -> list[dict]:
    kb = load_disease_kb()
    results = []
    q = query.strip()
    for key, entry in kb.get("diseases", {}).items():
        matched = q in key or key in q
        if not matched:
            hits = sum(1 for c in q if c in key)
            matched = hits >= len(q) * 0.5
        if matched:
            results.append({"name": key, "category": entry.get("category", ""), **entry})
    return results


def get_disease_detail(name: str) -> dict | None:
    kb = load_disease_kb()
    entry = kb.get("diseases", {}).get(name)
    if entry:
        return {"name": name, **entry}
    return None


def list_disease_names() -> list[str]:
    kb = load_disease_kb()
    return list(kb.get("diseases", {}).keys())


def get_insurance_rules() -> dict:
    return load_insurance_rules()


def search_exam_or_drug(query: str) -> dict:
    results = {"items": [], "source": "knowledge_base"}
    exam_kb = load_exam_kb()
    q = query.strip()
    for key, entry in exam_kb.get("exams", {}).items():
        aliases = entry.get("aliases", [])
        for name in [key] + aliases:
            if q in name:
                results["items"].append({
                    "name": key, "type": "检查项目",
                    "category": entry.get("category", ""),
                    "cost_range": entry.get("cost_range", ""),
                    "insurance": entry.get("insurance", "待查"),
                })
                break
    disease_kb = load_disease_kb()
    for dname, dentry in disease_kb.get("diseases", {}).items():
        for drug in dentry.get("typical_drugs", []):
            if q in drug.get("name", ""):
                results["items"].append({
                    "name": drug["name"], "type": "药品",
                    "disease_context": dname,
                    "insurance": drug.get("insurance", "待查"),
                    "box_price": drug.get("box_price", ""),
                })
                break
    return results


DRUG_AI_SEARCH_PROMPT = """你是中国医保药品目录查询助手。用户输入一个药品名称，请判断该药品是否在中国医保目录中，并给出相关信息。

## 极其重要：医保分类准确性
- 医保目录的甲乙丙分类、适应症限制、限工伤保险/限生育保险等备注非常复杂
- 你基于训练数据判断的医保类别可能与官方目录不一致
- 如果无法100%确定该药品的医保分类，必须在回答中明确标注"不确定，需核实"
- 部分药品可能在工伤保险/生育保险中报销但不在基本医保中
- 限适应症的药品（如限用于XX病）需明确标注限制条件

## 输出格式（严格JSON）
{
  "found": true,
  "name": "药品通用名",
  "brand_names": ["常见商品名"],
  "in_insurance": true,
  "category": "甲类/乙类/丙类(自费)/未纳入医保/限工伤保险/不确定",
  "category_note": "分类说明，如不确定必须说明",
  "box_price_range": "参考价格范围",
  "price_source": "[集采参考] 或 [AI估算]",
  "usage": "主要用途",
  "notes": "其他注意事项，特别标注任何适应症限制",
  "verification_warning": "⚠ 本药品的医保类别为AI判断，可能与官方目录不一致。请通过国家医保服务平台APP或当地医保局核实。",
  "source": "[AI搜索] — 本结果由AI实时分析，未经知识库核实"
}

## 要求
- 价格信息不确定时标注 [AI估算]
- 不在医保目录时 in_insurance=false，category="未纳入医保"
- 不确定分类时 category="不确定"，备注说明几种可能
- 诚实：医保目录细节复杂，宁可不确切的回答，不可编造"""


def ai_search_drug(query: str) -> dict:
    client, model = get_client()
    response = client.chat.completions.create(
        model=model,
        messages=[
            {"role": "system", "content": DRUG_AI_SEARCH_PROMPT},
            {"role": "user", "content": f"请查询 {query} 的医保信息"},
        ],
        temperature=0.3,
        response_format={"type": "json_object"},
        max_tokens=1000,
    )
    return json.loads(response.choices[0].message.content)


INSURANCE_AI_PROMPT = """你是中国医保政策分析助手。你的任务是：先确认知识库已有哪些数据，再补充可能遗漏的信息。

## 工作流程
1. 检查知识库中已列出的药品、检查、治疗路径
2. 基于医学知识，补充知识库中遗漏的内容（标注 [AI补充，需核实]）
3. 对知识库已有数据使用其价格；对补充数据给出参考范围并标注 [AI估算]

## 输出格式（严格JSON，所有字段必填）

{
  "ai_summary": "AI对疾病的简要分析 [AI分析]",
  "ai_supplement_exams": [
    {"name":"检查名","purpose":"为什么做 [AI补充，需核实]","cost_estimate":"费用范围","cost_source":"[价格参考]或[AI估算]","frequency":"建议频率 [AI补充，需核实]"}
  ],
  "ai_supplement_drugs": [
    {"name":"药品名","category":"甲类/乙类/丙类","category_source":"[医保政策]或[AI补充，需核实]","box_price":"价格范围","price_source":"[集采参考]或[AI估算]","reason":"补充原因 [AI补充，需核实]"}
  ],
  "ai_supplement_paths": ["补充的治疗路径 [AI补充，需核实]"],
  "ai_hospitalization_note": "住院补充说明 [AI补充，需核实]",
  "ai_insurance_note": "医保政策补充 [医保政策]或[AI分析]",
  "cost_breakdown": {
    "outpatient_monthly": "门诊月均估算",
    "hospitalization": "住院估算",
    "insurance_note": "医保报销说明 [医保政策]"
  },
  "important_notes": ["注意事项"],
  "disclaimer": "本分析由AI基于公开数据和知识库生成。标注[AI补充]的内容需自行核实。建议通过国家医保服务平台APP确认。"
}"""


def analyze_disease_cost_with_ai(disease_name: str) -> dict:
    client, model = get_client()
    disease_kb = load_disease_kb()
    rules = load_insurance_rules()
    kb_entry = disease_kb.get("diseases", {}).get(disease_name)

    kb_context = "未在知识库中找到该病种，以下分析基于AI通用医学知识 [AI分析]。"
    if kb_entry:
        kb_context = f"""知识库参考数据 [知识库]：
分类：{kb_entry.get('category','')}
典型检查：{json.dumps(kb_entry.get('typical_exams',[]), ensure_ascii=False)}
典型药品：{json.dumps(kb_entry.get('typical_drugs',[]), ensure_ascii=False)}
治疗路径：{json.dumps(kb_entry.get('treatment_paths',[]), ensure_ascii=False)}
住院参考：{kb_entry.get('hospitalization_scenario','')}
医保提示：{kb_entry.get('insurance_notes','')}"""

    kb_context += f"""

医保通用规则 [医保政策]：
{json.dumps(rules, ensure_ascii=False)[:2000]}

请严格遵守来源标注要求。"""

    response = client.chat.completions.create(
        model=model,
        messages=[
            {"role": "system", "content": INSURANCE_AI_PROMPT},
            {"role": "user", "content": f"请分析 {disease_name} 的诊疗费用和医保报销情况。{kb_context}"},
        ],
        temperature=0.3,
        response_format={"type": "json_object"},
        max_tokens=3000,
    )
    return json.loads(response.choices[0].message.content)
