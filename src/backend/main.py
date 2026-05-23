"""
智能体检报告解读助手 — FastAPI 后端

启动方式: uvicorn src.backend.main:app --reload
"""
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import json

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


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
