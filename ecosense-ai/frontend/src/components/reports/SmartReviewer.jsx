import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import axiosInstance from '../../api/axiosInstance';

/**
 * Sprint 4A — AI Smart Reviewer sidebar chat panel.
 * Drop-in component for ReportEditorPage.
 */
export default function SmartReviewer({ activeSectionId, projectId }) {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: '👋 Hi! I\'m your NEMA AI Reviewer. Ask me anything about the current section — compliance requirements, mitigation gaps, or wording improvements.',
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Context hints when section changes
  useEffect(() => {
    if (activeSectionId) {
      setMessages(prev => [
        ...prev,
        {
          role: 'system-hint',
          content: `📄 Section changed to: "${activeSectionId}". I now have context for this chapter.`,
        }
      ]);
    }
  }, [activeSectionId]);

  const send = async () => {
    const q = input.trim();
    if (!q || loading) return;

    setMessages(prev => [...prev, { role: 'user', content: q }]);
    setInput('');
    setLoading(true);

    try {
      const res = await axiosInstance.post(`/reports/${projectId}/smart-review/`, {
        question: q,
        section_id: activeSectionId,
      });
      const answer = res.data?.data?.answer || 'No response received.';
      const sources = res.data?.data?.sources || [];
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: answer, sources },
      ]);
    } catch (err) {
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: '❌ AI service unavailable. Check your OpenAI key in .env or try again shortly.' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-950 text-white">
      {/* Header */}
      <div className="px-4 py-3 bg-gray-900 border-b border-gray-800 shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-lg">🤖</span>
          <div>
            <p className="text-xs font-black text-white tracking-tight">NEMA AI Reviewer</p>
            <p className="text-[10px] text-gray-400">Powered by EcoSense AI Expert KB</p>
          </div>
          {activeSectionId && (
            <span className="ml-auto text-[9px] bg-blue-900 text-blue-300 px-2 py-0.5 rounded-full font-bold">
              {activeSectionId}
            </span>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {m.role === 'system-hint' ? (
              <div className="text-[10px] text-gray-500 italic text-center w-full py-1">{m.content}</div>
            ) : (
              <div
                className={`max-w-[85%] rounded-xl px-3 py-2 text-xs leading-relaxed ${
                  m.role === 'user'
                    ? 'bg-green-700 text-white rounded-br-none'
                    : 'bg-gray-800 text-gray-100 rounded-bl-none'
                }`}
              >
                <p className="whitespace-pre-wrap">{m.content}</p>
                {m.sources?.length > 0 && (
                  <p className="text-[9px] text-gray-400 mt-1.5 border-t border-gray-700 pt-1">
                    Sources: {m.sources.join(' · ')}
                  </p>
                )}
              </div>
            )}
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-800 rounded-xl px-4 py-2.5 text-xs text-gray-400 flex items-center gap-2">
              <span className="animate-spin">⟳</span> Analysing section…
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Suggested prompts */}
      <div className="px-4 pb-2 flex gap-1.5 flex-wrap shrink-0">
        {[
          'Is this section NEMA compliant?',
          'What mitigation is missing?',
          'Improve this for submission',
        ].map(p => (
          <button
            key={p}
            onClick={() => { setInput(p); }}
            className="text-[9px] bg-gray-800 hover:bg-gray-700 text-gray-300 px-2.5 py-1 rounded-full transition-colors"
          >
            {p}
          </button>
        ))}
      </div>

      {/* Input */}
      <div className="px-3 pb-3 shrink-0">
        <div className="flex gap-2 bg-gray-800 rounded-xl px-3 py-2 border border-gray-700 focus-within:border-green-500 transition-colors">
          <input
            className="flex-1 bg-transparent text-xs text-white placeholder-gray-500 outline-none"
            placeholder="Ask about NEMA compliance, mitigation, or content…"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && send()}
          />
          <button
            onClick={send}
            disabled={!input.trim() || loading}
            className="text-green-400 hover:text-green-300 disabled:text-gray-600 transition-colors font-black text-sm"
          >
            ↑
          </button>
        </div>
      </div>
    </div>
  );
}
