import { useState, useCallback, useRef } from 'react';

interface HistoryEntry<T> {
  state: T;
  timestamp: number;
}

interface UseUndoRedoOptions {
  maxHistory?: number;
}

export function useUndoRedo<T>(initialState: T, options: UseUndoRedoOptions = {}) {
  const { maxHistory = 50 } = options;
  
  const [history, setHistory] = useState<HistoryEntry<T>[]>([
    { state: initialState, timestamp: Date.now() }
  ]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const isUndoRedoRef = useRef(false);

  const currentState = history[currentIndex]?.state ?? initialState;

  const pushState = useCallback((newState: T) => {
    // Don't push if we're in the middle of undo/redo
    if (isUndoRedoRef.current) {
      isUndoRedoRef.current = false;
      return;
    }

    setHistory(prev => {
      // Remove any future states if we're not at the end
      const newHistory = prev.slice(0, currentIndex + 1);
      
      // Add new state
      newHistory.push({ state: newState, timestamp: Date.now() });
      
      // Limit history size
      if (newHistory.length > maxHistory) {
        newHistory.shift();
        return newHistory;
      }
      
      return newHistory;
    });
    
    setCurrentIndex(prev => Math.min(prev + 1, maxHistory - 1));
  }, [currentIndex, maxHistory]);

  const undo = useCallback((): T | null => {
    if (currentIndex <= 0) return null;
    
    isUndoRedoRef.current = true;
    const newIndex = currentIndex - 1;
    setCurrentIndex(newIndex);
    return history[newIndex]?.state ?? null;
  }, [currentIndex, history]);

  const redo = useCallback((): T | null => {
    if (currentIndex >= history.length - 1) return null;
    
    isUndoRedoRef.current = true;
    const newIndex = currentIndex + 1;
    setCurrentIndex(newIndex);
    return history[newIndex]?.state ?? null;
  }, [currentIndex, history]);

  const canUndo = currentIndex > 0;
  const canRedo = currentIndex < history.length - 1;

  const reset = useCallback((newState: T) => {
    setHistory([{ state: newState, timestamp: Date.now() }]);
    setCurrentIndex(0);
  }, []);

  return {
    state: currentState,
    pushState,
    undo,
    redo,
    canUndo,
    canRedo,
    reset,
    historyLength: history.length,
    currentIndex,
  };
}
