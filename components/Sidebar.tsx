
import React from 'react';
import { Plus, MessageSquare, Code, Calculator, Image as ImageIcon } from 'lucide-react';
import { AppMode } from '../types';

interface SidebarProps {
  currentMode: AppMode;
  onModeChange: (mode: AppMode) => void;
  onNewChat: () => void;
  isOpen: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentMode, onModeChange, onNewChat, isOpen }) => {
  return (
    <aside 
      className={`${isOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 fixed md:relative z-30 w-64 h-full bg-[#020617] border-r border-slate-800 flex flex-col transition-transform duration-300 ease-in-out flex-shrink-0 shadow-xl`}
    >
      {/* New Chat Button */}
      <div className="p-4">
        <button 
          onClick={onNewChat}
          className="flex items-center gap-3 w-full px-4 py-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-slate-600 rounded-lg transition-all text-white text-sm font-medium shadow-lg shadow-slate-900/20"
        >
          <Plus size={18} />
          <span>Cuộc trò chuyện mới</span>
        </button>
      </div>

      {/* Modes Section */}
      <div className="px-3 py-2">
        <h3 className="px-3 text-xs font-bold text-slate-500 mb-3 uppercase tracking-widest">Chế độ</h3>
        
        <div className="space-y-1">
          <button 
            onClick={() => onModeChange(AppMode.CODING)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200 ${currentMode === AppMode.CODING ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/20' : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'}`}
          >
            <Code size={18} className={currentMode === AppMode.CODING ? 'text-indigo-400' : ''} />
            <span>Lập trình Web</span>
          </button>

          <button 
            onClick={() => onModeChange(AppMode.MATH)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200 ${currentMode === AppMode.MATH ? 'bg-emerald-600/20 text-emerald-300 border border-emerald-500/20' : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'}`}
          >
            <Calculator size={18} className={currentMode === AppMode.MATH ? 'text-emerald-400' : ''} />
            <span>Giải Toán</span>
          </button>

          <button 
            onClick={() => onModeChange(AppMode.CHAT)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200 ${currentMode === AppMode.CHAT ? 'bg-blue-600/20 text-blue-300 border border-blue-500/20' : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'}`}
          >
            <MessageSquare size={18} className={currentMode === AppMode.CHAT ? 'text-blue-400' : ''} />
            <span>Trò chuyện</span>
          </button>

          <button 
            onClick={() => onModeChange(AppMode.IMAGE_GEN)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200 ${currentMode === AppMode.IMAGE_GEN ? 'bg-pink-600/20 text-pink-300 border border-pink-500/20' : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'}`}
          >
            <ImageIcon size={18} className={currentMode === AppMode.IMAGE_GEN ? 'text-pink-400' : ''} />
            <span>Tạo ảnh AI</span>
          </button>
        </div>
      </div>

      {/* History Section (Static for Demo) */}
      <div className="flex-1 overflow-y-auto px-3 py-2 custom-scrollbar">
        <h3 className="px-3 text-xs font-bold text-slate-500 mb-3 uppercase tracking-widest mt-4">Gần đây</h3>
        <div className="space-y-1">
          {['Tạo Landing Page bán hàng', 'Giải thích React Hooks', 'Cách học tiếng Nhật', 'Logo 5 cánh sáng', 'Debug lỗi API'].map((item, i) => (
            <button key={i} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-slate-400 hover:bg-slate-800/50 hover:text-slate-200 transition-colors text-left group">
              <span className="truncate opacity-80 group-hover:opacity-100">{item}</span>
            </button>
          ))}
        </div>
      </div>

      {/* User/Logo Footer */}
      <div className="p-4 border-t border-slate-800/50 bg-[#020617] space-y-3">
        <div className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer group">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm shadow-md group-hover:shadow-indigo-500/20">B</div>
          <div className="flex flex-col">
            <span className="text-sm font-medium text-white group-hover:text-indigo-300 transition-colors">Bach Developer</span>
            <span className="text-[10px] text-slate-500 font-mono">Pro Plan</span>
          </div>
        </div>
      </div>
    </aside>
  );
};
