"""
RAG服务 — 医学知识检索增强生成

面试要点：
- 为什么医疗AI需要RAG？（可溯源、可更新、防幻觉）
- 知识库如何维护？（临床指南更新→知识库更新→无需重新训练模型）
- Embedding选型考量？（中文医学文本的语义表达）
"""
import json
from pathlib import Path

KNOWLEDGE_BASE_PATH = Path(__file__).parent.parent.parent / "research" / "medical_knowledge.json"


class RAGService:
    """
    MVP阶段：基于关键词的医学知识检索
    未来升级：sentence-transformers + ChromaDB 向量检索
    """

    def __init__(self):
        self.knowledge = self._load_knowledge()

    def _load_knowledge(self) -> dict:
        if KNOWLEDGE_BASE_PATH.exists():
            return json.loads(KNOWLEDGE_BASE_PATH.read_text(encoding="utf-8"))
        return {}

    def search(self, indicator_name: str) -> str:
        """
        检索单个指标的医学知识

        参数:
            indicator_name: 指标名称，如 "丙氨酸氨基转移酶(ALT)"

        返回:
            格式化的医学知识文本
        """
        results = []

        # 1. 精确匹配
        for key, entry in self.knowledge.items():
            if indicator_name.lower() in key.lower() or key.lower() in indicator_name.lower():
                results.append(self._format_entry(key, entry))

        # 2. 模糊匹配（搜索别名）
        if not results:
            for key, entry in self.knowledge.items():
                aliases = entry.get("aliases", [])
                for alias in aliases:
                    if alias.lower() in indicator_name.lower() or indicator_name.lower() in alias.lower():
                        results.append(self._format_entry(key, entry))
                        break

        return "\n\n---\n\n".join(results) if results else ""

    def search_multi(self, indicator_names: list[str]) -> str:
        """批量检索多个指标"""
        contexts = []
        for name in indicator_names:
            ctx = self.search(name)
            if ctx:
                contexts.append(ctx)
        return "\n\n===\n\n".join(contexts)

    def _format_entry(self, name: str, entry: dict) -> str:
        parts = [f"## {name}"]
        if "full_name" in entry:
            parts.append(f"全称：{entry['full_name']}")
        if "description" in entry:
            parts.append(f"说明：{entry['description']}")
        if "reference_range" in entry:
            parts.append(f"参考范围：{entry['reference_range']}")
        if "clinical_significance" in entry:
            parts.append("临床意义：")
            for item in entry["clinical_significance"]:
                parts.append(f"  - {item}")
        if "related_indicators" in entry:
            parts.append(f"关联指标：{', '.join(entry['related_indicators'])}")
        if "drug_interference" in entry:
            parts.append(f"药物干扰：{entry['drug_interference']}")
        if "age_gender_variation" in entry:
            parts.append(f"年龄/性别差异：{entry['age_gender_variation']}")
        return "\n".join(parts)


# 全局单例
rag_service = RAGService()
