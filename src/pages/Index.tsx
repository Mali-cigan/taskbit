import { useState } from 'react';
import { Sidebar } from '@/components/workspace/Sidebar';
import { PageEditor } from '@/components/workspace/PageEditor';
import { useWorkspace } from '@/hooks/useWorkspace';

const Index = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
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
