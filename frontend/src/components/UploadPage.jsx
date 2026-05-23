import { useState, useRef } from 'react';
import { interpretReport } from '../api';

const API_BASE = '/api';

async function uploadOCR(file) {
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetch(`${API_BASE}/ocr/upload`, { method: 'POST', body: formData });
  if (!res.ok) throw new Error('OCR请求失败');
  return res.json();
}

// SVG Icons
const IconUpload = () => (
  <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
  </svg>
);
const IconDoc = () => (
  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
  </svg>
);
const IconSparkle = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09Z" />
  </svg>
);
const IconTarget = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0Z" />
  </svg>
);
const IconList = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15a2.25 2.25 0 012.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25Z" />
  </svg>
);

export default function UploadPage({ onSubmit, onBack, error }) {
  const [stage, setStage] = useState('upload'); // 'upload' | 'ocr-loading' | 'ocr-review' | 'analyze-loading'
  const [mode, setMode] = useState('form'); // 'form' | 'text'
  const [showManual, setShowManual] = useState(false);
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

  // File selection
  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setOcrError(null);
    setOcrResult(null);
    const reader = new FileReader();
    reader.onload = (ev) => setImagePreview(ev.target.result);
    reader.readAsDataURL(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;
    setImageFile(file);
    setOcrError(null);
    setOcrResult(null);
    const reader = new FileReader();
    reader.onload = (ev) => setImagePreview(ev.target.result);
    reader.readAsDataURL(file);
  };

  // OCR recognition
  const handleOCR = async () => {
    if (!imageFile) return;
    setStage('ocr-loading');
    setOcrError(null);
    try {
      const res = await uploadOCR(imageFile);
      if (res.success) {
        setOcrResult(res.data);
        setStage('ocr-review');
      } else {
        setOcrError(res.error || '识别失败，请尝试手动输入');
        setStage('upload');
      }
    } catch (e) {
      setOcrError(e.message || '网络错误');
      setStage('upload');
    }
  };

  // Update OCR result indicator
  const updateOcrIndicator = (i, field, val) => {
    const next = { ...ocrResult };
    const inds = [...next.indicators];
    inds[i] = { ...inds[i], [field]: field === 'value' ? parseFloat(val) || val : val };
    next.indicators = inds;
    setOcrResult(next);
  };

  // Submit
  const handleSubmit = (e) => {
    e?.preventDefault();
    let data;
    if (ocrResult) {
      data = ocrResult.indicators;
    } else if (mode === 'text') {
      data = indicatorText.split('\n').filter((l) => l.trim()).map((line) => {
        const [name, value, unit] = line.split(',').map((s) => s.trim());
        return { name: name || '', value: parseFloat(value) || value, unit: unit || '', reference_range: '' };
      });
    } else {
      data = indicators.filter((ind) => ind.name && ind.value);
    }
    if (data.length === 0) return;
    const userAge = ocrResult?.age || (age ? parseInt(age) : null);
    const userGender = ocrResult?.gender || gender || null;
    onSubmit(data, userAge, userGender);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <header className="bg-white border-b border-slate-200 px-4 py-6">
        <div className="max-w-lg mx-auto">
          <button onClick={onBack} className="text-slate-400 hover:text-slate-600 transition mb-3">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5"/></svg>
          </button>
          <div className="text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-50 mb-4">
            <div className="text-blue-600"><IconDoc /></div>
          </div>
          <h1 className="text-xl font-bold text-slate-800 tracking-tight">智能体检报告解读</h1>
          <p className="text-slate-500 text-sm mt-1">拍照上传体检报告，AI 秒懂每项指标</p>
        </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto p-4 space-y-5">
        {/* Error */}
        {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 text-sm">{error}</div>}
        {ocrError && <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 text-sm">{ocrError}</div>}

        {/* Upload Area */}
        {!ocrResult && (
          <div
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            onClick={() => fileInputRef.current?.click()}
            className={`relative border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all duration-200 ${
              imagePreview
                ? 'border-blue-400 bg-blue-50/50'
                : 'border-slate-300 hover:border-blue-400 hover:bg-slate-50'
            }`}
          >
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />

            {imagePreview ? (
              <div className="space-y-4">
                <img src={imagePreview} alt="预览" className="max-h-48 mx-auto rounded-xl shadow-sm border border-slate-200" />
                <p className="text-sm text-slate-500">点击重新选择图片</p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="text-slate-400 flex justify-center"><IconUpload /></div>
                <p className="text-sm text-slate-600 font-medium">点击上传体检报告</p>
                <p className="text-xs text-slate-400">支持 JPG / PNG，或拖拽图片到此处</p>
              </div>
            )}
          </div>
        )}

        {/* OCR Loading */}
        {stage === 'ocr-loading' && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 text-center shadow-sm">
            <div className="flex justify-center gap-1.5 mb-3">
              <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
            <p className="text-sm text-slate-600">AI 正在识别报告中的指标...</p>
          </div>
        )}

        {/* OCR Recognize Button */}
        {imagePreview && !ocrResult && stage !== 'ocr-loading' && (
          <button
            onClick={handleOCR}
            className="w-full py-3.5 rounded-2xl font-medium text-sm bg-blue-600 text-white hover:bg-blue-700 active:scale-[0.98] transition-all duration-200 shadow-sm"
          >
            开始识别
          </button>
        )}

        {/* OCR Review */}
        {stage === 'ocr-review' && ocrResult && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-4 py-3 bg-blue-50 border-b border-blue-100 flex items-center gap-2">
              <div className="text-blue-600"><IconSparkle /></div>
              <div>
                <h3 className="text-sm font-semibold text-blue-800">已识别 {ocrResult.indicators?.length || 0} 项指标</h3>
                <p className="text-xs text-blue-600">请核对并修改，确认无误后开始解读</p>
              </div>
            </div>
            <div className="divide-y divide-slate-100">
              {(ocrResult.indicators || []).map((ind, i) => (
                <div key={i} className="p-3 grid grid-cols-12 gap-2 items-center">
                  <input
                    value={ind.name || ''}
                    onChange={(e) => updateOcrIndicator(i, 'name', e.target.value)}
                    className="col-span-5 px-2 py-1.5 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-400"
                  />
                  <input
                    value={ind.value || ''}
                    onChange={(e) => updateOcrIndicator(i, 'value', e.target.value)}
                    className="col-span-3 px-2 py-1.5 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-400"
                  />
                  <input
                    value={ind.unit || ''}
                    onChange={(e) => updateOcrIndicator(i, 'unit', e.target.value)}
                    className="col-span-4 px-2 py-1.5 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-400"
                  />
                </div>
              ))}
            </div>
            <div className="px-4 py-3 bg-slate-50 border-t border-slate-200">
              <button
                onClick={handleSubmit}
                className="w-full py-3 rounded-2xl font-medium text-sm bg-blue-600 text-white hover:bg-blue-700 active:scale-[0.98] transition-all duration-200 shadow-sm"
              >
                确认并开始解读
              </button>
            </div>
          </div>
        )}

        {/* Manual Input (collapsible) */}
        {!ocrResult && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <button
              onClick={() => setShowManual(!showManual)}
              className="w-full px-4 py-3.5 flex items-center justify-between text-left hover:bg-slate-50 transition"
            >
              <div className="flex items-center gap-2.5">
                <div className="text-slate-500"><IconList /></div>
                <span className="text-sm font-medium text-slate-700">或手动输入指标</span>
              </div>
              <svg className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${showManual ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5"/></svg>
            </button>

            {showManual && (
              <div className="px-4 pb-4 space-y-4">
                {/* Age/Gender */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">年龄</label>
                    <input type="number" value={age} onChange={(e) => setAge(e.target.value)} placeholder="如 28"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-400" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">性别</label>
                    <select value={gender} onChange={(e) => setGender(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-400 bg-white">
                      <option value="">请选择</option><option value="男性">男性</option><option value="女性">女性</option>
                    </select>
                  </div>
                </div>

                {/* Mode Toggle */}
                <div className="flex gap-2">
                  <button onClick={() => setMode('form')}
                    className={`px-4 py-1.5 rounded-lg text-xs font-medium transition ${mode === 'form' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                    表单输入
                  </button>
                  <button onClick={() => setMode('text')}
                    className={`px-4 py-1.5 rounded-lg text-xs font-medium transition ${mode === 'text' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                    文本粘贴
                  </button>
                </div>

                {/* Text mode */}
                {mode === 'text' && (
                  <textarea value={indicatorText} onChange={(e) => setIndicatorText(e.target.value)} rows={6}
                    placeholder={"每行一个指标，格式：名称,数值,单位\n例如：\nALT,85,U/L\nAST,62,U/L\n总胆固醇,6.5,mmol/L"}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-mono outline-none focus:border-blue-400 resize-y" />
                )}

                {/* Form mode */}
                {mode === 'form' && (
                  <div className="border border-slate-200 rounded-lg overflow-hidden">
                    <div className="divide-y divide-slate-100">
                      {indicators.map((ind, i) => (
                        <div key={i} className="p-2.5 grid grid-cols-12 gap-2 items-center">
                          <input value={ind.name} onChange={(e) => updateRow(i, 'name', e.target.value)} placeholder="指标名"
                            className="col-span-5 px-2 py-1.5 border border-slate-200 rounded text-sm outline-none focus:border-blue-400" />
                          <input value={ind.value} onChange={(e) => updateRow(i, 'value', e.target.value)} placeholder="数值"
                            className="col-span-3 px-2 py-1.5 border border-slate-200 rounded text-sm outline-none focus:border-blue-400" />
                          <input value={ind.unit} onChange={(e) => updateRow(i, 'unit', e.target.value)} placeholder="单位"
                            className="col-span-3 px-2 py-1.5 border border-slate-200 rounded text-sm outline-none focus:border-blue-400" />
                          <button type="button" onClick={() => removeRow(i)} className="col-span-1 text-slate-400 hover:text-red-500 text-lg">&times;</button>
                        </div>
                      ))}
                    </div>
                    <button type="button" onClick={addRow}
                      className="w-full px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 transition">+ 添加指标</button>
                  </div>
                )}

                {indicators.some((i) => i.name && i.value) && (
                  <button onClick={handleSubmit}
                    className="w-full py-3 rounded-2xl font-medium text-sm bg-blue-600 text-white hover:bg-blue-700 active:scale-[0.98] transition-all duration-200 shadow-sm">
                    开始解读
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Feature cards */}
        <div className="grid grid-cols-3 gap-3 pt-2">
          {[
            { icon: <IconSparkle />, color: 'blue', title: 'AI解读', desc: '临床知识驱动的智能分析' },
            { icon: <IconTarget />, color: 'emerald', title: '风险分层', desc: '红橙黄绿四级风险标识' },
            { icon: <IconList />, color: 'amber', title: '就医建议', desc: '科室推荐+检查指引' },
          ].map((f) => (
            <div key={f.title} className="bg-white rounded-xl border border-slate-200 p-4 text-center shadow-sm">
              <div className={`w-10 h-10 mx-auto mb-2 rounded-xl bg-${f.color}-50 flex items-center justify-center text-${f.color}-600`}>{f.icon}</div>
              <h4 className="text-xs font-medium text-slate-700 mb-0.5">{f.title}</h4>
              <p className="text-xs text-slate-400 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>

        <p className="text-xs text-slate-400 text-center pb-8">
          本解读由AI生成，仅供参考，不构成医疗诊断建议。如有不适请及时就医。
        </p>
      </main>
    </div>
  );
}
