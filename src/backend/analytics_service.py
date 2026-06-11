"""
Analytics Service — AI PM 级产品分析

追踪两类数据：
1. 行为数据：用户在每个模块做了什么（自动埋点）
2. 感知数据：用户填写的反馈问卷

面试展示：/api/analytics/dashboard
"""
import json
import time
from pathlib import Path

DATA_DIR = Path(__file__).parent.parent.parent / "analytics_data"
DATA_DIR.mkdir(exist_ok=True)

# ═══════════════════════════════════════════════
# 行为事件追踪
# ═══════════════════════════════════════════════

def track_event(event_type: str, data: dict):
    """记录一个用户行为事件"""
    entry = {
        "timestamp": time.time(),
        "event": event_type,
        "data": data,
    }
    path = DATA_DIR / "events.jsonl"
    with open(path, "a", encoding="utf-8") as f:
        f.write(json.dumps(entry, ensure_ascii=False) + "\n")


# 预定义事件类型（面试时能准确说出追踪了什么）
TRACKED_EVENTS = {
    "kb_hit": "KB命中：LLM回答中使用了知识库数据",
    "task_start": "开始核心任务（症状分诊/检查搜索/报告上传/医保查询）",
    "task_complete": "完成核心任务",
    "task_drop": "中途退出（含退出时的步骤或状态）",
    "symptom_emergency": "症状分诊：触发紧急提醒",
    "feedback_quick": "轻量触达条 👍/👎 点击",
    "feedback_open": "打开完整反馈页面",
    "feedback_submit": "提交完整反馈表单",
}

# ═══════════════════════════════════════════════
# 反馈数据存储
# ═══════════════════════════════════════════════

def save_feedback(form: dict):
    """保存用户反馈"""
    entry = {
        "timestamp": time.time(),
        **form,
    }
    path = DATA_DIR / "feedback.jsonl"
    with open(path, "a", encoding="utf-8") as f:
        f.write(json.dumps(entry, ensure_ascii=False) + "\n")


def get_all_feedback() -> list[dict]:
    """获取所有反馈"""
    path = DATA_DIR / "feedback.jsonl"
    if not path.exists():
        return []
    entries = []
    with open(path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line:
                entries.append(json.loads(line))
    return list(reversed(entries))


# ═══════════════════════════════════════════════
# PM 看板：面试核心数据
# ═══════════════════════════════════════════════

def get_dashboard() -> dict:
    """生成 PM 分析看板（面试展示）"""
    feedbacks = get_all_feedback()
    events = _load_events()
    total = max(len(feedbacks), 1)

    # ── 核心指标 ──
    # 有用率
    useful_yes = sum(1 for fb in feedbacks if fb.get("useful") == "yes")
    useful_rate = round(useful_yes / total * 100)

    # vs AI 对比 ★ 最核心
    compare = {}
    for fb in feedbacks:
        ca = fb.get("compare_ai", "unknown")
        compare[ca] = compare.get(ca, 0) + 1
    better_rate = round(compare.get("better", 0) / total * 100)

    # 模块分布
    module_counts = {}
    for fb in feedbacks:
        m = fb.get("module", "unknown")
        module_counts[m] = module_counts.get(m, 0) + 1

    # 身体状态分布（控制变量）
    body_states = {}
    for fb in feedbacks:
        bs = fb.get("body_state", "unknown")
        body_states[bs] = body_states.get(bs, 0) + 1

    # 模块特定指标
    # 症状分诊：科室准确率
    accuracy_right = sum(1 for fb in feedbacks if fb.get("accuracy") == "right")
    accuracy_total = sum(1 for fb in feedbacks if fb.get("accuracy") in ("right", "wrong"))
    accuracy_rate = round(accuracy_right / max(accuracy_total, 1) * 100)

    # 检查解释：理解度
    understand_yes = sum(1 for fb in feedbacks if fb.get("understand") == "yes")
    exam_total = sum(1 for fb in feedbacks if fb.get("module") == "exam")
    understand_rate = round(understand_yes / max(exam_total, 1) * 100)

    # 检查解释：步骤说明有用度
    steps_helpful = sum(1 for fb in feedbacks if fb.get("exam_steps_helpful") in ("very", "somewhat"))

    # 回访意愿
    want_followup = sum(1 for fb in feedbacks if fb.get("want_followup"))

    # 行为漏斗
    task_starts = sum(1 for e in events if e["event"] == "task_start")
    task_completes = sum(1 for e in events if e["event"] == "task_complete")
    task_drops = sum(1 for e in events if e["event"] == "task_drop")
    funnel_rate = round(task_completes / max(task_starts, 1) * 100)

    # kb_hit 统计
    kb_hits = sum(1 for e in events if e["event"] == "kb_hit")

    return {
        "overview": {
            "total_feedback": len(feedbacks),
            "total_events": len(events),
            "kb_hits": kb_hits,
            "last_updated": time.time(),
        },
        "core_metrics": {
            "useful_rate_pct": useful_rate,
            "vs_ai_better_rate_pct": better_rate,
            "task_funnel_rate_pct": funnel_rate,
            "accuracy_self_reported_pct": accuracy_rate,
            "exam_understand_rate_pct": understand_rate,
            "exam_steps_helpful_count": steps_helpful,
            "want_followup_count": want_followup,
        },
        "breakdowns": {
            "module_usage": module_counts,
            "compare_to_ai": compare,
            "body_state": body_states,
        },
        "interview_talking_points": _generate_talking_points(
            useful_rate, better_rate, accuracy_rate, understand_rate,
            steps_helpful, want_followup, module_counts
        ),
    }


def _load_events() -> list[dict]:
    path = DATA_DIR / "events.jsonl"
    if not path.exists():
        return []
    entries = []
    with open(path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line:
                entries.append(json.loads(line))
    return entries


def _generate_talking_points(useful_rate, better_rate, accuracy_rate, understand_rate, steps_helpful, want_followup, module_counts):
    """生成面试时可以直接说的数据叙事"""
    points = []
    if better_rate >= 50:
        points.append(f'{better_rate}% 的用户认为比直接问 AI 更好——验证了 KB+来源标注+结构化追问的差异化价值')
    elif better_rate > 0:
        points.append(f'仅 {better_rate}% 认为优于直接问 AI——核心价值主张未被用户感知')
    if useful_rate >= 60:
        points.append(f'{useful_rate}% 的用户觉得有用，证实了产品解决真实需求')
    if accuracy_rate >= 50:
        points.append(f'自报科室推荐准确率 {accuracy_rate}%（{accuracy_rate}% 去看了医生的用户确认科室推荐正确）')
    if understand_rate > 0:
        points.append(f'检查项目解释的理解率达 {understand_rate}%，其中 {steps_helpful} 人认为分步骤说明有帮助——验证了结构化拆解比泛泛解释更有价值')
    if want_followup > 0:
        points.append(f'{want_followup} 人愿意被回访——这是产品信任度的硬信号，且为延迟验证留下了数据通道')
    # Module usage insight
    if module_counts:
        top = max(module_counts, key=module_counts.get)
        points.append(f'使用最多的模块是「{top}」（{module_counts[top]} 人），这与就医流程入口假设一致')
    return points
