import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sidebar } from '@/components/workspace/Sidebar';
import { PageEditor } from '@/components/workspace/PageEditor';
import { useWorkspace } from '@/hooks/useWorkspace';
import { useAuth } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';

const Index = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  // Redirect to auth if not logged in
  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);
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
