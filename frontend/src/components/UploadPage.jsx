import { useState, useRef } from 'react';
const API_BASE = '/api';
async function uploadOCR(file) {
  const formData = new FormData(); formData.append('file', file);
  const res = await fetch(`${API_BASE}/ocr/upload`, { method: 'POST', body: formData });
  if (!res.ok) throw new Error('OCR请求失败');
  return res.json();
}
const IconUpload = () => (<svg width="40" height="40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"/></svg>);
const IconDoc = () => (<svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"/></svg>);
const IconSparkle = () => (<svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"/></svg>);
const IconTarget = () => (<svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0Z"/><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0Z"/></svg>);
const IconList = () => (<svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15a2.25 2.25 0 012.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25Z"/></svg>);

const FEATURES = [
  { icon: <IconSparkle />, color: '#4A8FCD', title: 'AI解读', desc: '临床知识驱动的智能分析' },
  { icon: <IconTarget />, color: '#5BBA8B', title: '风险分层', desc: '红橙黄绿四级风险标识' },
  { icon: <IconList />, color: '#F0A04B', title: '就医建议', desc: '科室推荐+检查指引' },
];

export default function UploadPage({ onSubmit, onBack, error }) {
  const [stage, setStage] = useState('upload');
  const [mode, setMode] = useState('form');
  const [showManual, setShowManual] = useState(true);
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('');
  const [indicatorText, setIndicatorText] = useState('');
  const [indicators, setIndicators] = useState([{ name: '', value: '', unit: '' }]);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [ocrResult, setOcrResult] = useState(null);
  const [ocrError, setOcrError] = useState(null);
  const fileInputRef = useRef(null);

  const addRow = () => setIndicators([...indicators, { name: '', value: '', unit: '' }]);
  const updateRow = (i, field, val) => { const next = [...indicators]; next[i] = { ...next[i], [field]: val }; setIndicators(next); };
  const removeRow = (i) => { if (indicators.length > 1) setIndicators(indicators.filter((_, idx) => idx !== i)); };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    setImageFile(file); setOcrError(null); setOcrResult(null);
    const reader = new FileReader(); reader.onload = (ev) => setImagePreview(ev.target.result); reader.readAsDataURL(file);
  };
  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0]; if (!file || !file.type.startsWith('image/')) return;
    setImageFile(file); setOcrError(null); setOcrResult(null);
    const reader = new FileReader(); reader.onload = (ev) => setImagePreview(ev.target.result); reader.readAsDataURL(file);
  };
  const handleOCR = async () => {
    if (!imageFile) return; setStage('ocr-loading'); setOcrError(null);
    try {
      const res = await uploadOCR(imageFile);
      if (res.success) { setOcrResult(res.data); setStage('ocr-review'); }
      else { setOcrError(res.error || '识别失败'); setStage('upload'); }
    } catch (e) { setOcrError(e.message || '网络错误'); setStage('upload'); }
  };
  const updateOcrIndicator = (i, field, val) => {
    const next = { ...ocrResult }; const inds = [...next.indicators];
    inds[i] = { ...inds[i], [field]: field === 'value' ? parseFloat(val) || val : val };
    next.indicators = inds; setOcrResult(next);
  };
  const handleSubmit = (e) => {
    e?.preventDefault();
    let data;
    if (ocrResult) data = ocrResult.indicators;
    else if (mode === 'text') data = indicatorText.split('\n').filter((l) => l.trim()).map((line) => { const [name, value, unit] = line.split(',').map((s) => s.trim()); return { name: name || '', value: parseFloat(value) || value, unit: unit || '', reference_range: '' }; });
    else data = indicators.filter((ind) => ind.name && ind.value);
    if (data.length === 0) return;
    const userAge = ocrResult?.age || (age ? parseInt(age) : null);
    const userGender = ocrResult?.gender || gender || null;
    onSubmit(data, userAge, userGender);
  };

  const s = { bg:'#e8ecf1', card:'#edf1f5', text:'#1e293b', sub:'#475569', mute:'#64748b', accent:'#4A8FCD', err:'#E06060' };
  const neuCard = { background:s.card, borderRadius:20, boxShadow:'8px 8px 16px rgba(174,180,190,0.35), -6px -6px 14px rgba(255,255,255,0.8)' };
  const neuInset = { background:s.bg, borderRadius:16, boxShadow:'inset 3px 3px 6px rgba(174,180,190,0.3), inset -3px -3px 6px rgba(255,255,255,0.7)' };
  const neuBtn = { display:'inline-flex',alignItems:'center',justifyContent:'center',padding:'13px 28px',background:s.accent,color:'#fff',fontSize:'0.9375rem',fontWeight:600,border:'none',borderRadius:16,cursor:'pointer',width:'100%',boxShadow:'4px 4px 8px rgba(174,180,190,0.35), -4px -4px 8px rgba(255,255,255,0.7), 0 4px 12px rgba(74,143,205,0.2)' };

  return (
    <div style={{minHeight:'100vh',background:s.bg}}>
      {/* Header */}
      <div className="neu-header" style={{padding:'16px 20px'}}>
        <div className="neu-container">
          <button onClick={onBack} className="neu-icon-btn" style={{marginBottom:16}}>
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5"/></svg>
          </button>
          <div style={{textAlign:'center'}}>
            <div style={{width:52,height:52,borderRadius:16,background:'rgba(74,143,205,0.08)',display:'inline-flex',alignItems:'center',justifyContent:'center',marginBottom:12,color:s.accent}}><IconDoc /></div>
            <h1 style={{fontSize:'1.25rem',fontWeight:700,color:s.text,margin:0}}>智能体检报告解读</h1>
            <p style={{fontSize:'0.8125rem',color:s.sub,marginTop:4}}>拍照上传体检报告，AI 秒懂每项指标</p>
          </div>
        </div>
      </div>

      <main className="neu-container neu-safe-bottom" style={{paddingTop:16}}>
        {/* Error alerts */}
        {error && <div style={{...neuCard,background:'#fdeded',color:s.err,padding:'12px 16px',fontSize:'0.875rem',marginBottom:16,borderRadius:16}}>{error}</div>}
        {ocrError && (
          <div className="neu-card" style={{background:'#fef3ed',color:'#C46A3A',padding:'14px 16px',fontSize:'0.8125rem',marginBottom:16,borderRadius:16,lineHeight:1.6}}>
            <strong>图片识别暂不可用</strong><br/>
            {ocrError.includes('Tesseract') ? (
              <>需要安装 Tesseract OCR 才能识别图片。你也可以直接使用下方的<strong>手动输入</strong>或<strong>体验 Demo</strong>。</>
            ) : (
              <>{ocrError}</>
            )}
          </div>
        )}

        {/* Upload Area */}
        {!ocrResult && (
          <div
            onDrop={handleDrop} onDragOver={(e) => e.preventDefault()}
            onClick={() => fileInputRef.current?.click()}
            className="neu-card"
            style={{padding:32,textAlign:'center',cursor:'pointer',border:'none',marginBottom:16,background:imagePreview?'rgba(74,143,205,0.04)':s.card}}
          >
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelect} style={{display:'none'}}/>
            {imagePreview ? (
              <div>
                <img src={imagePreview} alt="preview" style={{maxHeight:180,margin:'0 auto 16px',borderRadius:12,border:'1px solid rgba(0,0,0,0.06)'}}/>
                <p style={{fontSize:'0.8125rem',color:s.mute}}>点击重新选择图片</p>
              </div>
            ) : (
              <div>
                <div style={{color:s.mute,marginBottom:12,display:'flex',justifyContent:'center'}}><IconUpload /></div>
                <p style={{fontSize:'0.9375rem',fontWeight:600,color:s.text,margin:'0 0 4px'}}>点击上传体检报告</p>
                <p style={{fontSize:'0.75rem',color:s.mute,margin:0}}>支持 JPG / PNG，或拖拽到此处</p>
              </div>
            )}
          </div>
        )}

        {/* OCR Loading */}
        {stage === 'ocr-loading' && (
          <div className="neu-card" style={{padding:'24px 16px',textAlign:'center',marginBottom:16}}>
            <div style={{display:'flex',justifyContent:'center',gap:6,marginBottom:12}}>
              {[0,150,300].map((d,i)=><span key={i} className="animate-bounce" style={{width:8,height:8,borderRadius:'50%',background:s.accent,animationDelay:d+'ms'}}/>)}
            </div>
            <p style={{fontSize:'0.875rem',color:s.sub,margin:0}}>AI 正在识别报告中的指标...</p>
          </div>
        )}

        {/* OCR Button */}
        {imagePreview && !ocrResult && stage !== 'ocr-loading' && (
          <button onClick={handleOCR} style={neuBtn}>开始识别</button>
        )}

        {/* OCR Review */}
        {stage === 'ocr-review' && ocrResult && (
          <div className="neu-card" style={{overflow:'hidden',marginBottom:16}}>
            <div style={{padding:'14px 16px',background:'rgba(74,143,205,0.05)',display:'flex',alignItems:'center',gap:10}}>
              <span style={{color:s.accent}}><IconSparkle /></span>
              <div><h3 style={{fontSize:'0.875rem',fontWeight:600,color:s.accent,margin:0}}>已识别 {ocrResult.indicators?.length||0} 项指标</h3>
              <p style={{fontSize:'0.75rem',color:s.sub,margin:0}}>请核对并修改，确认无误后开始解读</p></div>
            </div>
            <div style={{padding:'4px 0'}}>
              {(ocrResult.indicators||[]).map((ind,i)=>(
                <div key={i} style={{display:'grid',gridTemplateColumns:'5fr 3fr 4fr',gap:8,padding:'10px 16px',borderBottom:'1px solid rgba(0,0,0,0.04)',alignItems:'center'}}>
                  <input value={ind.name||''} onChange={(e)=>updateOcrIndicator(i,'name',e.target.value)}
                    className="neu-input" style={{padding:'10px 12px',fontSize:'0.8125rem'}} placeholder="指标名"/>
                  <input value={ind.value||''} onChange={(e)=>updateOcrIndicator(i,'value',e.target.value)}
                    className="neu-input" style={{padding:'10px 12px',fontSize:'0.8125rem'}} placeholder="数值"/>
                  <input value={ind.unit||''} onChange={(e)=>updateOcrIndicator(i,'unit',e.target.value)}
                    className="neu-input" style={{padding:'10px 12px',fontSize:'0.8125rem'}} placeholder="单位"/>
                </div>
              ))}
            </div>
            <div style={{padding:'14px 16px',background:'rgba(0,0,0,0.02)'}}>
              <button onClick={handleSubmit} style={neuBtn}>确认并开始解读</button>
            </div>
          </div>
        )}

        {/* Manual Input (collapsible) */}
        {!ocrResult && (
          <div className="neu-card" style={{overflow:'hidden',marginBottom:16}}>
            <button onClick={()=>setShowManual(!showManual)} style={{width:'100%',padding:'14px 16px',display:'flex',alignItems:'center',justifyContent:'space-between',background:'none',border:'none',cursor:'pointer',color:s.text,fontSize:'0.875rem',fontWeight:500}}>
              <span style={{display:'flex',alignItems:'center',gap:10}}><span style={{color:s.mute}}><IconList /></span>或手动输入指标</span>
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" style={{transform:showManual?'rotate(180deg)':'',transition:'transform .2s'}}><path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5"/></svg>
            </button>
            {showManual && (
              <div style={{padding:'0 16px 16px'}}>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:16}}>
                  <div><label style={{display:'block',fontSize:'0.75rem',fontWeight:500,color:s.sub,marginBottom:6}}>年龄</label>
                    <input type="number" value={age} onChange={(e)=>setAge(e.target.value)} placeholder="如 28" className="neu-input" style={{padding:'10px 14px',fontSize:'0.875rem'}}/></div>
                  <div><label style={{display:'block',fontSize:'0.75rem',fontWeight:500,color:s.sub,marginBottom:6}}>性别</label>
                    <select value={gender} onChange={(e)=>setGender(e.target.value)} className="neu-input" style={{padding:'10px 14px',fontSize:'0.875rem'}}><option value="">请选择</option><option value="男性">男性</option><option value="女性">女性</option></select></div>
                </div>
                <div style={{display:'flex',gap:8,marginBottom:16}}>
                  {['表单输入','文本粘贴'].map((t,i)=>(<button key={t} onClick={()=>setMode(i?'text':'form')} className="neu-chip" style={{border:'none',cursor:'pointer',background:mode===(i?'text':'form')?s.accent:'#e8ecf1',color:mode===(i?'text':'form')?'#fff':s.sub}}>{t}</button>))}
                </div>
                {mode==='text'?(
                  <textarea value={indicatorText} onChange={(e)=>setIndicatorText(e.target.value)} rows={5} className="neu-input" style={{fontFamily:'monospace',fontSize:'0.8125rem',marginBottom:16,resize:'vertical'}} placeholder={"每行一个指标，格式：名称,数值,单位\n例如：ALT,85,U/L\nAST,62,U/L"}/>
                ):(
                  <div className="neu-inset" style={{marginBottom:16,overflow:'hidden'}}>
                    {indicators.map((ind,i)=>(<div key={i} style={{display:'grid',gridTemplateColumns:'5fr 3fr 3fr 1fr',gap:6,padding:'10px 12px',borderBottom:'1px solid rgba(0,0,0,0.04)',alignItems:'center'}}>
                      <input value={ind.name} onChange={(e)=>updateRow(i,'name',e.target.value)} placeholder="指标名" className="neu-input" style={{padding:'8px 10px',fontSize:'0.8125rem'}}/>
                      <input value={ind.value} onChange={(e)=>updateRow(i,'value',e.target.value)} placeholder="数值" className="neu-input" style={{padding:'8px 10px',fontSize:'0.8125rem'}}/>
                      <input value={ind.unit} onChange={(e)=>updateRow(i,'unit',e.target.value)} placeholder="单位" className="neu-input" style={{padding:'8px 10px',fontSize:'0.8125rem'}}/>
                      <button onClick={()=>removeRow(i)} style={{background:'none',border:'none',color:s.mute,cursor:'pointer',fontSize:'1.25rem'}}>&times;</button>
                    </div>))}
                    <button onClick={addRow} style={{width:'100%',padding:'12px',background:'none',border:'none',color:s.accent,fontSize:'0.875rem',fontWeight:500,cursor:'pointer'}}>+ 添加指标</button>
                  </div>
                )}
                {indicators.some((ind)=>ind.name&&ind.value)&&(<button onClick={handleSubmit} style={neuBtn}>开始解读</button>)}
              </div>
            )}
          </div>
        )}

        {/* Demo button — always available */}
        {!ocrResult && !imagePreview && (
          <button onClick={() => onSubmit([], null, null)}
            className="neu-btn"
            style={{display:'block',width:'100%',marginBottom:24,background:'rgba(91,186,139,0.12)',color:'#3D8B60',fontSize:'0.875rem',boxShadow:'3px 3px 6px rgba(174,180,190,0.2), -3px -3px 6px rgba(255,255,255,0.7)'}}>
            ✨ 体验 Demo（加载模拟体检报告）
          </button>
        )}

        {/* Feature cards */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10,marginBottom:24}}>
          {FEATURES.map((f)=>(<div key={f.title} className="neu-flat" style={{padding:18,textAlign:'center'}}>
            <div style={{width:40,height:40,borderRadius:14,background:'rgba(0,0,0,0.03)',display:'inline-flex',alignItems:'center',justifyContent:'center',marginBottom:10,color:f.color}}>{f.icon}</div>
            <h4 style={{fontSize:'0.8125rem',fontWeight:600,color:s.text,margin:'0 0 2px'}}>{f.title}</h4>
            <p style={{fontSize:'0.6875rem',color:s.mute,margin:0,lineHeight:1.4}}>{f.desc}</p>
          </div>))}
        </div>

        <p style={{fontSize:'0.6875rem',color:s.mute,textAlign:'center',paddingBottom:32}}>本解读由AI生成，仅供参考，不构成医疗诊断建议。如有不适请及时就医。</p>
      </main>
    </div>
  );
}