"""
LLM服务 — 体检报告解读的核心AI调用
这是产品层面最重要的文件：Prompt设计 = 产品体验设计

面试要点：
- 为什么用结构化Prompt而非自由对话？
- 为什么要求JSON输出？
- 为什么要在Prompt中约束「不能做什么」？
"""
import json
from openai import OpenAI
from .config import get_llm_config


def get_client():
    cfg = get_llm_config()
    return OpenAI(
        api_key=cfg.api_key,
        base_url=cfg.base_url or None,
    ), cfg.model


SYSTEM_PROMPT = """你是一位经验丰富的临床医学解读助手。你的任务是将体检报告中的医学指标翻译成普通人能理解的通俗解释。

## 你的能力边界（重要）
✅ 你可以做：
- 解释指标的生理意义和临床意义
- 根据参考范围判断正常/异常，并评级严重度
- 根据多个指标交叉分析，给出综合评估
- 建议就医科室和进一步检查方向
- 提供科学的生活方式调整建议

❌ 你不能做：
- 给出确定性诊断（这是医生的职责）
- 推荐具体药物或治疗方案
- 制造不必要的恐慌
- 忽视需要紧急就医的警示信号

## 严重度分层标准
- 🟢 正常：在参考范围内
- 🟡 临界：略超出范围，临床意义有限，建议观察
- 🟠 关注：明显异常，建议近期就医
- 🔴 紧急：可能提示严重疾病，建议尽快就医

## 输出格式要求
必须返回严格的JSON格式，不要有任何额外文字：

{
  "summary": "一句话总体评估（40字以内）",
  "overall_risk": "low" | "moderate" | "high" | "urgent",
  "indicators": [
    {
      "name": "指标中文名",
      "value": "检测值",
      "unit": "单位",
      "reference": "参考范围",
      "status": "normal" | "high" | "low" | "critical_high" | "critical_low",
      "severity": "green" | "yellow" | "orange" | "red",
      "layman_explanation": "用通俗比喻解释这个指标的含义（就像讲给非医学朋友听）",
      "possible_causes": ["可能原因1", "可能原因2"],
      "clinical_context": "如果有多个相关指标异常，说明它们之间的关联"
    }
  ],
  "cross_analysis": "多指标交叉分析（如多个肝功能指标同时异常说明什么）",
  "department_suggestion": {
    "department": "建议就诊科室",
    "urgency": "routine" | "soon" | "immediate",
    "suggested_tests": ["建议进一步检查1", "建议进一步检查2"]
  },
  "lifestyle_advice": ["建议1", "建议2"],
  "disclaimer": "本解读由AI生成，仅供参考，不构成医疗诊断建议。如有不适请及时就医。"
}
"""

USER_PROMPT_TEMPLATE = """请分析以下体检报告数据：

## 用户信息
- 年龄：{age}
- 性别：{gender}

## 检测指标
{indicators_json}

## 检索到的参考知识
{rag_context}

请严格按照JSON格式输出分析结果。"""


def generate_report_interpretation(
    indicators: list[dict],
    age: int | None = None,
    gender: str | None = None,
    rag_context: str = "",
) -> dict:
    """
    调用LLM生成体检报告解读

    参数:
        indicators: [{name, value, unit, reference_range}, ...]
        age: 用户年龄（影响正常值判断）
        gender: 用户性别（影响正常值判断）
        rag_context: RAG检索的参考医学知识

    返回:
        JSON格式的解读报告
    """
    client, model = get_client()

    user_prompt = USER_PROMPT_TEMPLATE.format(
        age=age or "未知",
        gender=gender or "未知",
        indicators_json=json.dumps(indicators, ensure_ascii=False, indent=2),
        rag_context=rag_context or "无额外参考资料",
    )

    response = client.chat.completions.create(
        model=model,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_prompt},
        ],
        temperature=0.3,  # 医疗场景需要低温度，保证一致性
        response_format={"type": "json_object"},  # 强制JSON输出
    )

    content = response.choices[0].message.content
    return json.loads(content)
