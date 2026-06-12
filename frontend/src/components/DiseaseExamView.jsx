import { useState, useEffect } from 'react';
import { searchDiseaseExams, fetchDiseaseExamAI } from '../api';

export default function DiseaseExamView({ onBack, onSelectExam }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [aiData, setAiData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  // Restore state when navigating back from detail
  useEffect(() => {
    const saved = sessionStorage.getItem('diseaseExamState');
    if (saved) {
      try {
        const s = JSON.parse(saved);
        setQuery(s.query || '');
        setResults(s.results || []);
        setAiData(s.aiData || null);
        setSearched(s.searched || false);
        sessionStorage.removeItem('diseaseExamState');
      } catch {}
    }
  }, []);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setSearched(true);
    setAiData(null);
    const [kbRes, aiRes] = await Promise.all([
      searchDiseaseExams(query).catch(() => null),
      fetchDiseaseExamAI(query).catch(() => null),
    ]);
    setResults(kbRes?.success ? kbRes.data : []);
    setAiData(aiRes?.success ? aiRes.data : null);
    setLoading(false);
  };

  return (
    <div style={{minHeight:"100vh",background:"#e8ecf1"}}>
      <div className="neu-header" style={{padding:"16px 20px"}}>
        <div className="neu-container" style={{display:"flex",alignItems:"center",gap:12}}>
          <button onClick={onBack} className="neu-icon-btn">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5"/></svg>
          </button>
          <div>
            <h2 style={{fontSize:"0.875rem",fontWeight:600,color:"#2c3e50"}}>按疾病查检查</h2>
            <p className="text-xs text-slate-400">输入病种，了解该病通常需要做哪些检查</p>
          </div>
        </div>
      </div>

      <main className="neu-container neu-safe-bottom" style={{paddingTop:16}}>
        <div className="flex gap-2 mb-4">
          <div className="relative flex-1">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607Z"/></svg>
            </div>
            <input value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="输入疾病名称（如高血压、糖尿病...）" className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:border-blue-400" />
          </div>
          <button onClick={handleSearch} disabled={loading}
            className="px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition active:scale-95 disabled:opacity-50">搜索</button>
        </div>

        {loading && (
          <div className="flex justify-center gap-1.5 py-8">
            <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{animationDelay:'0ms'}}/>
            <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{animationDelay:'150ms'}}/>
            <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{animationDelay:'300ms'}}/>
          </div>
        )}

        {!loading && searched && results.length === 0 && !aiData && (
          <div className="text-center py-8">
            <p className="text-sm text-slate-400 mb-2">未在知识库中找到该病种</p>
            <p className="text-xs text-slate-400">尝试使用更通用的病名（如"高血压"而非"原发性高血压2级"）</p>
          </div>
        )}

        {/* KB Results */}
        {results.map((d, di) => (
          <div key={di} className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-slate-700">{d.disease}</h3>
              <span className="px-2 py-0.5 rounded-full text-xs bg-slate-100 text-slate-500">知识库</span>
            </div>
            <div className="space-y-2">
              {d.exams?.map((e, i) => (
                <button key={i} onClick={() => { sessionStorage.setItem('diseaseExamState', JSON.stringify({query,results,aiData,searched})); onSelectExam(e.name); }}
                  className="w-full bg-white rounded-xl border border-slate-200 p-3.5 text-left hover:border-blue-300 hover:shadow-sm transition-all duration-200">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-slate-800 text-sm">{e.name}</span>
                    <span className="text-xs text-slate-500">{e.frequency}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400">点击查看详情 →</span>
                    <span className="text-xs text-slate-500">单次 {e.cost}元</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ))}

        {/* AI Supplement Exams */}
        {aiData?.ai_supplement_exams?.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-purple-700">AI 补充检查</h3>
              <span className="px-2 py-0.5 rounded-full text-xs bg-purple-100 text-purple-600">AI补充，需核实</span>
            </div>
            {aiData.ai_summary && <p className="text-xs text-slate-500 mb-3">{aiData.ai_summary}</p>}
            <div className="space-y-2">
              {aiData.ai_supplement_exams.map((e, i) => (
                <div key={i} className="bg-purple-50/40 rounded-xl border border-purple-200 p-3.5">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-slate-800 text-sm">{e.name}</span>
                    <span className="text-xs text-purple-500">{e.frequency}</span>
                  </div>
                  {e.purpose && <p className="text-xs text-purple-500 mb-1">{e.purpose}</p>}
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-purple-400">[AI推荐，需核实]</span>
                    {e.cost_estimate && <span className="text-xs text-purple-500">约 {e.cost_estimate}</span>}
                  </div>
                </div>
              ))}
            </div>
            {aiData.important_notes?.length > 0 && (
              <div className="mt-3 text-xs text-purple-500 space-y-1">
                {aiData.important_notes.map((n, i) => <p key={i}>• {n}</p>)}
              </div>
            )}
          </div>
        )}

        {searched && (results.length > 0 || aiData) && (
          <p className="text-xs text-slate-400 text-center mt-6">
            以上检查建议仅供参考，实际以医生处方为准。AI推荐的检查需自行核实必要性。
          </p>
        )}
      </main>
    </div>
  );
}
