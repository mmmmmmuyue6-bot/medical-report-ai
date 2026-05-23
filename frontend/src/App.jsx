import { useState } from 'react';
import UploadPage from './components/UploadPage';
import ResultPage from './components/ResultPage';
import SymptomChat from './components/SymptomChat';
import ExamList from './components/ExamList';
import ExamDetail from './components/ExamDetail';
import DiseaseExamView from './components/DiseaseExamView';
import InsurancePage from './components/InsurancePage';
import { interpretReport, fetchDemo } from './api';

function HomePage({ onNavigate }) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex flex-col items-center justify-center px-4">
      <div className="text-center mb-10">
        <h1 className="text-2xl font-bold text-slate-800 tracking-tight">就医全流程 AI 导航</h1>
        <p className="text-slate-500 text-sm mt-2">从症状自查到报告解读，AI 帮你就医全程不迷路</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-lg">
        {/* Module 1: Symptom Checker */}
        <button
          onClick={() => onNavigate('symptom')}
          className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 text-left hover:shadow-md hover:border-blue-300 transition-all duration-200 group"
        >
          <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
            <svg className="w-6 h-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              <circle cx="12" cy="12" r="10" />
            </svg>
          </div>
          <h3 className="font-semibold text-slate-800 text-sm mb-1">智能症状分诊</h3>
          <p className="text-xs text-slate-500 leading-relaxed">不舒服不知道挂什么科？AI 帮你判断</p>
        </button>

        {/* Module 3: Report Interpreter */}
        <button
          onClick={() => onNavigate('report')}
          className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 text-left hover:shadow-md hover:border-blue-300 transition-all duration-200 group"
        >
          <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
            <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
          </div>
          <h3 className="font-semibold text-slate-800 text-sm mb-1">体检报告解读</h3>
          <p className="text-xs text-slate-500 leading-relaxed">拍照上传体检报告，AI 秒懂每项指标</p>
        </button>

        {/* Module 2: Exam Explainer */}
        <button
          onClick={() => onNavigate('exam')}
          className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 text-left hover:shadow-md hover:border-amber-300 transition-all duration-200 group"
        >
          <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
            <svg className="w-6 h-6 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15a2.25 2.25 0 012.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25Z" />
            </svg>
          </div>
          <h3 className="font-semibold text-slate-800 text-sm mb-1">检查项目解释</h3>
          <p className="text-xs text-slate-500 leading-relaxed">检查单看不懂？每项检查逐项拆解讲明白</p>
        </button>

        {/* Module 4: Insurance Query */}
        <button
          onClick={() => onNavigate('insurance')}
          className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 text-left hover:shadow-md hover:border-amber-300 transition-all duration-200 group"
        >
          <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
            <svg className="w-6 h-6 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0Z"/></svg>
          </div>
          <h3 className="font-semibold text-slate-800 text-sm mb-1">医保查询</h3>
          <p className="text-xs text-slate-500 leading-relaxed">查药品/检查医保覆盖，按疾病估算费用</p>
        </button>
      </div>

      <p className="text-xs text-slate-400 text-center mt-10">
        本工具由 AI 驱动，仅供参考，不构成医疗诊断建议
      </p>
    </div>
  );
}

export default function App() {
  const [page, setPage] = useState('home'); // 'home' | 'report' | 'loading' | 'result' | 'symptom' | 'exam' | 'examDetail'
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [selectedExam, setSelectedExam] = useState(null);
  const [selectedExamAI, setSelectedExamAI] = useState(null); // AI search result data
  const [detailFromPage, setDetailFromPage] = useState('exam'); // track where detail was opened from

  const handleUpload = async (indicators, age, gender) => {
    setPage('loading');
    setError(null);
    try {
      const res = await interpretReport(indicators, age, gender);
      if (res.success) {
        setResult(res.data);
        setPage('result');
      } else {
        setError(res.error || '解读失败');
        setPage('report');
      }
    } catch (e) {
      setError(e.message || '网络错误，请确认后端已启动');
      setPage('report');
    }
  };

  const handleDemo = async () => {
    setPage('loading');
    setError(null);
    try {
      const res = await fetchDemo();
      if (res.success) {
        setResult(res.data);
        setPage('result');
      } else {
        setError(res.error || 'Demo加载失败');
        setPage('report');
      }
    } catch (e) {
      setError('网络错误，请确认后端已启动 (localhost:8001)');
      setPage('report');
    }
  };

  const handleBack = () => {
    setPage('report');
    setResult(null);
    setError(null);
  };

  const handleHome = () => {
    setPage('home');
    setResult(null);
    setError(null);
  };

  const handleBackFromDetail = () => {
    setSelectedExam(null);
    setPage(detailFromPage);
  };

  if (page === 'home') {
    return <HomePage onNavigate={setPage} />;
  }

  if (page === 'loading') {
    return <LoadingSkeleton onBack={handleBack} />;
  }

  if (page === 'result' && result) {
    return <ResultPage data={result} onBack={handleBack} />;
  }

  if (page === 'symptom') {
    return <SymptomChat onBack={handleHome} />;
  }

  if (page === 'exam') {
    return (
      <ExamList
        onBack={handleHome}
        onSelectExam={(name) => { setSelectedExam(name); setSelectedExamAI(null); setDetailFromPage('exam'); setPage('examDetail'); }}
        onSelectExamWithAI={(name, aiData) => { setSelectedExam(name); setSelectedExamAI(aiData); setDetailFromPage('exam'); setPage('examDetail'); }}
        onDiseaseCheck={() => setPage('diseaseExam')}
      />
    );
  }

  if (page === 'diseaseExam') {
    return (
      <DiseaseExamView
        onBack={() => setPage('exam')}
        onSelectExam={(name) => { setDetailFromPage('diseaseExam'); setSelectedExam(name); setPage('examDetail'); }}
      />
    );
  }

  if (page === 'examDetail' && selectedExam) {
    return (
      <ExamDetail
        examName={selectedExam}
        examAI={selectedExamAI}
        onBack={handleBackFromDetail}
      />
    );
  }

  if (page === 'insurance') {
    return <InsurancePage onBack={handleHome} />;
  }

  return <UploadPage onSubmit={handleUpload} onBack={handleHome} error={error} />;
}

function LoadingSkeleton({ onBack }) {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-2xl space-y-6 animate-pulse">
        <div className="h-8 bg-slate-200 rounded w-48 mx-auto" />
        <div className="h-4 bg-slate-200 rounded w-64 mx-auto" />
        <div className="h-48 bg-slate-200 rounded-xl" />
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 bg-slate-200 rounded-lg" />
          ))}
        </div>
        <p className="text-center text-slate-500 text-sm">AI正在分析您的报告...</p>
        <button onClick={onBack} className="block mx-auto text-sm text-slate-400 underline">
          取消
        </button>
      </div>
    </div>
  );
}
