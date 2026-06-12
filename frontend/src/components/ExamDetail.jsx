import { useState, useEffect } from 'react';
import { fetchExamDetail, fetchExamAIExplain } from '../api';

const SECTION_ICONS = {
  '概述': (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607Z"/></svg>
  ),
  '原理': (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09Z"/></svg>
  ),
  '目的': (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0Z"/><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0Z"/></svg>
  ),
  '流程': (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75Z"/></svg>
  ),
  '疼痛': (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M15.362 5.214A8.252 8.252 0 0112 21 8.25 8.25 0 016.038 7.048 8.287 8.287 0 009 9.6a8.983 8.983 0 013.361-6.867 8.21 8.21 0 003 2.48Z"/><path strokeLinecap="round" strokeLinejoin="round" d="M12 18a3.75 3.75 0 00.495-7.467 5.99 5.99 0 00-1.925 3.546 5.974 5.974 0 01-2.133-1A3.75 3.75 0 0012 18Z"/></svg>
  ),
  '准备': (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15a2.25 2.25 0 012.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25Z"/></svg>
  ),
  '费用': (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0Z"/></svg>
  ),
  '等待': (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0Z"/></svg>
  ),
};

const ICON_COLORS = {
  '概述': '#6C9FD8',
  '原理': '#6b7d8e',
  '目的': '#6b7d8e',
  '流程': '#4A8FCD',
  '疼痛': '#F0A04B',
  '准备': '#5BBA8B',
  '费用': '#5BBA8B',
  '等待': '#9B8EC4',
};

const SECTION_LABELS = {
  'steps': { title: '检查流程', icon: '流程', defaultOpen: true },
  'preparation': { title: '检查前准备', icon: '准备', defaultOpen: true },
  'pain': { title: '疼不疼', icon: '疼痛', defaultOpen: true },
  'result_wait': { title: '结果等待时间', icon: '等待', defaultOpen: true },
  'cost': { title: '费用与医保', icon: '费用', defaultOpen: true },
  'one_liner': { title: '一句话概述', icon: '概述', defaultOpen: true },
  'purpose': { title: '为什么要做', icon: '目的', defaultOpen: false },
  'principle': { title: '原理机制', icon: '原理', defaultOpen: false },
};

function CollapsibleSection({ title, icon, defaultOpen, children }) {
  const [open, setOpen] = useState(defaultOpen);
  const handleToggle = () => {
    if (!open) {
      fetch('/api/analytics/event', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({event:'section_expand',data:{section:title}}) }).catch(()=>{});
    }
    setOpen(!open);
  };
  const iconColor = ICON_COLORS[icon] || '#6b7d8e';
  return (
    <div className="neu-flat" style={{overflow:"hidden",marginBottom:10}}>
      <button
        onClick={handleToggle}
        style={{width:"100%",display:"flex",alignItems:"center",justifyContent:"space-between",padding:"14px 16px",textAlign:"left",background:"none",border:"none",cursor:"pointer"}}
      >
        <div className="flex items-center gap-2.5">
          <span style={{color:iconColor}}>{SECTION_ICONS[icon]}</span>
          <span style={{fontSize:"0.9375rem",fontWeight:700,color:"#2c3e50"}}>{title}</span>
        </div>
        <svg
          className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5"/>
        </svg>
      </button>
      {open && <div className="px-4 pb-4 text-sm text-slate-600 leading-relaxed animate-[slideUp_0.2s_ease-out]" style={{fontSize:'0.875rem'}}>{children}</div>}
    </div>
  );
}

function painEmoji(level, desc) {
  const faces = ['🟢', '🟢', '🟡', '🟠', '🔴', '🔴'];
  const labels = ['完全不疼', '轻微不适', '有点难受', '比较难受', '很疼', '非常疼'];
  return (
    <div className="flex items-center gap-3">
      <span className="text-3xl">{faces[Math.min(level, 5)]}</span>
      <div>
        <p className="font-medium text-slate-800">{labels[Math.min(level, 5)]}</p>
        <p className="text-xs text-slate-500 mt-0.5">{desc}</p>
      </div>
    </div>
  );
}

export default function ExamDetail({ examName, onBack, examAI }) {
  const [exam, setExam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [aiExplain, setAiExplain] = useState(null);
  const [aiExpanded, setAiExpanded] = useState(false);

  useEffect(() => {
    setLoading(true);
    setAiExplain(null);
    Promise.all([
      fetchExamDetail(examName),
      fetchExamAIExplain(examName).catch(() => null),
    ]).then(([res, aiRes]) => {
      if (res.success) {
        // Merge AI supplement into KB exam
        const kb = res.data;
        const ai = aiRes?.success ? aiRes.data : null;
        if (ai) {
          kb._aiExplain = ai.explanation || '';
          kb._aiPrinciple = ai.principle || '';
          kb._aiPurpose = ai.purpose || '';
          kb._aiSteps = ai.steps || [];
          kb._aiPain = ai.pain_description || '';
          kb._aiPreparation = ai.preparation || [];
          kb._aiCostNote = ai.cost_note || '';
          kb._aiResultWait = ai.result_wait || '';
        }
        setExam(kb);
      } else if (examAI) {
        // KB empty but AI provided data — use AI explain data for all sections
        const ai = aiRes?.success ? aiRes.data : {};
        setExam({
          name: examAI.name,
          one_liner: examAI.one_liner || ai.explanation || '',
          category: examAI.category || 'AI搜索结果',
          pain_level: examAI.pain_level || 0,
          pain_description: ai.pain_description || examAI.pain_description || '',
          cost_range: examAI.cost_range || ai.cost_note || '',
          insurance: examAI.insurance || '',
          principle: ai.principle || examAI.one_liner || '',
          purpose: ai.purpose || examAI.one_liner || '',
          steps: ai.steps || ['请咨询医生 [AI解释]'],
          preparation: ai.preparation || ['请咨询医生 [AI解释]'],
          result_wait: ai.result_wait || '请就医时确认',
          _source: 'ai',
        });
      } else {
        setError(res.error || '加载失败');
      }
      if (aiRes?.success) setAiExplain(aiRes.data);
      fetch('/api/analytics/event', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({event:'page_view',data:{module:'exam',exam:examName}}) }).catch(()=>{});
    }).catch(() => setError('网络错误，请确认后端已启动')).finally(() => setLoading(false));
  }, [examName, examAI]);

  if (loading) {
    return (
      <div style={{minHeight:"100vh",background:"#e8ecf1",display:"flex",flexDirection:"column"}}>
        <div className="neu-header" style={{padding:"16px 20px"}}>
          <div className="neu-container" style={{display:"flex",alignItems:"center",gap:12}}>
            <button onClick={onBack} className="neu-icon-btn">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5"/></svg>
            </button>
            <h1 style={{fontSize:"1rem",fontWeight:700,color:"#2c3e50"}}>{examName}</h1>
          </div>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center" style={{paddingBottom:80}}>
          <div className="flex gap-2 mb-4">
            <span style={{width:10,height:10,borderRadius:"50%",background:"#4A8FCD",animation:"neu-pulse 1.5s ease-in-out infinite",animationDelay:"0ms"}}/>
            <span style={{width:10,height:10,borderRadius:"50%",background:"#4A8FCD",animation:"neu-pulse 1.5s ease-in-out infinite",animationDelay:"150ms"}}/>
            <span style={{width:10,height:10,borderRadius:"50%",background:"#4A8FCD",animation:"neu-pulse 1.5s ease-in-out infinite",animationDelay:"300ms"}}/>
          </div>
          <p style={{fontSize:"0.875rem",color:"#6b7d8e"}}>正在加载检查详情...</p>
        </div>
      </div>
    );
  }

  if (error || !exam) {
    return (
      <div style={{minHeight:"100vh",background:"#e8ecf1",display:"flex",flexDirection:"column"}}>
        <div className="neu-header" style={{padding:"16px 20px"}}>
          <div className="neu-container" style={{display:"flex",alignItems:"center",gap:12}}>
            <button onClick={onBack} className="neu-icon-btn">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5"/></svg>
            </button>
            <h1 style={{fontSize:"1rem",fontWeight:700,color:"#2c3e50"}}>检查详情</h1>
          </div>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center p-4">
          <p style={{color:"#6b7d8e",marginBottom:16}}>{error || '未找到检查项目'}</p>
          <button onClick={onBack} className="text-blue-600 text-sm font-medium">返回列表</button>
        </div>
      </div>
    );
  }

  const painStars = (level) => {
    const full = '★'.repeat(level);
    const empty = '☆'.repeat(Math.max(0, 5 - level));
    return <span className="text-amber-500 text-sm">{full}<span className="text-slate-300">{empty}</span></span>;
  };

  return (
    <div style={{minHeight:"100vh",background:"#e8ecf1"}}>
      {/* Header */}
      <div className="neu-header" style={{padding:"16px 20px"}}>
        <div className="neu-container" style={{display:"flex",alignItems:"center",gap:12}}>
          <button onClick={onBack} className="neu-icon-btn">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5"/></svg>
          </button>
          <div className="flex-1 min-w-0">
            <h1 style={{fontSize:"1rem",fontWeight:700,color:"#2c3e50",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{exam.name || examName}</h1>
            <div className="flex items-center gap-2 mt-0.5">
              <span style={{fontSize:"0.75rem",color:"#6b7d8e"}}>{exam.category}</span>
              {exam._source === 'ai' && <span className="neu-chip" style={{fontSize:"0.6875rem",background:"rgba(155,142,196,0.1)",color:"#9B8EC4"}}>AI搜索</span>}
              {painStars(exam.pain_level)}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <main className="neu-container neu-safe-bottom" style={{paddingTop:16,paddingBottom:48,display:"flex",flexDirection:"column",gap:12}}>

        {/* AI Explanation — collapsible */}
        {aiExplain && (
          <div className="neu-card" style={{background:"rgba(155,142,196,0.06)",border:"1px solid rgba(155,142,196,0.2)",padding:16,border:"none"}}>
            <button onClick={() => setAiExpanded(!aiExpanded)} style={{width:"100%",display:"flex",alignItems:"center",justifyContent:"space-between",background:"none",border:"none",cursor:"pointer",padding:0}}>
              <div className="flex items-center gap-2">
                <span className="text-lg">🤖</span>
                <span className="text-sm font-semibold text-purple-800">AI 通俗解释</span>
                <span className="px-2 py-0.5 rounded-full text-xs bg-purple-200 text-purple-700">DeepSeek</span>
              </div>
              <svg className={`w-4 h-4 text-purple-400 transition-transform duration-200 ${aiExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5"/></svg>
            </button>
            {!aiExpanded && aiExplain.explanation && (
              <p className="text-sm text-slate-600 mt-2 line-clamp-2">{aiExplain.explanation.slice(0, 80)}{aiExplain.explanation.length > 80 ? '…' : ''}</p>
            )}
            {aiExpanded && (
              <div className="mt-3 pt-3 border-t border-purple-100">
                {aiExplain.explanation && <p className="text-sm text-slate-700 mb-3">{aiExplain.explanation}</p>}
                {aiExplain.key_points?.length > 0 && (
                  <div className="mb-3">
                    {aiExplain.key_points.map((kp, i) => (
                      <p key={i} className="text-xs text-slate-600 flex items-start gap-2 mb-1">
                        <span className="text-purple-400 shrink-0">•</span>{kp}
                      </p>
                    ))}
                  </div>
                )}
                {aiExplain.faq?.length > 0 && (
                  <div className="space-y-2 border-t border-purple-200 pt-3">
                    {aiExplain.faq.map((f, i) => (
                      <div key={i} className="neu-flat" style={{padding:12}}>
                        <p className="text-xs font-medium text-slate-700 mb-1">Q: {f.q}</p>
                        <p className="text-xs text-slate-600">A: {f.a}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Steps — moved to top: "怎么做" is top user concern */}
        {exam.steps && (
          <CollapsibleSection title={SECTION_LABELS['steps'].title} icon={SECTION_LABELS['steps'].icon} defaultOpen={SECTION_LABELS['steps'].defaultOpen}>
            <ol className="space-y-2">
              {exam.steps.map((step, i) => (
                <li key={i} className="flex gap-3">
                  <span style={{width:20,height:20,borderRadius:"50%",background:"rgba(74,143,205,0.1)",color:"#4A8FCD",fontSize:"0.6875rem",fontWeight:600,display:"inline-flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{i + 1}</span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
            {exam._aiSteps?.length > 0 && (
              <div className="mt-3 pt-3 border-t border-purple-100">
                <p className="text-xs text-purple-500 mb-1">AI补充步骤 [AI解释]</p>
                {exam._aiSteps.map((s, i) => <p key={'ais-'+i} className="text-xs text-purple-600 mb-1">• {s.replace('[AI解释]','').trim()}</p>)}
              </div>
            )}
          </CollapsibleSection>
        )}

        {/* Preparation */}
        {exam.preparation && (
          <CollapsibleSection title={SECTION_LABELS['preparation'].title} icon={SECTION_LABELS['preparation'].icon} defaultOpen={SECTION_LABELS['preparation'].defaultOpen}>
            <ul className="space-y-1.5">
              {exam.preparation.map((item, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-blue-500 mt-1 shrink-0">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            {exam._aiPreparation?.length > 0 && (
              <div className="mt-3 pt-3 border-t border-purple-100">
                <p className="text-xs text-purple-500 mb-1">AI补充建议 [AI解释]</p>
                {exam._aiPreparation.map((p, i) => <p key={'aip-'+i} className="text-xs text-purple-600 mb-1">• {p.replace('[AI解释]','').trim()}</p>)}
              </div>
            )}
          </CollapsibleSection>
        )}

        {/* Pain — emphasized */}
        {(exam.pain_level !== undefined && exam.pain_description) && (
          <CollapsibleSection title={SECTION_LABELS['pain'].title} icon={SECTION_LABELS['pain'].icon} defaultOpen={SECTION_LABELS['pain'].defaultOpen}>
            {painEmoji(exam.pain_level, exam.pain_description)}
            {exam._aiPain && <p className="text-purple-600 text-xs mt-2 pt-2 border-t border-purple-100">{exam._aiPain}</p>}
          </CollapsibleSection>
        )}

        {/* Result wait — emphasized */}
        {exam.result_wait && (
          <CollapsibleSection title={SECTION_LABELS['result_wait'].title} icon={SECTION_LABELS['result_wait'].icon} defaultOpen={SECTION_LABELS['result_wait'].defaultOpen}>
            <p style={{fontWeight:700,color:'#9B8EC4',fontSize:'0.9375rem'}}>{exam.result_wait}</p>
            {exam._aiResultWait && <p className="text-purple-600 text-xs mt-2 pt-2 border-t border-purple-100">{exam._aiResultWait}</p>}
          </CollapsibleSection>
        )}

        {/* Cost — emphasized */}
        {exam.cost_range && (
          <CollapsibleSection title={SECTION_LABELS['cost'].title} icon={SECTION_LABELS['cost'].icon} defaultOpen={SECTION_LABELS['cost'].defaultOpen}>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span style={{color:"#6b7d8e"}}>大概费用</span>
                <span style={{fontWeight:700,color:'#E0735C',fontSize:'1.0625rem'}}>{exam.cost_range}</span>
              </div>
              {exam.insurance && (
                <div className="flex items-center justify-between">
                  <span style={{color:"#6b7d8e"}}>医保覆盖</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    exam.insurance.includes('甲类') ? 'bg-emerald-100 text-emerald-700' :
                    exam.insurance.includes('乙类') ? 'bg-amber-100 text-amber-700' :
                    'bg-blue-100 text-blue-700'}`} style={{fontSize:'0.8125rem'}}>{exam.insurance}</span>
                </div>
              )}
              <div className="border-t border-slate-100 pt-2 mt-2">
                <p className="text-xs text-slate-400 mb-1">医保报销说明</p>
                <div className="text-xs text-slate-500 space-y-1">
                  <p><span className="px-1 py-0.5 rounded bg-emerald-100 text-emerald-700 font-medium">甲类</span> 100%纳入报销基数，再按比例报销</p>
                  <p><span className="px-1 py-0.5 rounded bg-amber-100 text-amber-700 font-medium">乙类</span> 先自付10-30%，剩余纳入基数</p>
                  <p><span className="px-1 py-0.5 rounded bg-red-100 text-red-700 font-medium">丙类/自费</span> 全部自付，不报销</p>
                </div>
              </div>
              {exam._aiCostNote && <p className="text-purple-600 text-xs mt-2 pt-2 border-t border-purple-100">{exam._aiCostNote}</p>}
            </div>
          </CollapsibleSection>
        )}

        {/* One-liner — moved down: overview after practical details */}
        {exam.one_liner && (
          <CollapsibleSection title={SECTION_LABELS['one_liner'].title} icon={SECTION_LABELS['one_liner'].icon} defaultOpen={SECTION_LABELS['one_liner'].defaultOpen}>
            <p>{exam.one_liner}</p>
            {exam._aiExplain && <p className="text-purple-600 text-xs mt-2 pt-2 border-t border-purple-100">{exam._aiExplain}</p>}
          </CollapsibleSection>
        )}

        {/* Purpose — moved down: background info */}
        {exam.purpose && (
          <CollapsibleSection title={SECTION_LABELS['purpose'].title} icon={SECTION_LABELS['purpose'].icon} defaultOpen={SECTION_LABELS['purpose'].defaultOpen}>
            <p>{exam.purpose}</p>
            {exam._aiPurpose && <p className="text-purple-600 text-xs mt-2 pt-2 border-t border-purple-100">{exam._aiPurpose}</p>}
          </CollapsibleSection>
        )}

        {/* Principle — last: least urgent */}
        {exam.principle && (
          <CollapsibleSection title={SECTION_LABELS['principle'].title} icon={SECTION_LABELS['principle'].icon} defaultOpen={SECTION_LABELS['principle'].defaultOpen}>
            <p>{exam.principle}</p>
            {exam._aiPrinciple && <p className="text-purple-600 text-xs mt-2 pt-2 border-t border-purple-100">{exam._aiPrinciple}</p>}
          </CollapsibleSection>
        )}

        {/* Disclaimer */}
        <p className="text-xs text-slate-400 text-center pt-4">
          本信息由 AI 整理自医学知识库，仅供参考。具体检查方案请遵医嘱。
        </p>
      </main>

      <style>{`@keyframes slideUp { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }`}</style>
    </div>
  );
}
