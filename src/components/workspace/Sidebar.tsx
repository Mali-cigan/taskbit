import { Plus, ChevronLeft, Trash2 } from 'lucide-react';
import { Page } from '@/types/workspace';
import { cn } from '@/lib/utils';
interface SidebarProps {
  pages: Page[];
  activePageId: string;
  onSelectPage: (id: string) => void;
  onCreatePage: () => void;
  onDeletePage: (id: string) => void;
  isCollapsed: boolean;
  onToggle: () => void;
}
export function Sidebar({
  pages,
  activePageId,
  onSelectPage,
  onCreatePage,
  onDeletePage,
  isCollapsed,
  onToggle
}: SidebarProps) {
  return <aside className={cn("h-screen bg-sidebar border-r border-sidebar-border flex flex-col transition-gentle", isCollapsed ? "w-0 opacity-0 overflow-hidden" : "w-64")}>
      {/* Header */}
      <div className="h-14 px-4 flex items-center justify-between border-b border-sidebar-border">
        <span className="font-semibold text-sidebar-foreground">Taskbit</span>
        <button onClick={onToggle} className="p-1.5 rounded-md text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-gentle">
          <ChevronLeft className="w-4 h-4" />
        </button>
      </div>

      {/* Pages List */}
      <div className="flex-1 overflow-y-auto py-2">
        <div className="px-3 mb-2">
          <span className="text-xs font-medium text-sidebar-foreground/50 uppercase tracking-wider">
            Pages
          </span>
        </div>
        <nav className="space-y-0.5 px-2">
          {pages.map(page => <div key={page.id} className={cn("group flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer transition-gentle", activePageId === page.id ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-sidebar-foreground hover:bg-sidebar-accent/50")} onClick={() => onSelectPage(page.id)}>
              <span className="text-base">{page.icon}</span>
              <span className="flex-1 truncate text-sm">{page.title}</span>
              {pages.length > 1 && <button onClick={e => {
            e.stopPropagation();
            onDeletePage(page.id);
          }} className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-destructive/10 hover:text-destructive transition-gentle">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>}
            </div>)}
        </nav>
      </div>

      {/* Create Page Button */}
      <div className="p-3 border-t border-sidebar-border">
        <button onClick={onCreatePage} className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-gentle text-sm font-medium">
          <Plus className="w-4 h-4" />
          New Page
        </button>
      </div>
    </aside>;
}