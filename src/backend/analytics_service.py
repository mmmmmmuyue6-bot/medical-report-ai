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
    "page_home": "首页访问",
    "module_enter": "进入模块（symptom/exam/report/insurance）",
    "module_exit": "离开模块",
    "symptom_start": "症状分诊：开始输入症状",
    "symptom_complete": "症状分诊：完成7步获得科室推荐",
    "symptom_drop": "症状分诊：中途退出（记录当前步数）",
    "symptom_emergency": "症状分诊：触发紧急提醒",
    "exam_search": "检查搜索：输入查询",
    "exam_detail_view": "检查详情：查看某检查",
    "exam_ai_search": "检查AI搜索：点击AI搜索按钮",
    "report_upload": "报告上传",
    "report_ocr": "报告OCR识别",
    "report_result": "报告解读结果查看",
    "report_chat": "报告追问对话",
    "insurance_drug_search": "医保：药品查询",
    "insurance_disease_search": "医保：疾病费用查询",
    "insurance_disease_detail": "医保：查看疾病详情",
    "feedback_open": "打开反馈页面",
    "feedback_submit": "提交反馈",
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
    """生成 PM 分析看板"""
    feedbacks = get_all_feedback()
    events = _load_events()

    total_feedback = len(feedbacks)
    total_events = len(events)

    # 模块使用分布
    module_counts = {}
    for fb in feedbacks:
        m = fb.get("module", "unknown")
        module_counts[m] = module_counts.get(m, 0) + 1

    # 任务完成率
    task_status = {"completed": 0, "partial": 0, "dropped": 0}
    for fb in feedbacks:
        tc = fb.get("task_completed", "")
        if tc in task_status:
            task_status[tc] += 1

    completion_rate = round(task_status["completed"] / max(total_feedback, 1) * 100)

    # 对比 AI 的价值感知（★ 面试最核心数据）
    compare_ai = {}
    for fb in feedbacks:
        ca = fb.get("compare_ai", "unknown")
        compare_ai[ca] = compare_ai.get(ca, 0) + 1

    better_rate = round(compare_ai.get("better", 0) / max(total_feedback, 1) * 100)

    # 信任度（KB vs AI）
    trust_kb_high = sum(1 for fb in feedbacks if fb.get("trust_kb") == "high")
    trust_ai_high = sum(1 for fb in feedbacks if fb.get("trust_ai") == "high")

    # NPS 替代
    recommend = {}
    for fb in feedbacks:
        r = fb.get("recommend", "unknown")
        recommend[r] = recommend.get(r, 0) + 1
    promoter_rate = round((recommend.get("yes_active", 0) + recommend.get("yes_asked", 0)) / max(total_feedback, 1) * 100)

    # 真实行为转化
    real_outcome = {}
    for fb in feedbacks:
        ro = fb.get("real_outcome", "unknown")
        real_outcome[ro] = real_outcome.get(ro, 0) + 1

    # 功能需求排名
    feature_votes = {}
    for fb in feedbacks:
        mf = fb.get("missing_feature", "")
        if mf:
            feature_votes[mf] = feature_votes.get(mf, 0) + 1
    top_features = sorted(feature_votes.items(), key=lambda x: x[1], reverse=True)[:5]

    # 行为漏斗
    symptom_starts = sum(1 for e in events if e["event"] == "symptom_start")
    symptom_completes = sum(1 for e in events if e["event"] == "symptom_complete")
    symptom_funnel = round(symptom_completes / max(symptom_starts, 1) * 100)

    return {
        "overview": {
            "total_feedback": total_feedback,
            "total_events": total_events,
            "last_updated": time.time(),
        },
        "core_metrics": {
            "task_completion_rate_pct": completion_rate,
            "vs_ai_better_rate_pct": better_rate,
            "promoter_rate_pct": promoter_rate,
            "symptom_funnel_rate_pct": symptom_funnel,
            "trust_kb_high_pct": round(trust_kb_high / max(total_feedback, 1) * 100),
            "trust_ai_high_pct": round(trust_ai_high / max(total_feedback, 1) * 100),
        },
        "breakdowns": {
            "module_usage": module_counts,
            "task_completion": task_status,
            "compare_to_ai": compare_ai,
            "recommend": recommend,
            "real_outcome": real_outcome,
        },
        "feature_requests": [{"feature": f, "votes": v} for f, v in top_features],
        "interview_talking_points": _generate_talking_points(better_rate, completion_rate, promoter_rate, top_features),
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


def _generate_talking_points(better_rate, completion_rate, promoter_rate, top_features):
    """生成面试时可以直接说的数据叙事"""
    points = []
    if better_rate >= 50:
        points.append(f'{better_rate}% 的用户认为比直接问 AI 更好——验证了 KB+来源标注+结构化追问的差异化价值')
    elif better_rate > 0:
        points.append(f'仅 {better_rate}% 认为产品优于直接问 AI——核心价值主张未被用户感知，需要加强首次体验')
    if completion_rate >= 60:
        points.append(f'任务完成率 {completion_rate}% 达标，说明核心流程可用')
    else:
        points.append(f'任务完成率仅 {completion_rate}%，需要排查用户在哪个环节流失')
    if promoter_rate >= 50:
        points.append(f'{promoter_rate}% 愿意推荐，有口碑传播潜力')
    if top_features:
        points.append(f'用户最需要的功能是「{top_features[0][0]}」（{top_features[0][1]} 票），这是下一个迭代的优先级')
    return points
