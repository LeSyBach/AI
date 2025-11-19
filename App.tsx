
import React, { useState, useRef, useEffect } from 'react';
import { Send, Paperclip, X, Menu, Square } from 'lucide-react';
import { initChatSession, streamMessage, generateImage, getSystemInstruction } from './services/geminiService';
import { Message, Role, AppMode, Attachment } from './types';
import { ChatMessage } from './components/ChatMessage';
import { StarLogo } from './components/StarLogo';
import { Sidebar } from './components/Sidebar';

const App: React.FC = () => {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [mode, setMode] = useState<AppMode>(AppMode.CHAT);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // AbortController to stop generation
  const abortControllerRef = useRef<AbortController | null>(null);

  // Initialize
  useEffect(() => {
    startNewChat(AppMode.CHAT);
  }, []);

  // Auto-scroll
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [input]);

  const startNewChat = (newMode: AppMode = AppMode.CHAT) => {
    // Abort any ongoing generation
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsLoading(false);

    setMode(newMode);
    let prompt = "";
    let welcomeMsg = "";

    switch (newMode) {
      case AppMode.CODING:
        prompt = "Bạn là chuyên gia lập trình Web. Hãy giúp tôi viết code sạch, đẹp và tối ưu.";
        welcomeMsg = "Chào bạn! Tôi đang ở chế độ **Lập trình Web**. Tôi có thể giúp gì cho dự án của bạn?";
        break;
      case AppMode.MATH:
        prompt = "Bạn là giáo sư toán học. Hãy giải các bài toán từng bước một cách chi tiết.";
        welcomeMsg = "Chào bạn! Tôi đang ở chế độ **Giải Toán**. Hãy gửi bài toán bạn cần giúp đỡ.";
        break;
      case AppMode.IMAGE_GEN:
        prompt = "Bạn là chuyên gia tạo prompt cho AI vẽ tranh.";
        welcomeMsg = "Chào bạn! Tôi đang ở chế độ **Tạo ảnh AI**. Hãy mô tả bức ảnh bạn muốn tạo.";
        break;
      default:
        prompt = "";
        welcomeMsg = "Chào bạn! Tôi là **BACH AI**. \n\nTôi có thể giúp bạn lập trình, giải toán, tạo ảnh và trả lời câu hỏi.";
    }

    initChatSession(prompt);
    setMessages([{
      id: 'welcome',
      role: Role.MODEL,
      content: welcomeMsg,
      timestamp: Date.now()
    }]);
    setAttachments([]);
    setIsSidebarOpen(false);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        // Remove data url prefix
        const base64Data = base64String.split(',')[1];
        
        setAttachments(prev => [...prev, {
          mimeType: file.type,
          data: base64Data
        }]);
      };
      reader.readAsDataURL(file);
    }
    e.target.value = '';
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsLoading(false);
  };

  const handleSendMessage = async () => {
    if ((!input.trim() && attachments.length === 0) || isLoading) return;

    const userMessageText = input.trim();
    const currentAttachments = [...attachments];
    
    setInput('');
    setAttachments([]);
    if (textareaRef.current) textareaRef.current.style.height = 'auto';

    const newUserMessage: Message = {
      id: Date.now().toString(),
      role: Role.USER,
      content: userMessageText,
      timestamp: Date.now(),
      attachments: currentAttachments
    };

    // Optimistically update UI
    const updatedMessages = [...messages, newUserMessage];
    setMessages(updatedMessages);
    setIsLoading(true);

    // Setup new AbortController
    abortControllerRef.current = new AbortController();

    const aiMessageId = (Date.now() + 1).toString();
    const newAiMessage: Message = {
      id: aiMessageId,
      role: Role.MODEL,
      content: '',
      timestamp: Date.now()
    };
    setMessages(prev => [...prev, newAiMessage]);

    try {
      if (mode === AppMode.IMAGE_GEN) {
        const imageBytes = await generateImage(userMessageText);
        setMessages(prev => 
          prev.map(msg => 
            msg.id === aiMessageId 
              ? { ...msg, content: "Dưới đây là hình ảnh tôi đã tạo dựa trên mô tả của bạn:", generatedImage: imageBytes } 
              : msg
          )
        );
      } else {
        let accumulatedText = '';
        // Get instruction from session storage (set by initChatSession)
        const sysInstruction = getSystemInstruction();
        
        // Pass the HISTORY (updatedMessages) to the backend service
        await streamMessage(
          updatedMessages, // Pass full history
          userMessageText, 
          currentAttachments,
          sysInstruction,
          (chunk) => {
            accumulatedText += chunk;
            setMessages(prev => 
              prev.map(msg => 
                msg.id === aiMessageId 
                  ? { ...msg, content: accumulatedText } 
                  : msg
              )
            );
          },
          abortControllerRef.current.signal
        );
      }
    } catch (error) {
      // Only show error if not aborted
      if (!abortControllerRef.current?.signal.aborted) {
        setMessages(prev => 
          prev.map(msg => 
            msg.id === aiMessageId 
              ? { ...msg, content: "Xin lỗi, không thể kết nối tới Server. Hãy đảm bảo bạn đang chạy Backend tại localhost:5000.", isError: true } 
              : msg
          )
        );
      }
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 overflow-hidden relative font-sans">
      
      {/* Background Gradients */}
      <div className="fixed top-[-10%] right-[-10%] w-[50%] h-[50%] bg-purple-900/10 rounded-full blur-[120px] pointer-events-none z-0"></div>
      <div className="fixed bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-yellow-600/5 rounded-full blur-[120px] pointer-events-none z-0"></div>

      {/* Sidebar */}
      <Sidebar 
        currentMode={mode}
        onModeChange={startNewChat}
        onNewChat={() => startNewChat(AppMode.CHAT)}
        isOpen={isSidebarOpen}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 relative z-10">
        
        {/* Header */}
        <header className="flex items-center justify-between px-4 py-3 bg-slate-950/80 backdrop-blur-md border-b border-slate-800 sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <button 
              className="md:hidden p-2 text-slate-400 hover:text-white"
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            >
              <Menu size={24} />
            </button>
            <div className="flex items-center gap-2">
                <span className="text-lg font-medium text-slate-200">BACH AI</span>
                <StarLogo size={16} />
                {mode !== AppMode.CHAT && (
                   <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded border border-yellow-500/30 uppercase tracking-wide">
                       {mode === AppMode.IMAGE_GEN ? 'Image Gen' : mode}
                   </span>
                )}
            </div>
          </div>
        </header>

        {/* Overlay for sidebar on mobile */}
        {isSidebarOpen && (
          <div 
            className="fixed inset-0 bg-black/50 z-20 md:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        {/* Chat Area */}
        <main className="flex-1 overflow-y-auto p-0 z-10 custom-scrollbar scroll-smooth relative">
          {/* Adjusted max-width to 4xl and reduced padding to px-2 md:px-4 */}
          <div className="max-w-4xl mx-auto pt-4 md:pt-6 pb-10 px-2 md:px-4">
            {messages.map((msg) => (
              <ChatMessage key={msg.id} message={msg} />
            ))}
            
            {/* Loading Bubble */}
            {isLoading && messages[messages.length - 1].content === '' && !messages[messages.length - 1].generatedImage && (
               <div className="flex justify-start mb-6 w-full">
                   <div className="flex gap-3 items-center">
                       <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0">
                            <StarLogo size={20} />
                       </div>
                       <div className="flex items-center gap-1 h-8 px-4">
                           <div className="w-2 h-2 bg-yellow-400 rounded-full typing-dot"></div>
                           <div className="w-2 h-2 bg-yellow-400 rounded-full typing-dot"></div>
                           <div className="w-2 h-2 bg-yellow-400 rounded-full typing-dot"></div>
                       </div>
                   </div>
               </div>
            )}
            <div ref={messagesEndRef} className="h-4" />
          </div>
        </main>

        {/* Input Area */}
        <footer className="p-4 bg-transparent z-20">
          <div className="max-w-4xl mx-auto">
            
            {/* Attachment Preview */}
            {attachments.length > 0 && (
              <div className="flex gap-2 mb-2 overflow-x-auto p-1">
                {attachments.map((att, idx) => (
                  <div key={idx} className="relative group">
                    <img 
                      src={`data:${att.mimeType};base64,${att.data}`} 
                      alt="preview" 
                      className="h-16 w-16 object-cover rounded-lg border border-slate-700"
                    />
                    <button 
                      onClick={() => removeAttachment(idx)}
                      className="absolute -top-1.5 -right-1.5 bg-slate-800 text-white rounded-full p-0.5 shadow-md border border-slate-600 hover:bg-red-500 transition-colors"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="relative flex items-end gap-2 bg-slate-800/80 backdrop-blur border border-slate-700 rounded-xl p-3 shadow-2xl focus-within:ring-1 focus-within:ring-slate-500 transition-all">
                
                {/* File Upload Button */}
                <input 
                    type="file" 
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                    className="hidden"
                    accept="image/*"
                />
                <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors mb-0.5"
                    title="Thêm ảnh"
                    disabled={mode === AppMode.IMAGE_GEN}
                >
                    <Paperclip size={20} />
                </button>

                <textarea
                    ref={textareaRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={mode === AppMode.IMAGE_GEN ? "Mô tả hình ảnh bạn muốn tạo..." : "Gửi tin nhắn cho BACH AI..."}
                    className="w-full bg-transparent text-white placeholder-slate-400 px-2 py-2 max-h-[200px] resize-none outline-none custom-scrollbar"
                    rows={1}
                />
                
                <button
                    onClick={isLoading ? handleStop : handleSendMessage}
                    disabled={!isLoading && (!input.trim() && attachments.length === 0)}
                    className={`p-2 rounded-lg mb-0.5 transition-all duration-200 ${
                        isLoading
                          ? 'bg-white text-black hover:bg-gray-200' 
                          : (input.trim() || attachments.length > 0)
                            ? 'bg-white text-black hover:bg-slate-200'
                            : 'bg-slate-700 text-slate-500 cursor-not-allowed'
                    }`}
                >
                    {isLoading ? <Square size={20} fill="currentColor" /> : <Send size={20} />}
                </button>
            </div>
            <p className="text-center text-[10px] text-slate-500 mt-2 font-mono">
                BACH AI có thể mắc lỗi. Hãy kiểm tra thông tin quan trọng.
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default App;
