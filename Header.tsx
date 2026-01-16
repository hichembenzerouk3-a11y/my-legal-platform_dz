
import React from 'react';
import { View } from '../types';

interface HeaderProps {
  currentView: View;
  setView: (view: View) => void;
}

const Header: React.FC<HeaderProps> = ({ currentView, setView }) => {
  return (
    <header className="bg-slate-950 text-white shadow-2xl border-b border-amber-900/30 sticky top-0 z-50 backdrop-blur-md bg-opacity-95">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          <div className="flex items-center cursor-pointer group" onClick={() => setView(View.Home)}>
            <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-amber-700 rounded-xl flex items-center justify-center mr-3 ml-3 shadow-lg group-hover:rotate-6 transition-all duration-300">
               <span className="text-white font-bold text-2xl">⚖️</span>
            </div>
            <div className="flex flex-col">
              <h1 className="text-lg md:text-xl font-black tracking-tight text-white">منصة القانون الجزائرية</h1>
              <span className="text-[9px] text-amber-500 font-black tracking-[0.25em] uppercase opacity-80">Legal Excellence</span>
            </div>
          </div>
          <nav className="hidden md:flex space-x-reverse space-x-1 lg:space-x-reverse lg:space-x-2">
            {[
              { id: View.Home, label: 'الرئيسية' },
              { id: View.Consultation, label: 'استشارة' },
              { id: View.Analysis, label: 'تحليل' },
              { id: View.ContractGenerator, label: 'إنشاء' },
              { id: View.Radar, label: 'رادار' },
              { id: View.Research, label: 'بحوث' },
              { id: View.Resources, label: 'المصادر' },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => setView(item.id)}
                className={`px-3 lg:px-4 py-2 rounded-lg text-xs lg:text-sm font-bold transition-all duration-300 ${
                  currentView === item.id 
                    ? 'text-amber-500 bg-white/5 border-b-2 border-amber-500 rounded-b-none' 
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                {item.label}
              </button>
            ))}
          </nav>
          <div className="flex items-center gap-3">
             <button 
              onClick={() => setView(View.Contact)} 
              className="bg-amber-600 text-white px-5 py-2.5 rounded-xl font-black text-xs shadow-[0_0_20px_rgba(217,119,6,0.3)] hover:bg-amber-700 active:scale-90 transition-all"
             >
              اتصل بنا
             </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
