import { useState, useCallback } from 'react';

type Message = { role: 'user' | 'assistant'; content: string };

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-chat`;

async function streamAI({
  messages,
  mode,
  context,
  onDelta,
  onDone,
  onError,
}: {
  messages: Message[];
  mode?: 'chat' | 'generate';
  context?: { blockContent?: string; blockType?: string };
  onDelta: (text: string) => void;
  onDone: () => void;
  onError: (err: string) => void;
}) {
  const resp = await fetch(CHAT_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
    },
    body: JSON.stringify({ messages, mode: mode || 'chat', context }),
  });

  if (!resp.ok) {
    const body = await resp.json().catch(() => ({ error: 'Request failed' }));
    onError(body.error || `Error ${resp.status}`);
    return;
  }

  if (!resp.body) {
    onError('No response body');
    return;
  }

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let idx: number;
    while ((idx = buffer.indexOf('\n')) !== -1) {
      let line = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 1);
      if (line.endsWith('\r')) line = line.slice(0, -1);
      if (line.startsWith(':') || line.trim() === '') continue;
      if (!line.startsWith('data: ')) continue;
      const json = line.slice(6).trim();
      if (json === '[DONE]') { onDone(); return; }
      try {
        const parsed = JSON.parse(json);
        const content = parsed.choices?.[0]?.delta?.content;
        if (content) onDelta(content);
      } catch {
        buffer = line + '\n' + buffer;
        break;
      }
    }
  }
  onDone();
}

export function useAIChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendMessage = useCallback(async (input: string) => {
    const userMsg: Message = { role: 'user', content: input };
    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);
    setError(null);

    let soFar = '';
    const upsert = (chunk: string) => {
      soFar += chunk;
      setMessages(prev => {
        const last = prev[prev.length - 1];
        if (last?.role === 'assistant') {
          return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: soFar } : m);
        }
        return [...prev, { role: 'assistant', content: soFar }];
      });
    };

    try {
      await streamAI({
        messages: [...messages, userMsg],
        mode: 'chat',
        onDelta: upsert,
        onDone: () => setIsLoading(false),
        onError: (err) => { setError(err); setIsLoading(false); },
      });
    } catch {
      setError('Failed to connect to AI');
      setIsLoading(false);
    }
  }, [messages]);

  const clearMessages = useCallback(() => setMessages([]), []);

  return { messages, isLoading, error, sendMessage, clearMessages };
}

export function useAIGenerate() {
  const [isGenerating, setIsGenerating] = useState(false);

  const generate = useCallback(async (
    prompt: string,
    blockContent: string,
    blockType: string,
    onDelta: (text: string) => void,
  ): Promise<string> => {
    setIsGenerating(true);
    let result = '';

    return new Promise((resolve, reject) => {
      streamAI({
        messages: [{ role: 'user', content: prompt }],
        mode: 'generate',
        context: { blockContent, blockType },
        onDelta: (chunk) => {
          result += chunk;
          onDelta(chunk);
        },
        onDone: () => {
          setIsGenerating(false);
          resolve(result);
        },
        onError: (err) => {
          setIsGenerating(false);
          reject(new Error(err));
        },
      });
    });
  }, []);

  return { isGenerating, generate };
}
