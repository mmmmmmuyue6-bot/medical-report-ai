const API_BASE = '/api';

export async function interpretReport(indicators, age, gender) {
  const res = await fetch(`${API_BASE}/interpret`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ indicators, age, gender }),
  });
  if (!res.ok) throw new Error('解读失败');
  return res.json();
}

export async function fetchDemo() {
  const res = await fetch(`${API_BASE}/demo`);
  if (!res.ok) throw new Error('Demo加载失败');
  return res.json();
}

export async function queryKnowledge(name) {
  const res = await fetch(`${API_BASE}/knowledge/${encodeURIComponent(name)}`);
  return res.json();
}

// --- 模块一：症状分诊 API ---

export async function emergencyCheck(chiefComplaint) {
  const res = await fetch(`${API_BASE}/symptom/emergency-check`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chief_complaint: chiefComplaint }),
  });
  if (!res.ok) throw new Error('紧急检测失败');
  return res.json();
}

export async function getQuestion(step) {
  const res = await fetch(`${API_BASE}/symptom/question?step=${encodeURIComponent(step)}`);
  if (!res.ok) throw new Error('获取问题失败');
  return res.json();
}

export async function symptomAnalyze(data) {
  const res = await fetch(`${API_BASE}/symptom/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('分诊分析失败');
  return res.json();
}

// --- 模块四：医保查询 API ---

export async function fetchInsuranceRules() {
  const res = await fetch(`${API_BASE}/insurance/rules`);
  if (!res.ok) throw new Error('加载医保规则失败');
  return res.json();
}

export async function searchDisease(query) {
  const res = await fetch(`${API_BASE}/insurance/disease/search?q=${encodeURIComponent(query)}`);
  if (!res.ok) throw new Error('搜索失败');
  return res.json();
}

export async function fetchDiseaseDetail(name) {
  const res = await fetch(`${API_BASE}/insurance/disease/${encodeURIComponent(name)}`);
  if (!res.ok) throw new Error('加载详情失败');
  return res.json();
}

export async function fetchDiseaseAIAnalysis(name) {
  const res = await fetch(`${API_BASE}/insurance/disease/${encodeURIComponent(name)}/ai-analysis`);
  if (!res.ok) throw new Error('AI分析失败');
  return res.json();
}

export async function insuranceQuery(q) {
  const res = await fetch(`${API_BASE}/insurance/query?q=${encodeURIComponent(q)}`);
  if (!res.ok) throw new Error('查询失败');
  return res.json();
}

export async function insuranceAISearch(q) {
  const res = await fetch(`${API_BASE}/insurance/ai-search?q=${encodeURIComponent(q)}`);
  if (!res.ok) throw new Error('AI搜索失败');
  return res.json();
}

// --- 模块二：检查项目解释 API ---

export async function searchExams(query) {
  const res = await fetch(`${API_BASE}/exam/search?q=${encodeURIComponent(query)}`);
  if (!res.ok) throw new Error('搜索失败');
  return res.json();
}

export async function fetchCategories() {
  const res = await fetch(`${API_BASE}/exam/categories`);
  if (!res.ok) throw new Error('加载分类失败');
  return res.json();
}

export async function fetchExamDetail(name) {
  const res = await fetch(`${API_BASE}/exam/${encodeURIComponent(name)}`);
  if (!res.ok) throw new Error('加载详情失败');
  return res.json();
}

export async function fetchExamAIExplain(name) {
  const res = await fetch(`${API_BASE}/exam/${encodeURIComponent(name)}/ai-explain`);
  if (!res.ok) throw new Error('AI解释失败');
  return res.json();
}

export async function searchDiseaseExams(query) {
  const res = await fetch(`${API_BASE}/exam/disease-search?q=${encodeURIComponent(query)}`);
  if (!res.ok) throw new Error('搜索失败');
  return res.json();
}

export async function fetchDiseaseExamAI(name) {
  const res = await fetch(`${API_BASE}/exam/disease-search/${encodeURIComponent(name)}/ai-supplement`);
  if (!res.ok) throw new Error('AI补充失败');
  return res.json();
}

export async function aiSearchExam(query) {
  const res = await fetch(`${API_BASE}/exam/ai-search?q=${encodeURIComponent(query)}`);
  if (!res.ok) throw new Error('AI搜索失败');
  return res.json();
}
