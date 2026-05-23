import { useState } from 'react';
import { searchDisease, fetchDiseaseDetail, fetchDiseaseAIAnalysis, insuranceQuery, insuranceAISearch } from '../api';

const IconPill = () => (
  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0ZM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
  </svg>
);
const IconSearch = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607Z"/></svg>
);
const IconBack = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5"/></svg>
);

export default function InsurancePage({ onBack }) {
  const [view, setView] = useState('home'); // 'home' | 'drug' | 'disease' | 'disease-detail'
  const [drugQuery, setDrugQuery] = useState('');
  const [drugResults, setDrugResults] = useState(null);
  const [drugSource, setDrugSource] = useState('kb');
  const [drugNotInsured, setDrugNotInsured] = useState(false);
  const [drugNotInsuredName, setDrugNotInsuredName] = useState('');
  const [diseaseQuery, setDiseaseQuery] = useState('');
  const [diseaseResults, setDiseaseResults] = useState([]);
  const [selectedDisease, setSelectedDisease] = useState(null);
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleDrugSearch = async () => {
    if (!drugQuery.trim()) return;
    setLoading(true);
    setDrugSource('kb');
    // Always run KB + AI in parallel
    const [kbRes, aiRes] = await Promise.all([
      insuranceQuery(drugQuery).catch(() => null),
      insuranceAISearch(drugQuery).catch(() => null),
    ]);
    const kbItems = kbRes?.success ? (kbRes.data?.items || []) : [];
    const aiData = aiRes?.success ? aiRes.data : null;
    const hasAiSupplement = aiData && aiData.found !== false;
    const isNotInsured = aiData && aiData.in_insurance === false;

    if (kbItems.length > 0 && hasAiSupplement) {
      setDrugSource('kb+ai');
      setDrugResults({ items: kbItems, aiSupplement: aiData });
    } else if (kbItems.length > 0) {
      setDrugSource('kb');
      setDrugResults({ items: kbItems });
    } else if (isNotInsured) {
      setDrugSource('none');
      setDrugResults({ items: [], aiSupplement: null });
      setDrugNotInsured(true);
      setDrugNotInsuredName(drugQuery);
    } else if (hasAiSupplement) {
      setDrugSource('ai');
      setDrugResults({ items: [], aiSupplement: aiData });
    } else {
      setDrugSource('none');
      setDrugResults({ items: [], aiSupplement: null });
    }
    setLoading(false);
  };

  const handleDiseaseSearch = async () => {
    if (!diseaseQuery.trim()) return;
    setLoading(true);
    const res = await searchDisease(diseaseQuery);
    if (res.success && res.data.length > 0) {
      setDiseaseResults(res.data);
    } else {
      // KB empty — try AI fallback
      setDiseaseResults([{ name: diseaseQuery, category: 'AI搜索结果（知识库未收录）', _aiFallback: true }]);
    }
    setLoading(false);
  };

  const handleDiseaseSelect = async (name) => {
    setLoading(true);
    const [res, aiRes] = await Promise.all([
      fetchDiseaseDetail(name).catch(() => null),
      fetchDiseaseAIAnalysis(name).catch(() => null),
    ]);
    if (res?.success) {
      setSelectedDisease(res.data);
      setAiAnalysis(aiRes?.success ? aiRes.data : null);
      setView('disease-detail');
    } else if (aiRes?.success) {
      // KB empty but AI available — show AI-only detail
      setSelectedDisease({ name, category: 'AI分析（知识库未收录）' });
      setAiAnalysis(aiRes.data);
      setView('disease-detail');
    }
    setLoading(false);
  };

  // Home
  if (view === 'home') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
        <header className="bg-white border-b border-slate-200 px-4 py-6">
          <div className="max-w-lg mx-auto">
            <button onClick={onBack} className="text-slate-400 hover:text-slate-600 transition mb-3">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5"/></svg>
            </button>
            <div className="text-center">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-amber-50 mb-4">
              <div className="text-amber-600">
                <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0Z"/></svg>
              </div>
            </div>
            <h1 className="text-xl font-bold text-slate-800 tracking-tight">医保查询</h1>
            <p className="text-slate-500 text-sm mt-1">这个药医保报不报？生病要花多少钱？</p>
          </div>
          </div>
        </header>

        <main className="max-w-lg mx-auto p-4 space-y-4 pt-6">
          {/* Entry 1: Drug/Exam Query */}
          <button onClick={() => setView('drug')}
            className="w-full bg-white rounded-2xl border border-slate-200 shadow-sm p-6 text-left hover:shadow-md hover:border-amber-300 transition-all duration-200 group">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center group-hover:scale-105 transition-transform">
                <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607Z"/></svg>
              </div>
              <h3 className="font-semibold text-slate-800 text-sm">查药品/检查</h3>
            </div>
            <p className="text-xs text-slate-500">输入药品名或检查项目，看医保覆盖和报销比例</p>
          </button>

          {/* Entry 2: Disease Cost Estimation */}
          <button onClick={() => setView('disease')}
            className="w-full bg-white rounded-2xl border border-slate-200 shadow-sm p-6 text-left hover:shadow-md hover:border-red-300 transition-all duration-200 group">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center group-hover:scale-105 transition-transform">
                <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126Z"/></svg>
              </div>
              <h3 className="font-semibold text-slate-800 text-sm">按疾病评估费用</h3>
            </div>
            <p className="text-xs text-slate-500">输入诊断结果，AI 反推检查+药品+治疗方案的医保费用</p>
          </button>

          <p className="text-xs text-slate-400 text-center pt-6">
            费用为参考估算，实际因地区、医院等级和医保政策而异
          </p>
        </main>
      </div>
    );
  }

  // Drug/Exam search
  if (view === 'drug') {
    return (
      <div className="min-h-screen bg-slate-50">
        <header className="sticky top-0 bg-white border-b border-slate-200 px-4 py-3.5 z-10 flex items-center gap-3">
          <button onClick={() => { setView('home'); setDrugResults(null); setDrugQuery(''); }} className="text-slate-400 hover:text-slate-600"><IconBack /></button>
          <div className="flex-1">
            <h2 className="text-sm font-semibold text-slate-800">查药品/检查</h2>
          </div>
        </header>
        <main className="max-w-lg mx-auto p-4">
          <div className="flex gap-2 mb-4">
            <div className="relative flex-1">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"><IconSearch /></div>
              <input value={drugQuery} onChange={(e) => setDrugQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleDrugSearch()}
                placeholder="输入药品名或检查项目..." className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:border-amber-400" />
            </div>
            <button onClick={handleDrugSearch} disabled={loading}
              className="px-5 py-2.5 bg-amber-600 text-white rounded-xl text-sm font-medium hover:bg-amber-700 transition active:scale-95 disabled:opacity-50">查询</button>
          </div>

          {loading && (
            <div className="flex justify-center gap-1.5 py-8">
              <span className="w-2 h-2 bg-amber-400 rounded-full animate-bounce" style={{animationDelay:'0ms'}}/>
              <span className="w-2 h-2 bg-amber-400 rounded-full animate-bounce" style={{animationDelay:'150ms'}}/>
              <span className="w-2 h-2 bg-amber-400 rounded-full animate-bounce" style={{animationDelay:'300ms'}}/>
            </div>
          )}

          {drugResults && !loading && (
            <>
              {drugResults.items.length === 0 && drugSource === 'none' ? (
                <p className="text-sm text-slate-400 text-center py-8">未找到匹配的药品或检查项目</p>
              ) : (
                <div className="space-y-3">
                  {/* Source label */}
                  {drugSource !== 'kb' && drugSource !== 'none' && (
                    <div className={`rounded-xl border p-3 text-xs flex items-center gap-2 ${
                      drugSource === 'ai' ? 'bg-purple-50 border-purple-200 text-purple-600' :
                      'bg-blue-50 border-blue-200 text-blue-600'
                    }`}>
                      <span>🤖</span>
                      <span>{drugSource === 'ai' ? 'AI 搜索结果，未经知识库核实' : 'AI 补充信息，知识库 + AI 协作'}</span>
                    </div>
                  )}
                  {drugSource === 'none' && (
                    <div className="bg-red-50 rounded-xl border border-red-200 p-3 text-xs text-red-600 flex items-center gap-2">
                      <span>🤖</span>
                      <span>该药品暂未纳入中国医保目录</span>
                    </div>
                  )}
                  {/* Insurance explainer — always at top */}
                  <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                    <h4 className="text-xs font-semibold text-slate-600 mb-2">医保报销说明</h4>
                    <div className="text-xs text-slate-500 space-y-1">
                      <p><span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 font-medium">甲类</span> 100%纳入报销基数，再按医院等级比例报销</p>
                      <p><span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 font-medium">乙类</span> 先自付10-30%，剩余纳入报销基数</p>
                      <p><span className="px-1.5 py-0.5 rounded bg-red-100 text-red-700 font-medium">丙类/自费</span> 全部自付，医保不报销</p>
                    </div>
                  </div>
                  {/* KB items */}
                  {drugResults.items.filter(it => !it._ai).map((item, i) => (
                    <div key={'kb-'+i} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <span className="font-semibold text-slate-800 text-sm">{item.name}</span>
                          <span className="text-xs text-slate-400 ml-2">[知识库]</span>
                        </div>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          (item.insurance || item.category) === '甲类' ? 'bg-emerald-100 text-emerald-700' :
                          (item.insurance || item.category) === '乙类' ? 'bg-amber-100 text-amber-700' :
                          'bg-red-100 text-red-700'}`}>{item.insurance || item.category || '未知'}</span>
                      </div>
                      {item.type && <p className="text-xs text-slate-500 mb-1">类别：{item.type}</p>}
                      {item.cost_range && <p className="text-xs text-slate-500 mb-1">费用：{item.cost_range} <span className="text-slate-400">— [知识库/价格参考]</span></p>}
                      {item.box_price && <p className="text-xs text-slate-500 mb-1">每盒 {item.box_price}元 <span className="text-slate-400">— [知识库/集采参考]</span></p>}
                      {item.course_cost && <p className="text-xs text-slate-500 mb-1">每疗程 {item.course_cost}元 <span className="text-slate-400">— [知识库]</span></p>}
                      {item.disease_context && <p className="text-xs text-slate-400">参考疾病：{item.disease_context}</p>}
                    </div>
                  ))}
                  {/* AI supplement (shown even when KB has results) */}
                  {drugResults.aiSupplement && drugResults.aiSupplement.found !== false && (
                    <div className="bg-purple-50/40 rounded-xl border border-purple-200 p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <span className="font-semibold text-slate-800 text-sm">{drugResults.aiSupplement.name}</span>
                          <span className="text-xs text-purple-500 ml-2">[AI补充]</span>
                        </div>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          drugResults.aiSupplement.category === '甲类' ? 'bg-emerald-100 text-emerald-700' :
                          drugResults.aiSupplement.category === '乙类' ? 'bg-amber-100 text-amber-700' :
                          'bg-red-100 text-red-700'}`}>{drugResults.aiSupplement.category || '未知'}</span>
                      </div>
                      {drugResults.aiSupplement.usage && <p className="text-xs text-slate-500 mb-1">用途：{drugResults.aiSupplement.usage}</p>}
                      {drugResults.aiSupplement.box_price_range && (
                        <p className="text-xs text-slate-500 mb-1">
                          参考价：每盒 {drugResults.aiSupplement.box_price_range}元
                          <span className="text-purple-400 ml-1">— {drugResults.aiSupplement.price_source || '[AI估算]'}</span>
                        </p>
                      )}
                      {drugResults.aiSupplement.category_note && <p className="text-xs text-slate-500 mb-1">{drugResults.aiSupplement.category_note}</p>}
                      {drugResults.aiSupplement.brand_names && <p className="text-xs text-slate-400 mb-1">商品名：{drugResults.aiSupplement.brand_names.join('、')}</p>}
                      {drugResults.aiSupplement.notes && <p className="text-xs text-slate-400">{drugResults.aiSupplement.notes}</p>}
                      {drugResults.aiSupplement.source && <p className="text-xs text-purple-500 mt-1">{drugResults.aiSupplement.source}</p>}
                      <div className="mt-3 bg-red-50 rounded-lg border border-red-200 p-2.5 text-xs text-red-700 flex items-start gap-2">
                        <span className="shrink-0 mt-0.5">⚠</span>
                        <span><strong>该药品的医保类别为AI判断，可能与官方目录不一致。</strong>请通过国家医保服务平台APP或当地医保局核实后确认。</span>
                      </div>
                    </div>
                  )}
                  {/* "Not in insurance" drug */}
                  {drugResults.items.filter(it => it.insurance === '未纳入医保').map((item, i) => (
                    <div key={'none-'+i} className="bg-red-50 rounded-xl border border-red-200 p-4">
                      <span className="font-semibold text-red-700 text-sm">{item.name}</span>
                      <p className="text-xs text-red-500 mt-1">{item.notes}</p>
                    </div>
                  ))}
                </div>
              )}
              <p className="text-xs text-slate-400 text-center mt-6">以上为医保通用参考，具体以当地政策为准</p>
            </>
          )}
        </main>
      </div>
    );
  }

  // Disease search
  if (view === 'disease') {
    return (
      <div className="min-h-screen bg-slate-50">
        <header className="sticky top-0 bg-white border-b border-slate-200 px-4 py-3.5 z-10 flex items-center gap-3">
          <button onClick={() => { setView('home'); setDiseaseQuery(''); setDiseaseResults([]); }} className="text-slate-400 hover:text-slate-600"><IconBack /></button>
          <h2 className="text-sm font-semibold text-slate-800">按疾病评估费用</h2>
        </header>
        <main className="max-w-lg mx-auto p-4">
          <div className="flex gap-2 mb-4">
            <div className="relative flex-1">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"><IconSearch /></div>
              <input value={diseaseQuery} onChange={(e) => setDiseaseQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleDiseaseSearch()}
                placeholder="输入疾病名称（如高血压、肺癌...）" className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:border-red-400" />
            </div>
            <button onClick={handleDiseaseSearch} disabled={loading}
              className="px-5 py-2.5 bg-red-500 text-white rounded-xl text-sm font-medium hover:bg-red-600 transition active:scale-95 disabled:opacity-50">搜索</button>
          </div>

          {loading && (
            <div className="flex justify-center gap-1.5 py-8">
              <span className="w-2 h-2 bg-red-400 rounded-full animate-bounce" style={{animationDelay:'0ms'}}/>
              <span className="w-2 h-2 bg-red-400 rounded-full animate-bounce" style={{animationDelay:'150ms'}}/>
              <span className="w-2 h-2 bg-red-400 rounded-full animate-bounce" style={{animationDelay:'300ms'}}/>
            </div>
          )}

          {!loading && diseaseResults.length > 0 && (
            <div className="space-y-2">
              {diseaseResults.map((d, i) => {
                const displayName = typeof d === 'string' ? d : d.name;
                const category = typeof d === 'string' ? '' : (d.category || '');
                const isAiFallback = typeof d !== 'string' && d._aiFallback;
                return (
                <button key={i} onClick={() => handleDiseaseSelect(displayName)}
                  className={`w-full rounded-xl border p-4 text-left transition-all duration-200 ${
                    isAiFallback
                      ? 'bg-purple-50 border-purple-200 hover:border-purple-400'
                      : 'bg-white border-slate-200 hover:border-red-300 hover:shadow-sm'
                  }`}>
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-slate-800 text-sm">{displayName}</span>
                    <span className={`text-xs ${isAiFallback ? 'text-purple-500' : 'text-slate-400'}`}>
                      {isAiFallback ? 'AI搜索 · 知识库未收录' : category}
                    </span>
                  </div>
                  {isAiFallback && <p className="text-xs text-purple-500 mt-1">该病种未在知识库中，将使用AI分析（结果仅供参考）</p>}
                </button>
              )})}
            </div>
          )}
        </main>
      </div>
    );
  }

  // Disease Detail
  if (view === 'disease-detail' && selectedDisease) {
    const d = selectedDisease;

    // Calculate annual exam cost from frequency
    const calcAnnual = (freq) => {
      if (/年|每年|每12月/.test(freq)) return 1;
      if (/半年|每6月/.test(freq)) return 2;
      if (/季|每3月/.test(freq)) return 4;
      if (/月|每月/.test(freq)) return 12;
      if (/初诊|诊断|必要时|术前/.test(freq)) return 1;
      return 1;
    };

    return (
      <div className="min-h-screen bg-slate-50">
        <header className="sticky top-0 bg-white border-b border-slate-200 px-4 py-3.5 z-10 flex items-center gap-3">
          <button onClick={() => { setView('disease'); setSelectedDisease(null); }} className="text-slate-400 hover:text-slate-600"><IconBack /></button>
          <div>
            <h2 className="text-sm font-bold text-slate-800">{d.name}</h2>
            <p className="text-xs text-slate-400">{d.category}</p>
          </div>
        </header>
        <main className="max-w-lg mx-auto p-4 space-y-4 pb-12">

          {/* 数据来源 & 计算说明 */}
          <div className="bg-blue-50 rounded-2xl border border-blue-200 p-5">
            <h3 className="text-sm font-semibold text-blue-800 mb-3">费用是怎么算出来的？</h3>
            <div className="space-y-2 text-sm text-blue-700">
              <p><strong>数据来源：</strong>药品价格来自国家和省级药品集中采购平台公示价；检查费用来自全国医疗服务项目价格规范。以上均为参考范围，实际以就诊医院收费为准。</p>
              <p className="mt-3"><strong>报销比例参考（来源：国家医保局及各地医保公开政策）：</strong></p>
              <div className="bg-white/60 rounded-lg p-3 text-xs space-y-1">
                <p>• 职工门诊：三级医院报 50-60%，二级 60-70%，社区 70-80%</p>
                <p>• 居民门诊：三级医院报 40-50%，二级 50-60%，社区 50-65%</p>
                <p>• 职工住院：三级医院报 85-90%，二级 90-92%，社区 92-95%</p>
                <p>• 居民住院：三级医院报 70-75%，二级 75-80%，社区 80-85%</p>
                <p className="mt-1 text-blue-500">• 门特/慢病：报销比例参照住院或更高，部分地区取消起付线</p>
              </div>
              <p className="mt-3"><strong>计算公式：</strong></p>
              <div className="bg-white/60 rounded-lg p-3 text-xs space-y-1">
                <p>① 甲类药：费用 100% 纳入报销基数</p>
                <p>② 乙类药：个人先自付 10-30%，剩余纳入报销基数</p>
                <p>③ 丙类/自费药：全部自付，不纳入报销</p>
                <p>④ (报销基数 − 起付线) × 报销比例 = 医保报销金额</p>
                <p>⑤ 总费用 − 医保报销 = <strong>个人自付</strong></p>
              </div>
              <p className="text-xs mt-2"><strong>举例（职工医保，三级医院住院）：</strong></p>
              <p className="text-xs ml-4">总费用 10000 元（甲类药 6000 + 乙类药 3000 + 自费项目 1000）</p>
              <p className="text-xs ml-4">→ 报销基数 = 甲类 6000 + 乙类 3000×70%(扣除30%自付) = 6000 + 2100 = 8100 元</p>
              <p className="text-xs ml-4">→ (8100 − 1300起付线) × 85% = 5780 元医保报销</p>
              <p className="text-xs ml-4">→ 10000 − 5780 = <strong>自付约 4220 元</strong></p>
            </div>
          </div>

          {/* 甲乙丙类科普 */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <h3 className="text-sm font-semibold text-slate-700 mb-3">甲/乙/丙类是什么意思？</h3>
            <div className="space-y-3 text-sm">
              <div className="flex items-start gap-3">
                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700 shrink-0 mt-0.5">甲类</span>
                <div><p className="text-slate-700"><strong>临床必需 + 价格低</strong></p><p className="text-xs text-slate-500 mt-0.5">100% 纳入医保报销基数，再按医院等级比例报销。是医保覆盖最好的一类。</p></div>
              </div>
              <div className="flex items-start gap-3">
                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700 shrink-0 mt-0.5">乙类</span>
                <div><p className="text-slate-700"><strong>可供选择 + 价格略高</strong></p><p className="text-xs text-slate-500 mt-0.5">个人先自付 10-30%，剩余部分纳入报销基数。大部分常用药和检查属于乙类。</p></div>
              </div>
              <div className="flex items-start gap-3">
                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 shrink-0 mt-0.5">丙类/自费</span>
                <div><p className="text-slate-700"><strong>医保目录外</strong></p><p className="text-xs text-slate-500 mt-0.5">完全自费，医保不报销。包括保健品、美容项目、部分进口药和新药。</p></div>
              </div>
            </div>
          </div>

          {/* AI Analysis */}
          {aiAnalysis && (
            <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-2xl border border-purple-200 p-5">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-lg">🤖</span>
                <h3 className="text-sm font-semibold text-purple-800">AI 综合分析</h3>
                <span className="px-2 py-0.5 rounded-full text-xs bg-purple-200 text-purple-700">DeepSeek</span>
              </div>

              {aiAnalysis.ai_summary && (
                <p className="text-sm text-slate-700 mb-4">{aiAnalysis.ai_summary}</p>
              )}

              {aiAnalysis.cost_breakdown && (
                <div className="mb-4">
                  <h4 className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">费用结构分析</h4>
                  <div className="bg-white/70 rounded-lg p-3 text-sm space-y-2">
                    {aiAnalysis.cost_breakdown.outpatient_monthly && <p><strong>门诊月均：</strong>{aiAnalysis.cost_breakdown.outpatient_monthly}</p>}
                    {aiAnalysis.cost_breakdown.hospitalization && <p><strong>住院估算：</strong>{aiAnalysis.cost_breakdown.hospitalization}</p>}
                    {aiAnalysis.cost_breakdown.insurance_note && <p><strong>医保报销：</strong>{aiAnalysis.cost_breakdown.insurance_note}</p>}
                  </div>
                </div>
              )}

              {aiAnalysis.important_notes?.length > 0 && (
                <div className="mb-4">
                  <h4 className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">注意事项</h4>
                  {aiAnalysis.important_notes.map((n, i) => (
                    <p key={i} className="text-xs text-slate-600 flex items-start gap-2 mb-1"><span className="text-purple-400 shrink-0">•</span>{n}</p>
                  ))}
                </div>
              )}

              {aiAnalysis.disclaimer && (
                <p className="text-xs text-purple-500 border-t border-purple-200 pt-3">{aiAnalysis.disclaimer}</p>
              )}
            </div>
          )}

          {/* KB Exams */}
          {d.typical_exams?.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-slate-700">常规检查</h3>
                <span className="px-2 py-0.5 rounded-full text-xs bg-slate-100 text-slate-500">知识库</span>
              </div>
              <p className="text-xs text-slate-400 mb-3">费用为<strong>单次</strong>参考，年花费 = 单次 × 频率</p>
              <div className="space-y-3">
                {d.typical_exams.map((e, i) => {
                  const times = calcAnnual(e.frequency);
                  const costNum = parseFloat(e.cost);
                  const annualCost = isNaN(costNum) ? null : costNum * times;
                  return (
                  <div key={i} className="flex items-center justify-between text-sm py-2 border-b border-slate-50 last:border-0">
                    <div>
                      <span className="text-slate-700">{e.name}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-slate-500 text-xs block">{e.frequency}</span>
                      <span className="text-slate-600 text-xs">单次 {e.cost}元</span>
                      {annualCost && times > 1 && (
                        <span className="text-slate-400 text-xs block">年约 {Math.round(annualCost)} 元</span>
                      )}
                    </div>
                  </div>
                )})}
                {aiAnalysis?.ai_supplement_exams?.map((e, i) => (
                  <div key={'ai-exam-'+i} className="flex items-center justify-between text-sm py-2 border-b border-slate-50 last:border-0 bg-purple-50/40 rounded-lg px-2 -mx-2">
                    <div><span className="text-slate-700">{e.name}</span><span className="text-xs text-purple-500 ml-1.5">[AI补充,需核实]</span></div>
                    <div className="text-right"><span className="text-purple-500 text-xs block">{e.frequency}</span><span className="text-purple-600 text-xs">约 {e.cost_estimate}</span></div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Drugs (KB + AI merged) */}
          {(d.typical_drugs?.length > 0 || aiAnalysis?.ai_supplement_drugs?.length > 0) && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-slate-700">常用药品</h3>
                <div className="flex items-center gap-1.5">
                  {d.typical_drugs?.length > 0 && <span className="px-2 py-0.5 rounded-full text-xs bg-slate-100 text-slate-500">知识库</span>}
                  {aiAnalysis?.ai_supplement_drugs?.length > 0 && <span className="px-2 py-0.5 rounded-full text-xs bg-purple-100 text-purple-600">AI补充</span>}
                </div>
              </div>
              <p className="text-xs text-slate-400 mb-3">每盒参考价来自国家和省级药品集采平台公示价，<strong>不同品牌（原研vs仿制药）价格差异大</strong>，患者可自行核实</p>
              <div className="space-y-2">
                {d.typical_drugs?.map((dr, i) => {
                  const bp = dr.box_price || '';
                  const cc = dr.course_cost || '';
                  const isCourse = !bp && cc; // course_cost without box_price = treatment course
                  const priceStr = bp || cc;
                  const unitLabel = isCourse ? '每疗程' : '每盒';
                  return (
                  <div key={'kb-'+i} className="flex items-center justify-between text-sm py-1.5 border-b border-slate-50 last:border-0">
                    <div>
                      <span className="text-slate-700">{dr.name}</span>
                      <span className="text-xs text-slate-400 ml-1.5">[知识库]</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {priceStr && <span className="text-xs text-slate-600">{unitLabel} {priceStr}元</span>}
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${dr.insurance==='甲类'?'bg-emerald-100 text-emerald-700':dr.insurance==='乙类'?'bg-amber-100 text-amber-700':'bg-red-100 text-red-700'}`}>{dr.insurance}</span>
                    </div>
                  </div>
                )})}
                {aiAnalysis?.ai_supplement_drugs?.map((da, i) => (
                  <div key={'ai-'+i} className="flex items-center justify-between text-sm py-1.5 border-b border-slate-50 last:border-0 bg-purple-50/40 rounded-lg px-2 -mx-2">
                    <div>
                      <span className="text-slate-700">{da.name}</span>
                      <span className="text-xs text-purple-500 ml-1.5">[AI补充，需核实]</span>
                      {da.reason && <span className="text-xs text-purple-400 block mt-0.5">{da.reason}</span>}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {da.box_price && <span className="text-xs text-slate-500">约 {da.box_price}元</span>}
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${(da.category||'').includes('甲')?'bg-emerald-100 text-emerald-700':(da.category||'').includes('乙')?'bg-amber-100 text-amber-700':'bg-red-100 text-red-700'}`}>{da.category}</span>
                    </div>
                  </div>
                ))}
                {aiAnalysis?.ai_supplement_drugs?.length > 0 && (
                  <div className="bg-red-50 rounded-xl border border-red-200 p-3 text-xs text-red-700 flex items-start gap-2 mt-2">
                    <span className="shrink-0 mt-0.5">⚠</span>
                    <span>上方标注 [AI补充] 的药品由AI推荐，<strong>医保类别和价格可能不准确</strong>。请以国家医保服务平台APP或医生处方为准。</span>
                  </div>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-3 pt-3 border-t border-slate-100">
                自付金额 = 每盒价格 × 自付比例。甲类自付约15-50%（取决于门诊/住院/医院等级），乙类在此基础上先加10-30%。标注[AI补充]的药品需自行核实。
              </p>
            </div>
          )}

          {/* Treatment Paths */}
          {(d.treatment_paths?.length > 0 || aiAnalysis?.ai_supplement_paths?.length > 0) && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-slate-700">治疗路径</h3>
                <div className="flex items-center gap-1.5">
                  {d.treatment_paths?.length > 0 && <span className="px-2 py-0.5 rounded-full text-xs bg-slate-100 text-slate-500">知识库</span>}
                  {aiAnalysis?.ai_supplement_paths?.length > 0 && <span className="px-2 py-0.5 rounded-full text-xs bg-purple-100 text-purple-600">AI补充</span>}
                </div>
              </div>
              {d.treatment_paths?.map((p, i) => (
                <p key={i} className="text-sm text-slate-600 flex items-start gap-2 mb-1.5">
                  <span className="text-red-400 mt-1 shrink-0">•</span>{p}
                </p>
              ))}
              {aiAnalysis?.ai_supplement_paths?.map((p, i) => (
                <p key={'ai-path-'+i} className="text-sm text-purple-600 flex items-start gap-2 mb-1.5 bg-purple-50/40 rounded-lg px-2 py-1 -mx-1">
                  <span className="text-purple-400 mt-1 shrink-0">•</span>{p} <span className="text-xs text-purple-400 ml-1">[AI补充，需核实]</span>
                </p>
              ))}
            </div>
          )}

          {/* Hospitalization (KB + AI) */}
          {(d.hospitalization_scenario || aiAnalysis?.ai_hospitalization_note) && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
              <h3 className="text-sm font-semibold text-slate-700 mb-2">住院参考</h3>
              {d.hospitalization_scenario && <p className="text-sm text-slate-600">{d.hospitalization_scenario}</p>}
              {aiAnalysis?.ai_hospitalization_note && (
                <p className="text-sm text-purple-600 mt-2 bg-purple-50/40 rounded-lg px-3 py-2">
                  {aiAnalysis.ai_hospitalization_note} <span className="text-xs text-purple-400 ml-1">[AI补充,需核实]</span>
                </p>
              )}
            </div>
          )}

          {/* Insurance Notes (KB + AI) */}
          {(d.insurance_notes || aiAnalysis?.ai_insurance_note) && (
            <div className="bg-amber-50 rounded-2xl border border-amber-200 p-5">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-amber-800">医保提示</h3>
                {aiAnalysis?.ai_insurance_note && <span className="px-2 py-0.5 rounded-full text-xs bg-amber-200 text-amber-700">AI补充</span>}
              </div>
              {d.insurance_notes && <p className="text-sm text-amber-700">{d.insurance_notes}</p>}
              {aiAnalysis?.ai_insurance_note && (
                <p className="text-sm text-amber-700 mt-2 border-t border-amber-200 pt-2">{aiAnalysis.ai_insurance_note}</p>
              )}
            </div>
          )}

          <p className="text-xs text-slate-400 text-center pt-4">
            以上费用均来自公开参考数据和知识库估算，实际因地区、医院、医保年度调整而异
          </p>
        </main>
      </div>
    );
  }

  return null;
}
