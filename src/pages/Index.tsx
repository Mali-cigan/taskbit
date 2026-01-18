import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Sidebar } from '@/components/workspace/Sidebar';
import { PageEditor } from '@/components/workspace/PageEditor';
import { useWorkspace } from '@/hooks/useWorkspace';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

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
    setActivePageId,
    createPage,
    deletePage,
    updatePageTitle,
    updatePageIcon,
    addBlock,
    updateBlock,
    deleteBlock,
  } = useWorkspace();

  // Show loading state
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Don't render if not authenticated
  if (!user) return null;

  if (!activePage) return null;

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
      <PageEditor
        page={activePage}
        onUpdateTitle={(title) => updatePageTitle(activePageId, title)}
        onUpdateIcon={(icon) => updatePageIcon(activePageId, icon)}
        onAddBlock={(type, afterBlockId) => addBlock(activePageId, type, afterBlockId)}
        onUpdateBlock={(blockId, updates) => updateBlock(activePageId, blockId, updates)}
        onDeleteBlock={(blockId) => deleteBlock(activePageId, blockId)}
        onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
        isSidebarCollapsed={sidebarCollapsed}
      />
    </div>
  );
};

export default Index;
