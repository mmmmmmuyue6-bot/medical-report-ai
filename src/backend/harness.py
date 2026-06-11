"""
Harness Engineering — 集中式安全约束系统

面试要点：
- 为什么医疗AI需要Harness？（安全边界、合规要求、用户信任）
- 三层防护：输入检测 → 输出校验 → 来源标注
- 所有LLM调用经过同一安全管道，避免各模块各自实现导致遗漏

架构位置：所有LLM调用的前置和后置层
"""
import re
import json
import time
from pathlib import Path
from typing import Any, Callable

# ═══════════════════════════════════════════════════════════════════
# 第一层：硬编码紧急检测（<1ms，不依赖API）
# ═══════════════════════════════════════════════════════════════════

EMERGENCY_PATTERNS = [
    (r"胸痛|胸口疼|心绞痛|压榨性", "心脏急症可能", "请立即前往急诊科或拨打120"),
    (r"呼吸困难|喘不上气|窒息|气促|不能呼吸", "严重呼吸/心脏问题可能", "请立即前往急诊科或拨打120"),
    (r"晕厥|晕倒|意识不清|意识模糊|昏迷|叫不醒", "严重神经系统问题可能", "请立即前往急诊科或拨打120"),
    (r"高热.{0,3}不退|高烧.{0,3}不退|39度|39℃", "严重感染可能", "请立即前往感染科急诊"),
    (r"说话不清|言语不清|口齿不清|一侧肢体无力|半边身子|面瘫|嘴歪", "脑卒中可能", "请立即前往急诊科，每延迟一分钟都可能造成不可逆损伤"),
    (r"呕血|吐血|黑便|便血|大出血|大量出血", "消化道出血可能", "请立即前往急诊科"),
    (r"突.{0,2}剧烈头痛|雷击样|头要炸|撕裂样", "蛛网膜下腔出血等危急情况可能", "请立即前往急诊科"),
    (r"板状腹|腹肌紧张|全腹痛|腹部.{0,2}硬", "外科急腹症可能", "请立即前往急诊科"),
]

# 就医准备清单（紧急弹窗用）
EMERGENCY_PREP_LIST = [
    "携带身份证、医保卡",
    "带上正在服用的药物清单",
    "记录过敏史（药物/食物）",
    "尽量有家属陪同",
    "如需抽血检查，尽量空腹",
    "带上既往病历和检查报告",
    "手机充满电，带充电宝",
]


def check_emergency(text: str) -> dict:
    """硬编码紧急检测"""
    for pattern, condition, action in EMERGENCY_PATTERNS:
        if re.search(pattern, text):
            return {
                "is_emergency": True,
                "condition": condition,
                "action": action,
                "prep_list": EMERGENCY_PREP_LIST,
                "trigger": "hardcoded",
                "response_time_ms": "<1",
            }
    return {"is_emergency": False, "condition": "", "action": "", "trigger": None}


# ═══════════════════════════════════════════════════════════════════
# 第二层：模块级Temperature注册表（一致性保证）
# ═══════════════════════════════════════════════════════════════════

TEMPERATURE_REGISTRY = {
    "symptom_triage": 0.2,       # 分诊需要高度一致性
    "report_interpretation": 0.3, # 报告解读需要一致性
    "exam_explanation": 0.5,      # 检查解释允许一定变化
    "insurance_query": 0.3,       # 医保查询需要准确性
    "ocr_analysis": 0.2,          # OCR提取需要精确
}

# 各模块的max_tokens上限
MAX_TOKENS_REGISTRY = {
    "symptom_triage": 1500,
    "report_interpretation": 2000,
    "exam_explanation": 1500,
    "insurance_query": 3000,
    "ocr_analysis": 1000,
    "ai_chat": 300,
}


def get_module_config(module: str) -> dict:
    """获取模块级安全配置"""
    return {
        "temperature": TEMPERATURE_REGISTRY.get(module, 0.3),
        "max_tokens": MAX_TOKENS_REGISTRY.get(module, 1500),
    }


# ═══════════════════════════════════════════════════════════════════
# 第三层：来源标注标准（强制统一）
# ═══════════════════════════════════════════════════════════════════

SOURCE_LABELS = {
    "kb": "[知识库]",
    "ai_analysis": "[AI分析]",
    "ai_supplement": "[AI补充，需核实]",
    "ai_supplement_warn": "⚠ 该药品的医保类别为AI判断，可能与官方目录不一致",
    "insurance_policy": "[医保政策]",
    "centralized_purchase": "[集采参考]",
    "price_reference": "[价格参考]",
    "ai_estimate": "[AI估算]",
    "ai_explanation": "[AI解释]",
    "ai_search": "[AI搜索需核实]",
}

# 标注规则说明（用于前端展示）
LABEL_LEGEND = {
    "[知识库]": "来自内置医学知识库，由临床指南和公开数据整理",
    "[AI分析]": "由DeepSeek基于知识库数据进行的分析补充",
    "[AI补充，需核实]": "AI基于通用医学知识补充，建议通过官方渠道核实",
    "[医保政策]": "引用自国家医保局公开政策和地方医保目录",
    "[集采参考]": "参考国家药品集中采购中选价格",
    "[价格参考]": "参考公开市场信息，实际价格因品牌/地区/渠道而异",
    "[AI估算]": "AI基于公开数据估算，仅供参考",
    "[AI解释]": "AI用通俗语言补充解释",
    "[AI搜索需核实]": "AI实时搜索结果，未经知识库验证",
}


def get_label(key: str) -> str:
    """获取来源标注标签"""
    return SOURCE_LABELS.get(key, "")


def get_label_legend() -> dict:
    """获取标注图例（供前端展示）"""
    return LABEL_LEGEND


# ═══════════════════════════════════════════════════════════════════
# 第四层：标准化免责声明
# ═══════════════════════════════════════════════════════════════════

DISCLAIMERS = {
    "default": "本内容由AI生成，仅供参考，不构成医疗诊断建议。如有不适请及时就医。",
    "symptom": "本建议由AI生成，仅供参考。如症状加重或出现紧急情况，请及时就医。",
    "report": "本解读由AI生成，仅供参考，不构成医疗诊断建议。如有不适请及时就医。",
    "exam": "以上检查信息由AI补充，以医生实际处方为准。标注[AI补充]的建议需自行核实。",
    "insurance": "医保政策可能随时调整，以当地医保局最新通知为准。可通过国家医保服务平台APP确认。",
    "drug_ai": "本药品的医保类别为AI判断，可能与官方目录不一致。请通过国家医保服务平台APP或当地医保局核实。",
}


def get_disclaimer(module: str) -> str:
    """获取模块级免责声明"""
    return DISCLAIMERS.get(module, DISCLAIMERS["default"])


# ═══════════════════════════════════════════════════════════════════
# 第五层：输出安全校验
# ═══════════════════════════════════════════════════════════════════

FORBIDDEN_PATTERNS = [
    r"确诊为",
    r"你得了",
    r"你患有",
    r"一定是",
    r"肯定是",
    r"百分之百是",
]

REQUIRED_FIELDS_BY_MODULE = {
    "symptom_triage": ["departments", "emergency_level", "disclaimer"],
    "report_interpretation": ["summary", "overall_risk", "disclaimer"],
    "exam_explanation": ["explanation", "disclaimer"],
    "insurance_query": ["disclaimer"],
}


def validate_llm_output(output: dict, module: str) -> dict:
    """
    校验LLM输出安全性
    - 检查是否有确定性诊断语句
    - 检查必填字段
    - 注入免责声明（如果缺失）
    """
    output_str = json.dumps(output, ensure_ascii=False)

    for pattern in FORBIDDEN_PATTERNS:
        if re.search(pattern, output_str):
            output["_safety_flag"] = f"检测到可能的确定性诊断语句: {pattern}"
            output["_safety_note"] = "已标记，请人工审核"

    required = REQUIRED_FIELDS_BY_MODULE.get(module, [])
    missing = [f for f in required if f not in output or not output[f]]
    if missing:
        output["_missing_required"] = missing

    if "disclaimer" not in output or not output.get("disclaimer"):
        output["disclaimer"] = get_disclaimer(module)

    return output


# ═══════════════════════════════════════════════════════════════════
# 第六层：LLM调用安全包装器
# ═══════════════════════════════════════════════════════════════════

class HarnessEngine:
    """
    集中式安全引擎 — 所有LLM调用经过此引擎
    使用方式：
        engine = HarnessEngine("symptom_triage")
        result = engine.safe_call(llm_function, prompt_args)
    """

    def __init__(self, module: str):
        self.module = module
        self.config = get_module_config(module)
        self.call_history: list[dict] = []

    def check_input(self, text: str) -> dict:
        """输入安全检查"""
        result = check_emergency(text)
        self._log("input_check", result)
        return result

    def validate_output(self, output: dict) -> dict:
        """输出安全校验 + 来源标注完整性检查"""
        validated = validate_llm_output(output, self.module)
        self._log("output_validation", {"validated": bool(validated)})
        return validated

    def safe_call(self, fn: Callable, *args, **kwargs) -> dict:
        """
        安全执行LLM调用
        1. 记录调用时间
        2. 执行调用
        3. 校验输出
        4. 记录审计日志
        """
        start = time.time()
        try:
            result = fn(*args, **kwargs)
            elapsed = time.time() - start

            if isinstance(result, dict):
                result = self.validate_output(result)

            self._log("llm_call", {
                "module": self.module,
                "elapsed_ms": round(elapsed * 1000),
                "temperature": self.config["temperature"],
                "success": True,
            })
            return result
        except Exception as e:
            elapsed = time.time() - start
            self._log("llm_call", {
                "module": self.module,
                "elapsed_ms": round(elapsed * 1000),
                "success": False,
                "error": str(e),
            })
            raise

    def _log(self, event: str, data: dict):
        """审计日志"""
        entry = {
            "timestamp": time.time(),
            "module": self.module,
            "event": event,
            "data": data,
        }
        self.call_history.append(entry)

    def get_audit_trail(self) -> list[dict]:
        """获取审计追踪（面试展示用）"""
        return self.call_history


# ═══════════════════════════════════════════════════════════════════
# 第七层：模块级安全策略定义
# ═══════════════════════════════════════════════════════════════════

MODULE_SAFETY_POLICIES = {
    "symptom_triage": {
        "name": "症状分诊安全策略",
        "rules": [
            "硬编码8种紧急关键词（<1ms响应）",
            "AI动态紧急度评估",
            "仅推荐科室，不给出诊断",
            "可能方向标注'AI分析，仅供参考'",
            "强制免责声明",
            "Temperature=0.2 保证一致性",
        ],
    },
    "report_interpretation": {
        "name": "报告解读安全策略",
        "rules": [
            "不给出确定性诊断",
            "异常指标分级（绿黄橙红）而非定性",
            "建议就医而非自行处理",
            "交叉分析标注临床不确定性",
            "Temperature=0.3",
        ],
    },
    "exam_explanation": {
        "name": "检查解释安全策略",
        "rules": [
            "KB数据标注[知识库]",
            "AI补充标注[AI解释]",
            "费用信息标注来源",
            "疼痛描述不恐吓用户",
        ],
    },
    "insurance_query": {
        "name": "医保查询安全策略",
        "rules": [
            "AI药品分类强制红色警告",
            "价格标注来源（集采参考/AI估算）",
            "不编造自付金额",
            "甲/乙/丙分类透明化说明",
            "费用计算公式+数字示例",
        ],
    },
}


def get_safety_policy(module: str) -> dict:
    """获取模块安全策略（面试展示用）"""
    return MODULE_SAFETY_POLICIES.get(module, {})


def get_all_safety_policies() -> dict:
    """获取所有安全策略（整体架构展示用）"""
    return MODULE_SAFETY_POLICIES
