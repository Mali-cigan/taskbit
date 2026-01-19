import { useState, useRef } from 'react';
import { Block } from '@/types/workspace';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Upload, Image, Link, Loader2, X, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface ImageBlockProps {
  block: Block;
  onUpdate: (updates: Partial<Block>) => void;
  onDelete: () => void;
}

export function ImageBlock({ block, onUpdate, onDelete }: ImageBlockProps) {
  const { user } = useAuth();
  const [isUploading, setIsUploading] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const imageUrl = block.content;

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be less than 5MB');
      return;
    }

    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${crypto.randomUUID()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('workspace-images')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('workspace-images')
        .getPublicUrl(fileName);

      onUpdate({ content: urlData.publicUrl });
      toast.success('Image uploaded');
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload image');
    } finally {
      setIsUploading(false);
    }
  };

  const handleUrlSubmit = () => {
    if (!urlInput.trim()) return;
    
    // Basic URL validation
    try {
      new URL(urlInput);
      onUpdate({ content: urlInput.trim() });
      setShowUrlInput(false);
      setUrlInput('');
    } catch {
      toast.error('Please enter a valid URL');
    }
  };

  const handleRemoveImage = () => {
    onUpdate({ content: '' });
  };

  // If we have an image, show it
  if (imageUrl) {
    return (
      <div className="group relative py-2">
        <div className="relative rounded-lg overflow-hidden border border-border bg-muted/30">
          <img
            src={imageUrl}
            alt="Block image"
            className="max-w-full max-h-96 object-contain mx-auto"
            onError={(e) => {
              (e.target as HTMLImageElement).src = '/placeholder.svg';
            }}
          />
          <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-gentle">
            <Button
              variant="secondary"
              size="icon"
              className="h-8 w-8 bg-background/80 backdrop-blur-sm"
              onClick={handleRemoveImage}
            >
              <X className="w-4 h-4" />
            </Button>
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

  // Empty state - show upload options
  return (
    <div className="group relative py-2">
      <div className="border-2 border-dashed border-border rounded-lg p-6 text-center bg-muted/20">
        {isUploading ? (
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Uploading...</p>
          </div>
        ) : showUrlInput ? (
          <div className="flex flex-col items-center gap-3">
            <Input
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="https://example.com/image.jpg"
              className="max-w-md"
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && handleUrlSubmit()}
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={handleUrlSubmit}>
                Add Image
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setShowUrlInput(false)}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <Image className="w-10 h-10 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">
              Add an image to your page
            </p>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                className="gap-2"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="w-4 h-4" />
                Upload
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="gap-2"
                onClick={() => setShowUrlInput(true)}
              >
                <Link className="w-4 h-4" />
                URL
              </Button>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileSelect}
            />
          </div>
        )}
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
