"""
Agent Swarm — 多Agent并行协作编排

面试要点：
- 为什么多Agent？（关注点分离：KB检索和LLM分析是不同的能力）
- 为什么并行？（用户体验：用户不等，KB和AI同时跑）
- KB Agent + LLM Agent 各司其职，结果合并时强制来源标注

架构：
  用户查询
    ├── KB Agent (知识检索) ──→ KB结果 + [知识库]标签
    ├── LLM Agent (分析解释) ──→ AI结果 + [AI分析]标签
    └── Merge Agent (结果合并) ──→ 最终输出 + 来源标注
"""
import json
import time
import concurrent.futures
from pathlib import Path
from typing import Callable

from openai import OpenAI
from .config import get_llm_config
from .harness import HarnessEngine, get_label, get_disclaimer


# ═══════════════════════════════════════════════════════════════════
# KB Agent — 知识检索专家
# ═══════════════════════════════════════════════════════════════════

class KBAgent:
    """
    KB Agent — 专门负责知识库检索
    单一职责：从JSON知识库中找到最匹配的数据
    """

    def __init__(self):
        self._kb_cache: dict[str, dict] = {}
        self.label = get_label("kb")

    def load(self, kb_name: str) -> dict:
        """加载知识库（带缓存）"""
        if kb_name not in self._kb_cache:
            path = Path(__file__).parent.parent.parent / "research" / kb_name
            if path.exists():
                self._kb_cache[kb_name] = json.loads(path.read_text(encoding="utf-8"))
            else:
                self._kb_cache[kb_name] = {}
        return self._kb_cache[kb_name]

    def search(self, query: str, kb_names: list[str], top_k: int = 5) -> dict:
        """
        在多知识库中搜索

        返回:
        {
            "results": [{"source": "kb_name", "key": "...", "data": {...}, "score": 0.0-1.0}],
            "total_found": int,
            "source_label": "[知识库]"
        }
        """
        all_results = []

        for kb_name in kb_names:
            kb = self.load(kb_name)
            results = self._search_in_kb(query, kb, kb_name)
            all_results.extend(results)

        # 按相关度排序
        all_results.sort(key=lambda x: x.get("score", 0), reverse=True)

        return {
            "results": all_results[:top_k],
            "total_found": len(all_results),
            "source_label": self.label,
        }

    def _search_in_kb(self, query: str, kb: dict, kb_name: str) -> list[dict]:
        """在单个知识库中搜索"""
        results = []
        q = query.strip().lower()

        # 遍历知识库条目
        items = kb.get("exams", {}) or kb.get("diseases", {}) or kb.get("symptoms", {}) or kb

        for key, entry in items.items():
            if not isinstance(entry, dict):
                continue

            score = self._match_score(q, key, entry)
            if score > 0:
                results.append({
                    "source": kb_name,
                    "key": key,
                    "data": entry,
                    "score": score,
                })

        return results

    def _match_score(self, query: str, key: str, entry: dict) -> float:
        """计算匹配分数"""
        score = 0.0
        key_lower = key.lower()

        # 精确包含
        if query in key_lower:
            score = 0.9
        elif key_lower in query:
            score = 0.8

        # 别名匹配
        aliases = entry.get("aliases", [])
        for alias in aliases:
            if query in alias.lower() or alias.lower() in query:
                score = max(score, 0.7)
                break

        # 字符重叠率
        if score == 0:
            hits = sum(1 for c in query if c in key_lower)
            overlap = hits / max(len(query), 1)
            if overlap >= 0.5:
                score = overlap * 0.6

        return score

    def get_exact(self, key: str, kb_names: list[str]) -> dict | None:
        """精确获取某条知识库数据"""
        for kb_name in kb_names:
            kb = self.load(kb_name)
            items = kb.get("exams", {}) or kb.get("diseases", {}) or kb.get("symptoms", {}) or kb
            for k, entry in items.items():
                if k == key:
                    return {"source": kb_name, "key": k, "data": entry}
                aliases = entry.get("aliases", []) if isinstance(entry, dict) else []
                if key in aliases:
                    return {"source": kb_name, "key": k, "data": entry}
        return None


# ═══════════════════════════════════════════════════════════════════
# LLM Agent — 分析解释专家
# ═══════════════════════════════════════════════════════════════════

class LLMAgent:
    """
    LLM Agent — 专门负责AI分析和自然语言解释
    单一职责：基于知识库上下文，生成通俗易懂的分析
    """

    def __init__(self):
        cfg = get_llm_config()
        self.client = OpenAI(api_key=cfg.api_key, base_url=cfg.base_url or None)
        self.model = cfg.model

    def analyze(
        self,
        system_prompt: str,
        user_prompt: str,
        temperature: float = 0.3,
        max_tokens: int = 2000,
        json_mode: bool = True,
    ) -> dict:
        """
        执行LLM分析

        参数:
            system_prompt: 系统提示（定义角色+输出格式）
            user_prompt: 用户提示（包含知识库上下文+用户问题）
            temperature: 创意度控制
            json_mode: 是否强制JSON输出
        """
        kwargs = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            "temperature": temperature,
            "max_tokens": max_tokens,
        }

        if json_mode:
            kwargs["response_format"] = {"type": "json_object"}

        response = self.client.chat.completions.create(**kwargs)
        content = response.choices[0].message.content
        return json.loads(content)


# ═══════════════════════════════════════════════════════════════════
# Agent Swarm — 并行编排器
# ═══════════════════════════════════════════════════════════════════

class AgentSwarm:
    """
    Agent Swarm — 多Agent并行编排

    用法:
        swarm = AgentSwarm("insurance_query")
        result = swarm.execute(
            query="高血压",
            kb_search_params={"kb_names": ["disease_treatment.json", "insurance_rules.json"]},
            llm_params={
                "system_prompt": INSURANCE_AI_PROMPT,
                "user_prompt_template": "请分析 {query}...\n{kb_context}",
            }
        )
    """

    def __init__(self, module: str):
        self.module = module
        self.kb_agent = KBAgent()
        self.llm_agent = LLMAgent()
        self.harness = HarnessEngine(module)

    def execute(
        self,
        query: str,
        kb_search_params: dict,
        llm_params: dict,
    ) -> dict:
        """
        并行执行 KB + LLM 两个Agent

        返回:
        {
            "kb_results": {...},    # KB Agent 结果
            "ai_results": {...},    # LLM Agent 结果
            "merged": {...},        # 合并结果
            "sources": [...],       # 来源追踪
            "elapsed_ms": int,      # 总耗时
        }
        """
        start = time.time()

        # ── Phase 1: 并行执行 KB Agent 和 LLM Agent ──
        kb_result = {}
        ai_result = {}

        with concurrent.futures.ThreadPoolExecutor(max_workers=2) as executor:
            # KB检索
            kb_future = executor.submit(
                self.kb_agent.search,
                query,
                kb_search_params.get("kb_names", []),
                kb_search_params.get("top_k", 5),
            )

            # LLM分析
            user_prompt = llm_params.get("user_prompt_template", "{query}").format(
                query=query,
                kb_context="KB检索中...",
            )

            llm_future = executor.submit(
                self.llm_agent.analyze,
                llm_params.get("system_prompt", ""),
                user_prompt,
                llm_params.get("temperature", 0.3),
                llm_params.get("max_tokens", 2000),
                llm_params.get("json_mode", True),
            )

            # 等待完成
            try:
                kb_result = kb_future.result(timeout=30)
            except Exception as e:
                kb_result = {"error": str(e), "results": [], "source_label": get_label("kb")}

            try:
                ai_result = llm_future.result(timeout=30)
            except Exception as e:
                ai_result = {"error": str(e), "disclaimer": get_disclaimer(self.module)}

        # ── Phase 2: 合并结果 ──
        merged = self._merge_results(query, kb_result, ai_result, kb_search_params)

        elapsed = round((time.time() - start) * 1000)

        # ── Phase 3: 安全校验 ──
        validated = self.harness.validate_output(merged)

        return {
            "kb_results": kb_result,
            "ai_results": ai_result,
            "merged": validated,
            "sources": self._trace_sources(kb_result, ai_result),
            "elapsed_ms": elapsed,
            "parallel": True,
        }

    def _merge_results(self, query: str, kb: dict, ai: dict, params: dict) -> dict:
        """合并KB和AI结果，标注来源"""
        merged = {}

        # 基础信息来自KB
        merged["kb_items"] = kb.get("results", [])

        # AI分析内容
        if isinstance(ai, dict) and "error" not in ai:
            for key in ["ai_summary", "ai_supplement_drugs", "ai_supplement_exams",
                        "ai_supplement_paths", "ai_hospitalization_note", "ai_insurance_note",
                        "cost_breakdown", "important_notes", "disclaimer"]:
                if key in ai:
                    merged[key] = ai[key]

        # 确保有disclaimer
        if "disclaimer" not in merged:
            merged["disclaimer"] = get_disclaimer(self.module)

        return merged

    def _trace_sources(self, kb: dict, ai: dict) -> list[dict]:
        """追踪信息来源"""
        sources = []

        kb_count = len(kb.get("results", []))
        if kb_count > 0:
            sources.append({
                "agent": "KB Agent",
                "type": "知识库检索",
                "count": kb_count,
                "label": get_label("kb"),
                "kb_files": list(set(r.get("source", "") for r in kb.get("results", []))),
            })

        if isinstance(ai, dict) and "error" not in ai:
            ai_keys = [k for k in ai if k.startswith("ai_") and ai[k]]
            if ai_keys:
                sources.append({
                    "agent": "LLM Agent",
                    "type": "AI分析补充",
                    "fields": ai_keys,
                    "label": get_label("ai_analysis"),
                })

        return sources

    def execute_kb_only(self, query: str, kb_names: list[str], top_k: int = 5) -> dict:
        """仅执行KB检索（不需要AI分析时）"""
        return self.kb_agent.search(query, kb_names, top_k)

    def execute_ai_only(
        self,
        system_prompt: str,
        user_prompt: str,
        temperature: float = 0.3,
        max_tokens: int = 2000,
    ) -> dict:
        """仅执行LLM分析（不需要KB检索时）"""
        return self.llm_agent.analyze(system_prompt, user_prompt, temperature, max_tokens)


# ═══════════════════════════════════════════════════════════════════
# 工厂函数
# ═══════════════════════════════════════════════════════════════════

# 模块→KB文件映射
MODULE_KB_MAP = {
    "symptom_triage": ["symptom_department.json", "departments.json"],
    "exam_explanation": ["exam_knowledge.json", "disease_treatment.json"],
    "report_interpretation": ["medical_knowledge.json"],
    "insurance_query": ["disease_treatment.json", "insurance_rules.json", "exam_knowledge.json"],
}


def create_swarm(module: str) -> AgentSwarm:
    """创建针对特定模块的Agent Swarm"""
    return AgentSwarm(module)


def get_module_kb_names(module: str) -> list[str]:
    """获取模块对应的知识库文件名"""
    return MODULE_KB_MAP.get(module, [])
