import { useState, useEffect, useCallback } from 'react';
import { HardDrive, RefreshCw, ChevronDown, ChevronUp, File, Folder, GripVertical } from 'lucide-react';
import { useGoogleIntegrations } from '@/hooks/useGoogleIntegrations';
import { cn } from '@/lib/utils';

interface DriveFile {
  id: string;
  name: string;
  type: string;
  isFolder: boolean;
  webViewLink?: string;
}

export function DriveSidebarWidget() {
  const { isConnected, fetchDriveFiles } = useGoogleIntegrations();
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const loadFiles = useCallback(async () => {
    if (!isConnected) return;
    setLoading(true);
    try {
      const f = await fetchDriveFiles();
      setFiles(f.slice(0, 8));
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [isConnected, fetchDriveFiles]);

  useEffect(() => {
    loadFiles();
  }, [loadFiles]);

  if (!isConnected) return null;

  const handleDragStart = (e: React.DragEvent, file: DriveFile) => {
    e.dataTransfer.setData('application/x-drive-file', JSON.stringify(file));
    e.dataTransfer.effectAllowed = 'copy';
  };

  return (
    <div className="border-t border-sidebar-border">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-sidebar-foreground hover:bg-sidebar-accent/50 transition-gentle"
      >
        <HardDrive className="w-4 h-4" />
        <span className="flex-1 text-left font-medium">Drive</span>
        {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
      </button>

      {expanded && (
        <div className="px-2 pb-2">
          <div className="flex items-center justify-between mb-1 px-1">
            <span className="text-[10px] text-sidebar-foreground/40">Drag into page</span>
            <button
              onClick={loadFiles}
              disabled={loading}
              className="p-1 rounded hover:bg-sidebar-accent/50 text-sidebar-foreground/60"
            >
              <RefreshCw className={cn('w-3 h-3', loading && 'animate-spin')} />
            </button>
          </div>

          {files.length === 0 && !loading && (
            <p className="text-xs text-sidebar-foreground/50 px-2 py-1">No recent files</p>
          )}

          <div className="space-y-0.5">
            {files.map(file => (
              <div
                key={file.id}
                draggable
                onDragStart={(e) => handleDragStart(e, file)}
                className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-sidebar-accent/50 cursor-grab active:cursor-grabbing transition-gentle"
              >
                <GripVertical className="w-3 h-3 text-sidebar-foreground/30 flex-shrink-0" />
                {file.isFolder ? (
                  <Folder className="w-3.5 h-3.5 text-yellow-500 flex-shrink-0" />
                ) : (
                  <File className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                )}
                <span className="text-xs text-sidebar-foreground truncate">{file.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
