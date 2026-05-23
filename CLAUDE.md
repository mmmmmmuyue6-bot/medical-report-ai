# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Product Context

**项目**：就医全流程AI导航（四模块作品集）

| 模块 | 名称 | 状态 |
|------|------|------|
| 模块一 | 症状→科室 | 产品设计中（问卷已草稿，交互模式待确认） |
| 模块二 | 检查解释 | 待设计 |
| 模块三 | 报告解读 | MVP已完成（后端+前端+API联通） |
| 模块四 | 医保查询 | 待设计 |

**设计原则**：用户是临床医学背景的求职者，每一行代码和每一个产品决策都服务于「AI产品经理作品集」这个目标。

**关键决策记录**：
- 风险路线：中间路线（列可能性方向，不排名，不标概率，强制就医提醒）
- 问卷结构：基于标准病历格式（主诉、现病史、既往史、家族史），去除体格检查
- 输入方式：聊天式对话交互（用户输入主诉后切换为聊天界面）
- 进度条：不显示（B2，让对话自然流动）
- 输入框提示：显示当前问题的示例回答（A）
- 年龄/性别：放在第一步主诉之后收集
- 背景信息：全部必填，以对话方式收集
- 紧急提醒：AI动态判断 + 硬编码红色清单兜底（胸痛、呼吸困难、意识改变、高烧等）
- 输入不足兜底：追问最多2轮，仍不足出低信息量结果
- 目标用户：25-40岁年轻职场人自查症状
- 核心指标：科室推荐准确率 + 紧急提醒召回率 + 用户满意度/NPS

## Backend Architecture

```
src/backend/
├── main.py          # FastAPI app + 5 API endpoints
├── config.py        # Multi-LLM provider config (DeepSeek/OpenAI/Anthropic)
├── llm_service.py   # LLM调用 + Prompt design（结构化JSON输出，temperature=0.3）
├── rag_service.py   # RAG医学知识检索（当前关键词匹配，未来可升级向量检索）
├── ocr_service.py   # OCR服务 + 模拟测试数据
```

**启动**：`cd medical-report-ai && uvicorn src.backend.main:app --reload`
**依赖**：切换到项目目录后 `pip install fastapi uvicorn python-multipart openai anthropic`
**.env 配置**：项目根目录 `.env` 文件，支持 DEEPSEEK_API_KEY / OPENAI_API_KEY / ANTHROPIC_API_KEY

## Frontend Architecture

```
frontend/
├── src/
│   ├── main.jsx            # 入口
│   ├── App.jsx             # 路由/页面切换（Upload/Loading/Result）
│   ├── api.js              # 后端API调用封装
│   ├── components/
│   │   ├── UploadPage.jsx  # 首页：输入指标 + Demo按钮
│   │   └── ResultPage.jsx  # 结果页：指标卡片+风险标签+就医建议+对话追问
│   └── index.css           # TailwindCSS
├── vite.config.js          # Vite配置（含/api → localhost:8000代理）
```

**启动**：`cd frontend && npm run dev`（端口5173，自动代理API到8000）
**依赖**：`cd frontend && npm install`

## Key Architecture Decisions

1. **RAG架构**：医疗场景必须RAG，不能纯LLM。RAG保证可溯源、可更新、防幻觉。
2. **temperature=0.3**：医疗场景低温度保证一致性，减少幻觉。
3. **结构化Prompt**：System Prompt定义能力边界和输出格式，强制JSON输出方便前端渲染。
4. **Vite proxy**：前端dev server代理/api请求到后端，避免CORS问题。
5. **医学知识库**：当前JSON文件（research/medical_knowledge.json），8个核心指标含临床意义、关联指标、药物干扰、年龄性别差异。

## User Preferences

- 所有需要用户预览/审阅的文档输出到 Obsidian `E:/obsidian/Obsidian data/Claude create/` 目录
- 生成产品/个人文档前必须先交互确认，不得直接替用户做决策
- 用户是AI PM求职者，产品设计过程中应调用 pm/ux-designer/analyst 等技能
- 后端/前端服务停在 C 盘之外（已在E盘）

## Development Notes

- 前端重写时保留 `public/` 和 `vite.config.js` 的代理配置
- 添加新指标知识库条目时遵循已有 JSON 结构（description/reference_range/clinical_significance/related_indicators 等字段）
- API Key 通过 `.env` 文件管理，不上传到 git
