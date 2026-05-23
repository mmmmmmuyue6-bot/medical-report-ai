# Bolt.new 前端生成提示词

> 复制下面的提示词到 bolt.new 或 v0.dev，生成前端原型

---

## 提示词（英文版，Bolt.new对英文响应更准确）

```
Build a medical report interpretation app with the following features:

## Core Pages

### 1. Home/Upload Page
- Clean hero section with title "智能体检报告解读" (Smart Health Report Interpreter)
- Subtitle: "拍照上传体检报告，AI帮你秒懂每项指标"
- A drag-and-drop upload area for images/PDFs
- OR a text input area where users can paste indicator data
- A "Demo" button that loads sample data for instant experience
- Bottom section: 3 feature highlights with icons
  1. "AI智能解读" - 基于临床医学知识库
  2. "风险分层" - 红橙黄绿四级预警
  3. "就医建议" - 科室推荐+检查指引

### 2. Result Page
After processing, show a structured result:

**Top section - Summary Card**
- Overall risk badge: "总体风险：中度关注" with color (green/yellow/orange/red)
- One-sentence summary: "您的报告显示多项肝功能指标异常，建议近期就医进一步检查"
- Disclaimer text at bottom: "本解读由AI生成，仅供参考，不构成医疗诊断建议"

**Middle section - Indicator List**
- Each indicator as a card showing:
  - Indicator name (Chinese)
  - Value with unit
  - Status badge: 🟢正常 / 🟡临界 / 🟠关注 / 🔴紧急
  - Plain language explanation
  - Expandable section for details (clinical context, possible causes)

**Bottom section - Recommendations**
- Department suggestion: "建议就诊科室：消化内科" with urgency level
- Suggested tests list
- Lifestyle advice list

### 3. Chat/Follow-up
- A chat input at the bottom where users can ask follow-up questions about their results
- Example questions as chips: "我的肝功能严重吗？", "需要做什么进一步检查？", "生活方式怎么调整？"

## Design Requirements
- Medical/healthcare color palette: primary blue (#2563EB), with green/yellow/orange/red for risk levels
- Clean, trustworthy feel - no playful elements
- Mobile-first responsive design (people check reports on phone)
- Chinese language interface
- Loading states: skeleton cards when analyzing
- Error state: friendly error message with retry button

## Technical Notes
- The app will connect to a FastAPI backend at localhost:8000
- API endpoint: POST /api/interpret with JSON body {indicators: [...], age: 28, gender: "男性"}
- API endpoint: GET /api/demo for demo data
- Use React + TailwindCSS
- Make the upload area support both image upload and text paste

## Key UX Principle
The user is likely anxious about their health. The UI should feel calm, professional, and reassuring. Never use alarming language or red unnecessarily. Every risk indication should come with constructive next steps.
```

---

## 提示词（中文版，如果英文版效果不好用这个）

```
构建一个体检报告AI解读应用，包含以下页面：

## 1. 首页（上传页）
- 标题"智能体检报告解读"
- 副标题"拍照上传体检报告，AI帮你秒懂每项指标"
- 拖拽上传区（支持图片/PDF）
- 文本粘贴区（手动输入指标数据）
- "体验Demo"按钮（一键加载示例数据）
- 底部三个功能亮点：AI智能解读、四级风险分层、就医建议

## 2. 结果页
- 顶部总览卡片：整体风险等级（绿/黄/橙/红）+ 一句话总结
- 中部指标列表：每个指标一张卡片，含指标名、数值、状态标识、通俗解释
- 底部建议区：就诊科室、进一步检查、生活方式建议
- 免责声明："本解读由AI生成，仅供参考，不构成医疗诊断建议"

## 3. 追问对话
- 底部聊天输入框，用户可追问
- 预设问题标签："我的报告严重吗？""需要做什么检查？""生活方式怎么调整？"

## 设计要求
- 医疗配色：主色蓝(#2563EB)，风险色绿/黄/橙/红
- 可信赖感：干净、专业、不花哨
- 移动端优先
- 中文界面
- 加载态：骨架屏
- 错误态：友好提示+重试按钮

## 技术说明
- 后端API：localhost:8000
- POST /api/interpret 提交报告
- GET /api/demo 获取示例数据
- React + TailwindCSS

## 用户体验原则
用户可能因体检异常而焦虑，UI需冷静、专业、安抚。
每次风险提示都必须附带可操作的建议。
```

---

## 使用步骤

1. 打开 https://bolt.new
2. 粘贴上述提示词
3. 等待生成 → 预览 → 调整
4. 导出代码或截图保存到作品集

> 提示：Bolt.new免费版有次数限制，建议先用英文版生成，不满意再用中文版微调。
