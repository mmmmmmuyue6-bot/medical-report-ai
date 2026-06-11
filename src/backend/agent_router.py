"""
Agent Router — Skills-Agent 两层架构

面试要点：
- Layer 1: Router Agent — 意图识别 + 技能路由
- Layer 2: Skills — 每个模块是独立Skill，含KB+Prompt+约束
- 为什么两层？（关注点分离：路由不关心技能细节，技能不关心路由逻辑）

架构图：
  用户输入 → Router Agent → 匹配Skill → Skill.execute()
                                    ├── KB Agent (知识检索)
                                    ├── LLM Agent (分析解释)
                                    └── Harness (安全约束)
"""
import json
from pathlib import Path
from typing import Protocol
from dataclasses import dataclass, field

from .harness import HarnessEngine, get_module_config, get_label, get_disclaimer
from .memory_service import memory_service


# ═══════════════════════════════════════════════════════════════════
# Skill Interface
# ═══════════════════════════════════════════════════════════════════

@dataclass
class SkillConfig:
    """Skill配置 — 定义每个技能的能力边界和约束"""
    name: str
    display_name: str
    module: str  # harness模块名
    description: str
    kb_paths: list[str] = field(default_factory=list)
    input_schema: dict = field(default_factory=dict)
    output_schema: dict = field(default_factory=dict)
    safety_rules: list[str] = field(default_factory=list)


class Skill:
    """
    Skill基类 — 每个就医流程模块是一个Skill
    职责：
    1. 管理本Skill的知识库
    2. 定义本Skill的Prompt
    3. 执行本Skill的业务逻辑
    4. 通过Harness确保安全合规
    """

    def __init__(self, config: SkillConfig):
        self.config = config
        self.harness = HarnessEngine(config.module)

    @property
    def name(self) -> str:
        return self.config.name

    @property
    def temperature(self) -> float:
        return get_module_config(self.config.module)["temperature"]

    def load_kb(self, kb_name: str) -> dict:
        """加载知识库JSON文件"""
        path = Path(__file__).parent.parent.parent / "research" / kb_name
        if path.exists():
            return json.loads(path.read_text(encoding="utf-8"))
        return {}

    def execute(self, input_data: dict, session_id: str | None = None) -> dict:
        """执行Skill — 子类实现具体逻辑"""
        raise NotImplementedError

    def get_label(self, key: str) -> str:
        return get_label(key)

    def get_disclaimer(self) -> str:
        return get_disclaimer(self.config.module)


# ═══════════════════════════════════════════════════════════════════
# Router Agent
# ═══════════════════════════════════════════════════════════════════

# 意图→Skill路由表
ROUTING_TABLE = {
    "symptom_triage": {
        "keywords": ["症状", "不舒服", "疼", "痛", "头晕", "发烧", "咳嗽", "胸闷", "挂号", "分诊", "科室"],
        "skill": "symptom",
        "description": "智能症状分诊 — 根据症状推荐科室",
    },
    "exam_explain": {
        "keywords": ["检查", "B超", "CT", "核磁", "化验", "抽血", "胃镜", "X光", "体检项目"],
        "skill": "exam",
        "description": "检查项目解释 — 检查是什么/为什么做/多少钱",
    },
    "report_interpret": {
        "keywords": ["报告", "体检", "指标", "化验单", "偏高", "偏低", "异常", "解读"],
        "skill": "report",
        "description": "体检报告解读 — 指标含义+风险评估",
    },
    "insurance_query": {
        "keywords": ["医保", "报销", "自费", "甲类", "乙类", "药品", "费用", "价格"],
        "skill": "insurance",
        "description": "医保查询 — 药品/检查报销+疾病费用评估",
    },
}


class AgentRouter:
    """
    Router Agent — 意图识别 + 技能路由

    两层架构的第一层：
    1. 接收用户输入
    2. 识别意图（关键词匹配 + 置信度）
    3. 路由到对应Skill
    4. 合并多个Skill的结果（如果需要）
    """

    def __init__(self):
        self.skills: dict[str, Skill] = {}
        self.routing_table = ROUTING_TABLE

    def register_skill(self, skill: Skill):
        """注册Skill到路由器"""
        self.skills[skill.name] = skill

    def route(self, user_input: str, session_id: str | None = None) -> dict:
        """
        意图识别 + 路由

        返回:
        {
            "intent": "matched_intent",
            "skill": "matched_skill_name",
            "confidence": 0.0-1.0,
            "alternatives": [...],
        }
        """
        scores = {}
        for intent, config in self.routing_table.items():
            score = sum(1 for kw in config["keywords"] if kw in user_input)
            if score > 0:
                scores[intent] = {
                    "score": score,
                    "skill": config["skill"],
                    "description": config["description"],
                }

        if not scores:
            # 默认意图：通用症状分诊
            return {
                "intent": "symptom_triage",
                "skill": "symptom",
                "confidence": 0.3,
                "description": "未匹配到明确意图，默认症状分诊",
                "alternatives": [],
            }

        # 按匹配分数排序
        ranked = sorted(scores.items(), key=lambda x: x[1]["score"], reverse=True)
        best_intent, best_match = ranked[0]
        max_score = max(s["score"] for s in scores.values())

        return {
            "intent": best_intent,
            "skill": best_match["skill"],
            "confidence": min(best_match["score"] / max(len(self.routing_table[best_intent]["keywords"]), 1), 1.0),
            "description": best_match["description"],
            "alternatives": [
                {"intent": i, "skill": m["skill"], "description": m["description"]}
                for i, m in ranked[1:3]
            ],
        }

    def execute(self, skill_name: str, input_data: dict, session_id: str | None = None) -> dict:
        """执行指定Skill"""
        skill = self.skills.get(skill_name)
        if not skill:
            return {"success": False, "error": f"Skill '{skill_name}' not registered"}

        # 加载会话上下文
        session_context = ""
        if session_id:
            session_context = memory_service.get_session_context(session_id)

        if session_context:
            input_data["session_context"] = session_context

        return skill.execute(input_data, session_id)


# 全局路由器实例
agent_router = AgentRouter()


# ═══════════════════════════════════════════════════════════════════
# 预定义的四个Skill Configs（面试展示用）
# ═══════════════════════════════════════════════════════════════════

SKILL_CONFIGS = {
    "symptom": SkillConfig(
        name="symptom",
        display_name="智能症状分诊",
        module="symptom_triage",
        description="基于7步对话框架收集症状信息，AI分析后推荐就诊科室+紧急性判断",
        kb_paths=["symptom_department.json", "departments.json"],
        safety_rules=[
            "8种硬编码紧急关键词（<1ms响应）",
            "AI动态紧急度评估",
            "可能方向标注'AI分析，仅供参考'",
            "不给出确定性诊断",
            "Temperature=0.2",
        ],
    ),
    "exam": SkillConfig(
        name="exam",
        display_name="检查项目解释",
        module="exam_explanation",
        description="83项检查8分类，三入口（分类浏览/疾病查检查/搜索），KB+AI双层展示",
        kb_paths=["exam_knowledge.json", "disease_treatment.json"],
        safety_rules=[
            "KB数据标注[知识库]",
            "AI补充标注[AI解释]",
            "费用信息标注来源",
            "疼痛描述不恐吓用户",
        ],
    ),
    "report": SkillConfig(
        name="report",
        display_name="体检报告解读",
        module="report_interpretation",
        description="OCR识别+AI解读，异常指标四色分级，结果页追问接入DeepSeek",
        kb_paths=["medical_knowledge.json"],
        safety_rules=[
            "不给出确定性诊断",
            "异常指标分级（绿黄橙红）",
            "交叉分析标注临床不确定性",
            "Temperature=0.3",
        ],
    ),
    "insurance": SkillConfig(
        name="insurance",
        display_name="医保查询",
        module="insurance_query",
        description="药品/检查医保查询+疾病费用评估，KB+AI并行，来源强制标注",
        kb_paths=["disease_treatment.json", "insurance_rules.json", "exam_knowledge.json"],
        safety_rules=[
            "AI药品分类强制红色警告",
            "价格标注来源（集采参考/AI估算）",
            "不编造自付金额",
            "费用计算公式透明化",
        ],
    ),
}


def get_skill_configs() -> dict:
    """获取所有Skill配置（面试展示用）"""
    return {
        name: {
            "display_name": cfg.display_name,
            "module": cfg.module,
            "description": cfg.description,
            "kb_paths": cfg.kb_paths,
            "safety_rules": cfg.safety_rules,
        }
        for name, cfg in SKILL_CONFIGS.items()
    }
