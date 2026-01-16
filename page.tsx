
import React, { useState, useMemo, useEffect } from 'react';
import Header from './components/Header';
import FeatureCard from './components/FeatureCard';
import { View, Message, OfficialResource } from './types';
import * as gemini from './services/geminiService';

const OFFICIAL_RESOURCES: OfficialResource[] = [
  { name: 'الجريدة الرسمية للجمهورية الجزائرية', url: 'https://www.joradp.dz', category: 'الهيئات السيادية والتشريعية' },
  { name: 'بوابة المجلات العلمية الجزائرية ASJP (المرجع الأكاديمي)', url: 'https://www.asjp.cerist.dz', category: 'المصادر الأكاديمية والبحثية' },
  { name: 'رئاسة الجمهورية الجزائرية', url: 'https://www.el-mouradia.dz', category: 'الهيئات السيادية والتشريعية' },
  { name: 'الوزارة الأولى (الحكومة)', url: 'https://www.cg.gov.dz', category: 'الهيئات السيادية والتشريعية' },
  { name: 'المحكمة الدستورية', url: 'https://www.cour-constitutionnelle.dz', category: 'الهيئات السيادية والتشريعية' },
  { name: 'المعاهدات الاقتصادية (UNCTAD)', url: 'https://investmentpolicy.unctad.org/international-investment-agreements/countries/4/algeria', category: 'المواثيق والمعاهدات الدولية' },
  { name: 'الملكية الفكرية (WIPO LEX)', url: 'https://wipolex.wipo.int/en/main/legislation/c/DZ', category: 'المواثيق والمعاهدات الدولية' },
  { name: 'وزارة العدل', url: 'https://www.mjustice.dz', category: 'الوزارات والقطاعات الحكومية' },
  { name: 'وزارة الداخلية والجماعات المحلية', url: 'https://www.interieur.gov.dz', category: 'الوزارات والقطاعات الحكومية' },
];

const CONTRACT_CATEGORIES = [
  { id: 'financial', label: 'المعاملات المالية', desc: 'اعتراف بدين، قرض بين خواص (المادة 327 مدني)', allowed: true },
  { id: 'services', label: 'الخدمات والمقاولة', desc: 'عقد مقاولة، تقديم خدمات استشارية (المادة 549 مدني)', allowed: true },
  { id: 'movables', label: 'بيع المنقولات', desc: 'بيع معدات، أثاث، مواشي (مبدأ الرضائية)', allowed: true },
  { id: 'obligations', label: 'الالتزامات والتعهدات', desc: 'تعهد، تصريح شرفي (قانون الإجراءات الإدارية)', allowed: true },
  { id: 'realestate', label: 'العقارات والهبات', desc: 'عقود تتطلب التوثيق الإلزامي (المادة 324 مكرر 1)', allowed: false },
];

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<View>(View.Home);
  const [loading, setLoading] = useState(false);
  
  const [chatHistory, setChatHistory] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [radarQuery, setRadarQuery] = useState('آخر القوانين والمراسيم والاتفاقيات الدولية - 15 جانفي 2026');
  const [radarResult, setRadarResult] = useState<{text: string, sources: any[]}>({text: '', sources: []});
  const [analysisFile, setAnalysisFile] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState('');
  const [selectedContractCat, setSelectedContractCat] = useState('financial');

  // Research Multi-stage states
  const [researchStage, setResearchStage] = useState(0);
  const [fullResearch, setFullResearch] = useState<string[]>([]);

  const [resSearchTerm, setResSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('الكل');

  const cleanText = (text: string) => text.replace(/[#*]/g, '');

  const filteredResources = useMemo(() => {
    const term = resSearchTerm.toLowerCase().trim();
    return OFFICIAL_RESOURCES.filter(res => {
      const matchesSearch = res.name.toLowerCase().includes(term) || res.url.toLowerCase().includes(term);
      const matchesCategory = selectedCategory === 'الكل' || res.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [resSearchTerm, selectedCategory]);

  const categories = useMemo(() => ['الكل', ...Array.from(new Set(OFFICIAL_RESOURCES.map(r => r.category)))], []);

  const setView = (v: View) => {
    setCurrentView(v);
    setAnalysisResult('');
    setAnalysisFile(null);
    setInputText('');
    setResearchStage(0);
    setFullResearch([]);
    if (v === View.Radar) handleRadar();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleConsultation = async () => {
    if (!inputText) return;
    const q = inputText;
    setLoading(true);
    setChatHistory(prev => [...prev, { role: 'user', text: q, timestamp: new Date() }]);
    setInputText('');
    try {
      const response = await gemini.getLegalConsultation(q);
      setChatHistory(prev => [...prev, { role: 'model', text: response || 'نعتذر، حدث خطأ.', timestamp: new Date() }]);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const handleAnalysis = async () => {
    setLoading(true);
    try {
      const result = await gemini.analyzeContract(inputText, analysisFile || undefined);
      setAnalysisResult(result || '');
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const handleGenerateContract = async () => {
    const cat = CONTRACT_CATEGORIES.find(c => c.id === selectedContractCat);
    if (!cat?.allowed) {
      setAnalysisResult('نعتذر، المادة 324 مكرر 1 من القانون المدني تلزم صب هذا العقد في قالب رسمي توثيقي.');
      return;
    }
    setLoading(true);
    try {
      const result = await gemini.generateDraftContract(cat.label, inputText);
      setAnalysisResult(result || '');
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const handleRadar = async () => {
    setLoading(true);
    try {
      const result = await gemini.legalRadarSearch(radarQuery);
      setRadarResult(result);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const handleResearch = async () => {
    if (!inputText) return;
    setLoading(true);
    setFullResearch([]);
    setResearchStage(1);
    
    try {
      let cumulativeText = "";
      for (let s = 1; s <= 5; s++) {
        setResearchStage(s);
        const stageContent = await gemini.generateResearchStage(inputText, s, cumulativeText);
        setFullResearch(prev => [...prev, stageContent]);
        cumulativeText += stageContent;
      }
    } catch (e) { 
      console.error(e); 
      setFullResearch(prev => [...prev, "[حدث خطأ أثناء التوليد، يرجى إعادة المحاولة]"]);
    } finally { 
      setLoading(false); 
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setAnalysisFile(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const renderContent = () => {
    switch (currentView) {
      case View.Home:
        return (
          <div className="max-w-7xl mx-auto px-4 py-16 text-right">
            <div className="text-center mb-16 animate-in fade-in slide-in-from-top duration-700">
              <h2 className="text-4xl md:text-6xl font-black text-slate-900 mb-6">منصة القانون <span className="text-amber-600">الجزائرية</span></h2>
              <p className="text-lg text-slate-500 max-w-2xl mx-auto font-light leading-relaxed">بوابتكم الذكية للتشريع والبحث الأكاديمي، نجمع بين عراقة القانون ودقة التكنولوجيا.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              <FeatureCard title="استشارة ومساعد إجرائي" description="اقتراح الدفوع والطلبات الختامية بناءً على وقائع قضيتك." icon="💬" view={View.Consultation} onClick={setView} color="bg-white" />
              <FeatureCard title="تحليل الملفات والصور" description="مطابقة العقود مع القوانين الجزائرية والمواثيق الدولية." icon="📄" view={View.Analysis} onClick={setView} color="bg-white" />
              <FeatureCard title="إنشاء العقود العرفية" description="صياغة ذكية للعقود التي لا تشترط التوثيق الرسمي." icon="✍️" view={View.ContractGenerator} onClick={setView} color="bg-white" />
              <FeatureCard title="الرادار القانوني" description="رصد آخر الجرائد الرسمية ومراسيم التصديق الدولية." icon="📡" view={View.Radar} onClick={setView} color="bg-white" />
              <FeatureCard title="بحوث أكاديمية (20 صفحة)" description="إعداد بحوث قانونية معمقة على 5 مراحل مع تهميش إلزامي وتفصيل دقيق." icon="🎓" view={View.Research} onClick={setView} color="bg-white" />
              <FeatureCard title="دليل المصادر" description="الوصول المباشر للهيئات السيادية وقواعد البيانات الدولية." icon="🔗" view={View.Resources} onClick={setView} color="bg-white" />
            </div>
          </div>
        );

      case View.Consultation:
        return (
          <div className="max-w-4xl mx-auto px-4 py-8 h-[calc(100vh-80px)] flex flex-col text-right">
            <div className="flex justify-between items-center mb-4 px-2">
              <div className="flex items-center gap-2">
                <span className="text-xl">⚖️</span>
                <h3 className="text-lg font-black text-slate-900">المساعد الإجرائي الذكي</h3>
              </div>
              {chatHistory.length > 0 && (
                <button onClick={() => setChatHistory([])} className="text-xs font-bold text-red-500">مسح المحادثة</button>
              )}
            </div>
            <div className="flex-1 overflow-y-auto mb-6 space-y-4 p-6 bg-white rounded-2xl shadow-xl border border-slate-100">
              {chatHistory.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-start' : 'justify-end'}`}>
                  <div className={`max-w-[85%] p-4 rounded-2xl ${msg.role === 'user' ? 'bg-slate-900 text-white' : 'bg-amber-50 text-slate-800 border border-amber-100'}`}>
                    <div className="whitespace-pre-wrap leading-relaxed">{cleanText(msg.text)}</div>
                  </div>
                </div>
              ))}
              {loading && <div className="text-amber-600 animate-pulse font-bold p-2 text-sm">جاري تحليل الوقائع...</div>}
            </div>
            <div className="flex gap-2 bg-white p-2 rounded-2xl shadow-lg border border-slate-200">
              <input type="text" value={inputText} onChange={(e) => setInputText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleConsultation()} placeholder="اشرح قضيتك هنا..." className="flex-1 p-3 outline-none" />
              <button onClick={handleConsultation} disabled={loading || !inputText} className="bg-amber-600 text-white px-8 py-3 rounded-xl font-bold">إرسال</button>
            </div>
          </div>
        );

      case View.ContractGenerator:
        return (
          <div className="max-w-4xl mx-auto px-4 py-12 text-right">
            <div className="bg-white p-10 rounded-2xl shadow-2xl border border-slate-100">
              <h3 className="text-2xl font-black mb-6">إنشاء العقود العرفية ✍️</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                {CONTRACT_CATEGORIES.map(cat => (
                  <button key={cat.id} onClick={() => setSelectedContractCat(cat.id)} className={`p-4 rounded-xl border text-right transition-all ${selectedContractCat === cat.id ? 'border-amber-600 bg-amber-50' : 'bg-slate-50'}`}>
                    <p className="font-bold">{cat.label}</p>
                    <p className="text-[10px] text-slate-500">{cat.desc}</p>
                  </button>
                ))}
              </div>
              <textarea className="w-full p-4 bg-slate-50 border rounded-xl mb-6 h-48 outline-none" placeholder="أدخل أطراف العقد والتفاصيل..." value={inputText} onChange={(e) => setInputText(e.target.value)}></textarea>
              <button onClick={handleGenerateContract} disabled={loading || !inputText} className="w-full bg-slate-950 text-amber-500 py-4 rounded-xl font-black">توليد العقد</button>
              {analysisResult && (
                <div id="contract-printable" className="mt-12 p-8 bg-white border rounded-xl whitespace-pre-wrap leading-loose">
                  <div className="flex justify-between items-center mb-6 no-print">
                    <span className="text-xs text-slate-400">نموذج عقد عرفي</span>
                    <button onClick={() => window.print()} className="bg-amber-600 text-white px-4 py-1 rounded text-xs font-bold shadow">طباعة</button>
                  </div>
                  {cleanText(analysisResult)}
                </div>
              )}
            </div>
          </div>
        );

      case View.Radar:
        return (
          <div className="max-w-4xl mx-auto px-4 py-12 text-right">
            <div className="bg-white p-10 rounded-2xl shadow-2xl border border-slate-100">
              <h3 className="text-2xl font-black mb-2">الرادار القانوني 📡</h3>
              <p className="text-slate-500 text-sm mb-6">رصد القوانين والمراسيم الجديدة مع روابط تحميل الجريدة الرسمية.</p>
              
              <div className="flex gap-2 mb-8">
                <input type="text" value={radarQuery} onChange={(e) => setRadarQuery(e.target.value)} className="flex-1 p-3 border rounded-xl outline-none focus:ring-2 focus:ring-amber-500" />
                <button onClick={handleRadar} disabled={loading} className="bg-slate-900 text-white px-6 py-2 rounded-xl font-bold hover:bg-slate-800 transition-colors">تحديث الرصد</button>
              </div>
              
              {loading && <div className="text-center py-10 animate-pulse text-amber-600 font-bold">جاري مسح قواعد البيانات والجرائد الرسمية...</div>}
              
              {radarResult.text && (
                <div className="space-y-6">
                  <div id="radar-printable" className="p-8 bg-slate-950 text-slate-200 rounded-2xl leading-[2] whitespace-pre-wrap print:bg-white print:text-black print:border">
                    {cleanText(radarResult.text)}
                  </div>
                  
                  <div className="space-y-3 no-print">
                    <h4 className="font-black text-slate-900 text-sm">روابط التحميل المباشرة:</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {radarResult.sources.map((s, i) => {
                        const isJORADP = s.url.includes('joradp.dz');
                        return (
                          <a 
                            key={i} 
                            href={s.url} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className={`p-4 border rounded-xl transition-all flex items-center justify-between group ${isJORADP ? 'border-amber-500 bg-amber-50/30' : 'bg-slate-50'}`}
                          >
                            <div className="flex flex-col gap-1 overflow-hidden">
                              <span className={`text-[10px] font-bold uppercase ${isJORADP ? 'text-amber-700' : 'text-slate-400'}`}>
                                {isJORADP ? 'تحميل الجريدة الرسمية' : 'مرجع إضافي'}
                              </span>
                              <span className="truncate text-xs font-black text-slate-800">{s.title}</span>
                            </div>
                            <span className={`text-xl transition-transform group-hover:scale-125 ${isJORADP ? 'text-amber-600' : 'text-slate-400'}`}>
                              {isJORADP ? '📥' : '🔗'}
                            </span>
                          </a>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        );

      case View.Resources:
        return (
          <div className="max-w-6xl mx-auto px-4 py-16 text-right">
            <h3 className="text-4xl font-black mb-12 text-center">دليل المصادر الرسمية 🔗</h3>
            <div className="flex flex-col md:flex-row gap-4 max-w-4xl mx-auto mb-16">
              <input type="text" placeholder="بحث في المصادر..." value={resSearchTerm} onChange={(e) => setResSearchTerm(e.target.value)} className="flex-1 p-4 border rounded-2xl outline-none" />
              <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)} className="p-4 bg-slate-900 text-white rounded-2xl font-bold outline-none">
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredResources.map((res, i) => (
                <a key={i} href={res.url} target="_blank" rel="noopener noreferrer" className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm hover:shadow-2xl transition-all group">
                  <p className="font-black text-slate-900 group-hover:text-amber-700">{res.name}</p>
                  <p className="text-[11px] text-slate-400 mt-2 truncate uppercase">{res.url.replace('https://', '')}</p>
                  <div className="mt-6 text-[10px] bg-slate-50 inline-block px-3 py-1 rounded-full font-bold text-slate-500">{res.category}</div>
                </a>
              ))}
            </div>
          </div>
        );

      case View.Research:
        return (
          <div className="max-w-5xl mx-auto px-4 py-12 text-right">
            <div className="bg-white p-12 rounded-3xl shadow-2xl border border-slate-100">
              <h3 className="text-3xl font-black mb-4 text-center">الأكاديمية القانونية الجزائرية 🎓</h3>
              <p className="text-slate-500 mb-10 text-center font-light leading-relaxed max-w-2xl mx-auto">توليد بحوث أكاديمية معمقة (20 صفحة) على 5 مراحل مع التهميش الإلزامي وفق منهجية ASJP.</p>
              
              {researchStage === 0 ? (
                <>
                  <textarea 
                    className="w-full p-6 bg-slate-50 border rounded-2xl mb-8 h-40 outline-none text-xl focus:ring-2 focus:ring-amber-500" 
                    placeholder="أدخل عنوان البحث أو الإشكالية القانونية..." 
                    value={inputText} 
                    onChange={(e) => setInputText(e.target.value)}
                  ></textarea>
                  <button onClick={handleResearch} disabled={loading || !inputText} className="w-full bg-amber-600 text-white py-5 rounded-2xl font-black text-xl hover:bg-amber-700 shadow-xl transition-all">بدء توليد البحث (5 مراحل)</button>
                </>
              ) : (
                <div className="space-y-8 animate-in fade-in">
                  <div className="flex items-center justify-between bg-slate-50 p-6 rounded-2xl border border-slate-100">
                    <div className="flex-1 mr-4">
                      <div className="flex justify-between mb-2">
                        <span className="text-xs font-bold text-slate-400">تقدم التوليد: المرحلة {researchStage} من 5</span>
                        <span className="text-xs font-bold text-amber-600">{Math.round((researchStage / 5) * 100)}%</span>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-2">
                        <div className="bg-amber-600 h-2 rounded-full transition-all duration-500" style={{ width: `${(researchStage / 5) * 100}%` }}></div>
                      </div>
                    </div>
                    {loading && <div className="w-8 h-8 border-4 border-amber-600 border-t-transparent rounded-full animate-spin"></div>}
                  </div>

                  <div id="research-printable" className="p-10 bg-white border-2 border-slate-50 shadow-inner rounded-3xl print:border-none print:shadow-none print:p-0">
                    <div className="flex justify-between items-center mb-10 no-print border-b pb-4">
                      <h4 className="text-xl font-black text-slate-900">محتوى البحث التراكمي:</h4>
                      <div className="flex gap-2">
                         <button onClick={() => setResearchStage(0)} className="text-xs font-bold text-slate-400 px-4 py-2 hover:text-red-500 transition-colors">إلغاء وإعادة</button>
                         {researchStage === 5 && !loading && (
                           <button onClick={() => window.print()} className="bg-slate-900 text-white px-6 py-2 rounded-full font-bold text-sm shadow-xl hover:scale-105 transition-transform flex items-center gap-2">
                             <span>💾</span> تحميل بصيغة PDF
                           </button>
                         )}
                      </div>
                    </div>
                    
                    <div className="font-serif text-lg text-slate-800 leading-[2.2] print:text-[14pt]">
                      {fullResearch.map((content, idx) => (
                        <div key={idx} className="research-stage-section mb-12 print:mb-0 print:page-break-after-always">
                           {idx > 0 && <div className="border-t border-slate-100 my-8 no-print"></div>}
                           <div className="whitespace-pre-wrap">{cleanText(content)}</div>
                        </div>
                      ))}
                    </div>

                    {loading && (
                      <div className="mt-8 text-center py-10 border-t border-dashed border-slate-100 animate-pulse text-slate-400 no-print">
                        جاري صياغة المرحلة القادمة بتركيز عالي...
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        );

      case View.Analysis:
        return (
          <div className="max-w-4xl mx-auto px-4 py-12 text-right">
            <div className="bg-white p-10 rounded-2xl shadow-2xl border border-slate-100">
              <h3 className="text-2xl font-black mb-8">تحليل الملفات والصور 📄</h3>
              <div className="mb-8 p-16 border-4 border-dashed border-slate-200 rounded-3xl text-center bg-slate-50 hover:bg-amber-50 cursor-pointer relative group transition-all">
                <input type="file" accept="image/*,.pdf" onChange={handleFileChange} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                <div className="text-5xl mb-4 group-hover:scale-110 transition-transform">📤</div>
                <p className="text-slate-500 font-bold">انقر أو اسحب الملف للتحليل</p>
                {analysisFile && <div className="mt-4 p-2 bg-slate-900 text-amber-500 rounded-lg text-xs font-black inline-block">تم اختيار الملف ✓</div>}
              </div>
              <textarea className="w-full p-4 bg-slate-50 border rounded-xl mb-6 h-32 outline-none" placeholder="أضف ملاحظات اختيارية..." value={inputText} onChange={(e) => setInputText(e.target.value)}></textarea>
              <button onClick={handleAnalysis} disabled={loading} className="w-full bg-slate-950 text-amber-500 py-4 rounded-xl font-black">بدء التحليل</button>
              {analysisResult && (
                <div id="analysis-printable" className="mt-10 p-8 bg-amber-50/50 border border-amber-100 rounded-xl whitespace-pre-wrap leading-relaxed print:bg-white print:border-none">
                  <div className="flex justify-between items-center mb-4 no-print border-b pb-2">
                    <h4 className="font-black">تقرير التحليل والمطابقة:</h4>
                    <button onClick={() => window.print()} className="bg-amber-600 text-white px-4 py-1 rounded text-xs">طباعة التقرير</button>
                  </div>
                  {cleanText(analysisResult)}
                </div>
              )}
            </div>
          </div>
        );

      case View.Contact:
        return (
          <div className="max-w-2xl mx-auto px-4 py-24 text-center">
            <div className="bg-slate-950 p-16 rounded-[3rem] shadow-2xl border border-amber-900/30">
               <div className="w-24 h-24 bg-amber-600 rounded-full flex items-center justify-center mx-auto mb-10 text-4xl shadow-xl shadow-amber-600/20">📧</div>
               <h3 className="text-3xl font-black mb-6 text-white uppercase tracking-wider">تواصل مباشر</h3>
               <p className="text-slate-400 mb-12 font-light">يسعدنا تلقي آرائكم واقتراحاتكم لتطوير خدمات المنصة.</p>
               <div className="bg-white/5 p-8 rounded-3xl border border-white/10 text-amber-500 font-black text-2xl mb-12 select-all tracking-wider">hichembenzerouk3@gmail.com</div>
               <button onClick={() => setView(View.Home)} className="text-slate-500 font-bold hover:text-amber-50 transition-colors uppercase text-xs tracking-widest border-b border-slate-800 pb-1">العودة للرئيسية</button>
            </div>
          </div>
        );
      
      default: return null;
    }
  };

  return (
    <div className="min-h-screen flex flex-col font-cairo bg-[#fdfcfb] selection:bg-amber-100 text-right">
      <Header currentView={currentView} setView={setView} />
      <main className="flex-1">{renderContent()}</main>
      <footer className="bg-slate-950 border-t border-white/5 py-12 text-center text-slate-500 no-print">
        <div className="max-w-7xl mx-auto px-4">
           <p className="text-[10px] text-slate-400 mb-4 leading-relaxed max-w-2xl mx-auto">
             تخضع هذه المنصة للقانون رقم 18-07 المؤرخ في 10 جوان 2018 المتعلق بحماية الأشخاص الطبيعيين في مجال معالجة المعطيات ذات الطابع الشخصي. جميع الاستشارات والبيانات تعالج بخصوصية تامة.
           </p>
           <p className="text-[10px] font-medium opacity-80 mb-2">© {new Date().getFullYear()} جميع الحقوق محفوظة لمنصة القانون الجزائرية الذكية</p>
           <p className="font-bold text-slate-400 text-xs">hichembenzerouk3@gmail.com</p>
        </div>
      </footer>
      <style>{`
        @media print {
          @page {
            margin: 2.5cm;
            size: A4;
          }
          body {
            background: white !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          header, footer, nav, .no-print, button {
            display: none !important;
            visibility: hidden !important;
          }
          #research-printable, #contract-printable, #analysis-printable, #radar-printable {
            display: block !important;
            visibility: visible !important;
            position: static !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            border: none !important;
            box-shadow: none !important;
            background: white !important;
            color: black !important;
          }
          #research-printable {
            font-size: 14pt !important;
            line-height: 1.8 !important;
            text-align: justify !important;
          }
          .research-stage-section {
            page-break-after: always;
          }
          .research-stage-section:last-child {
            page-break-after: auto;
          }
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          body * {
            visibility: hidden;
          }
          #research-printable, #research-printable *, 
          #contract-printable, #contract-printable *, 
          #analysis-printable, #analysis-printable *, 
          #radar-printable, #radar-printable * {
            visibility: visible;
          }
        }
      `}</style>
    </div>
  );
};

export default App;
