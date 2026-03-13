import { useState, useEffect } from 'react';
import { Block } from '@/types/workspace';
import { HardDrive, Search, ExternalLink, Trash2, File, Folder, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useGoogleIntegrations } from '@/hooks/useGoogleIntegrations';
import { cn } from '@/lib/utils';

interface DriveAttachBlockProps {
  block: Block;
  onUpdate: (updates: Partial<Block>) => void;
  onDelete: () => void;
}

interface DriveFile {
  id: string;
  name: string;
  type: string;
  isFolder: boolean;
  webViewLink?: string;
  iconLink?: string;
}

export function DriveAttachBlock({ block, onUpdate, onDelete }: DriveAttachBlockProps) {
  const { isConnected, searchDriveFiles, fetchDriveFiles } = useGoogleIntegrations();
  const [searchQuery, setSearchQuery] = useState('');
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [showPicker, setShowPicker] = useState(!block.content);

  // Parse stored drive file data from content
  const attachedFile = block.content ? (() => {
    try { return JSON.parse(block.content) as DriveFile; } catch { return null; }
  })() : null;

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setLoading(true);
      try {
        const f = await fetchDriveFiles();
        setFiles(f);
      } catch { /* ignore */ }
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const f = await searchDriveFiles(searchQuery);
      setFiles(f);
    } catch { /* ignore */ }
    setLoading(false);
  };

  useEffect(() => {
    if (showPicker && isConnected && files.length === 0) {
      handleSearch();
    }
  }, [showPicker, isConnected]);

  const handleAttach = (file: DriveFile) => {
    onUpdate({ content: JSON.stringify(file) });
    setShowPicker(false);
  };

  if (!isConnected) {
    return (
      <div className="group relative py-2">
        <div className="border-2 border-dashed border-border rounded-lg p-6 bg-muted/20 text-center">
          <HardDrive className="w-8 h-8 text-muted-foreground/50 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Connect Google to attach Drive files</p>
        </div>
        <button onClick={onDelete} className="absolute -right-8 top-2 p-1 rounded opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-gentle">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  // Show attached file
  if (attachedFile && !showPicker) {
    return (
      <div className="group relative py-2">
        <div className="flex items-center gap-3 p-3 rounded-lg border border-border bg-muted/20 hover:bg-muted/30 transition-gentle">
          {attachedFile.isFolder ? (
            <Folder className="w-5 h-5 text-yellow-500 flex-shrink-0" />
          ) : (
            <File className="w-5 h-5 text-blue-500 flex-shrink-0" />
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{attachedFile.name}</p>
            <p className="text-xs text-muted-foreground">{attachedFile.type}</p>
          </div>
          {attachedFile.webViewLink && (
            <a href={attachedFile.webViewLink} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded hover:bg-muted">
              <ExternalLink className="w-4 h-4 text-muted-foreground" />
            </a>
          )}
          <button onClick={() => setShowPicker(true)} className="text-xs text-muted-foreground hover:text-foreground">
            Change
          </button>
        </div>
        <button onClick={onDelete} className="absolute -right-8 top-2 p-1 rounded opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-gentle">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  // File picker
  return (
    <div className="group relative py-2">
      <div className="border-2 border-dashed border-border rounded-lg p-4 bg-muted/20">
        <div className="flex items-center gap-2 mb-3">
          <HardDrive className="w-5 h-5 text-muted-foreground" />
          <span className="text-sm font-medium">Attach a Google Drive file</span>
        </div>
        <div className="flex gap-2 mb-3">
          <Input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search Drive files..."
            className="flex-1"
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
          />
          <Button size="sm" variant="outline" onClick={handleSearch}>
            <Search className="w-4 h-4" />
          </Button>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        )}

        <div className="max-h-48 overflow-y-auto space-y-0.5">
          {files.map(file => (
            <button
              key={file.id}
              onClick={() => handleAttach(file)}
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-hover-overlay text-left transition-gentle"
            >
              {file.isFolder ? (
                <Folder className="w-4 h-4 text-yellow-500 flex-shrink-0" />
              ) : (
                <File className="w-4 h-4 text-blue-500 flex-shrink-0" />
              )}
              <span className="text-sm truncate flex-1">{file.name}</span>
              <span className="text-xs text-muted-foreground">{file.type}</span>
            </button>
          ))}
        </div>
      </div>
      <button onClick={onDelete} className="absolute -right-8 top-2 p-1 rounded opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-gentle">
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
