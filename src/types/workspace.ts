export type BlockType = 
  | 'text' 
  | 'heading1' 
  | 'heading2' 
  | 'heading3' 
  | 'checklist' 
  | 'divider'
  // Premium blocks
  | 'callout'
  | 'quote'
  | 'code'
  | 'table'
  | 'toggle'
  | 'image'
  | 'embed'
  | 'kanban'
  | 'database'
  // New basic blocks
  | 'bullet'
  | 'numbered'
  | 'math';

export interface Block {
  id: string;
  type: BlockType;
  content: string;
  checked?: boolean;
  // Additional properties for premium blocks
  calloutType?: 'info' | 'warning' | 'success' | 'error';
  language?: string; // For code blocks
  collapsed?: boolean; // For toggle blocks
  embedUrl?: string; // For embed blocks
}

export interface Page {
  id: string;
  title: string;
  icon: string;
  blocks: Block[];
  createdAt: Date;
  updatedAt: Date;
}

// Premium block types that require Pro subscription
export const PREMIUM_BLOCK_TYPES: BlockType[] = [
  'callout',
  'quote',
  'code',
  'table',
  'toggle',
  'image',
  'embed',
  'kanban',
  'database',
  'math',
];

export const isPremiumBlock = (type: BlockType): boolean => {
  return PREMIUM_BLOCK_TYPES.includes(type);
};
