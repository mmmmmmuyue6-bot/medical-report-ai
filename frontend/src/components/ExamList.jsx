import { useState, useEffect } from 'react';
import { searchExams, fetchCategories, aiSearchExam } from '../api';

const CATEGORY_ICONS = {
  '影像学': (
    <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25H12" />
      <rect x="3" y="3" width="18" height="18" rx="3" strokeLinecap="round" />
    </svg>
  ),
  '实验室': (
    <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" />
    </svg>
  ),
  '内镜检查': (
    <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="3" />
      <path strokeLinecap="round" d="M8 12h8M12 8v8" />
    </svg>
  ),
  '功能检查': (
    <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125Z" />
    </svg>
  ),
  '病理检查': (
    <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
      <circle cx="6" cy="6" r="2" />
      <circle cx="12" cy="6" r="2" />
      <circle cx="6" cy="12" r="2" />
      <circle cx="12" cy="12" r="2" />
      <circle cx="6" cy="18" r="2" />
      <circle cx="12" cy="18" r="2" />
      <circle cx="16" cy="12" r="1.5" />
      <circle cx="18" cy="15" r="1" />
    </svg>
  ),
  '造影/特殊检查': (
    <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.429 9.75L2.25 12l4.179 2.25m0-4.5l5.571 3 5.571-3m-11.142 0L2.25 7.5 12 2.25l9.75 5.25-4.179 2.25m0 0L21.75 12l-4.179 2.25m0 0l4.179 2.25L12 21.75 2.25 16.5l4.179-2.25m11.142 0l-5.571 3-5.571-3" />
    </svg>
  ),
  '妇科/产科': (
    <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0ZM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
    </svg>
  ),
  '精神心理': (
    <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z" />
    </svg>
  ),
};

const CATEGORY_COLORS = {
  '影像学': 'bg-indigo-50 text-indigo-600 border-indigo-200',
  '实验室': 'bg-emerald-50 text-emerald-600 border-emerald-200',
  '内镜检查': 'bg-amber-50 text-amber-600 border-amber-200',
  '功能检查': 'bg-cyan-50 text-cyan-600 border-cyan-200',
  '病理检查': 'bg-rose-50 text-rose-600 border-rose-200',
  '造影/特殊检查': 'bg-purple-50 text-purple-600 border-purple-200',
  '妇科/产科': 'bg-pink-50 text-pink-600 border-pink-200',
  '精神心理': 'bg-teal-50 text-teal-600 border-teal-200',
};

const QUICK_CHIPS = ['血常规', '尿常规', '心电图', '胃镜', '胸部CT', '肝功能', '肾功能', '肠镜', 'B超', '血糖'];

export default function ExamList({ onSelectExam, onBack, onDiseaseCheck, onSelectExamWithAI }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [aiResults, setAiResults] = useState(null);
  const [categories, setCategories] = useState({});
  const [showResults, setShowResults] = useState(false);

  useEffect(() => {
    fetchCategories().then((res) => {
      if (res.success) setCategories(res.data);
    }).catch(() => {});
    // Restore previous search/browse state when navigating back
    const saved = sessionStorage.getItem('examSearchState');
    if (saved) {
      try {
        const s = JSON.parse(saved);
        setQuery(s.query || '');
        setResults(s.results || []);
        setAiResults(s.aiResults || null);
        setShowResults(s.showResults || false);
        sessionStorage.removeItem('examSearchState');
      } catch {}
    }
  }, []);

  const handleSearch = async (q) => {
    setQuery(q);
    if (q.trim().length > 0) {
      setShowResults(true);
      setAiResults(null);
      const res = await searchExams(q);
      if (res.success && res.data.length > 0) {
        setResults(res.data);
      } else {
        setResults([]);
        // KB empty — try AI
        const aiRes = await aiSearchExam(q).catch(() => null);
        if (aiRes?.success && aiRes.data?.name) {
          setAiResults(aiRes.data);
        }
      }
    } else {
      setShowResults(false);
      setResults([]);
      setAiResults(null);
    }
  };

  const painStars = (level) => {
    const full = '★'.repeat(level);
    const empty = '☆'.repeat(Math.max(0, 5 - level));
    return <span className="text-amber-500 text-xs">{full}<span className="text-slate-300">{empty}</span></span>;
  };

  return (
    <div style={{minHeight:'100vh',background:'#e8ecf1'}}>
      {/* Header */}
      <div className="neu-header" style={{padding:'16px 20px'}}>
        <div className="neu-container">
          <button onClick={() => { if (showResults) { setShowResults(false); setResults([]); setAiResults(null); setQuery(''); } else onBack(); }} className="neu-icon-btn" style={{marginBottom:16}}>
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5"/></svg>
          </button>
          <div style={{textAlign:'center'}}>
            <div style={{width:52,height:52,borderRadius:16,background:'rgba(240,160,75,0.08)',display:'inline-flex',alignItems:'center',justifyContent:'center',marginBottom:12,color:'#F0A04B'}}>
              <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15a2.25 2.25 0 012.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25Z"/></svg>
            </div>
            <h1 style={{fontSize:'1.25rem',fontWeight:700,color:'#2c3e50',margin:0}}>检查项目解释</h1>
            <p style={{fontSize:'0.8125rem',color:'#6b7d8e',marginTop:4}}>医学检查详解，逐项拆解，AI讲给你听</p>
          </div>
        </div>
      </div>

      <main className="neu-container neu-safe-bottom" style={{paddingTop:16}}>
        {/* Search bar */}
        <div style={{display:'flex',gap:8,marginBottom:20}}>
          <div style={{flex:1,position:'relative'}}>
            <span style={{position:'absolute',left:14,top:'50%',transform:'translateY(-50%)',color:'#94a3b8'}}>
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607Z"/></svg>
            </span>
            <input value={query} onChange={(e) => handleSearch(e.target.value)}
              placeholder="搜索检查项目，或点 AI 搜索智能查询..." className="neu-input" style={{padding:'12px 16px 12px 42px',fontSize:'0.875rem'}} />
          </div>
          <button
            onClick={() => { if(query.trim()){ setShowResults(true); setResults([]); aiSearchExam(query).then(r => { if(r?.success && r.data?.name) setAiResults(r.data); }).catch(()=>{}); } }}
            className="neu-chip" style={{border:'none',cursor:'pointer',whiteSpace:'nowrap',background:query.trim()?'rgba(155,142,196,0.1)':'#e8ecf1',color:query.trim()?'#9B8EC4':'#94a3b8'}}>
            AI 搜索
          </button>
        </div>

        {/* Search Results */}
        {showResults && (
          <div className="mb-6">
            <h3 className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-3">
              搜索结果 ({results.length}){aiResults ? ' + AI' : ''}
            </h3>
            {/* AI search results */}
            {aiResults && (
              <div className="bg-purple-50/40 rounded-xl border border-purple-200 p-4 mb-2">
                <div className="flex items-center gap-2 mb-2">
                  <span>🤖</span>
                  <span className="text-xs text-purple-600 font-medium">AI 搜索结果 [AI搜索，需核实]</span>
                </div>
                <button onClick={() => { sessionStorage.setItem("examSearchState", JSON.stringify({query,results,aiResults,showResults})); if(onSelectExamWithAI) onSelectExamWithAI(aiResults.name, aiResults); else onSelectExam(aiResults.name); }}
                  className="w-full bg-white rounded-xl border border-slate-200 p-3.5 text-left hover:border-blue-300 hover:shadow-sm transition-all duration-200">
                  <span className="font-medium text-slate-800 text-sm">{aiResults.name}</span>
                  <p className="text-xs text-slate-500 mt-1">{aiResults.one_liner}</p>
                </button>
              </div>
            )}
            {results.length === 0 && !aiResults ? (
              <p className="text-sm text-slate-400 py-4 text-center">未找到匹配的检查项目</p>
            ) : (
              <div className="space-y-2">
                {results.map((exam) => (
                  <button
                    key={exam.key}
                    onClick={() => { sessionStorage.setItem("examSearchState", JSON.stringify({query,results,aiResults,showResults})); onSelectExam(exam.name); }}
                    className="w-full bg-white rounded-xl border border-slate-200 p-3.5 text-left hover:border-blue-300 hover:shadow-sm transition-all duration-200"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-slate-800 text-sm">{exam.name}</span>
                      {painStars(exam.pain_level)}
                    </div>
                    <p className="text-xs text-slate-500 line-clamp-2">{exam.one_liner}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Disease Check Entry */}
        {!showResults && onDiseaseCheck && (
          <button onClick={onDiseaseCheck}
            className="w-full bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl border border-blue-200 p-4 text-left hover:shadow-md transition-all duration-200 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126Z"/></svg>
              </div>
              <div>
                <span className="text-sm font-semibold text-blue-800">按疾病查检查</span>
                <p className="text-xs text-blue-500 mt-0.5">输入病种名，了解该病通常需要做哪些检查</p>
              </div>
              <svg className="w-4 h-4 text-blue-400 ml-auto shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5"/></svg>
            </div>
          </button>
        )}

        {/* Categories */}
        {!showResults && (
          <>
            <h3 className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-3">按分类浏览</h3>
            <div className="grid grid-cols-2 gap-3 mb-8">
              {Object.entries(categories).map(([name, info]) => (
                <button
                  key={name}
                  onClick={() => {
                    setQuery(name);
                    handleSearch('');
                    // Show all exams in this category
                    setShowResults(true);
                    setResults((info.exams || []).map((e) => ({ ...e, name: e.name || e.key })));
                  }}
                  className={`rounded-2xl border p-4 text-left transition-all duration-200 hover:shadow-md ${CATEGORY_COLORS[name] || 'bg-slate-50 text-slate-600 border-slate-200'}`}
                >
                  <div className="mb-2">{CATEGORY_ICONS[name]}</div>
                  <h4 className="font-semibold text-sm mb-0.5">{name}</h4>
                  <p className="text-xs opacity-70">{info.description}</p>
                </button>
              ))}
            </div>

            {/* Quick Access */}
            <h3 className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-3">常见检查</h3>
            <div className="flex flex-wrap gap-2 mb-8">
              {QUICK_CHIPS.map((name) => (
                <button
                  key={name}
                  onClick={() => onSelectExam(name)}
                  className="px-4 py-2 rounded-full text-sm border border-slate-300 bg-white text-slate-600 hover:border-blue-400 hover:text-blue-600 transition-all duration-200"
                >
                  {name}
                </button>
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
