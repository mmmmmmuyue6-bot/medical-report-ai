"""
智能体检报告解读助手 — FastAPI 后端

启动方式: uvicorn src.backend.main:app --reload

架构: Skills-Agent 两层架构 + Agent Swarm 多Agent协作
- Layer 1: Router Agent (agent_router.py) — 意图识别 + 技能路由
- Layer 2: Four Skills — 症状分诊/检查解释/报告解读/医保查询
- Harness Engine (harness.py) — 集中式安全约束
- Memory Service (memory_service.py) — Mem0风格会话持久记忆
- Agent Swarm (agent_swarm.py) — KB Agent + LLM Agent 并行协作
"""
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import Optional
import json
from pathlib import Path

from .llm_service import generate_report_interpretation, get_client as get_llm_client
from .rag_service import rag_service
from .ocr_service import parse_text_input, get_mock_report, process_image_ocr
from .symptom_service import (
    check_emergency,
    analyze_symptoms,
    get_next_question,
    load_knowledge_base,
    load_departments,
    generate_tailored_questions,
)
from .exam_service import search_exams, get_exam_detail, get_categories, get_exams_by_category, explain_exam_with_ai, search_disease_exams, analyze_disease_exams_with_ai, ai_search_exam
from .insurance_service import (
    search_disease,
    get_disease_detail,
    list_disease_names,
    get_insurance_rules,
    search_exam_or_drug,
    analyze_disease_cost_with_ai,
    ai_search_drug,
)

# ── 新增：Harness / Memory / Agent Router / Agent Swarm ──
from .harness import (
    HarnessEngine,
    check_emergency as harness_check_emergency,
    get_module_config,
    get_label,
    get_disclaimer,
    get_label_legend,
    get_all_safety_policies,
    EMERGENCY_PREP_LIST,
)
from .memory_service import memory_service
from .agent_router import agent_router, get_skill_configs
from .agent_swarm import create_swarm, get_module_kb_names
from .analytics_service import track_event, save_feedback, get_all_feedback, get_dashboard

app = FastAPI(
    title="MedReport AI - 智能体检报告解读助手",
    description="上传体检报告，获取AI驱动的通俗解读和就医建议",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# --- 请求/响应模型 ---

class IndicatorInput(BaseModel):
    name: str
    value: float | str
    unit: str = ""
    reference_range: str = ""


class ReportRequest(BaseModel):
    indicators: list[IndicatorInput]
    age: int | None = None
    gender: str | None = None


class ReportResponse(BaseModel):
    success: bool
    data: dict | None = None
    error: str | None = None


class SymptomRequest(BaseModel):
    chief_complaint: str
    age: int | None = None
    gender: str | None = None
    symptom_location: str = ""
    symptom_onset: str = ""
    symptom_context: str = ""
    history_medical: str = ""
    history_lifestyle: str = ""
    family_history: str = ""
    session_id: str | None = None



# --- API 端点 ---

@app.get("/api/health")
async def health():
    return {"status": "ok", "version": "1.0.0"}


@app.post("/api/interpret", response_model=ReportResponse)
async def interpret_report(request: ReportRequest):
    """
    解读体检报告

    输入：指标列表 + 年龄性别
    输出：结构化解读报告（JSON）
    """
    try:
        # 1. 准备指标数据
        indicators = [
            {
                "name": ind.name,
                "value": ind.value,
                "unit": ind.unit,
                "reference_range": ind.reference_range,
            }
            for ind in request.indicators
        ]

        # 2. RAG检索相关知识
        indicator_names = [ind.name for ind in request.indicators]
        rag_context = rag_service.search_multi(indicator_names)

        # 3. LLM生成解读
        result = generate_report_interpretation(
            indicators=indicators,
            age=request.age,
            gender=request.gender,
            rag_context=rag_context,
        )

        return ReportResponse(success=True, data=result)

    except Exception as e:
        return ReportResponse(success=False, error=str(e))


@app.post("/api/interpret/text")
async def interpret_text(text: str = Form(...), age: str = Form(""), gender: str = Form("")):
    """
    通过文本输入解读（简化版，适合手动输入）
    """
    try:
        indicators = parse_text_input(text)
        indicator_names = [ind["name"] for ind in indicators]
        rag_context = rag_service.search_multi(indicator_names)

        result = generate_report_interpretation(
            indicators=indicators,
            age=int(age) if age else None,
            gender=gender or None,
            rag_context=rag_context,
        )

        return {"success": True, "data": result}
    except Exception as e:
        return {"success": False, "error": str(e)}


@app.post("/api/ocr/upload")
async def ocr_upload(file: UploadFile = File(...)):
    """
    图片OCR识别：上传体检报告图片，返回提取的指标数据
    """
    try:
        contents = await file.read()
        result = process_image_ocr(contents)
        return {"success": True, "data": result}
    except RuntimeError as e:
        return {"success": False, "error": str(e), "fallback": "manual"}
    except Exception as e:
        return {"success": False, "error": f"OCR处理失败: {str(e)}"}


@app.post("/api/interpret/chat")
async def interpret_chat(request: dict):
    """结果页AI追问"""
    try:
        question = request.get("question","")
        report = request.get("report",{})
        client, model = get_llm_client()
        r = client.chat.completions.create(model=model,messages=[
            {"role":"system","content":"你是体检报告解读助手。根据用户的体检报告数据，回答用户的追问。回答要通俗易懂、简洁。如果被问到严重程度，给出合理评估但不制造恐慌。每次回复限制在100字以内。"},
            {"role":"user","content":f"报告数据：{json.dumps(report,ensure_ascii=False)[:1500]}\n\n用户问：{question}"}],
            temperature=0.5,max_tokens=300)
        return {"success":True,"data":{"reply":r.choices[0].message.content}}
    except Exception as e:
        return {"success":False,"error":str(e)}


@app.get("/api/demo")
async def demo_interpretation():
    """
    Demo模式：使用模拟体检数据演示完整解读流程
    用于面试展示，不依赖OCR和上传
    """
    mock = get_mock_report()
    indicator_names = [ind["name"] for ind in mock["indicators"]]
    rag_context = rag_service.search_multi(indicator_names)

    result = generate_report_interpretation(
        indicators=mock["indicators"],
        age=mock["age"],
        gender=mock["gender"],
        rag_context=rag_context,
    )

    return {
        "success": True,
        "data": result,
        "meta": {
            "mode": "demo",
            "rag_sources": len(indicator_names),
            "indicators_analyzed": len(mock["indicators"]),
        },
    }


@app.get("/api/knowledge/{indicator_name}")
async def query_knowledge(indicator_name: str):
    """查询特定指标的医学知识"""
    result = rag_service.search(indicator_name)
    if result:
        return {"success": True, "data": result}
    return {"success": False, "error": "指标未找到，请检查名称"}


# --- 模块一：症状分诊 API ---

@app.post("/api/symptom/emergency-check")
async def emergency_check(request: SymptomRequest):
    """
    紧急症状检测（硬编码关键词匹配）
    在用户输入主诉后立即调用，命中则直接返回警告
    """
    result = check_emergency(request.chief_complaint)
    return {"success": True, "data": result}


@app.post("/api/symptom/dynamic-question")
async def dynamic_question(request: SymptomRequest):
    """AI动态生成下一个追问"""
    try:
        conv = f"主诉：{request.chief_complaint}\n"
        conv += f"部位与性质：{request.symptom_location}\n"
        conv += f"程度与时间：{request.symptom_onset}\n"
        conv += f"诱因与背景：{request.symptom_context}\n"
        conv += f"既往史：{request.history_medical}\n"
        conv += f"生活习惯：{request.history_lifestyle}\n"
        conv += f"家族史：{request.family_history}\n"
        result = generate_dynamic_question(
            chief_complaint=request.chief_complaint,
            conversation=conv,
            collected={
                "age": request.age, "gender": request.gender,
                "symptom_location": request.symptom_location,
                "symptom_onset": request.symptom_onset,
                "symptom_context": request.symptom_context,
                "history_medical": request.history_medical,
                "history_lifestyle": request.history_lifestyle,
                "family_history": request.family_history,
            }
        )
        return {"success": True, "data": result}
    except Exception as e:
        return {"success": False, "error": str(e)}


@app.get("/api/symptom/tailored-questions")
async def tailored_questions(q: str = ""):
    """根据主诉生成7个定制追问"""
    if not q.strip():
        return {"success": False, "error": "请输入主诉"}
    try:
        result = generate_tailored_questions(q)
        return {"success": True, "data": result}
    except Exception as e:
        return {"success": False, "error": str(e)}


@app.get("/api/symptom/question")
async def symptom_question(step: str = "age_gender"):
    """
    获取当前步骤的追问问题
    step: age_gender | symptom_location | symptom_onset | symptom_context | history_medical | history_lifestyle | family_history
    """
    question = get_next_question(step)
    return {"success": True, "data": question}


@app.post("/api/symptom/analyze")
async def symptom_analyze(request: SymptomRequest):
    """
    症状分诊分析
    输入主诉+病史信息，输出科室推荐+紧急性判断
    """
    try:
        # 1. 硬编码紧急检测
        emergency = check_emergency(request.chief_complaint)
        if emergency["is_emergency"]:
            return {
                "success": True,
                "data": {
                    "is_emergency": True,
                    "message": emergency["message"],
                    "departments": [],
                    "summary": "检测到可能的紧急情况，请立即就医",
                },
            }

        # 2. LLM 分诊分析
        result = analyze_symptoms(
            chief_complaint=request.chief_complaint,
            age=request.age,
            gender=request.gender,
            symptom_location=request.symptom_location,
            symptom_onset=request.symptom_onset,
            symptom_context=request.symptom_context,
            history_medical=request.history_medical,
            history_lifestyle=request.history_lifestyle,
            family_history=request.family_history,
        )

        return {"success": True, "data": result}

    except Exception as e:
        return {"success": False, "error": str(e)}


@app.get("/api/symptom/knowledge/{symptom_name}")
async def symptom_knowledge(symptom_name: str):
    """查询症状知识库"""
    kb = load_knowledge_base()
    symptoms = kb.get("symptoms", {})
    for key, entry in symptoms.items():
        aliases = entry.get("aliases", [])
        if symptom_name in [key] + aliases:
            return {"success": True, "data": {"key": key, **entry}}
    return {"success": False, "error": "症状未找到"}


# --- 模块二：检查项目解释 API ---

@app.get("/api/exam/search")
async def exam_search(q: str = ""):
    """搜索检查项目"""
    if not q.strip():
        return {"success": True, "data": []}
    results = search_exams(q)
    return {"success": True, "data": results}


@app.get("/api/exam/{exam_name}/ai-explain")
async def exam_ai_explain(exam_name: str):
    """AI增强的检查解释"""
    try:
        result = explain_exam_with_ai(exam_name)
        return {"success": True, "data": result}
    except Exception as e:
        return {"success": False, "error": str(e)}


@app.get("/api/exam/disease-search")
async def disease_exam_search(q: str = ""):
    """按疾病搜索需要的检查（知识库）"""
    if not q.strip():
        return {"success": True, "data": []}
    results = search_disease_exams(q)
    return {"success": True, "data": results}


@app.get("/api/exam/disease-search/{disease_name}/ai-supplement")
async def disease_exam_ai(disease_name: str):
    """AI补充某病种需要的检查"""
    try:
        result = analyze_disease_exams_with_ai(disease_name)
        return {"success": True, "data": result}
    except Exception as e:
        return {"success": False, "error": str(e)}


@app.get("/api/exam/ai-search")
async def exam_ai_search(q: str = ""):
    """AI兜底搜索检查项目"""
    if not q.strip():
        return {"success": False, "error": "请输入查询内容"}
    try:
        result = ai_search_exam(q)
        return {"success": True, "data": result}
    except Exception as e:
        return {"success": False, "error": str(e)}


@app.get("/api/exam/categories")
async def exam_categories():
    """获取所有检查分类 + 每个分类下的检查列表"""
    cats = get_categories()
    result = {}
    for cat_name, cat_info in cats.items():
        exams = get_exams_by_category(cat_name)
        result[cat_name] = {**cat_info, "exams": exams}
    return {"success": True, "data": result}


@app.get("/api/exam/{exam_name}")
async def exam_detail(exam_name: str):
    """获取单个检查项目的完整详情"""
    detail = get_exam_detail(exam_name)
    if detail:
        return {"success": True, "data": detail}
    return {"success": False, "error": "检查项目未找到"}


# --- 模块四：医保查询 API ---

@app.get("/api/insurance/rules")
async def insurance_rules():
    """获取医保通用规则"""
    rules = get_insurance_rules()
    return {"success": True, "data": rules}


@app.get("/api/insurance/disease/search")
async def disease_search(q: str = ""):
    """搜索病种"""
    if not q.strip():
        return {"success": True, "data": list_disease_names()}
    results = search_disease(q)
    return {"success": True, "data": results}


@app.get("/api/insurance/disease/{disease_name}")
async def disease_detail(disease_name: str):
    """获取病种完整治疗路径和费用信息"""
    detail = get_disease_detail(disease_name)
    if detail:
        return {"success": True, "data": detail}
    return {"success": False, "error": "病种未找到"}


@app.get("/api/insurance/disease/{disease_name}/ai-analysis")
async def disease_ai_analysis(disease_name: str):
    """AI增强的疾病费用分析（DeepSeek + 知识库）"""
    try:
        result = analyze_disease_cost_with_ai(disease_name)
        return {"success": True, "data": result}
    except Exception as e:
        return {"success": False, "error": str(e)}


@app.get("/api/insurance/ai-search")
async def insurance_ai_search(q: str = ""):
    """AI实时搜索药品/检查的医保信息（知识库兜底）"""
    if not q.strip():
        return {"success": False, "error": "请输入查询内容"}
    try:
        result = ai_search_drug(q)
        return {"success": True, "data": result}
    except Exception as e:
        return {"success": False, "error": str(e)}


@app.get("/api/insurance/query")
async def insurance_query(q: str = ""):
    """查询药品/检查的医保信息"""
    if not q.strip():
        return {"success": True, "data": {"items": []}}
    results = search_exam_or_drug(q)
    return {"success": True, "data": results}


# --- Analytics API（AI PM 数据分析） ---

@app.post("/api/analytics/event")
async def analytics_track_event(request: dict):
    """追踪用户行为事件"""
    event_type = request.get("event", "unknown")
    data = request.get("data", {})
    track_event(event_type, data)
    return {"success": True}


@app.post("/api/analytics/feedback")
async def analytics_submit_feedback(request: dict):
    """提交用户反馈"""
    save_feedback(request)
    return {"success": True, "message": "感谢反馈！"}


@app.get("/api/analytics/dashboard")
async def analytics_dashboard():
    """PM 分析看板（面试展示用）"""
    return {"success": True, "data": get_dashboard()}


@app.get("/api/analytics/feedback")
async def analytics_list_feedback():
    """查看所有反馈详情"""
    return {"success": True, "data": get_all_feedback()}


# --- Memory API（会话持久记忆） ---

@app.post("/api/memory/session/create")
async def memory_create_session(request: dict):
    """创建新会话"""
    module = request.get("module", "general")
    metadata = request.get("metadata", {})
    session_id = memory_service.create_session(module, metadata)
    return {"success": True, "data": {"session_id": session_id}}


@app.get("/api/memory/session/{session_id}")
async def memory_get_session(session_id: str):
    """获取会话详情"""
    session = memory_service.load_session(session_id)
    if not session:
        return {"success": False, "error": "会话不存在或已过期"}
    return {"success": True, "data": session}


@app.post("/api/memory/session/{session_id}/message")
async def memory_save_message(session_id: str, request: dict):
    """保存一条消息到会话"""
    role = request.get("role", "user")
    content = request.get("content", "")
    step = request.get("step", "")
    memory_service.save_message(session_id, role, content, step)
    return {"success": True}


@app.post("/api/memory/session/{session_id}/info")
async def memory_save_info(session_id: str, request: dict):
    """保存已收集的用户信息"""
    memory_service.save_collected_info(session_id, request)
    return {"success": True}


@app.get("/api/memory/session/{session_id}/context")
async def memory_get_context(session_id: str):
    """获取会话上下文摘要（注入LLM prompt用）"""
    context = memory_service.get_session_context(session_id)
    return {"success": True, "data": {"context": context}}


@app.delete("/api/memory/session/{session_id}")
async def memory_delete_session(session_id: str):
    """删除会话"""
    memory_service.delete_session(session_id)
    return {"success": True}


@app.get("/api/memory/profile/{user_id}")
async def memory_get_profile(user_id: str):
    """获取用户画像"""
    profile = memory_service.get_or_create_profile(user_id)
    return {"success": True, "data": profile}


@app.post("/api/memory/profile/{user_id}")
async def memory_update_profile(user_id: str, request: dict):
    """更新用户画像"""
    memory_service.update_profile(user_id, request)
    return {"success": True}


# --- Agent Architecture API（面试展示用） ---

@app.get("/api/architecture/skills")
async def architecture_skills():
    """获取Skills-Agent架构的Skill配置（面试展示）"""
    return {"success": True, "data": get_skill_configs()}


@app.get("/api/architecture/safety-policies")
async def architecture_safety():
    """获取所有模块的安全策略（Harness Engineering展示）"""
    return {"success": True, "data": get_all_safety_policies()}


@app.get("/api/architecture/labels")
async def architecture_labels():
    """获取来源标注标准和图例"""
    return {
        "success": True,
        "data": {
            "labels": {k: v for k, v in get_label_legend().items()},
            "legend": get_label_legend(),
        },
    }


@app.get("/api/architecture/overview")
async def architecture_overview():
    """获取整体架构概览（面试核心展示端点）"""
    return {
        "success": True,
        "data": {
            "architecture": "Skills-Agent 两层架构 + Agent Swarm 多Agent协作",
            "layers": [
                {
                    "name": "Layer 1: Router Agent",
                    "description": "意图识别 + 技能路由，将用户输入分发到对应Skill",
                    "file": "agent_router.py",
                },
                {
                    "name": "Layer 2: Four Skills",
                    "description": "每个Skill包含独立的KB、Prompt模板、安全约束",
                    "skills": [
                        {"name": "SymptomSkill", "module": "symptom_triage", "temperature": 0.2},
                        {"name": "ExamSkill", "module": "exam_explanation", "temperature": 0.5},
                        {"name": "ReportSkill", "module": "report_interpretation", "temperature": 0.3},
                        {"name": "InsuranceSkill", "module": "insurance_query", "temperature": 0.3},
                    ],
                },
                {
                    "name": "Agent Swarm Layer",
                    "description": "KB Agent + LLM Agent 并行执行，结果合并时来源标注",
                    "file": "agent_swarm.py",
                    "agents": [
                        {"name": "KB Agent", "role": "知识库检索", "feature": "双向模糊匹配 + 别名识别"},
                        {"name": "LLM Agent", "role": "AI分析解释", "feature": "结构化JSON + Temperature控制"},
                        {"name": "Merge Agent", "role": "结果合并", "feature": "来源追踪 + 去重"},
                    ],
                },
                {
                    "name": "Harness Layer",
                    "description": "集中式安全约束：输入检测 → 输出校验 → 审计日志",
                    "file": "harness.py",
                    "features": [
                        "8种硬编码紧急关键词（<1ms）",
                        "模块级Temperature注册表",
                        "来源标注标准（10种标签）",
                        "输出安全校验（禁止确定性诊断）",
                        "审计追踪日志",
                    ],
                },
                {
                    "name": "Memory Layer",
                    "description": "Mem0风格双层记忆：会话短期 + 用户长期画像",
                    "file": "memory_service.py",
                    "features": [
                        "Session Memory（7天过期，断点续聊）",
                        "User Profile（跨会话用户画像）",
                        "JSON文件存储（与KB策略一致）",
                    ],
                },
            ],
            "knowledge_bases": [
                {"file": "symptom_department.json", "entries": "20症状 + 科室映射"},
                {"file": "departments.json", "entries": "30个临床科室"},
                {"file": "exam_knowledge.json", "entries": "83项检查 / 8分类"},
                {"file": "disease_treatment.json", "entries": "82病种治疗路径"},
                {"file": "insurance_rules.json", "entries": "医保规则 + 报销比例"},
                {"file": "medical_knowledge.json", "entries": "医学指标参考范围"},
            ],
            "key_decisions": [
                "KB+LLM双引擎（非纯LLM，可溯源防幻觉）",
                "JSON文件做知识库（MVP阶段，手动更新即可）",
                "AI始终并行调用（不是KB查不到才调）",
                "所有AI输出强制标注来源",
                "Temperature分模块控制（0.2-0.5）",
                "不编造自付金额（去掉AI估算的18%/44%）",
            ],
        },
    }


@app.get("/api/architecture/swarm-demo")
async def architecture_swarm_demo(q: str = "", module: str = "insurance_query"):
    """
    Agent Swarm 演示端点 — 并行执行 KB Agent + LLM Agent
    面试时可用来展示多Agent协作的实际效果
    """
    if not q.strip():
        return {"success": False, "error": "请提供查询参数 q"}

    try:
        swarm = create_swarm(module)
        kb_names = get_module_kb_names(module)

        result = swarm.execute(
            query=q,
            kb_search_params={"kb_names": kb_names, "top_k": 5},
            llm_params={
                "system_prompt": "你是医疗信息分析助手。基于知识库上下文，提供简洁准确的信息。输出JSON：{\"summary\":\"一句话总结\",\"key_points\":[\"要点\"],\"source_note\":\"来源说明\"}",
                "user_prompt_template": "查询：{query}\n\n知识库参考：{kb_context}\n\n请提供分析。",
                "temperature": 0.3,
                "max_tokens": 1000,
            },
        )

        return {
            "success": True,
            "data": {
                "query": q,
                "module": module,
                "kb_agent": {
                    "total_found": result["kb_results"].get("total_found", 0),
                    "top_results": [
                        {"key": r["key"], "source": r["source"], "score": r["score"]}
                        for r in result["kb_results"].get("results", [])[:3]
                    ],
                },
                "llm_agent": result["ai_results"],
                "sources": result["sources"],
                "elapsed_ms": result["elapsed_ms"],
                "parallel": result["parallel"],
            },
        }
    except Exception as e:
        return {"success": False, "error": str(e)}


# --- 生产环境：服务前端静态文件 ---

FRONTEND_DIST = Path(__file__).parent.parent.parent / "frontend" / "dist"

if FRONTEND_DIST.exists():
    # Mount static assets (JS, CSS, images) at /assets
    assets_dir = FRONTEND_DIST / "assets"
    if assets_dir.exists():
        app.mount("/assets", StaticFiles(directory=str(assets_dir)), name="assets")

    @app.get("/{full_path:path}")
    async def serve_frontend(full_path: str):
        """SPA fallback — 所有非 API 路径返回 index.html"""
        file_path = FRONTEND_DIST / full_path
        if file_path.exists() and file_path.is_file() and not full_path.startswith("api"):
            return FileResponse(str(file_path))
        return FileResponse(str(FRONTEND_DIST / "index.html"))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
