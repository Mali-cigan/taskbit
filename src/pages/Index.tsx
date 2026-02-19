import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Sidebar } from '@/components/workspace/Sidebar';
import { PageEditor } from '@/components/workspace/PageEditor';
import { useWorkspace } from '@/hooks/useWorkspace';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, Undo2, Redo2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

const Index = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const didSyncRef = useRef(false);

  // Redirect to auth if not logged in
  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  // Sync subscription at least once per session (and handle post-checkout return).
  useEffect(() => {
    if (loading || !user) return;
    if (didSyncRef.current) return;

    didSyncRef.current = true;

    const params = new URLSearchParams(location.search);
    const fromCheckout = params.get('success') === 'true';

    (async () => {
      const { error } = await supabase.functions.invoke('sync-subscription', {
        body: { force: fromCheckout },
      });

      if (fromCheckout) {
        if (error) {
          toast.error('Payment succeeded, but Pro is still activating. Try again in a minute.');
        } else {
          toast.success('Pro activated.');
        }
        // Clear query params
        navigate('/', { replace: true });
      }
    })();
  }, [loading, location.search, navigate, user]);

  const {
    pages,
    activePage,
    activePageId,
    isLoading: workspaceLoading,
    setActivePageId,
    createPage,
    deletePage,
    updatePageTitle,
    updatePageIcon,
    addBlock,
    updateBlock,
    deleteBlock,
    reorderBlocks,
    undo,
    redo,
    canUndo,
    canRedo,
  } = useWorkspace();

  // Keyboard shortcuts for undo/redo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          redo();
        } else {
          undo();
        }
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'y') {
        e.preventDefault();
        redo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo]);

  // Show loading state
  if (loading || workspaceLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Don't render if not authenticated
  if (!user) return null;

  if (!activePage || !activePageId) return null;

  return (
    <div className="flex h-screen bg-background">
      <Sidebar
        pages={pages}
        activePageId={activePageId}
        onSelectPage={setActivePageId}
        onCreatePage={createPage}
        onDeletePage={deletePage}
        isCollapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
      />
      <div className="flex-1 flex flex-col">
        {/* Undo/Redo toolbar */}
        <div className="h-10 px-4 flex items-center gap-1 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={undo}
                disabled={!canUndo}
              >
                <Undo2 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Undo (⌘Z)</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={redo}
                disabled={!canRedo}
              >
                <Redo2 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Redo (⌘⇧Z)</TooltipContent>
          </Tooltip>
          <div className="flex-1" />
          <span className="text-xs text-muted-foreground">
            Synced across devices
          </span>
        </div>
        <PageEditor
          page={activePage}
          pageId={activePageId}
          onUpdateTitle={(title) => updatePageTitle(activePageId, title)}
          onUpdateIcon={(icon) => updatePageIcon(activePageId, icon)}
          onAddBlock={(type, afterBlockId) => addBlock(activePageId, type, afterBlockId)}
          onUpdateBlock={(blockId, updates) => updateBlock(activePageId, blockId, updates)}
          onDeleteBlock={(blockId) => deleteBlock(activePageId, blockId)}
          onReorderBlocks={reorderBlocks}
          onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
          isSidebarCollapsed={sidebarCollapsed}
        />
      </div>
    </div>
  );
};

export default Index;
