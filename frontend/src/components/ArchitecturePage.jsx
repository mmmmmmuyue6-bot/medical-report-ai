import { useState } from 'react';

export default function ArchitecturePage({ onBack }) {
  const s = {bg:'#e8ecf1',card:'#edf1f5',text:'#1e293b',sub:'#475569',mute:'#64748b',accent:'#4A8FCD'};

  return (
    <div style={{minHeight:'100vh',background:s.bg}}>
      <div className="neu-header" style={{padding:'16px 20px'}}>
        <div className="neu-container">
          <button onClick={onBack} className="neu-icon-btn" style={{marginBottom:16}}>
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5"/></svg>
          </button>
          <div style={{textAlign:'center'}}>
            <h1 style={{fontSize:'1.25rem',fontWeight:700,color:s.text,margin:0}}>技术架构</h1>
            <p style={{fontSize:'0.8125rem',color:s.mute,marginTop:4}}>Skills-Agent 两层架构 + Agent Swarm 多Agent协作</p>
          </div>
        </div>
      </div>

      <main className="neu-container neu-safe-bottom" style={{paddingTop:16,paddingBottom:40}}>
        {/* Architecture Overview */}
        <div className="neu-card" style={{padding:24,border:'none',marginBottom:16}}>
          <h2 style={{fontSize:'1rem',fontWeight:700,color:s.text,margin:'0 0 16px'}}>架构总览</h2>
          <div style={{fontFamily:'monospace',fontSize:'0.75rem',color:s.sub,lineHeight:2,background:s.bg,borderRadius:12,padding:16}}>
            {'用户请求 → Router Agent → 匹配 Skill\n' +
             '                          ├── SymptomSkill (分诊)\n' +
             '                          ├── ExamSkill (检查)\n' +
             '                          ├── ReportSkill (报告)\n' +
             '                          └── InsuranceSkill (医保)\n' +
             '每个 Skill 内部:\n' +
             '  KB Agent (知识检索) ─┐\n' +
             '  LLM Agent (AI分析) ─┴→ Merge Agent (结果合并)\n' +
             '                          ↓\n' +
             '                  Harness Engine (安全校验)\n' +
             '                          ↓\n' +
             '                    最终输出（含来源标注）'}
          </div>
        </div>

        {/* Layer Details */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))',gap:14,marginBottom:16}}>
          {[
            {t:'Router Agent',d:'意图识别 + 技能路由。用户输入"头疼"→匹配症状分诊 Skill。支持关键词和置信度评分',file:'agent_router.py'},
            {t:'Agent Swarm',d:'KB Agent + LLM Agent 始终并行执行。不是 KB 查不到才调 AI——AI 始终作为补充者和解释者',file:'agent_swarm.py'},
            {t:'Harness Engine',d:'三层安全防护：输入紧急检测(<1ms)→输出诊断语句校验→来源强制标注',file:'harness.py'},
            {t:'Memory Layer',d:'Mem0 风格双层记忆。Session 记忆(7天过期)+User Profile(跨会话聚合)。JSON 文件存储',file:'memory_service.py'},
          ].map((l,i)=>
            <div key={i} className="neu-flat" style={{padding:20}}>
              <h3 style={{fontSize:'0.875rem',fontWeight:600,color:s.accent,margin:'0 0 6px'}}>{l.t}</h3>
              <p style={{fontSize:'0.8125rem',color:s.sub,lineHeight:1.6,margin:'0 0 8px'}}>{l.d}</p>
              <code style={{fontSize:'0.6875rem',color:s.mute,background:s.bg,padding:'2px 8px',borderRadius:6}}>{l.file}</code>
            </div>
          )}
        </div>

        {/* Knowledge Bases */}
        <div className="neu-card" style={{padding:24,border:'none',marginBottom:16}}>
          <h2 style={{fontSize:'1rem',fontWeight:700,color:s.text,margin:'0 0 16px'}}>知识库体系（5 个 JSON 文件）</h2>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))',gap:10}}>
            {[
              {n:'symptom_department.json',c:'20 症状 × 科室映射 + 红色警报清单'},
              {n:'departments.json',c:'30 个临床科室 + 别名 + 诊疗范围'},
              {n:'exam_knowledge.json',c:'83 项检查 / 8 分类 / 费用+医保类别'},
              {n:'disease_treatment.json',c:'82 病种 / 治疗路径 / 药品+检查+住院参考'},
              {n:'insurance_rules.json',c:'药品分类 / 报销比例 / 起付线 / 年度限额'},
            ].map((kb,i)=>
              <div key={i} style={{padding:'12px 14px',background:s.bg,borderRadius:10}}>
                <div style={{fontSize:'0.75rem',fontWeight:600,color:s.text,marginBottom:4}}>{kb.n}</div>
                <div style={{fontSize:'0.6875rem',color:s.mute,lineHeight:1.4}}>{kb.c}</div>
              </div>
            )}
          </div>
        </div>

        {/* Source Label System */}
        <div className="neu-card" style={{padding:24,border:'none',marginBottom:16}}>
          <h2 style={{fontSize:'1rem',fontWeight:700,color:s.text,margin:'0 0 16px'}}>来源标注体系（10 种标签）</h2>
          <div style={{display:'flex',flexWrap:'wrap',gap:8}}>
            {[
              {l:'[知识库]',c:'#e8ecf1',t:'#475569',d:'来自内置医学知识库'},
              {l:'[AI分析]',c:'#f3effa',t:'#7B6EA8',d:'AI基于知识库的分析补充'},
              {l:'[AI补充，需核实]',c:'#f3effa',t:'#7B6EA8',d:'AI补充，建议核实'},
              {l:'[医保政策]',c:'#e8f5ee',t:'#3D8B60',d:'引用国家/地方医保政策'},
              {l:'[集采参考]',c:'#e8f5ee',t:'#3D8B60',d:'国家药品集采中选价格'},
              {l:'[价格参考]',c:'#e8f5ee',t:'#3D8B60',d:'公开市场价格参考'},
              {l:'[AI估算]',c:'#fef7ef',t:'#C7853A',d:'AI估算，仅供参考'},
              {l:'[AI解释]',c:'#f3effa',t:'#7B6EA8',d:'AI通俗化解释'},
              {l:'[AI搜索需核实]',c:'#f3effa',t:'#7B6EA8',d:'AI实时搜索结果'},
              {l:'[诊疗项目参考]',c:'#e8f5ee',t:'#3D8B60',d:'检查项目费用参考'},
            ].map((lb,i)=>
              <span key={i} style={{display:'inline-block',padding:'4px 12px',borderRadius:8,background:lb.c,color:lb.t,fontSize:'0.75rem',fontWeight:500}} title={lb.d}>{lb.l}</span>
            )}
          </div>
        </div>

        {/* Key Decisions */}
        <div className="neu-card" style={{padding:24,border:'none',marginBottom:16}}>
          <h2 style={{fontSize:'1rem',fontWeight:700,color:s.text,margin:'0 0 16px'}}>关键架构决策</h2>
          {[
            'KB+LLM 双引擎：不是纯 LLM，可溯源防幻觉',
            'JSON 文件做知识库：MVP 阶段不需要向量数据库（手动更新即可）',
            'AI 始终并行调用：不是 KB 查不到才调 AI——AI 是补充者，不是救火员',
            '所有 AI 输出强制标注来源：10 种标签，可追溯到具体知识库条目',
            'Temperature 分模块控制：分诊 0.2 / 报告 0.3 / 检查 0.5 / 医保 0.3',
            '不编造自付金额：去掉 AI 估算的 18%/44% 自付比例',
          ].map((d,i)=>
            <div key={i} style={{display:'flex',gap:10,padding:'8px 0',borderBottom:'1px solid rgba(0,0,0,0.04)',fontSize:'0.8125rem',color:s.sub}}>
              <span style={{color:s.accent,flexShrink:0}}>{i+1}.</span><span>{d}</span>
            </div>
          )}
        </div>

        {/* Tech Stack */}
        <div style={{textAlign:'center',padding:'16px 0'}}>
          <p style={{fontSize:'0.75rem',color:s.mute,margin:0}}>
            前端：React 19 · Vite · TailwindCSS 4 &nbsp;|&nbsp;
            后端：FastAPI (Python) · DeepSeek (OpenAI SDK) &nbsp;|&nbsp;
            部署：Cloudflare Tunnel / Vercel
          </p>
          <p style={{fontSize:'0.6875rem',color:s.mute,margin:'6px 0 0'}}>
            API 架构展示端点：<code style={{background:s.bg,padding:'2px 6px',borderRadius:4}}>GET /api/architecture/overview</code>
          </p>
        </div>
      </main>
    </div>
  );
}
