"""
症状分诊服务 — 紧急检测 + 科室推荐 Prompt 设计

面试要点：
- 为什么硬编码+AI双机制？
- 为什么分诊 temperature 比报告解读更低？
"""
import json
import re
from pathlib import Path
from openai import OpenAI
from .config import get_llm_config


def get_client():
    cfg = get_llm_config()
    return OpenAI(api_key=cfg.api_key, base_url=cfg.base_url or None), cfg.model


# 硬编码紧急关键词（正则匹配）
EMERGENCY_PATTERNS = [
    (r"胸痛|胸口疼|心绞痛|压榨性", "您的症状可能提示心脏急症，请立即前往急诊科或拨打120"),
    (r"呼吸困难|喘不上气|窒息|气促|不能呼吸", "您的症状可能提示严重呼吸或心脏问题，请立即前往急诊科或拨打120"),
    (r"晕厥|晕倒|意识不清|意识模糊|昏迷|叫不醒", "您的症状可能提示严重神经系统问题，请立即前往急诊科或拨打120"),
    (r"高热.{0,3}不退|高烧.{0,3}不退|39度|39℃", "您的高热持续不退，可能存在严重感染，请立即前往感染科急诊"),
    (r"说话不清|言语不清|口齿不清|一侧肢体无力|半边身子|面瘫|嘴歪", "您的症状可能提示脑卒中，请立即前往急诊科，每延迟一分钟都可能造成不可逆损伤"),
    (r"呕血|吐血|黑便|便血|大出血|大量出血", "您有消化道出血可能，请立即前往急诊科"),
    (r"突.{0,2}剧烈头痛|雷击样|头要炸|撕裂样", "您的头痛可能提示蛛网膜下腔出血等危急情况，请立即前往急诊科"),
    (r"板状腹|腹肌紧张|全腹痛|腹部.{0,2}硬", "您的腹部体征可能提示外科急腹症，请立即前往急诊科"),
]


def check_emergency(text: str) -> dict:
    """硬编码紧急检测，返回 {'is_emergency': bool, 'message': str, 'trigger': str|null}"""
    for pattern, message in EMERGENCY_PATTERNS:
        if re.search(pattern, text):
            return {"is_emergency": True, "message": message, "trigger": "hardcoded"}
    return {"is_emergency": False, "message": "", "trigger": None}


def load_knowledge_base() -> dict:
    """加载症状知识库"""
    kb_path = Path(__file__).parent.parent.parent / "research" / "symptom_department.json"
    with open(kb_path, "r", encoding="utf-8") as f:
        return json.load(f)


def search_symptom(symptom_text: str) -> list[dict]:
    """从知识库检索匹配的症状条目"""
    kb = load_knowledge_base()
    results = []
    for key, entry in kb.get("symptoms", {}).items():
        aliases = entry.get("aliases", [])
        all_names = [key] + aliases
        for name in all_names:
            if name in symptom_text:
                results.append({"key": key, **entry})
                break
    return results


def load_departments() -> dict:
    """加载科室数据库"""
    dept_path = Path(__file__).parent.parent.parent / "research" / "departments.json"
    with open(dept_path, "r", encoding="utf-8") as f:
        return json.load(f)


SYMPTOM_SYSTEM_PROMPT = """你是一位临床分诊辅助AI。你的任务是根据用户描述的症状，给出科室推荐和紧急性判断。

## 你的角色定位
你是一个「帮用户判断挂什么科」的工具——不是医生，不做诊断。你的价值是帮用户少走弯路，而不是替代医生。

## 动态追问规则（重要）
用户可能给出不完整的回答（如只说"不知道"或极其简短）。你需要：
1. 检查每条已有信息是否足够——信息太短或模糊时，在missing_info中指出还需要补充什么
2. 对于"不知道"/"没有"/"无"这种回答，视为已收集（不要重复追问）
3. 如果用户明确回答了某个维度的内容（即使简短），不要把该维度列入missing_info

## 你可以做
✅ 根据症状推荐最可能的就诊科室（1-3个，按可能性排序）
✅ 判断是否需要紧急就医
✅ 建议可以做的检查项目
✅ 提供就医前准备建议
✅ 列出可能的疾病方向（标注"AI分析，仅供参考"）

## 你不能做
❌ 给出确定性诊断
❌ 推荐具体药物或治疗方案
❌ 制造不必要的恐慌
❌ 忽视需要紧急就医的警示信号

## 紧急性分层
- non_urgent: 可择期就诊（非紧急，但建议近期看看）
- observe: 建议观察1-3天，无好转再就医
- urgent: 建议尽快就医（24-48小时内）
- emergency: 建议立即前往急诊

## 输出格式
必须返回严格的JSON格式，不要有任何额外文字：

{
  "departments": [
    {"name": "科室名称", "reason": "推荐理由（一句话，面向用户）", "probability": "high" | "medium" | "low"}
  ],
  "emergency_level": "non_urgent" | "observe" | "urgent" | "emergency",
  "emergency_reason": "如果紧急性为urgent或emergency，说明原因；否则为空字符串",
  "summary": "一句话总结（面向用户，40字以内）",
  "suggested_tests": ["建议检查1", "建议检查2"],
  "preparation_advice": "就医前准备建议（如：带好身份证、空腹、记录症状日记等）",
  "lifestyle_advice": ["就医前可以尝试的事项"],
  "missing_info": ["还需要了解的信息——注意：只列出用户确实没有提供的信息，已提供的信息绝对不要列"],
  "possible_diagnoses": [
    {"direction": "可能方向（不是诊断，只是可能性方向）", "likelihood": "常见/可见/少见", "why": "为什么考虑这个方向", "note": "需要做什么检查来确认或排除 [AI分析，仅供参考，不构成诊断]"}
  ],
  "disclaimer": "本建议由AI生成，仅供参考。如症状加重或出现紧急情况，请及时就医。"
}"""


SYMPTOM_USER_PROMPT = """请根据以下用户信息进行分诊建议。注意：已提供的信息不要再列入missing_info。

## 主诉
{chief_complaint}

## 基本信息（已收集）
- 年龄：{age}
- 性别：{gender}

## 症状详情（已收集）
- 部位与性质：{symptom_location}
- 程度与时间：{symptom_onset}
- 诱因与背景：{symptom_context}

## 既往史（已收集）
{history_medical}

## 生活习惯（已收集）
{history_lifestyle}

## 家族史（已收集）
{family_history}

## 知识库参考
{symptom_kb}

请严格按照JSON格式输出分诊建议。missing_info只列出值为"未提供"或内容过短的字段中缺少的关键信息。"""


def analyze_symptoms(
    chief_complaint: str,
    age: int | None = None,
    gender: str | None = None,
    symptom_location: str = "",
    symptom_onset: str = "",
    symptom_context: str = "",
    history_medical: str = "",
    history_lifestyle: str = "",
    family_history: str = "",
) -> dict:
    """调用LLM进行症状分诊"""
    client, model = get_client()

    kb_results = search_symptom(chief_complaint)
    kb_context = json.dumps(kb_results, ensure_ascii=False, indent=2) if kb_results else "知识库中未找到精确匹配，请基于通用医学知识给出建议"

    user_prompt = SYMPTOM_USER_PROMPT.format(
        chief_complaint=chief_complaint,
        age=age or "未提供",
        gender=gender or "未提供",
        symptom_location=symptom_location or "未提供",
        symptom_onset=symptom_onset or "未提供",
        symptom_context=symptom_context or "未提供",
        history_medical=history_medical or "未提供",
        history_lifestyle=history_lifestyle or "未提供",
        family_history=family_history or "未提供",
        symptom_kb=kb_context,
    )

    response = client.chat.completions.create(
        model=model,
        messages=[
            {"role": "system", "content": SYMPTOM_SYSTEM_PROMPT},
            {"role": "user", "content": user_prompt},
        ],
        temperature=0.2,  # 分诊场景比报告解读更低，需要高度一致性
        response_format={"type": "json_object"},
    )

    content = response.choices[0].message.content
    return json.loads(content)


# 追问问题模板 — 每轮只问1-2个紧密相关的问题，保持对话自然
QUESTION_TEMPLATES = {
    "age_gender": {
        "question": "请问您的年龄和性别？",
        "placeholder": "例如：28岁，男性",
    },
    "symptom_location": {
        "question": "具体是哪个部位不舒服？是什么样的感觉？",
        "placeholder": "例如：太阳穴位置，隐隐的胀痛",
    },
    "symptom_onset": {
        "question": "大概多严重？0-10分打分的话是几分？什么时候开始的？持续多久了？",
        "placeholder": "例如：大概4分，三天前开始的，持续性，下午更明显",
    },
    "symptom_context": {
        "question": "有什么可能的诱因吗？什么情况会加重或缓解？还有没有其他伴随的症状？",
        "placeholder": "例如：最近熬夜比较多，休息会好一些，没有其他不舒服",
    },
    "history_medical": {
        "question": "您有慢性病吗（高血压/糖尿病等）？做过手术吗？在吃什么药吗？有没有药物过敏？",
        "placeholder": "例如：没有慢性病，没做过手术，不吃药，青霉素过敏",
    },
    "history_lifestyle": {
        "question": "平时有抽烟或喝酒的习惯吗？",
        "placeholder": "例如：不抽烟，偶尔喝酒",
    },
    "family_history": {
        "question": "直系亲属（父母、兄弟姐妹）有没有相关疾病史？",
        "placeholder": "例如：我妈有偏头痛，其他没有",
    },
}


def get_next_question(step: str) -> dict:
    """获取当前步骤的追问问题"""
    template = QUESTION_TEMPLATES.get(step)
    if not template:
        return {"question": "", "placeholder": "", "step": "", "is_emergency": False}
    return {**template, "step": step, "is_emergency": False}


# --- AI动态对话引擎 ---

TAILORED_QUESTIONS_PROMPT = """你是分诊对话设计助手。根据用户主诉，为7个步骤各设计一个问题。

## 规则
1. 每步一个问题，贴合主诉（如胃痛→问大便/黑便；头痛→问视力/畏光）
2. 问题和placeholder要具体、自然

## 输出JSON
{"questions":[{"step":"age_gender","question":"请问您的年龄和性别？","placeholder":"例如：28岁，男性"},{"step":"symptom_location","question":"...","placeholder":"..."},{"step":"symptom_onset","question":"...","placeholder":"..."},{"step":"symptom_context","question":"...","placeholder":"..."},{"step":"history_medical","question":"...","placeholder":"..."},{"step":"history_lifestyle","question":"...","placeholder":"..."},{"step":"family_history","question":"...","placeholder":"..."}]}"""


def generate_tailored_questions(chief_complaint: str) -> dict:
    """根据主诉一次性生成7个定制问题"""
    client, model = get_client()
    response = client.chat.completions.create(
        model=model,
        messages=[
            {"role": "system", "content": TAILORED_QUESTIONS_PROMPT},
            {"role": "user", "content": f"主诉：{chief_complaint}。请生成7个定制问题。"},
        ],
        temperature=0.5,
        response_format={"type": "json_object"},
        max_tokens=800,
    )
    return json.loads(response.choices[0].message.content)
