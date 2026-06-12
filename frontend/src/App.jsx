import { useState, useEffect } from 'react';
import UploadPage from './components/UploadPage';
import ResultPage from './components/ResultPage';
import SymptomChat from './components/SymptomChat';
import ExamList from './components/ExamList';
import ExamDetail from './components/ExamDetail';
import DiseaseExamView from './components/DiseaseExamView';
import InsurancePage from './components/InsurancePage';
import ArchitecturePage from './components/ArchitecturePage';
import FeedbackPage from './components/FeedbackPage';
import { interpretReport, fetchDemo } from './api';

const MODULES = [
  {
    id: 'symptom',
    title: '智能症状分诊',
    desc: '不舒服不知道挂什么科？AI 帮你判断',
    color: '#5BBA8B',
    bg: 'rgba(91,186,139,0.08)',
    icon: <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10"/><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15"/></svg>,
  },
  {
    id: 'report',
    title: '体检报告解读',
    desc: '拍照上传体检报告，AI 秒懂每项指标',
    color: '#4A8FCD',
    bg: 'rgba(74,143,205,0.08)',
    icon: <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"/></svg>,
  },
  {
    id: 'exam',
    title: '检查项目解释',
    desc: '检查单看不懂？每项检查逐项拆解讲明白',
    color: '#F0A04B',
    bg: 'rgba(240,160,75,0.08)',
    icon: <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15a2.25 2.25 0 012.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25Z"/></svg>,
  },
  {
    id: 'insurance',
    title: '医保查询',
    desc: '查药品/检查医保覆盖，按疾病估算费用',
    color: '#9B8EC4',
    bg: 'rgba(155,142,196,0.08)',
    icon: <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0Z"/></svg>,
  },
];

function HomePage({ onNavigate }) {
  const s = {bg:'#e8ecf1',card:'#edf1f5',text:'#1e293b',sub:'#475569',mute:'#64748b',accent:'#4A8FCD'};
  const [guideOpen, setGuideOpen] = useState(false);
  const [guideTab, setGuideTab] = useState(0);
  return (
    <div style={{minHeight:'100vh',background:s.bg}}>
      {/* ── DESKTOP LAYOUT ── */}
      <div style={{display:'none'}} className="neu-dt-home">
        <div className="neu-container" style={{paddingTop:48,paddingBottom:48}}>
          {/* Hero Section */}
          <div style={{textAlign:'center',marginBottom:48}}>
            <div style={{width:72,height:72,borderRadius:22,background:s.accent,display:'inline-flex',alignItems:'center',justifyContent:'center',marginBottom:20,
              boxShadow:'10px 10px 20px rgba(174,180,190,0.35), -8px -8px 16px rgba(255,255,255,0.8), 0 8px 24px rgba(74,143,205,0.2)'}}>
              <svg width="36" height="36" fill="none" viewBox="0 0 24 24" stroke="#fff" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15"/><circle cx="12" cy="12" r="10"/></svg>
            </div>
            <h1 style={{fontSize:'2.25rem',fontWeight:700,color:s.text,letterSpacing:'-0.02em',margin:'0 0 10px'}}>就医全流程 AI 导航</h1>
            <p style={{fontSize:'1.125rem',color:s.accent,fontWeight:500,margin:'0 0 8px'}}>不是替代医生，是让你看医生之前心里有底</p>
            <p style={{fontSize:'0.9375rem',color:s.sub,margin:'0 auto',maxWidth:600,lineHeight:1.7}}>
              直接用 AI 问诊？回答没来源、不追问细节、不标注可信度。<br/>
              我们给 AI 套上<strong style={{color:s.text}}>知识库缰绳</strong> + <strong style={{color:s.text}}>安全护栏</strong> + <strong style={{color:s.text}}>来源标签</strong>——让每次回答都可溯源。
            </p>
          </div>

          {/* 4 Module Cards Grid */}
          <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:16,marginBottom:48}}>
            {MODULES.map((m,i)=>
              <button key={m.id} onClick={()=>onNavigate(m.id)} className="neu-card"
                style={{display:'flex',flexDirection:'column',alignItems:'flex-start',padding:'28px 22px',border:'none',cursor:'pointer',textAlign:'left',animation:`neu-slide-up .4s cubic-bezier(.25,.46,.45,.94) both`,animationDelay:`${i*.1}s`}}>
                <div style={{width:48,height:48,borderRadius:14,background:m.bg,display:'flex',alignItems:'center',justifyContent:'center',marginBottom:16,color:m.color}}>{m.icon}</div>
                <span style={{fontSize:'0.9375rem',fontWeight:600,color:s.text,marginBottom:4}}>{m.title}</span>
                <span style={{fontSize:'0.75rem',color:s.mute,lineHeight:1.5}}>{m.desc}</span>
              </button>
            )}
          </div>

          {/* Guide toggle */}
          <div style={{textAlign:'center',marginBottom:48}}>
            <button onClick={() => setGuideOpen(true)}
              className="neu-chip" style={{border:'none',cursor:'pointer',fontSize:'0.875rem',padding:'12px 28px'}}>
              📖 使用教程
            </button>
          </div>

          {/* Why This vs Raw AI */}
          <div style={{marginBottom:48}}>
            <h2 style={{fontSize:'1.25rem',fontWeight:700,color:s.text,textAlign:'center',marginBottom:32}}>为什么不用直接问 AI？</h2>
            <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:16}}>
              {[
                {t:'信息可溯源',d:'每条 AI 回答标注来源——[知识库] 是经过整理的医学数据，[AI分析] 是大模型补充。知道信息从哪来，才知道能不能信',icon:'🔍'},
                {t:'结构化追问',d:'直接问 AI"头疼"，它不会追问年龄、部位、伴随症状。我们内置 7 步问诊框架，确保不遗漏关键信息',icon:'📋'},
                {t:'安全边界',d:'紧急情况 1 毫秒内识别并警告。禁止 AI 给出"你得了XX病"的确定性诊断。比裸用大模型多一道安全保障',icon:'🛡️'},
              ].map((f,i)=>
                <div key={i} className="neu-card" style={{padding:'24px 20px',textAlign:'center',border:'none'}}>
                  <div style={{fontSize:'2rem',marginBottom:12}}>{f.icon}</div>
                  <h3 style={{fontSize:'0.9375rem',fontWeight:600,color:s.text,margin:'0 0 8px'}}>{f.t}</h3>
                  <p style={{fontSize:'0.8125rem',color:s.sub,lineHeight:1.6,margin:0}}>{f.d}</p>
                </div>
              )}
            </div>
          </div>

          {/* Data & Trust Section */}
          <div className="neu-card" style={{padding:'32px',border:'none',marginBottom:32}}>
            <h2 style={{fontSize:'1.125rem',fontWeight:700,color:s.text,textAlign:'center',margin:'0 0 8px'}}>数据来源与可信度说明</h2>
            <p style={{fontSize:'0.8125rem',color:s.mute,textAlign:'center',margin:'0 0 24px'}}>透明是我们建立信任的方式。这是我们数据的来源、覆盖范围和局限。</p>
            <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:16}}>
              <div>
                <h4 style={{fontSize:'0.8125rem',fontWeight:600,color:s.text,margin:'0 0 6px'}}>知识库来源</h4>
                <ul style={{fontSize:'0.75rem',color:s.sub,lineHeight:1.8,margin:0,paddingLeft:16}}>
                  <li>国家医保局公开目录（药品分类/报销比例）</li>
                  <li>临床指南（中华医学会各分会）</li>
                  <li>国家集采中选价格公示</li>
                  <li>医学教材/公开文献</li>
                </ul>
              </div>
              <div>
                <h4 style={{fontSize:'0.8125rem',fontWeight:600,color:s.text,margin:'0 0 6px'}}>为什么不用官方 API？</h4>
                <ul style={{fontSize:'0.75rem',color:s.sub,lineHeight:1.8,margin:0,paddingLeft:16}}>
                  <li>国家医保平台暂无公开药品查询 API</li>
                  <li>各地医保政策差异大（市级统筹）</li>
                  <li>官方目录更新滞后 3-6 个月</li>
                  <li>本产品标注来源，用户可自行核实</li>
                </ul>
              </div>
              <div>
                <h4 style={{fontSize:'0.8125rem',fontWeight:600,color:s.text,margin:'0 0 6px'}}>当前局限</h4>
                <ul style={{fontSize:'0.75rem',color:s.sub,lineHeight:1.8,margin:0,paddingLeft:16}}>
                  <li>知识库覆盖 ~82 病种 / ~83 检查</li>
                  <li>罕见病/特殊检查依赖 AI 补充</li>
                  <li>医保政策可能变动，请以当地医保局为准</li>
                  <li>AI 价格估算仅供参考</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Stats + Disclaimer */}
          <div style={{display:'flex',justifyContent:'center',gap:48,marginBottom:24}}>
            {[{n:'4',l:'功能模块'},{n:'83+',l:'检查项目'},{n:'82+',l:'病种覆盖'},{n:'5',l:'知识库文件'}].map(st=>
              <div key={st.l} style={{textAlign:'center'}}><div style={{fontSize:'1.5rem',fontWeight:700,color:s.accent}}>{st.n}</div><div style={{fontSize:'0.75rem',color:s.mute}}>{st.l}</div></div>
            )}
          </div>
          <p style={{fontSize:'0.6875rem',color:s.mute,textAlign:'center',marginBottom:0}}>
            本工具由 AI 驱动，仅供参考，不构成医疗诊断建议。如有不适请及时就医。
            <br/>知识库最后更新：2026 年 5 月 · AI 模型：DeepSeek · 来源标注体系：10 种标签
            <br/><button onClick={()=>onNavigate('architecture')} className="neu-chip" style={{border:'none',cursor:'pointer',marginTop:10,fontSize:'0.75rem',marginRight:8}}>查看技术架构 →</button>
            <button onClick={()=>onNavigate('feedback')} className="neu-btn-ghost" style={{marginTop:10,fontSize:'0.8125rem',color:'#5BBA8B',padding:'10px 20px',boxShadow:'2px 2px 5px rgba(174,180,190,0.25), -2px -2px 5px rgba(255,255,255,0.7)',borderRadius:9999}}>💬 提交反馈</button>
          </p>
        </div>
      </div>

      {/* ── MOBILE LAYOUT ── */}
      <div className="neu-mobile-home" style={{minHeight:'100vh',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:'24px 16px'}}>
        <div style={{textAlign:'center',marginBottom:36}}>
          <div style={{width:64,height:64,borderRadius:20,background:s.accent,display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 16px',
            boxShadow:'8px 8px 16px rgba(174,180,190,0.35), -6px -6px 14px rgba(255,255,255,0.8), 0 6px 20px rgba(74,143,205,0.2)'}}>
            <svg width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="#fff" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15"/><circle cx="12" cy="12" r="10"/></svg>
          </div>
          <h1 style={{fontSize:'1.375rem',fontWeight:700,color:s.text,letterSpacing:'-0.01em',margin:0}}>就医全流程 AI 导航</h1>
          <p style={{fontSize:'0.8125rem',color:s.mute,marginTop:6,marginBottom:0}}>从症状自查到报告解读，AI 帮你就医全程不迷路</p>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14,width:'100%',maxWidth:420}}>
          {MODULES.map((m,i)=>
            <button key={m.id} onClick={()=>onNavigate(m.id)} className="neu-card"
              style={{display:'flex',flexDirection:'column',alignItems:'flex-start',padding:'22px 18px',border:'none',cursor:'pointer',textAlign:'left',width:'100%',animation:`neu-slide-up .35s cubic-bezier(.25,.46,.45,.94) both`,animationDelay:`${i*.08}s`}}>
              <div style={{width:44,height:44,borderRadius:14,background:m.bg,display:'flex',alignItems:'center',justifyContent:'center',marginBottom:14,color:m.color}}>{m.icon}</div>
              <span style={{fontSize:'0.875rem',fontWeight:600,color:s.text,marginBottom:4}}>{m.title}</span>
              <span style={{fontSize:'0.75rem',color:s.mute,lineHeight:1.5}}>{m.desc}</span>
            </button>
          )}
        </div>
        <p style={{fontSize:'0.6875rem',color:s.mute,textAlign:'center',marginTop:32,marginBottom:0}}>本工具由 AI 驱动，仅供参考，不构成医疗诊断建议</p>

        <div style={{textAlign:'center',marginTop:20}}>
          <button onClick={() => setGuideOpen(true)}
            className="neu-chip" style={{border:'none',cursor:'pointer',fontSize:'0.8125rem',padding:'10px 22px'}}>
            📖 使用教程
          </button>
        </div>
      </div>

      {/* Guide Modal */}
      {guideOpen && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.45)',zIndex:100,display:'flex',alignItems:'center',justifyContent:'center',padding:16}} onClick={() => setGuideOpen(false)}>
          <div className="neu-card" style={{maxWidth:900,width:'100%',maxHeight:'90vh',overflow:'auto',padding:'28px 24px',border:'none'}} onClick={e => e.stopPropagation()}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:20}}>
              <h2 style={{fontSize:'1.125rem',fontWeight:700,color:'#1e293b',margin:0}}>📖 使用教程</h2>
              <button onClick={() => setGuideOpen(false)} style={{background:'none',border:'none',fontSize:'1.5rem',color:'#64748b',cursor:'pointer',lineHeight:1}}>✕</button>
            </div>

            {/* Desktop guide: 4-column grid */}
            <div style={{display:'none'}} className="neu-dt-home">
              <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:14}}>
                {[
                  {icon:'🔍',title:'智能症状分诊',steps:['输入症状','AI 对话式追问','紧急症状预警','推荐科室+建议']},
                  {icon:'📄',title:'体检报告解读',steps:['拍照上传报告','AI 逐项分析','指标详解+风险判定','个性化就医建议']},
                  {icon:'📋',title:'检查项目解释',steps:['搜索/浏览检查项目','查看检查流程','准备事项+疼痛等级','费用+医保+等待时间']},
                  {icon:'💰',title:'医保查询',steps:['输入药品或病种','医保目录匹配','报销比例查询','费用估算']},
                ].map(g =>
                  <div key={g.title} className="neu-flat" style={{padding:'18px 16px',borderRadius:14}}>
                    <div style={{fontSize:'1.5rem',marginBottom:10}}>{g.icon}</div>
                    <div style={{fontSize:'0.875rem',fontWeight:700,color:'#1e293b',marginBottom:12}}>{g.title}</div>
                    <div style={{display:'flex',flexDirection:'column',gap:6}}>
                      {g.steps.map((step,si) =>
                        <div key={si} style={{display:'flex',alignItems:'center',gap:8}}>
                          <span style={{width:20,height:20,borderRadius:'50%',background:'#e8ecf1',color:'#475569',fontSize:'0.6875rem',fontWeight:700,display:'inline-flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>{si+1}</span>
                          <span style={{fontSize:'0.8125rem',color:'#475569'}}>{step}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Mobile guide: swipeable tabs */}
            <div className="neu-mobile-home" style={{display:'block'}}>
              <div style={{display:'flex',gap:8,marginBottom:16,overflowX:'auto'}}>
                {['智能症状分诊','体检报告解读','检查项目解释','医保查询'].map((t,i) =>
                  <button key={i} onClick={() => setGuideTab(i)}
                    style={{flex:'1 0 auto',padding:'8px 14px',borderRadius:20,border:'none',cursor:'pointer',fontSize:'0.75rem',fontWeight:guideTab===i?700:400,background:guideTab===i?'rgba(74,143,205,0.1)':'#e8ecf1',color:guideTab===i?'#4A8FCD':'#475569'}}>
                    {['🔍 ','📄 ','📋 ','💰 '][i]}{t}
                  </button>
                )}
              </div>
              {[
                {icon:'🔍',title:'智能症状分诊',steps:['输入症状','AI 对话式追问','紧急症状预警','推荐科室+建议']},
                {icon:'📄',title:'体检报告解读',steps:['拍照上传报告','AI 逐项分析','指标详解+风险判定','个性化就医建议']},
                {icon:'📋',title:'检查项目解释',steps:['搜索/浏览检查项目','查看检查流程','准备事项+疼痛等级','费用+医保+等待时间']},
                {icon:'💰',title:'医保查询',steps:['输入药品或病种','医保目录匹配','报销比例查询','费用估算']},
              ].map((g,i) => guideTab===i && (
                <div key={g.title} className="neu-flat" style={{padding:'20px 16px',borderRadius:14}}>
                  <div style={{fontSize:'1.5rem',marginBottom:10}}>{g.icon}</div>
                  <div style={{fontSize:'0.9375rem',fontWeight:700,color:'#1e293b',marginBottom:14}}>{g.title}</div>
                  <div style={{display:'flex',flexDirection:'column',gap:8}}>
                    {g.steps.map((step,si) =>
                      <div key={si} style={{display:'flex',alignItems:'center',gap:10}}>
                        <span style={{width:24,height:24,borderRadius:'50%',background:'#e8ecf1',color:'#475569',fontSize:'0.75rem',fontWeight:700,display:'inline-flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>{si+1}</span>
                        <span style={{fontSize:'0.875rem',color:'#475569'}}>{step}</span>
                      </div>
                    )}
                  </div>
                  {/* Swipe hint */}
                  <div style={{display:'flex',justifyContent:'center',gap:6,marginTop:16}}>
                    {[0,1,2,3].map(di => <div key={di} style={{width:6,height:6,borderRadius:'50%',background:guideTab===di?'#4A8FCD':'#cbd5e1'}}/>)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [page, setPage] = useState('home');
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [selectedExam, setSelectedExam] = useState(null);
  const [selectedExamAI, setSelectedExamAI] = useState(null);
  const [detailFromPage, setDetailFromPage] = useState('exam');

  // Browser history integration — makes back/forward button work
  const navigate = (p) => {
    window.history.pushState({page:p}, '', '');
    setPage(p);
  };

  useEffect(() => {
    const onPop = (e) => {
      if (e.state?.page) setPage(e.state.page);
      else setPage('home');
    };
    window.addEventListener('popstate', onPop);
    // Push initial state
    window.history.replaceState({page:'home'}, '', '');
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const handleUpload = async (indicators, age, gender) => {
    setPage('loading');
    setError(null);
    try {
      const res = await interpretReport(indicators, age, gender);
      if (res.success) {
        setResult(res.data);
        navigate('result');
      } else {
        setError(res.error || '解读失败');
        navigate('report');
      }
    } catch (e) {
      setError(e.message || '网络错误');
      navigate('report');
    }
  };

  const handleDemo = async () => {
    setPage('loading');
    setError(null);
    try {
      const res = await fetchDemo();
      if (res.success) {
        setResult(res.data);
        navigate('result');
      } else {
        setError(res.error || 'Demo加载失败');
        navigate('report');
      }
    } catch (e) {
      setError('网络错误，请确认后端已启动 (localhost:8001)');
      navigate('report');
    }
  };

  const handleBack = () => {
    goBack();
    setResult(null);
    setError(null);
  };

  const handleHome = () => {
    navigate('home');
    setResult(null);
    setError(null);
  };

  // Generic back: uses browser history so it always goes to previous page
  const goBack = () => window.history.back();

  // Replace: ExamDetail back now uses goBack
  // (handleBackFromDetail removed — replaced by goBack)

  if (page === 'home') {
    return <HomePage onNavigate={navigate} />;
  }

  if (page === 'loading') {
    return <LoadingSkeleton onBack={handleBack} />;
  }

  if (page === 'result' && result) {
    return <ResultPage data={result} onBack={handleBack} />;
  }

  if (page === 'symptom') {
    return <SymptomChat onBack={goBack} />;
  }

  if (page === 'exam') {
    return (
      <ExamList
        onBack={goBack}
        onSelectExam={(name) => { setSelectedExam(name); setSelectedExamAI(null); setDetailFromPage('exam'); navigate('examDetail'); }}
        onSelectExamWithAI={(name, aiData) => { setSelectedExam(name); setSelectedExamAI(aiData); setDetailFromPage('exam'); navigate('examDetail'); }}
        onDiseaseCheck={() => navigate('diseaseExam')}
      />
    );
  }

  if (page === 'diseaseExam') {
    return (
      <DiseaseExamView
        onBack={goBack}
        onSelectExam={(name) => { setDetailFromPage('diseaseExam'); setSelectedExam(name); navigate('examDetail'); }}
      />
    );
  }

  if (page === 'examDetail' && selectedExam) {
    return (
      <ExamDetail
        examName={selectedExam}
        examAI={selectedExamAI}
        onBack={goBack}
      />
    );
  }

  if (page === 'insurance') {
    return <InsurancePage onBack={goBack} />;
  }

  if (page === 'architecture') {
    return <ArchitecturePage onBack={goBack} />;
  }

  if (page === 'feedback') {
    return <FeedbackPage onBack={goBack} />;
  }

  return <UploadPage onSubmit={handleUpload} onBack={goBack} error={error} />;
}

function LoadingSkeleton({ onBack }) {
  return (
    <div style={{minHeight:'100vh',background:'#e8ecf1',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:24}}>
      <div className="neu-card" style={{width:'100%',maxWidth:480,padding:32}}>
        <div style={{textAlign:'center',marginBottom:24}}>
          <div style={{width:48,height:48,borderRadius:14,background:'#e8ecf1',margin:'0 auto 16px',
            boxShadow:'inset 3px 3px 6px rgba(174,180,190,0.3), inset -3px -3px 6px rgba(255,255,255,0.7)',
            display:'flex',alignItems:'center',justifyContent:'center'}}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#4A8FCD" strokeWidth="1.5" style={{animation:'neu-pulse 1.5s ease-in-out infinite'}}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z"/>
            </svg>
          </div>
          <p style={{fontSize:'0.9375rem',fontWeight:600,color:'#1e293b',margin:0}}>AI 正在分析您的报告</p>
          <p style={{fontSize:'0.8125rem',color:'#64748b',marginTop:4}}>请稍候...</p>
        </div>
        <button onClick={onBack} className="neu-chip" style={{border:'none',cursor:'pointer',margin:'0 auto',display:'block'}}>取消</button>
      </div>
    </div>
  );
}
