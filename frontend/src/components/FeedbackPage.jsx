import { useState } from 'react';

const API_BASE = '/api';

export default function FeedbackPage({ onBack }) {
  const s = {bg:'#e8ecf1',card:'#edf1f5',text:'#2c3e50',sub:'#6b7d8e',mute:'#94a3b8',accent:'#4A8FCD'};
  const [step, setStep] = useState('form');
  const [form, setForm] = useState({
    body_state: '', modules: [], useful: '', compare_ai: '', suggestion: '',
    accuracy: '', understand: '', exam_steps_helpful: '', cost_accurate: '',
    report_match: '', insurance_accurate: '', want_followup: false, contact: ''
  });
  const [loading, setLoading] = useState(false);

  const update = (field, value) => setForm({...form, [field]: value});
  const toggleModule = (v) => {
    const next = form.modules.includes(v) ? form.modules.filter(m => m !== v) : [...form.modules, v];
    setForm({...form, modules: next});
  };
  const coreDone = form.modules.length > 0 && form.useful && form.compare_ai;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.modules.length || !form.useful || !form.compare_ai) { alert('请填写前3道核心问题'); return; }
    setLoading(true);
    try {
      await fetch(`${API_BASE}/analytics/feedback`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(form) });
      setStep('done');
    } catch { alert('提交失败，请重试'); }
    setLoading(false);
  };

  // ── Submitted ──
  if (step === 'done') {
    return (
      <div style={{minHeight:'100vh',background:s.bg}}>
        <div className="neu-header" style={{padding:'16px 20px'}}>
          <div className="neu-container">
            <button onClick={onBack} className="neu-icon-btn" style={{marginBottom:16}}>
              <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5"/></svg>
            </button>
            <div style={{textAlign:'center'}}>
              <div style={{width:52,height:52,borderRadius:16,background:'rgba(91,186,139,0.08)',display:'inline-flex',alignItems:'center',justifyContent:'center',marginBottom:12,color:'#5BBA8B'}}>
                <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0Z"/></svg>
              </div>
              <h1 style={{fontSize:'1.25rem',fontWeight:700,color:s.text,margin:0}}>收到，谢谢！</h1>
              <p style={{fontSize:'0.8125rem',color:s.sub,marginTop:4}}>每一个回答都在帮我把产品变好</p>
            </div>
          </div>
        </div>
        <div className="neu-container" style={{paddingTop:16,textAlign:'center'}}>
          <button onClick={() => { setStep('form'); setForm({body_state:'',modules:[],useful:'',compare_ai:'',suggestion:'',accuracy:'',understand:'',exam_steps_helpful:'',cost_accurate:'',report_match:'',insurance_accurate:'',want_followup:false,contact:''}); }}
            className="neu-chip" style={{border:'none',cursor:'pointer'}}>再提一条</button>
        </div>
      </div>
    );
  }

  // ── Choice button ──
  const Btn = ({ value, field, label, desc }) => (
    <button type="button" onClick={() => update(field, value)}
      style={{padding:'13px 16px',borderRadius:12,border:'none',cursor:'pointer',fontSize:'0.8125rem',
        textAlign:'left',width:'100%',marginBottom:8,
        background:form[field]===value?'rgba(74,143,205,0.08)':'#e8ecf1',
        color:form[field]===value?s.accent:s.sub,
        boxShadow:form[field]===value?'inset 2px 2px 4px rgba(174,180,190,0.25), inset -2px -2px 4px rgba(255,255,255,0.6)':'2px 2px 4px rgba(174,180,190,0.15), -2px -2px 4px rgba(255,255,255,0.6)'}}>
      <div style={{fontWeight:form[field]===value?600:400}}>{label}</div>
      {desc && <div style={{fontSize:'0.6875rem',color:s.mute,marginTop:2}}>{desc}</div>}
    </button>
  );

  const Chip = ({ value, field, label }) => (
    <button type="button" onClick={() => update(field, value)}
      className="neu-chip" style={{border:'none',cursor:'pointer',marginRight:8,marginBottom:8,
        background:form[field]===value?'rgba(74,143,205,0.08)':'#e8ecf1',color:form[field]===value?s.accent:s.sub}}>{label}</button>
  );

  const QLabel = ({ children, required }) => (
    <h3 style={{fontSize:'0.9375rem',fontWeight:600,color:s.text,margin:'0 0 12px'}}>
      {children}{required && <span style={{color:s.accent,marginLeft:4}}>*</span>}
    </h3>
  );

  // ── Module-specific questions (show all for selected modules) ──
  const ModuleQuestions = () => {
    if (form.modules.length === 0) return null;
    const sections = {
      symptom: (
        <div key="symptom" style={{marginBottom:16,padding:'16px',background:'rgba(91,186,139,0.04)',borderRadius:14}}>
          <p style={{fontSize:'0.75rem',fontWeight:600,color:'#5BBA8B',margin:'0 0 12px'}}>关于症状分诊</p>
          <QLabel>如果你后来去看了医生——推荐的科室对吗？</QLabel>
          <Btn value="right" field="accuracy" label="对了" />
          <Btn value="wrong" field="accuracy" label="不对" />
          <Btn value="notyet" field="accuracy" label="还没去——如果愿意的话，过两周我回访你？" />
          {form.accuracy==='notyet' && (
            <div style={{marginTop:8}}>
              <label style={{display:'flex',alignItems:'center',gap:8,cursor:'pointer',fontSize:'0.8125rem',color:s.sub}}>
                <input type="checkbox" checked={form.want_followup} onChange={e => update('want_followup', e.target.checked)} style={{width:16,height:16,accentColor:s.accent}} />愿意。联系方式（微信/手机，选填）
              </label>
              {form.want_followup && <input value={form.contact} onChange={e => update('contact', e.target.value)} className="neu-input" style={{marginTop:8,fontSize:'0.875rem'}} placeholder="微信/手机号" />}
            </div>
          )}
        </div>
      ),
      exam: (
        <div key="exam" style={{marginBottom:16,padding:'16px',background:'rgba(240,160,75,0.04)',borderRadius:14}}>
          <p style={{fontSize:'0.75rem',fontWeight:600,color:'#F0A04B',margin:'0 0 12px'}}>关于检查项目解释</p>
          <QLabel>看完解释，你理解这个检查是干什么的了吗？</QLabel>
          <Btn value="yes" field="understand" label="完全理解了" /><Btn value="partly" field="understand" label="大概懂了" /><Btn value="no" field="understand" label="还是不太懂" />
          <QLabel style={{marginTop:16}}>检查流程的分步骤说明对你有帮助吗？</QLabel>
          <Btn value="very" field="exam_steps_helpful" label="非常有用" /><Btn value="somewhat" field="exam_steps_helpful" label="有点用" /><Btn value="no" field="exam_steps_helpful" label="没注意到" />
          <QLabel style={{marginTop:16}}>费用信息你觉得准吗？</QLabel>
          <Btn value="ok" field="cost_accurate" label="看起来合理" /><Btn value="high" field="cost_accurate" label="感觉偏高了" /><Btn value="low" field="cost_accurate" label="感觉偏低了" />
        </div>
      ),
      report: (
        <div key="report" style={{marginBottom:16,padding:'16px',background:'rgba(74,143,205,0.04)',borderRadius:14}}>
          <p style={{fontSize:'0.75rem',fontWeight:600,color:s.accent,margin:'0 0 12px'}}>关于体检报告解读</p>
          <QLabel>AI 指出的异常指标，和医生后来说的一致吗？</QLabel>
          <Btn value="match" field="report_match" label="基本一致" /><Btn value="partial" field="report_match" label="部分一致" /><Btn value="notyet" field="report_match" label="还没看医生——愿意被回访" />
          {form.report_match==='notyet' && (
            <div style={{marginTop:8}}><label style={{display:'flex',alignItems:'center',gap:8,cursor:'pointer',fontSize:'0.8125rem',color:s.sub}}><input type="checkbox" checked={form.want_followup} onChange={e => update('want_followup', e.target.checked)} style={{width:16,height:16,accentColor:s.accent}} />愿意被回访</label>
            {form.want_followup && <input value={form.contact} onChange={e => update('contact', e.target.value)} className="neu-input" style={{marginTop:8,fontSize:'0.875rem'}} placeholder="微信/手机号" />}</div>
          )}
        </div>
      ),
      insurance: (
        <div key="insurance" style={{marginBottom:16,padding:'16px',background:'rgba(155,142,196,0.04)',borderRadius:14}}>
          <p style={{fontSize:'0.75rem',fontWeight:600,color:'#9B8EC4',margin:'0 0 12px'}}>关于医保查询</p>
          <QLabel>如果你去官方平台核实了——这里的信息准吗？</QLabel>
          <Btn value="accurate" field="insurance_accurate" label="基本准确" /><Btn value="inaccurate" field="insurance_accurate" label="有出入" /><Btn value="notyet" field="insurance_accurate" label="还没核实——愿意被回访" />
          {form.insurance_accurate==='notyet' && (
            <div style={{marginTop:8}}><label style={{display:'flex',alignItems:'center',gap:8,cursor:'pointer',fontSize:'0.8125rem',color:s.sub}}><input type="checkbox" checked={form.want_followup} onChange={e => update('want_followup', e.target.checked)} style={{width:16,height:16,accentColor:s.accent}} />愿意被回访</label>
            {form.want_followup && <input value={form.contact} onChange={e => update('contact', e.target.value)} className="neu-input" style={{marginTop:8,fontSize:'0.875rem'}} placeholder="微信/手机号" />}</div>
          )}
        </div>
      ),
    };
    return form.modules.map(m => sections[m] || null);
  };

  // ── Form ──
  return (
    <div style={{minHeight:'100vh',background:s.bg}}>
      <div className="neu-header" style={{padding:'16px 20px'}}>
        <div className="neu-container">
          <button onClick={onBack} className="neu-icon-btn" style={{marginBottom:16}}>
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5"/></svg>
          </button>
          <div style={{textAlign:'center'}}>
            <h1 style={{fontSize:'1.25rem',fontWeight:700,color:s.text,margin:0}}>帮助我改进产品</h1>
            <p style={{fontSize:'0.75rem',color:s.mute,marginTop:4}}>最多 90 秒 · 核心问题 3 道 · {coreDone ? '核心问题已完成 ✅' : `还剩 ${3 - [form.modules.length>0,form.useful,form.compare_ai].filter(Boolean).length} 道`}</p>
          </div>
        </div>
      </div>

      <main className="neu-container neu-safe-bottom" style={{paddingTop:16,paddingBottom:40}}>
        <form onSubmit={handleSubmit} className="neu-card" style={{padding:24,border:'none'}}>

          {/* Control variable */}
          <div style={{marginBottom:24}}>
            <QLabel>你现在感觉怎么样？（帮助我区分"产品差"和"身体不舒服影响判断"）</QLabel>
            <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
              <Chip value="fine" field="body_state" label="挺好的" />
              <Chip value="uncomfortable" field="body_state" label="有点不舒服" />
              <Chip value="bad" field="body_state" label="挺难受的" />
            </div>
          </div>

          <hr className="neu-divider" />

          {/* Q1: Module */}
          <div style={{marginBottom:24}}>
            <QLabel required>你试了哪个功能？</QLabel>
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(120px,1fr))',gap:8}}>
              {[{v:'symptom',l:'症状分诊',icon:'🔍'},{v:'exam',l:'检查项目解释',icon:'📋'},{v:'report',l:'体检报告解读',icon:'📊'},{v:'insurance',l:'医保查询',icon:'💰'}].map(o =>
                <button key={o.v} type="button" onClick={() => toggleModule(o.v)}
                  className="neu-card"
                  style={{padding:'14px 12px',borderRadius:14,border:'none',cursor:'pointer',fontSize:'0.8125rem',textAlign:'center',
                    background:form.modules.includes(o.v)?'rgba(74,143,205,0.08)':'#edf1f5',color:form.modules.includes(o.v)?s.accent:s.sub,
                    boxShadow:form.modules.includes(o.v)?'inset 3px 3px 6px rgba(174,180,190,0.25), inset -3px -3px 6px rgba(255,255,255,0.6)':'3px 3px 6px rgba(174,180,190,0.2), -3px -3px 6px rgba(255,255,255,0.7)',
                    transform:form.modules.includes(o.v)?'scale(0.97)':'scale(1)',transition:'all 0.2s ease'}}>
                  <div style={{fontSize:'1.25rem',marginBottom:6}}>{o.icon}</div>
                  {form.modules.includes(o.v) ? '✓ ' : ''}{o.l}
                </button>)}
            </div>
          </div>

          {/* Q2: Useful */}
          <div style={{marginBottom:24}}>
            <QLabel required>这个功能对你有用吗？</QLabel>
            <Btn value="yes" field="useful" label="挺有用的" />
            <Btn value="meh" field="useful" label="一般般" />
            <Btn value="no" field="useful" label="感觉没啥用" />
          </div>

          {/* Q3: Compare to AI */}
          <div style={{marginBottom:24}}>
            <QLabel required>和你平时用 ChatGPT / DeepSeek / 豆包直接问相比？</QLabel>
            <Btn value="better" field="compare_ai" label="这个更好——有追问、有来源、更系统" />
            <Btn value="same" field="compare_ai" label="差不多" />
            <Btn value="worse" field="compare_ai" label="不如直接问 AI 灵活" />
          </div>

          {/* Module-specific questions */}
          <ModuleQuestions />

          {/* Q4: Open */}
          <div style={{marginBottom:20}}>
            <QLabel>还有什么想说的？（吐槽、建议、bug 报告，什么都行）</QLabel>
            <textarea value={form.suggestion} onChange={e => update('suggestion', e.target.value)}
              className="neu-input" rows={3} style={{fontSize:'0.875rem',resize:'vertical'}}
              placeholder="不填也行" />
          </div>

          <button type="submit" disabled={loading || !coreDone}
            className="neu-btn" style={{width:'100%',opacity:(loading||!coreDone)?0.5:1}}>
            {loading ? '提交中...' : '提交'}
          </button>
        </form>
      </main>
    </div>
  );
}
