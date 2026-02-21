import { useState } from 'react';
import { Sparkles, Loader2, X } from 'lucide-react';
import { useAIGenerate } from '@/hooks/useAIChat';
import { Block } from '@/types/workspace';
import { cn } from '@/lib/utils';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

interface AIWriteButtonProps {
  block: Block;
  onUpdate: (updates: Partial<Block>) => void;
}

const quickActions = [
  { label: 'Continue writing', prompt: 'Continue writing from where the text left off.' },
  { label: 'Improve writing', prompt: 'Rewrite and improve the existing text to be clearer and more polished.' },
  { label: 'Summarize', prompt: 'Summarize the existing content concisely.' },
  { label: 'Make shorter', prompt: 'Make the text shorter while keeping the key points.' },
];

export function AIWriteButton({ block, onUpdate }: AIWriteButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [customPrompt, setCustomPrompt] = useState('');
  const { isGenerating, generate } = useAIGenerate();

  const handleGenerate = async (prompt: string) => {
    if (isGenerating) return;
    try {
      let result = '';
      await generate(prompt, block.content, block.type, (chunk) => {
        result += chunk;
        // Don't do live update to avoid cursor jump — apply at end
      });
      // If the block had content and we're "continuing", append. Otherwise replace.
      const isContinue = prompt.toLowerCase().includes('continue');
      const newContent = isContinue && block.content
        ? block.content + ' ' + result.trimStart()
        : result;
      onUpdate({ content: newContent });
      setIsOpen(false);
      setCustomPrompt('');
    } catch (err: any) {
      console.error('AI generate error:', err);
    }
  };

  // Only show for text-like blocks
  if (!['text', 'heading1', 'heading2', 'heading3', 'bullet', 'numbered', 'checklist', 'callout', 'quote'].includes(block.type)) {
    return null;
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <button
          className={cn(
            'p-1 rounded text-muted-foreground hover:text-accent hover:bg-accent/10 transition-gentle',
            isGenerating && 'text-accent'
          )}
          title="AI writing assist"
        >
          {isGenerating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 p-2" sideOffset={4}>
        <div className="space-y-1">
          <div className="px-2 py-1 text-xs font-medium text-muted-foreground flex items-center justify-between">
            <span className="flex items-center gap-1"><Sparkles className="w-3 h-3" /> AI Write</span>
            <button onClick={() => setIsOpen(false)} className="hover:text-foreground">
              <X className="w-3 h-3" />
            </button>
          </div>
          {quickActions.map((action) => (
            <button
              key={action.label}
              onClick={() => handleGenerate(action.prompt)}
              disabled={isGenerating || (action.label !== 'Continue writing' && !block.content)}
              className="w-full text-left px-2 py-1.5 text-sm rounded-md hover:bg-hover-overlay disabled:opacity-40 disabled:cursor-not-allowed transition-gentle"
            >
              {action.label}
            </button>
          ))}
          <div className="pt-1 border-t border-border mt-1">
            <div className="flex gap-1">
              <input
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && customPrompt.trim() && handleGenerate(customPrompt)}
                placeholder="Custom prompt..."
                className="flex-1 bg-muted rounded px-2 py-1.5 text-xs outline-none placeholder:text-muted-foreground"
                disabled={isGenerating}
              />
              <button
                onClick={() => customPrompt.trim() && handleGenerate(customPrompt)}
                disabled={isGenerating || !customPrompt.trim()}
                className="px-2 py-1.5 text-xs rounded bg-accent text-accent-foreground hover:bg-accent/90 disabled:opacity-50 transition-gentle"
              >
                Go
              </button>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
