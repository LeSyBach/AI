import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import remarkGfm from 'remark-gfm';
import { Role, Message } from '../types';
import { StarLogo } from './StarLogo';

interface ChatMessageProps {
  message: Message;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  const isUser = message.role === Role.USER;

  return (
    <div className={`flex w-full mb-6 ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`flex max-w-[95%] md:max-w-[90%] ${isUser ? 'flex-row-reverse' : 'flex-row'} gap-3`}>
        
        {/* Avatar */}
        <div className="flex-shrink-0">
          {isUser ? (
            <div className="w-8 h-8 rounded-sm bg-indigo-600 flex items-center justify-center text-white font-bold shadow-lg">
              U
            </div>
          ) : (
            <div className="w-8 h-8 rounded-full flex items-center justify-center">
              <StarLogo size={24} />
            </div>
          )}
        </div>

        {/* Content Bubble */}
        <div className="flex flex-col space-y-2 min-w-0">
          <div 
            className={`flex flex-col px-4 py-3 md:px-5 md:py-4 rounded-2xl shadow-sm overflow-hidden text-base leading-7 ${
              isUser 
                ? 'bg-slate-800 text-white rounded-tr-sm' 
                : 'bg-transparent text-slate-100 -ml-2'
            } ${message.isError ? 'border border-red-500/50 bg-red-900/10' : ''}`}
          >
            {/* User Attachments */}
            {message.attachments && message.attachments.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {message.attachments.map((att, idx) => (
                  <img 
                    key={idx}
                    src={`data:${att.mimeType};base64,${att.data}`}
                    alt="User attachment"
                    className="max-w-[200px] max-h-[200px] rounded-lg border border-slate-600 object-cover"
                  />
                ))}
              </div>
            )}

            {/* Generated Image */}
            {message.generatedImage && (
               <div className="mb-3">
                 <img 
                   src={`data:image/jpeg;base64,${message.generatedImage}`}
                   alt="AI Generated"
                   className="w-full max-w-md rounded-lg border border-slate-700 shadow-2xl"
                 />
               </div>
            )}

            {/* Text Content */}
            {message.content && (
              <div className="markdown-body">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    // Customize Code Blocks
                    code({node, inline, className, children, ...props}: any) {
                      const match = /language-(\w+)/.exec(className || '')
                      return !inline && match ? (
                        <div className="rounded-md overflow-hidden my-4 border border-slate-700 shadow-2xl">
                          <div className="bg-slate-900 px-4 py-1.5 text-xs text-slate-400 border-b border-slate-700 flex justify-between items-center">
                            <span className="font-mono uppercase">{match[1]}</span>
                            <span className="text-[10px] opacity-50">BACH AI CODE</span>
                          </div>
                          <SyntaxHighlighter
                            style={vscDarkPlus}
                            language={match[1]}
                            PreTag="div"
                            customStyle={{ margin: 0, borderRadius: 0 }}
                            {...props}
                          >
                            {String(children).replace(/\n$/, '')}
                          </SyntaxHighlighter>
                        </div>
                      ) : (
                        <code className={`${isUser ? 'bg-slate-900/50' : 'bg-slate-800'} px-1.5 py-0.5 rounded font-mono text-sm text-yellow-200`} {...props}>
                          {children}
                        </code>
                      )
                    },
                    // Customize Links
                    a: ({node, ...props}) => <a className="text-blue-400 hover:underline" target="_blank" rel="noopener noreferrer" {...props} />,
                    // Customize Lists
                    ul: ({node, ...props}) => <ul className="list-disc ml-6 my-2" {...props} />,
                    ol: ({node, ...props}) => <ol className="list-decimal ml-6 my-2" {...props} />,
                    p: ({node, ...props}) => <p className="mb-2 last:mb-0" {...props} />,
                    h1: ({node, ...props}) => <h1 className="text-2xl font-bold mb-4 mt-2" {...props} />,
                    h2: ({node, ...props}) => <h2 className="text-xl font-bold mb-3 mt-2" {...props} />,
                    h3: ({node, ...props}) => <h3 className="text-lg font-bold mb-2 mt-2" {...props} />,
                  }}
                >
                  {message.content}
                </ReactMarkdown>
              </div>
            )}
            
            {/* Timestamp / Footer */}
            {isUser && (
               <div className={`text-[10px] mt-1 opacity-40 text-right font-mono`}>
                 {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
               </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};