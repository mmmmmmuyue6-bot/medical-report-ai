"""
Memory Service — Mem0-inspired 会话持久记忆系统

面试要点：
- 为什么医疗AI需要记忆？（复诊场景、长期健康追踪、避免重复输入）
- 双层记忆：会话短期记忆 + 用户长期画像
- MVP用JSON文件存储（与知识库JSON策略一致），未来可升级Mem0/向量库

架构位置：所有对话模块的记忆层
"""
import json
import time
import uuid
from pathlib import Path
from typing import Optional
from datetime import datetime, timedelta

MEMORY_DIR = Path(__file__).parent.parent.parent / "memory_store"
MEMORY_DIR.mkdir(parents=True, exist_ok=True)


class MemoryService:
    """
    双层记忆系统

    Layer 1 — Session Memory (会话记忆):
    - 存储单次对话的所有消息
    - 时效：7天自动过期
    - 用途：刷新不丢失、断点续聊

    Layer 2 — User Profile (用户画像):
    - 跨会话聚合用户信息
    - 用途：复诊时减少重复输入
    """

    def __init__(self):
        self.session_dir = MEMORY_DIR / "sessions"
        self.profile_dir = MEMORY_DIR / "profiles"
        self.session_dir.mkdir(exist_ok=True)
        self.profile_dir.mkdir(exist_ok=True)

    # ── Session Memory ──

    def create_session(self, module: str, metadata: dict | None = None) -> str:
        """创建新会话，返回session_id"""
        session_id = uuid.uuid4().hex[:12]
        session = {
            "session_id": session_id,
            "module": module,
            "created_at": time.time(),
            "updated_at": time.time(),
            "expires_at": (datetime.now() + timedelta(days=7)).timestamp(),
            "messages": [],
            "collected_info": {},
            "metadata": metadata or {},
        }
        self._write_session(session_id, session)
        return session_id

    def save_message(self, session_id: str, role: str, content: str, step: str = ""):
        """保存一条消息到会话"""
        session = self.load_session(session_id)
        if not session:
            return

        session["messages"].append({
            "role": role,
            "content": content,
            "step": step,
            "timestamp": time.time(),
        })
        session["updated_at"] = time.time()
        self._write_session(session_id, session)

    def save_collected_info(self, session_id: str, info: dict):
        """保存已收集的用户信息（跨步骤持久化）"""
        session = self.load_session(session_id)
        if not session:
            return
        session["collected_info"].update(info)
        session["updated_at"] = time.time()
        self._write_session(session_id, session)

    def load_session(self, session_id: str) -> dict | None:
        """加载会话"""
        path = self.session_dir / f"{session_id}.json"
        if not path.exists():
            return None

        session = json.loads(path.read_text(encoding="utf-8"))

        # 检查过期
        if time.time() > session.get("expires_at", 0):
            path.unlink(missing_ok=True)
            return None

        return session

    def get_session_messages(self, session_id: str) -> list[dict]:
        """获取会话的所有消息"""
        session = self.load_session(session_id)
        return session["messages"] if session else []

    def get_session_context(self, session_id: str) -> str:
        """获取会话上下文摘要（注入LLM prompt用）"""
        session = self.load_session(session_id)
        if not session:
            return ""

        parts = []
        if session.get("collected_info"):
            parts.append("已收集信息：")
            for k, v in session["collected_info"].items():
                parts.append(f"  - {k}: {v}")

        if session.get("messages"):
            parts.append("\n对话历史：")
            for msg in session["messages"][-20:]:  # 最近20条
                role_label = "用户" if msg["role"] == "user" else "AI"
                parts.append(f"  [{role_label}] {msg['content'][:200]}")

        return "\n".join(parts)

    def delete_session(self, session_id: str):
        """删除会话"""
        path = self.session_dir / f"{session_id}.json"
        path.unlink(missing_ok=True)

    def cleanup_expired(self) -> int:
        """清理过期会话，返回清理数量"""
        cleaned = 0
        for path in self.session_dir.glob("*.json"):
            try:
                session = json.loads(path.read_text(encoding="utf-8"))
                if time.time() > session.get("expires_at", 0):
                    path.unlink()
                    cleaned += 1
            except (json.JSONDecodeError, KeyError):
                path.unlink()
                cleaned += 1
        return cleaned

    # ── User Profile ──

    def get_or_create_profile(self, user_id: str) -> dict:
        """获取或创建用户画像"""
        path = self.profile_dir / f"{user_id}.json"
        if path.exists():
            return json.loads(path.read_text(encoding="utf-8"))

        profile = {
            "user_id": user_id,
            "created_at": time.time(),
            "demographics": {},       # 人口学信息（年龄/性别等）
            "medical_history": [],     # 既往史摘要
            "symptom_history": [],     # 历史症状记录
            "session_ids": [],         # 关联的会话ID
            "preferences": {},         # 用户偏好
        }
        self._write_profile(user_id, profile)
        return profile

    def update_profile(self, user_id: str, updates: dict):
        """更新用户画像"""
        profile = self.get_or_create_profile(user_id)
        profile.update(updates)
        profile["updated_at"] = time.time()
        self._write_profile(user_id, profile)

    def add_symptom_record(self, user_id: str, symptom: str, result: dict):
        """记录一次症状分诊历史"""
        profile = self.get_or_create_profile(user_id)
        profile.setdefault("symptom_history", []).append({
            "symptom": symptom,
            "departments": [d["name"] for d in result.get("departments", [])],
            "emergency_level": result.get("emergency_level", ""),
            "timestamp": time.time(),
        })
        profile["session_ids"].append(result.get("session_id", ""))
        profile["updated_at"] = time.time()
        self._write_profile(user_id, profile)

    def get_profile_summary(self, user_id: str) -> str:
        """获取用户画像摘要（注入LLM prompt用）"""
        profile = self.get_or_create_profile(user_id)
        parts = []

        demos = profile.get("demographics", {})
        if demos:
            parts.append(f"用户信息：{demos.get('age','?')}岁 {demos.get('gender','?')}")

        history = profile.get("medical_history", [])
        if history:
            parts.append(f"既往史：{'; '.join(history[:5])}")

        symptoms = profile.get("symptom_history", [])
        if symptoms:
            recent = symptoms[-3:]  # 最近3次
            parts.append(f"近期就诊记录：{len(symptoms)}次")
            for s in recent:
                parts.append(f"  - {s.get('symptom','')} → {', '.join(s.get('departments',[]))}")

        return "\n".join(parts)

    # ── Internal ──

    def _write_session(self, session_id: str, data: dict):
        path = self.session_dir / f"{session_id}.json"
        path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")

    def _write_profile(self, user_id: str, data: dict):
        path = self.profile_dir / f"{user_id}.json"
        path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")


# 全局单例
memory_service = MemoryService()
