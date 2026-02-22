import { useState, useCallback } from 'react';
import { Block } from '@/types/workspace';
import { Plus, Trash2, GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TableBlockProps {
  block: Block;
  onUpdate: (updates: Partial<Block>) => void;
  onDelete: () => void;
}

interface TableData {
  headers: string[];
  rows: string[][];
}

function parseTableContent(content: string): TableData {
  try {
    const parsed = JSON.parse(content);
    if (parsed.headers && parsed.rows) return parsed;
  } catch {}
  return { headers: ['Column 1', 'Column 2', 'Column 3'], rows: [['', '', ''], ['', '', '']] };
}

function serializeTable(data: TableData): string {
  return JSON.stringify(data);
}

export function TableBlock({ block, onUpdate, onDelete }: TableBlockProps) {
  const [tableData, setTableData] = useState<TableData>(() => parseTableContent(block.content));

  const save = useCallback((data: TableData) => {
    setTableData(data);
    onUpdate({ content: serializeTable(data) });
  }, [onUpdate]);

  const updateHeader = (colIndex: number, value: string) => {
    const newHeaders = [...tableData.headers];
    newHeaders[colIndex] = value;
    save({ ...tableData, headers: newHeaders });
  };

  const updateCell = (rowIndex: number, colIndex: number, value: string) => {
    const newRows = tableData.rows.map((row, ri) =>
      ri === rowIndex ? row.map((cell, ci) => ci === colIndex ? value : cell) : [...row]
    );
    save({ ...tableData, rows: newRows });
  };

  const addColumn = () => {
    save({
      headers: [...tableData.headers, `Column ${tableData.headers.length + 1}`],
      rows: tableData.rows.map(row => [...row, '']),
    });
  };

  const removeColumn = (colIndex: number) => {
    if (tableData.headers.length <= 1) return;
    save({
      headers: tableData.headers.filter((_, i) => i !== colIndex),
      rows: tableData.rows.map(row => row.filter((_, i) => i !== colIndex)),
    });
  };

  const addRow = () => {
    save({
      ...tableData,
      rows: [...tableData.rows, new Array(tableData.headers.length).fill('')],
    });
  };

  const removeRow = (rowIndex: number) => {
    if (tableData.rows.length <= 1) return;
    save({
      ...tableData,
      rows: tableData.rows.filter((_, i) => i !== rowIndex),
    });
  };

  return (
    <div className="group relative py-1">
      <div className="rounded-lg border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-muted/50">
                {tableData.headers.map((header, colIndex) => (
                  <th key={colIndex} className="relative border-r border-border last:border-r-0 group/col">
                    <input
                      value={header}
                      onChange={(e) => updateHeader(colIndex, e.target.value)}
                      className="w-full px-3 py-2 bg-transparent text-sm font-medium text-foreground outline-none placeholder:text-muted-foreground"
                      placeholder="Header"
                    />
                    {tableData.headers.length > 1 && (
                      <button
                        onClick={() => removeColumn(colIndex)}
                        className="absolute -top-2 right-0.5 p-0.5 rounded bg-destructive/10 text-destructive opacity-0 group-hover/col:opacity-100 hover:bg-destructive/20 transition-all text-xs"
                        title="Remove column"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </th>
                ))}
                <th className="w-8 bg-muted/30">
                  <button
                    onClick={addColumn}
                    className="w-full h-full flex items-center justify-center p-2 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                    title="Add column"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </th>
              </tr>
            </thead>
            <tbody>
              {tableData.rows.map((row, rowIndex) => (
                <tr key={rowIndex} className="border-t border-border group/row hover:bg-muted/20">
                  {row.map((cell, colIndex) => (
                    <td key={colIndex} className="border-r border-border last:border-r-0">
                      <input
                        value={cell}
                        onChange={(e) => updateCell(rowIndex, colIndex, e.target.value)}
                        className="w-full px-3 py-2 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
                        placeholder="—"
                      />
                    </td>
                  ))}
                  <td className="w-8">
                    {tableData.rows.length > 1 && (
                      <button
                        onClick={() => removeRow(rowIndex)}
                        className="w-full flex items-center justify-center p-2 text-muted-foreground hover:text-destructive opacity-0 group-hover/row:opacity-100 transition-all"
                        title="Remove row"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* Add row button */}
        <button
          onClick={addRow}
          className="w-full flex items-center justify-center gap-1.5 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/30 border-t border-border transition-colors"
        >
          <Plus className="w-3 h-3" />
          Add row
        </button>
      </div>
      {/* Delete block */}
      <button
        onClick={onDelete}
        className="absolute -right-8 top-1 p-1 rounded opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-gentle"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
