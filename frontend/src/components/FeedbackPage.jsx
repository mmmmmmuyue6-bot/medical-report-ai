import { useState } from 'react';

const API_BASE = '/api';

export default function FeedbackPage({ onBack }) {
  const s = {bg:'#e8ecf1',card:'#edf1f5',text:'#2c3e50',sub:'#6b7d8e',mute:'#94a3b8',accent:'#4A8FCD'};

  const [step, setStep] = useState('form'); // 'form' | 'submitted'
  const [form, setForm] = useState({
    module: '', task_completed: '', compare_ai: '', trust_kb: '', trust_ai: '',
    recommend: '', real_outcome: '', missing_feature: '', suggestion: '', contact: ''
  });
  const [loading, setLoading] = useState(false);

  const update = (field, value) => setForm({ ...form, [field]: value });
  const progress = [form.module, form.task_completed, form.compare_ai, form.recommend].filter(Boolean).length;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.module || !form.task_completed || !form.compare_ai || !form.recommend) {
      alert('请填写前4项核心问题（标记为 *）'); return;
    }
    setLoading(true);
    try {
      await fetch(`${API_BASE}/analytics/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      setStep('submitted');
    } catch { alert('提交失败，请重试'); }
    setLoading(false);
  };

  if (step === 'submitted') {
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
              <h1 style={{fontSize:'1.25rem',fontWeight:700,color:s.text,margin:0}}>感谢反馈</h1>
              <p style={{fontSize:'0.8125rem',color:s.sub,marginTop:4}}>每一个回答都帮助我理解产品该往哪个方向迭代</p>
            </div>
          </div>
        </div>
        <div className="neu-container" style={{paddingTop:16,textAlign:'center'}}>
          <button onClick={() => { setStep('form'); setForm({ module: '', task_completed: '', compare_ai: '', trust_kb: '', trust_ai: '', recommend: '', real_outcome: '', missing_feature: '', suggestion: '', contact: '' }); }}
            className="neu-chip" style={{border:'none',cursor:'pointer'}}>再提交一条</button>
        </div>
      </div>
    );
  }

  const Q = ({ title, subtitle, required, children }) => (
    <div style={{marginBottom:24}}>
      <h3 style={{fontSize:'0.9375rem',fontWeight:600,color:s.text,margin:'0 0 4px'}}>
        {title}{required && <span style={{color:s.accent,marginLeft:4}}>*</span>}
      </h3>
      {subtitle && <p style={{fontSize:'0.75rem',color:s.mute,margin:'0 0 12px'}}>{subtitle}</p>}
      {children}
    </div>
  );

  const ChoiceBtn = ({ value, label, selected, desc }) => (
    <button type="button" onClick={() => update(selected, value)}
      style={{padding:'14px 16px',borderRadius:12,border:'none',cursor:'pointer',fontSize:'0.8125rem',
        textAlign:'left',width:'100%',marginBottom:8,
        background:form[selected]===value?'rgba(74,143,205,0.08)':'#e8ecf1',
        color:form[selected]===value?s.accent:s.sub,
        boxShadow:form[selected]===value?
          'inset 2px 2px 4px rgba(174,180,190,0.25), inset -2px -2px 4px rgba(255,255,255,0.6)':
          '2px 2px 4px rgba(174,180,190,0.15), -2px -2px 4px rgba(255,255,255,0.6)'}}>
      <div style={{fontWeight:form[selected]===value?600:400}}>{label}</div>
      {desc && <div style={{fontSize:'0.6875rem',color:s.mute,marginTop:2}}>{desc}</div>}
    </button>
  );

  return (
    <div style={{minHeight:'100vh',background:s.bg}}>
      <div className="neu-header" style={{padding:'16px 20px'}}>
        <div className="neu-container">
          <button onClick={onBack} className="neu-icon-btn" style={{marginBottom:16}}>
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5"/></svg>
          </button>
          <div style={{textAlign:'center'}}>
            <h1 style={{fontSize:'1.25rem',fontWeight:700,color:s.text,margin:0}}>产品反馈</h1>
            <p style={{fontSize:'0.75rem',color:s.mute,marginTop:4}}>已完成 {progress}/4 项核心问题</p>
          </div>
        </div>
      </div>

      <main className="neu-container neu-safe-bottom" style={{paddingTop:16,paddingBottom:40}}>
        <form onSubmit={handleSubmit} className="neu-card" style={{padding:28,border:'none'}}>

          {/* 1. Module */}
          <Q title="你试用了哪个功能？" subtitle="面试数据：哪个模块使用率最高？" required>
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(130px,1fr))',gap:8}}>
              {[{v:'symptom',l:'症状分诊'},{v:'exam',l:'检查项目解释'},{v:'report',l:'体检报告解读'},{v:'insurance',l:'医保查询'}].map(o =>
                <button key={o.v} type="button" onClick={() => update('module', o.v)}
                  style={{padding:'12px',borderRadius:12,border:'none',cursor:'pointer',fontSize:'0.8125rem',
                    background:form.module===o.v?'rgba(74,143,205,0.08)':'#e8ecf1',
                    color:form.module===o.v?s.accent:s.sub}}>{o.l}</button>)}
            </div>
          </Q>

          {/* 2. Task Completion */}
          <Q title="你完成想做的事了吗？" subtitle="面试数据：任务完成率 = 核心转化指标" required>
            <ChoiceBtn value="completed" selected="task_completed" label="完成了，拿到了我需要的信息" desc="例如：确认了应该挂哪个科 / 看懂了检查报告 / 查到了药品报销比例" />
            <ChoiceBtn value="partial" selected="task_completed" label="完成了一部分，但不够满意" desc="例如：给了科室推荐但我想知道为什么推荐这个科 / 查到了医保类别但不确定价格对不对" />
            <ChoiceBtn value="dropped" selected="task_completed" label="没完成，中途退出了" desc="例如：流程太长 / 卡住了 / 结果不对 / 不知道下一步点哪里" />
          </Q>

          {/* 3. Comparative Value — THE MOST IMPORTANT QUESTION */}
          <Q title="和直接问 DeepSeek/ChatGPT 相比？" subtitle="面试核心数据：产品的差异化价值是否被用户感知到？" required>
            <ChoiceBtn value="better" selected="compare_ai" label="比直接问 AI 更好" desc="因为有追问、有来源标注、能推荐科室/查医保，比纯聊天更有用" />
            <ChoiceBtn value="same" selected="compare_ai" label="差不多" desc="没觉得有明显区别，直接问 AI 也能得到类似信息" />
            <ChoiceBtn value="worse" selected="compare_ai" label="不如直接问 AI" desc="流程太复杂 / 信息不够 / 不如 AI 灵活" />
          </Q>

          {/* 4. Trust breakdown */}
          <Q title="你有多信任给出的信息？" subtitle="面试数据：AI vs KB 信任度差异——RAG 架构的核心价值验证">
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
              <div>
                <p style={{fontSize:'0.75rem',fontWeight:500,color:s.text,margin:'0 0 8px'}}>对 [知识库] 内容</p>
                {[{v:'high',l:'比较信任'},{v:'medium',l:'一般'},{v:'low',l:'不太信'}].map(o =>
                  <button key={'kb-'+o.v} type="button" onClick={() => update('trust_kb', o.v)}
                    className="neu-chip" style={{border:'none',cursor:'pointer',marginRight:6,display:'inline-block',
                      background:form.trust_kb===o.v?'rgba(74,143,205,0.08)':'#e8ecf1',color:form.trust_kb===o.v?s.accent:s.sub}}>{o.l}</button>)}
              </div>
              <div>
                <p style={{fontSize:'0.75rem',fontWeight:500,color:s.text,margin:'0 0 8px'}}>对 [AI分析] 内容</p>
                {[{v:'high',l:'比较信任'},{v:'medium',l:'一般'},{v:'low',l:'不太信'}].map(o =>
                  <button key={'ai-'+o.v} type="button" onClick={() => update('trust_ai', o.v)}
                    className="neu-chip" style={{border:'none',cursor:'pointer',marginRight:6,display:'inline-block',
                      background:form.trust_ai===o.v?'rgba(74,143,205,0.08)':'#e8ecf1',color:form.trust_ai===o.v?s.accent:s.sub}}>{o.l}</button>)}
              </div>
            </div>
          </Q>

          {/* 5. NPS-lite */}
          <Q title="你愿意把这个工具推荐给身边需要的人吗？" subtitle="面试数据：NPS 替代指标，衡量产品口碑" required>
            {[{v:'yes_active',l:'会主动推荐'},{v:'yes_asked',l:'有人问会推荐'},{v:'maybe',l:'不确定'},{v:'no',l:'不会推荐'}].map(o =>
              <button key={o.v} type="button" onClick={() => update('recommend', o.v)}
                className="neu-chip" style={{border:'none',cursor:'pointer',marginRight:8,marginBottom:8,
                  background:form.recommend===o.v?'rgba(74,143,205,0.08)':'#e8ecf1',color:form.recommend===o.v?s.accent:s.sub}}>{o.l}</button>)}
          </Q>

          {/* 6. Real-world outcome */}
          <Q title="你有没有真的按照建议去做了？" subtitle="面试数据：真实行为转化——产品是否真正影响了就医决策？">
            <ChoiceBtn value="yes_right" selected="real_outcome" label="去了推荐的科室，确实是对的" />
            <ChoiceBtn value="yes_wrong" selected="real_outcome" label="去了，但推荐的科室不对" />
            <ChoiceBtn value="no_notyet" selected="real_outcome" label="还没去，先看看" />
            <ChoiceBtn value="no_tool_only" selected="real_outcome" label="只是好奇试用，没打算去医院" />
          </Q>

          {/* 7. Missing feature */}
          <Q title="缺了哪个功能让你最想弃用？" subtitle="面试数据：功能优先级排序——ROI 最高的下一个迭代方向">
            {[{v:'history',l:'历史记录 / 收藏功能'},{v:'appointment',l:'直接挂号（连医院系统）'},
              {v:'video',l:'视频/图文教程'},{v:'compare',l:'多家医院比价'},{v:'share',l:'分享给医生/家人'},
              {v:'voice',l:'语音输入'},{v:'account',l:'个人健康档案'}].map(o =>
              <button key={o.v} type="button" onClick={() => update('missing_feature', o.v)}
                className="neu-chip" style={{border:'none',cursor:'pointer',marginRight:8,marginBottom:8,
                  background:form.missing_feature===o.v?'rgba(74,143,205,0.08)':'#e8ecf1',color:form.missing_feature===o.v?s.accent:s.sub}}>{o.l}</button>)}
          </Q>

          {/* 8. Open feedback */}
          <Q title="还想说什么？">
            <textarea value={form.suggestion} onChange={e => update('suggestion', e.target.value)}
              className="neu-input" rows={3} style={{fontSize:'0.875rem',resize:'vertical'}}
              placeholder="吐槽、建议、bug 报告...什么都行" />
          </Q>

          {/* 9. Contact */}
          <div style={{marginBottom:28}}>
            <input value={form.contact} onChange={e => update('contact', e.target.value)}
              className="neu-input" style={{fontSize:'0.875rem'}}
              placeholder="微信/邮箱（选填，方便跟进）" />
          </div>

          <button type="submit" disabled={loading}
            className="neu-btn" style={{width:'100%',opacity:loading?0.6:1}}>
            {loading ? '提交中...' : '提交反馈'}
          </button>
        </form>
      </main>
    </div>
  );
}
