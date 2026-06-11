import { useState } from 'react';

const API_BASE = '/api';

export default function FeedbackPage({ onBack }) {
  const s = {bg:'#e8ecf1',card:'#edf1f5',text:'#2c3e50',sub:'#6b7d8e',mute:'#94a3b8',accent:'#4A8FCD'};

  const [form, setForm] = useState({ module: '', rating: '', helpful: '', suggestion: '', contact: '' });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const update = (field, value) => setForm({ ...form, [field]: value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.module || !form.rating) { setError('请至少选择使用的模块和评分'); return; }
    setLoading(true); setError('');
    try {
      const res = await fetch(`${API_BASE}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (res.ok) { setSubmitted(true); } else { setError('提交失败，请稍后重试'); }
    } catch { setError('网络错误，请稍后重试'); }
    setLoading(false);
  };

  if (submitted) {
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
              <h1 style={{fontSize:'1.25rem',fontWeight:700,color:s.text,margin:0}}>感谢反馈！</h1>
              <p style={{fontSize:'0.8125rem',color:s.sub,marginTop:4}}>你的意见会帮助我改进这个产品</p>
            </div>
          </div>
        </div>
        <div className="neu-container neu-safe-bottom" style={{paddingTop:16,textAlign:'center'}}>
          <button onClick={() => { setSubmitted(false); setForm({ module: '', rating: '', helpful: '', suggestion: '', contact: '' }); }}
            className="neu-chip" style={{border:'none',cursor:'pointer'}}>再提交一条</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{minHeight:'100vh',background:s.bg}}>
      <div className="neu-header" style={{padding:'16px 20px'}}>
        <div className="neu-container">
          <button onClick={onBack} className="neu-icon-btn" style={{marginBottom:16}}>
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5"/></svg>
          </button>
          <div style={{textAlign:'center'}}>
            <h1 style={{fontSize:'1.25rem',fontWeight:700,color:s.text,margin:0}}>产品反馈</h1>
            <p style={{fontSize:'0.8125rem',color:s.sub,marginTop:4}}>试用后有什么想法？好的坏的都欢迎</p>
          </div>
        </div>
      </div>

      <main className="neu-container neu-safe-bottom" style={{paddingTop:16,paddingBottom:40}}>
        <form onSubmit={handleSubmit} className="neu-card" style={{padding:24,border:'none'}}>
          {/* Module */}
          <div style={{marginBottom:20}}>
            <label style={{display:'block',fontSize:'0.875rem',fontWeight:600,color:s.text,marginBottom:8}}>你试用了哪个模块？ *</label>
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))',gap:8}}>
              {[
                {v:'symptom',l:'🔍 智能症状分诊'},
                {v:'exam',l:'📋 检查项目解释'},
                {v:'report',l:'📊 体检报告解读'},
                {v:'insurance',l:'💰 医保查询'},
              ].map(o =>
                <button key={o.v} type="button" onClick={() => update('module', o.v)}
                  style={{padding:'12px',borderRadius:12,border:'none',cursor:'pointer',fontSize:'0.8125rem',
                    background:form.module===o.v?'rgba(74,143,205,0.1)':'#e8ecf1',
                    color:form.module===o.v?s.accent:s.sub,
                    boxShadow:form.module===o.v?'inset 2px 2px 4px rgba(174,180,190,0.25), inset -2px -2px 4px rgba(255,255,255,0.6)':'2px 2px 4px rgba(174,180,190,0.15), -2px -2px 4px rgba(255,255,255,0.6)'}}>
                  {o.l}
                </button>
              )}
            </div>
          </div>

          {/* Rating */}
          <div style={{marginBottom:20}}>
            <label style={{display:'block',fontSize:'0.875rem',fontWeight:600,color:s.text,marginBottom:8}}>整体体验评分 *</label>
            <div style={{display:'flex',gap:8}}>
              {[1,2,3,4,5].map(n =>
                <button key={n} type="button" onClick={() => update('rating', String(n))}
                  style={{width:52,height:52,borderRadius:14,border:'none',cursor:'pointer',fontSize:'1.25rem',
                    background:Number(form.rating)>=n?'#4A8FCD':'#e8ecf1',
                    color:Number(form.rating)>=n?'#fff':s.mute,
                    boxShadow:Number(form.rating)>=n?'4px 4px 8px rgba(74,143,205,0.3)':'2px 2px 4px rgba(174,180,190,0.2), -2px -2px 4px rgba(255,255,255,0.6)'}}>
                  {n}
                </button>
              )}
              <span style={{fontSize:'0.8125rem',color:s.mute,alignSelf:'center',marginLeft:8}}>
                {form.rating==='1'?'很差':form.rating==='2'?'较差':form.rating==='3'?'一般':form.rating==='4'?'不错':form.rating==='5'?'非常好':''}
              </span>
            </div>
          </div>

          {/* Helpful */}
          <div style={{marginBottom:20}}>
            <label style={{display:'block',fontSize:'0.875rem',fontWeight:600,color:s.text,marginBottom:8}}>相比直接问 AI，这个产品有用吗？</label>
            <div style={{display:'flex',gap:8}}>
              {[
                {v:'more','l':'更有用 👍'},
                {v:'same','l':'差不多'},
                {v:'less','l':'不如直接问 AI'},
              ].map(o =>
                <button key={o.v} type="button" onClick={() => update('helpful', o.v)}
                  className="neu-chip" style={{border:'none',cursor:'pointer',
                    background:form.helpful===o.v?'rgba(74,143,205,0.1)':'#e8ecf1',
                    color:form.helpful===o.v?s.accent:s.sub}}>{o.l}</button>
              )}
            </div>
          </div>

          {/* Suggestion */}
          <div style={{marginBottom:20}}>
            <label style={{display:'block',fontSize:'0.875rem',fontWeight:600,color:s.text,marginBottom:8}}>有什么建议或想吐槽的？</label>
            <textarea value={form.suggestion} onChange={e => update('suggestion', e.target.value)}
              className="neu-input" rows={4}
              style={{fontSize:'0.875rem',resize:'vertical'}}
              placeholder="比如：搜索结果的展示方式可以改进 / 希望增加XX功能 / 某处的文案看不懂..." />
          </div>

          {/* Contact */}
          <div style={{marginBottom:24}}>
            <label style={{display:'block',fontSize:'0.875rem',fontWeight:600,color:s.text,marginBottom:8}}>联系方式（选填，方便跟进反馈）</label>
            <input value={form.contact} onChange={e => update('contact', e.target.value)}
              className="neu-input" style={{fontSize:'0.875rem'}}
              placeholder="微信/邮箱，不填也行" />
          </div>

          {error && <p style={{fontSize:'0.8125rem',color:'#E06060',marginBottom:16}}>{error}</p>}

          <button type="submit" disabled={loading}
            className="neu-btn" style={{width:'100%',opacity:loading?0.6:1}}>
            {loading ? '提交中...' : '提交反馈'}
          </button>
        </form>
      </main>
    </div>
  );
}
