export type BlockType = 'text' | 'heading1' | 'heading2' | 'heading3' | 'checklist' | 'divider';

export interface Block {
  id: string;
  type: BlockType;
  content: string;
  checked?: boolean;
}

export interface Page {
  id: string;
  title: string;
  icon: string;
  blocks: Block[];
  createdAt: Date;
  updatedAt: Date;
}
