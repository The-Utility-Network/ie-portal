'use client'
import React, { useEffect, useRef, useState } from "react";
import ReactMarkdown, { Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import vscDarkPlus from "react-syntax-highlighter/dist/esm/styles/prism/vsc-dark-plus";

// Fix for SyntaxHighlighter type compatibility
const SyntaxHighlighterComponent = SyntaxHighlighter as any;
import { PaperAirplaneIcon } from "@heroicons/react/24/solid";
import { ArrowPathIcon, ClipboardDocumentIcon, CheckIcon, CpuChipIcon } from "@heroicons/react/24/outline";

// Use Rajdhani for UI, standard mono for code
const MONO_FONT_FAMILY = `'Fira Mono', Menlo, Monaco, Consolas, 'Courier New', monospace`;

interface Message {
  sender: "user" | "assistant";
  text: string;
}

interface ChatbotProps {
  messages: Message[];
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  input: string;
  setInput: React.Dispatch<React.SetStateAction<string>>;
  optionsVisible: boolean;
  setOptionsVisible: React.Dispatch<React.SetStateAction<boolean>>;
}

const Chatbot: React.FC<ChatbotProps> = ({
  messages,
  setMessages,
  input,
  setInput,
  optionsVisible,
  setOptionsVisible,
}) => {
  const chatContainerRef = useRef<HTMLDivElement | null>(null);


  const [isTyping, setIsTyping] = useState<boolean>(false);
  const [copiedMsgIdx, setCopiedMsgIdx] = useState<number | null>(null);
  const [copiedCodeIdx, setCopiedCodeIdx] = useState<string | null>(null);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setInput(event.target.value);
  };

  const handleSendMessage = async (message: string) => {
    setMessages((prev) => [...prev, { sender: "user", text: message }]);
    setOptionsVisible(false);
    setMessages((prev) => [...prev, { sender: "assistant", text: "" }]);
    setIsTyping(true);

    try {
      const resp = await fetch("/api/chat/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userInput: message }),
      });

      if (!resp.ok) {
        const errorText = await resp.text();
        throw new Error(`Server error: ${resp.status} - ${errorText}`);
      }

      if (!resp.body) return;

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let done = false;
      let text = "";

      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        const chunkValue = decoder.decode(value, { stream: true });
        text += chunkValue;

        setMessages((prev) => {
          const newMessages = [...prev];
          newMessages[newMessages.length - 1].text = text;
          return newMessages;
        });
      }

    } catch (error: any) {
      console.error("Error fetching response:", error);
      setMessages((prev) => {
        const newMessages = [...prev];
        const msg = error?.message || String(error);
        newMessages[newMessages.length - 1].text = `Error: ${msg}`;
        return newMessages;
      });
    } finally {
      setIsTyping(false);
    }
  };

  const handleOptionClick = (option: string) => {
    handleSendMessage(option);
  };

  const handleFormSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (input.trim()) {
      handleSendMessage(input);
      setInput("");
    }
  };

  const startNewChat = () => {
    setMessages([]);
    setOptionsVisible(true);
    setInput("");
  };

  interface CustomCodeProps {
    inline?: boolean;
    className?: string;
    children?: React.ReactNode;
    [key: string]: any;
  }

  const markdownComponents: Partial<Components> = {
    code: ({ inline, className, children, ...props }: CustomCodeProps) => {
      const match = /language-(\w+)/.exec(className || "");
      const codeString = String(children).replace(/\n$/, "");
      const codeKey = `${className || 'inline'}-${codeString.slice(0, 16)}`;
      const handleCopyCode = () => {
        navigator.clipboard.writeText(codeString);
        setCopiedCodeIdx(codeKey);
        setTimeout(() => setCopiedCodeIdx(null), 1200);
      };
      const lineCount = codeString.split('\n').length;

      return inline ? (
        <code className="inline-code" {...props}>{children}</code>
      ) : match ? (
        lineCount === 1 ? (
          <code className="inline-code" {...props}>{codeString.trim()}</code>
        ) : (
          <div className="codeblock-container my-4">
            <SyntaxHighlighterComponent
              style={vscDarkPlus}
              language={match[1] === "sol" ? "solidity" : match[1]}
              PreTag="div"
              customStyle={{
                background: 'rgba(5, 5, 10, 0.6)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '8px',
                margin: '0',
                fontSize: '11px',
                lineHeight: '1.5',
                fontFamily: MONO_FONT_FAMILY,
                overflowX: 'auto',
                color: '#fff',
                padding: '12px',
                width: '100%',
              }}
              {...props}
            >
              {codeString}
            </SyntaxHighlighterComponent>
            {lineCount > 2 && (
              <div className="flex justify-end mt-2">
                <button
                  className="copy-btn-text"
                  onClick={handleCopyCode}
                  type="button"
                  aria-label="Copy code"
                >
                  {copiedCodeIdx === codeKey ? 'Copied!' : 'Copy'}
                </button>
              </div>
            )}
          </div>
        )
      ) : (
        <code className="inline-code" {...props}>{children}</code>
      );
    },
  };

  return (
    <div
      className="flex flex-col h-full font-[family-name:var(--font-rajdhani)] overflow-hidden"
    >
      <style jsx>{`
        .inline-code {
          background: rgba(255, 255, 255, 0.1);
          color: #fff;
          padding: 2px 6px;
          border-radius: 4px;
          font-size: 0.85em;
          font-family: ${MONO_FONT_FAMILY};
          border: 1px solid rgba(255, 255, 255, 0.2);
        }
        .copy-btn-text {
          background: none;
          color: rgba(255, 255, 255, 0.6);
          border: none;
          font-size: 0.75em;
          padding: 4px 8px;
          cursor: pointer;
          transition: all 0.2s;
          font-family: ${MONO_FONT_FAMILY};
        }
        .copy-btn-text:hover {
          color: #fff;
        }
        
        /* Custom Scrollbar for Chat */
        .chat-scroll::-webkit-scrollbar { width: 4px; }
        .chat-scroll::-webkit-scrollbar-track { background: rgba(0,0,0,0.1); }
        .chat-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.2); border-radius: 2px; }
        .chat-scroll::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.3); }
      `}</style>

      {/* Container Frame */}
      <div
        className="flex flex-col h-full rounded-2xl border border-purple-400/30 bg-purple-950/60 backdrop-blur-xl shadow-[0_0_30px_rgba(127,44,255,0.2)] relative overflow-hidden"
      >
        {/* Decorative Header */}
        <div className="p-4 border-b border-purple-400/20 bg-purple-900/30 flex items-center justify-between">
          <h2 className="text-xl font-bold tracking-widest text-white flex items-center gap-2">
            <CpuChipIcon className="w-5 h-5 text-purple-400" />
            ZYNATHRA<span className="text-purple-400">{'//'}</span>AI
          </h2>
          <div className="flex gap-1">
            <div className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
            <div className="w-1.5 h-1.5 rounded-full bg-purple-400/50" />
          </div>
        </div>

        {/* Messages Area */}
        <div ref={chatContainerRef} className="flex-grow overflow-y-auto chat-scroll p-4 md:p-6 space-y-6 flex flex-col">
          {/* Welcome / Empty State */}
          {messages.length === 0 && !isTyping && (
            <div className="flex-1 flex flex-col items-center justify-center opacity-50 pb-12">
              <div className="p-6 rounded-full border border-purple-400/30 bg-purple-500/20 mb-4">
                <CpuChipIcon className="w-12 h-12 text-purple-400" />
              </div>
              <p className="text-sm font-bold tracking-widest text-purple-200">SYSTEM ONLINE. AWAITING INPUT.</p>
            </div>
          )}

          {messages.map((msg, index) => (
            <div key={index} className={`flex flex-col ${msg.sender === "user" ? "items-end" : "items-start"} ${msg.sender === 'assistant' && !msg.text ? 'hidden' : ''}`}>
              <span className="text-[10px] text-white/40 mb-1 tracking-wider uppercase font-bold flex items-center gap-1">
                {msg.sender === "assistant" && <CpuChipIcon className="w-3 h-3" />}
                {msg.sender === "user" ? "OPERATOR" : "ZYNATHRA::V1"}
              </span>

              <div className="relative max-w-[90%] md:max-w-[85%] group">
                {/* Copy Button for Assistant */}
                {msg.sender === "assistant" && msg.text && (
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(msg.text);
                      setCopiedMsgIdx(index);
                      setTimeout(() => setCopiedMsgIdx(null), 1200);
                    }}
                    className="absolute -top-2 -right-2 z-10 p-1.5 rounded-md bg-purple-950/80 border border-purple-400/30 text-purple-300 opacity-0 group-hover:opacity-100 transition-all hover:bg-purple-500 hover:text-white"
                  >
                    {copiedMsgIdx === index ? <CheckIcon className="w-3 h-3" /> : <ClipboardDocumentIcon className="w-3 h-3" />}
                  </button>
                )}

                <div
                  className={`px-5 py-4 rounded-2xl backdrop-blur-sm border shadow-lg text-sm md:text-base leading-relaxed
                            ${msg.sender === "user"
                      ? "bg-purple-500 text-white border-purple-400 rounded-tr-none"
                      : "bg-purple-950/70 text-gray-200 border-purple-400/20 rounded-tl-none"
                    }`}
                >
                  {msg.sender === "assistant" ? (
                    <div className="prose prose-invert prose-sm max-w-none prose-p:leading-relaxed prose-pre:m-0 prose-pre:p-0 prose-pre:bg-transparent">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm, remarkBreaks]}
                        components={markdownComponents}
                      >
                        {msg.text}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    <span className="font-medium">{msg.text}</span>
                  )}
                </div>
              </div>
            </div>
          ))}

          {/* Typing Indicator */}
          {isTyping && (
            <div className="flex flex-col items-start animate-pulse">
              <span className="text-[10px] text-purple-300/50 mb-1 tracking-wider uppercase font-bold">ZYNATHRA::PROCESSING</span>
              <div className="px-5 py-4 rounded-2xl rounded-tl-none bg-purple-950/70 border border-purple-400/20 flex gap-1">
                <span className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                <span className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                <span className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce"></span>
              </div>
            </div>
          )}
        </div>

        {/* Quick Options */}
        {optionsVisible && (
          <div className="px-4 pb-2 animate-in slide-in-from-bottom-4 duration-500">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {[
                'What areas does Invisible Enemies focus on to support veterans and the community?',
                'How does Invisible Enemies incorporate Web3 technologies into its mission?',
                'Can you explain Invisible Enemies’ approach to mental health support and financial independence for veterans?',
                'How can I benefit from the different partnerships and projects within the Invisible Enemies community?',
              ].map((opt, i) => (
                <button
                  key={i}
                  onClick={() => handleOptionClick(opt)}
                  className="text-left px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-xs text-gray-400 hover:bg-white/10 hover:text-white hover:border-white/30 transition-all font-bold tracking-wide"
                >
                  {">"} {opt}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input Area */}
        <div className="p-4 bg-purple-950/50 border-t border-purple-400/20">
          <form onSubmit={handleFormSubmit} className="flex gap-3 relative">
            <input
              type="text"
              value={input}
              onChange={handleInputChange}
              placeholder="Enter command or query..."
              className="flex-1 bg-purple-950/60 border border-purple-400/30 rounded-xl px-4 py-3 text-white placeholder:text-purple-300/30 focus:outline-none focus:border-purple-400/60 focus:bg-purple-900/60 transition-all font-[family-name:var(--font-rajdhani)] text-sm md:text-base"
            />

            {input.trim() ? (
              <button
                type="submit"
                className="p-3 bg-purple-500 text-white rounded-xl hover:bg-purple-400 transition-colors shadow-lg shadow-purple-500/20"
              >
                <PaperAirplaneIcon className="w-5 h-5" />
              </button>
            ) : (
              !optionsVisible && (
                <button
                  type="button"
                  onClick={startNewChat}
                  className="p-3 bg-purple-900/50 text-purple-300/60 rounded-xl border border-purple-400/20 hover:bg-purple-800/50 hover:text-white transition-colors"
                  title="Reset Chat"
                >
                  <ArrowPathIcon className="w-5 h-5" />
                </button>
              )
            )}
          </form>
        </div>
      </div>
    </div>
  );
};

export default Chatbot;
