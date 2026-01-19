import { useState, useMemo } from 'react';
import { Block } from '@/types/workspace';
import { Link, ExternalLink, Trash2, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface EmbedBlockProps {
  block: Block;
  onUpdate: (updates: Partial<Block>) => void;
  onDelete: () => void;
}

// Extract embed info from various URLs
function getEmbedInfo(url: string): { type: string; embedUrl: string | null; previewUrl: string | null } {
  if (!url) return { type: 'unknown', embedUrl: null, previewUrl: null };

  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname;

    // YouTube
    if (hostname.includes('youtube.com') || hostname.includes('youtu.be')) {
      let videoId = '';
      if (hostname.includes('youtu.be')) {
        videoId = urlObj.pathname.slice(1);
      } else {
        videoId = urlObj.searchParams.get('v') || '';
      }
      if (videoId) {
        return {
          type: 'youtube',
          embedUrl: `https://www.youtube.com/embed/${videoId}`,
          previewUrl: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
        };
      }
    }

    // Vimeo
    if (hostname.includes('vimeo.com')) {
      const videoId = urlObj.pathname.split('/').filter(Boolean).pop();
      if (videoId) {
        return {
          type: 'vimeo',
          embedUrl: `https://player.vimeo.com/video/${videoId}`,
          previewUrl: null,
        };
      }
    }

    // Twitter/X
    if (hostname.includes('twitter.com') || hostname.includes('x.com')) {
      return {
        type: 'twitter',
        embedUrl: null,
        previewUrl: null,
      };
    }

    // Figma
    if (hostname.includes('figma.com')) {
      return {
        type: 'figma',
        embedUrl: `https://www.figma.com/embed?embed_host=share&url=${encodeURIComponent(url)}`,
        previewUrl: null,
      };
    }

    // Google Docs/Sheets/Slides
    if (hostname.includes('docs.google.com')) {
      const pubUrl = url.includes('/pub') ? url : url.replace(/\/edit.*$/, '/preview');
      return {
        type: 'google-docs',
        embedUrl: pubUrl,
        previewUrl: null,
      };
    }

    // Loom
    if (hostname.includes('loom.com')) {
      const videoId = urlObj.pathname.split('/').filter(Boolean).pop();
      return {
        type: 'loom',
        embedUrl: `https://www.loom.com/embed/${videoId}`,
        previewUrl: null,
      };
    }

    // CodePen
    if (hostname.includes('codepen.io')) {
      const embedUrl = url.replace('/pen/', '/embed/');
      return {
        type: 'codepen',
        embedUrl,
        previewUrl: null,
      };
    }

    // Default - try to iframe it
    return {
      type: 'generic',
      embedUrl: url,
      previewUrl: null,
    };
  } catch {
    return { type: 'invalid', embedUrl: null, previewUrl: null };
  }
}

export function EmbedBlock({ block, onUpdate, onDelete }: EmbedBlockProps) {
  const [urlInput, setUrlInput] = useState('');
  const embedUrl = block.embedUrl || block.content;

  const embedInfo = useMemo(() => getEmbedInfo(embedUrl || ''), [embedUrl]);

  const handleUrlSubmit = () => {
    if (!urlInput.trim()) return;

    try {
      new URL(urlInput);
      onUpdate({ embedUrl: urlInput.trim(), content: urlInput.trim() });
      setUrlInput('');
    } catch {
      toast.error('Please enter a valid URL');
    }
  };

  const handleRemoveEmbed = () => {
    onUpdate({ embedUrl: '', content: '' });
  };

  // If we have an embed URL, show the embed
  if (embedUrl) {
    return (
      <div className="group relative py-2">
        <div className="relative rounded-lg overflow-hidden border border-border bg-muted/30">
          {embedInfo.embedUrl ? (
            <div className="aspect-video">
              <iframe
                src={embedInfo.embedUrl}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                title="Embedded content"
              />
            </div>
          ) : (
            <a
              href={embedUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-4 hover:bg-muted/50 transition-colors"
            >
              <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                <Globe className="w-5 h-5 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{embedUrl}</p>
                <p className="text-xs text-muted-foreground capitalize">{embedInfo.type} link</p>
              </div>
              <ExternalLink className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            </a>
          )}
          <button
            onClick={handleRemoveEmbed}
            className="absolute top-2 right-2 p-1.5 rounded-md bg-background/80 backdrop-blur-sm opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground transition-gentle"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
        <button
          onClick={onDelete}
          className="absolute -right-8 top-2 p-1 rounded opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-gentle"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  // Empty state - show URL input
  return (
    <div className="group relative py-2">
      <div className="border-2 border-dashed border-border rounded-lg p-6 bg-muted/20">
        <div className="flex flex-col items-center gap-3">
          <Link className="w-10 h-10 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground text-center">
            Embed content from YouTube, Vimeo, Figma, Google Docs, and more
          </p>
          <div className="flex gap-2 w-full max-w-md">
            <Input
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="Paste a URL..."
              className="flex-1"
              onKeyDown={(e) => e.key === 'Enter' && handleUrlSubmit()}
            />
            <Button size="sm" onClick={handleUrlSubmit}>
              Embed
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Supports YouTube, Vimeo, Figma, Loom, CodePen, Google Docs
          </p>
        </div>
      </div>
      <button
        onClick={onDelete}
        className="absolute -right-8 top-2 p-1 rounded opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-gentle"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
