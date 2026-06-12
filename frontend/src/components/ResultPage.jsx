import { useState, useRef, useEffect } from 'react';
const API_BASE='/api';
const RISK={low:{text:'低风险',color:'#5BBA8B',bg:'rgba(91,186,139,0.08)'},moderate:{text:'中度关注',color:'#F0A04B',bg:'rgba(240,160,75,0.08)'},high:{text:'高度关注',color:'#E8884A',bg:'rgba(232,136,74,0.08)'},urgent:{text:'需紧急就医',color:'#E06060',bg:'rgba(224,96,96,0.08)'}};
const SEV={green:{label:'正常',color:'#5BBA8B'},yellow:{label:'临界',color:'#F0A04B'},orange:{label:'关注',color:'#E8884A'},red:{label:'紧急',color:'#E06060'}};
const URG={routine:'常规就诊',soon:'建议近期就医',immediate:'尽快就医'};
const s={bg:'#e8ecf1',card:'#edf1f5',text:'#1e293b',sub:'#475569',mute:'#64748b',accent:'#4A8FCD'};

const Ic={back:()=><svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5"/></svg>,
summary:()=><svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08"/></svg>,
cross:()=><svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10"/><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15"/></svg>,
indicator:()=><svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75Z"/></svg>,
hospital:()=><svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0Z"/><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0Z"/></svg>,
lifestyle:()=><svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"/></svg>,
send:()=><svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5"/></svg>};

export default function ResultPage({data,onBack}){
  const[chatMsgs,setChatMsgs]=useState([]);
  const[chatInput,setChatInput]=useState('');
  const[chatLoading,setChatLoading]=useState(false);
  const[expandedIdx,setExpandedIdx]=useState(null);
  const endRef=useRef(null);
  const risk=RISK[data.overall_risk]||RISK.moderate;
  useEffect(()=>{endRef.current?.scrollIntoView({behavior:'smooth'})},[chatMsgs]);

  const handleChat=async(e)=>{
    e?.preventDefault();
    const t=chatInput.trim();if(!t||chatLoading)return;
    setChatMsgs(p=>[...p,{role:'user',text:t}]);setChatInput('');setChatLoading(true);
    try{
      const r=await fetch(`${API_BASE}/interpret/chat`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({question:t,report:data})});
      const d=await r.json();
      setChatMsgs(p=>[...p,{role:'ai',text:d.success?d.data.reply:'抱歉，AI暂时无法回复'}]);
    }catch{setChatMsgs(p=>[...p,{role:'ai',text:'网络错误'}])}
    finally{setChatLoading(false)}
  };

  const neuCard={background:s.card,borderRadius:20,padding:'20px',boxShadow:'8px 8px 16px rgba(174,180,190,0.3), -6px -6px 14px rgba(255,255,255,0.8)',marginBottom:16};
  const neuChip={display:'inline-block',padding:'4px 12px',borderRadius:8,fontSize:'0.75rem',fontWeight:600};

  return<div style={{minHeight:'100vh',background:s.bg,paddingBottom:180}}>
    {/* Header */}
    <div className="neu-header" style={{padding:'14px 20px'}}>
      <div className="neu-container" style={{display:'flex',alignItems:'center',gap:12}}>
        <button onClick={onBack} className="neu-icon-btn" style={{flexShrink:0}}><Ic.back/></button>
        <h1 style={{fontSize:'1.0625rem',fontWeight:700,color:s.text,margin:0}}>解读结果</h1>
      </div>
    </div>

    <main className="neu-container neu-safe-bottom" style={{paddingTop:16}}>
      {/* Overall risk */}
      <div style={{...neuCard,textAlign:'center',background:risk.bg,border:`2px solid ${risk.color}20`}}>
        <p style={{fontSize:'0.8125rem',color:s.sub,margin:'0 0 4px'}}>总体风险评估</p>
        <p style={{fontSize:'1.5rem',fontWeight:700,color:risk.color,margin:0}}>{risk.text}</p>
      </div>

      {/* Summary */}
      <div style={neuCard}>
        <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:8}}><span style={{color:s.accent}}><Ic.summary/></span><h2 style={{fontSize:'0.9375rem',fontWeight:600,color:s.text,margin:0}}>综合总结</h2></div>
        <p style={{fontSize:'0.875rem',color:s.text,lineHeight:1.6,margin:0}}>{data.summary}</p>
      </div>

      {/* Cross analysis */}
      {data.cross_analysis&&<div style={{...neuCard,background:'rgba(155,142,196,0.06)',border:'1px solid rgba(155,142,196,0.2)'}}>
        <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:8}}><span style={{color:'#9B8EC4'}}><Ic.cross/></span><h2 style={{fontSize:'0.9375rem',fontWeight:600,color:'#6B5EA8',margin:0}}>交叉分析</h2></div>
        <p style={{fontSize:'0.875rem',color:s.text,lineHeight:1.6,margin:0}}>{data.cross_analysis}</p>
      </div>}

      {/* Indicators */}
      <div style={{marginBottom:16}}>
        <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:12}}><span style={{color:s.sub}}><Ic.indicator/></span><h2 style={{fontSize:'0.9375rem',fontWeight:600,color:s.text,margin:0}}>指标详情</h2></div>
        {data.indicators?.map((ind,i)=>{
          const sev=SEV[ind.severity]||SEV.green;
          const isExpanded=expandedIdx===i;
          return<div key={i} className="neu-flat" style={{marginBottom:10,overflow:'hidden',boxShadow:ind.severity==='red'?'0 0 0 2px rgba(224,96,96,0.3), 3px 3px 6px rgba(174,180,190,0.25), -3px -3px 6px rgba(255,255,255,0.7)':undefined}}>
            <button onClick={()=>setExpandedIdx(isExpanded?null:i)} style={{width:'100%',padding:'14px 16px',display:'flex',alignItems:'center',justifyContent:'space-between',background:'none',border:'none',cursor:'pointer',color:s.text}}>
              <div style={{display:'flex',alignItems:'center',gap:10}}>
                <span style={{...neuChip,background:sev.color+'15',color:sev.color}}>{sev.label}</span>
                <span style={{fontSize:'0.875rem',fontWeight:500}}>{ind.name}</span>
              </div>
              <div style={{display:'flex',alignItems:'center',gap:8}}>
                <span style={{fontSize:'0.8125rem',color:s.sub}}>{ind.value} {ind.unit}</span>
                <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" style={{transform:isExpanded?'rotate(180deg)':'',transition:'transform .2s',color:s.mute}}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7"/></svg>
              </div>
            </button>
            {isExpanded&&<div style={{padding:'0 16px 16px',borderTop:'1px solid rgba(0,0,0,0.04)',paddingTop:12}}>
              <div style={{marginBottom:12}}><p style={{fontSize:'0.6875rem',color:s.mute,margin:'0 0 4px'}}>通俗解释</p><p style={{fontSize:'0.875rem',color:s.text,margin:0}}>{ind.layman_explanation}</p></div>
              {ind.possible_causes?.length>0&&<div style={{marginBottom:12}}><p style={{fontSize:'0.6875rem',color:s.mute,margin:'0 0 6px'}}>可能原因</p><div style={{display:'flex',flexWrap:'wrap',gap:6}}>{ind.possible_causes.map((c,j)=><span key={j} className="neu-chip" style={{fontSize:'0.75rem'}}>{c}</span>)}</div></div>}
              {ind.clinical_context&&<div><p style={{fontSize:'0.6875rem',color:s.mute,margin:'0 0 4px'}}>临床背景</p><p style={{fontSize:'0.8125rem',color:s.sub,margin:0}}>{ind.clinical_context}</p></div>}
            </div>}
          </div>
        })}
      </div>

      {/* Department suggestion */}
      {data.department_suggestion&&<div style={neuCard}>
        <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:12}}><span style={{color:s.accent}}><Ic.hospital/></span><h2 style={{fontSize:'0.9375rem',fontWeight:600,color:s.text,margin:0}}>就医建议</h2></div>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'12px 0',borderBottom:'1px solid rgba(0,0,0,0.04)'}}><span style={{fontSize:'0.875rem',color:s.sub}}>建议就诊科室</span><span style={{fontSize:'0.875rem',fontWeight:600,color:s.accent}}>{data.department_suggestion.department}</span></div>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'12px 0',borderBottom:'1px solid rgba(0,0,0,0.04)'}}><span style={{fontSize:'0.875rem',color:s.sub}}>紧急程度</span><span style={{fontSize:'0.875rem',fontWeight:500,color:s.text}}>{URG[data.department_suggestion.urgency]||data.department_suggestion.urgency}</span></div>
        {data.department_suggestion.suggested_tests?.length>0&&<div style={{paddingTop:12}}><p style={{fontSize:'0.75rem',color:s.mute,marginBottom:8}}>建议进一步检查</p><div style={{display:'flex',flexWrap:'wrap',gap:6}}>{data.department_suggestion.suggested_tests.map((t,j)=><span key={j} className="neu-chip" style={{background:'rgba(74,143,205,0.08)',color:s.accent}}>{t}</span>)}</div></div>}
      </div>}

      {/* Lifestyle */}
      {data.lifestyle_advice?.length>0&&<div style={neuCard}>
        <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:12}}><span style={{color:'#5BBA8B'}}><Ic.lifestyle/></span><h2 style={{fontSize:'0.9375rem',fontWeight:600,color:s.text,margin:0}}>生活方式建议</h2></div>
        {data.lifestyle_advice.map((a,i)=><div key={i} style={{display:'flex',gap:8,padding:'8px 0',fontSize:'0.875rem',color:s.text}}><span style={{color:'#5BBA8B',flexShrink:0}}>&bull;</span>{a}</div>)}
      </div>}

      <p style={{fontSize:'0.6875rem',color:s.mute,textAlign:'center',padding:'8px 0 16px'}}>{data.disclaimer}</p>
    </main>

    {/* Bottom chat bar */}
    <div style={{position:'fixed',bottom:0,left:0,right:0,background:'rgba(232,236,241,0.85)',backdropFilter:'blur(20px) saturate(180%)',WebkitBackdropFilter:'blur(20px) saturate(180%)',borderTop:'1px solid rgba(0,0,0,0.06)',padding:'12px 16px',zIndex:50,paddingBottom:'env(safe-area-inset-bottom, 12px)'}}>
      <div className="neu-container" style={{maxWidth:720}}>
        {chatMsgs.length>0&&<div style={{maxHeight:180,overflowY:'auto',marginBottom:10}}>{chatMsgs.map((msg,i)=><div key={i} className={msg.role==='user'?'neu-chip':''} style={{padding:'8px 14px',marginBottom:6,fontSize:'0.8125rem',color:msg.role==='user'?'#fff':s.text,background:msg.role==='user'?s.accent:'#e8ecf1',borderRadius:14,maxWidth:'85%',marginLeft:msg.role==='user'?'auto':0,boxShadow:msg.role==='user'?'2px 2px 6px rgba(74,143,205,0.25)':'2px 2px 6px rgba(174,180,190,0.15)'}}>{msg.text}</div>)}<div ref={endRef}/></div>}
        <div style={{display:'flex',gap:6,marginBottom:10,overflowX:'auto'}}>
          {['我的报告严重吗？','需要做什么进一步检查？','生活方式怎么调整？'].map(q=><button key={q} onClick={()=>{setChatInput(q);handleChat({preventDefault:()=>{}})}} className="neu-chip" style={{border:'none',cursor:'pointer',whiteSpace:'nowrap',flexShrink:0}}>{q}</button>)}
        </div>
        <div style={{display:'flex',gap:8}}>
          <input value={chatInput} onChange={e=>setChatInput(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();handleChat(e)}}} placeholder="关于结果有什么疑问？" className="neu-input" style={{flex:1,padding:'12px 16px',fontSize:'0.875rem'}} disabled={chatLoading}/>
          <button onClick={handleChat} disabled={!chatInput.trim()||chatLoading} style={{padding:'12px 18px',background:s.accent,color:'#fff',border:'none',borderRadius:14,cursor:'pointer',opacity:(!chatInput.trim()||chatLoading)?0.5:1,boxShadow:'2px 2px 6px rgba(74,143,205,0.3)'}}><Ic.send/></button>
        </div>
      </div>
    </div>
  </div>
}