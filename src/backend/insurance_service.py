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


DRUG_AI_SEARCH_PROMPT = """你是中国医保政策查询助手。用户可能查询药品或检查项目，请先判断类型，再给出对应信息。

## 判断逻辑
1. 如果是**检查/检验项目**（如血常规、CT、B超、血脂全套、肝功能等）：这些属于医疗服务项目，不在药品目录中，但在诊疗项目目录中。绝大多数常规检查属于医保甲类诊疗项目，可以报销。请说明"这是检查项目，属于医保诊疗项目目录。常规检查通常可报销，具体比例取决于当地政策和医院等级"。
2. 如果是**药品**：查询医保药品目录，给出甲乙丙分类。

## 医保分类准确性（药品）
- 医保目录的甲乙丙分类、适应症限制非常复杂
- 基于训练数据判断的类别可能与官方目录不一致
- 如果无法100%确定，标注"不确定，需核实"
- 限适应症的药品需明确标注限制条件
- 集采药品价格远低于非集采，请尽量标注

## 价格信息
- 价格标注来源：[集采参考] 优先（集采中选价格）
- 无集采数据时标注 [AI估算]
- 药品价格因品牌、地区、医院等级差异很大，给出常见价格区间
- 检查项目费用因医院等级（三级/二级/社区）差异大，给出参考范围

## 输出格式（严格JSON）
{
  "found": true,
  "name": "名称",
  "type": "药品 或 检查项目",
  "brand_names": ["商品名（药品适用）"],
  "in_insurance": true,
  "category": "甲类/乙类/丙类(自费)/诊疗项目(可报销)/未纳入医保/不确定",
  "category_note": "详细说明：药品说明甲乙丙分类依据；检查项目说明属于诊疗项目目录、通常可报销",
  "box_price_range": "参考价格（药品用每盒价格，检查用单次费用）",
  "price_source": "[集采参考] 或 [AI估算] 或 [诊疗项目参考]",
  "usage": "主要用途",
  "notes": "特别注意事项（如检查项目需空腹、药品需皮试等）",
  "verification_warning": "⚠ 本结果为AI判断，可能与官方目录不一致。请通过国家医保服务平台APP或当地医保局核实。",
  "source": "[AI搜索] — 本结果由AI实时分析，未经知识库核实"
}

## 核心原则
- 先判断类型再查对应目录
- 检查项目不能说"不在医保目录"，应说明"属于诊疗项目目录"
- 诚实：不确定就标注不确定，绝对不编造
- 价格标注来源，不凭空给数字"""


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


INSURANCE_AI_PROMPT = """你是中国医保政策分析助手。分析某疾病的诊疗费用和医保报销情况。

## 工作流程
1. 检查知识库中已列出的药品、检查、治疗路径
2. 基于医学知识，补充知识库中遗漏的内容（标注 [AI补充，需核实]）
3. 对知识库已有数据使用其价格；对补充数据给出参考范围并标注来源

## 极其重要的准确性要求
- 药品医保分类不确定时，category必须标注"不确定"，不可编造为甲/乙/丙类
- 检查项目不属于药品目录，应说明属于诊疗项目目录（通常可报销）
- 价格因地区、医院等级、集采与否差异大，必须标注来源
- 无法确定价格时标注 [AI估算]，给出合理区间而非精准数字
- 任何你不够确定的信息，写明"不确定，需核实"

## 输出格式（严格JSON，所有字段必填）

{
  "ai_summary": "AI对疾病的简要分析 [AI分析]",
  "ai_supplement_exams": [
    {"name":"检查名","purpose":"为什么做 [AI补充，需核实]","cost_estimate":"费用范围","cost_source":"[价格参考]或[AI估算]或[诊疗项目参考]","frequency":"建议频率 [AI补充，需核实]"}
  ],
  "ai_supplement_drugs": [
    {"name":"药品名","category":"甲类/乙类/丙类/不确定","category_source":"[医保政策]或[AI补充，需核实]","box_price":"价格范围（标注是每盒/每疗程）","price_source":"[集采参考]或[AI估算]","reason":"补充原因 [AI补充，需核实]"}
  ],
  "ai_supplement_paths": ["补充的治疗路径 [AI补充，需核实]"],
  "ai_hospitalization_note": "住院补充说明 [AI补充，需核实]",
  "ai_insurance_note": "医保政策补充 [医保政策]或[AI分析]",
  "cost_breakdown": {
    "outpatient_monthly": "门诊月均估算 [AI估算]",
    "hospitalization": "住院估算 [AI估算]",
    "insurance_note": "医保报销说明 [医保政策]"
  },
  "important_notes": ["注意事项"],
  "disclaimer": "本分析由AI基于公开数据和知识库生成。标注[AI补充]的内容需自行核实。建议通过国家医保服务平台APP确认。"
}

## 核心原则
- 不确定就说不确定，绝对不编造
- 检查项目 ≠ 药品，不要说检查项目"不在医保目录"
- 价格标注来源，给区间不给精准数字
- 诚实 > 完整：宁缺毋滥"""


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
