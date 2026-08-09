import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Search, Loader2, Flag, CheckSquare, MessageSquare, Tag, Clock } from 'lucide-react';

const DEBOUNCE_MS = 300;
const MAX_RECENT = 5;

export default function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [recentSearches, setRecentSearches] = useState([]);
  
  const inputRef = useRef(null);
  const listRef = useRef(null);
  const navigate = useNavigate();

  // Load recent searches
  useEffect(() => {
    try {
      const stored = localStorage.getItem('teamflow_recent_searches');
      if (stored) setRecentSearches(JSON.parse(stored));
    } catch (e) {
      console.error(e);
    }
  }, []);

  const saveRecentSearch = (searchTerm) => {
    if (!searchTerm.trim()) return;
    const term = searchTerm.trim();
    const newRecent = [term, ...recentSearches.filter(t => t !== term)].slice(0, MAX_RECENT);
    setRecentSearches(newRecent);
    localStorage.setItem('teamflow_recent_searches', JSON.stringify(newRecent));
  };

  // Keyboard listener for Cmd+K
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setResults(null);
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Debounced Search
  useEffect(() => {
    if (!query.trim() || query.trim().length < 2) {
      setResults(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    const abortController = new AbortController();

    const handler = setTimeout(async () => {
      try {
        const res = await axios.get(`/v1/search?q=${encodeURIComponent(query)}`, {
          signal: abortController.signal
        });
        setResults(res.data.data);
        setSelectedIndex(0);
      } catch (err) {
        if (!axios.isCancel(err)) {
          console.error('Search failed', err);
        }
      } finally {
        if (!abortController.signal.aborted) {
          setLoading(false);
        }
      }
    }, DEBOUNCE_MS);

    return () => {
      clearTimeout(handler);
      abortController.abort();
    };
  }, [query]);

  // Flatten results for keyboard navigation
  const flattenedResults = [];
  if (results) {
    if (results.projects?.length) {
      flattenedResults.push({ type: 'header', label: 'Projects' });
      results.projects.forEach(p => flattenedResults.push({ type: 'project', item: p }));
    }
    if (results.tasks?.length) {
      flattenedResults.push({ type: 'header', label: 'Tasks' });
      results.tasks.forEach(t => flattenedResults.push({ type: 'task', item: t }));
    }
    if (results.comments?.length) {
      flattenedResults.push({ type: 'header', label: 'Comments' });
      results.comments.forEach(c => flattenedResults.push({ type: 'comment', item: c }));
    }
    if (results.labels?.length) {
      flattenedResults.push({ type: 'header', label: 'Labels' });
      results.labels.forEach(l => flattenedResults.push({ type: 'label', item: l }));
    }
  }

  // Count only selectable items
  const selectableCount = flattenedResults.filter(r => r.type !== 'header').length;

  const handleAction = (type, item) => {
    saveRecentSearch(query);
    setIsOpen(false);
    
    // Navigate based on type
    if (type === 'project') {
      navigate(`/projects/${item._id}`);
    } else if (type === 'task') {
      navigate(`/projects/${item.project?._id || item.project}?taskId=${item._id}`);
    } else if (type === 'comment') {
      navigate(`/projects/${item.task?.project}?taskId=${item.task?._id}`);
    } else if (type === 'label') {
      navigate(`/projects/${item.project?._id || item.project}`);
    }
  };

  const handleRecentClick = (term) => {
    setQuery(term);
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isOpen) return;

      if (e.key === 'Escape') {
        setIsOpen(false);
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % (selectableCount || 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + (selectableCount || 1)) % (selectableCount || 1));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (query.trim() && !results) {
          // It's still loading or searching, do nothing
          return;
        }
        
        let currentIndex = 0;
        for (const row of flattenedResults) {
          if (row.type !== 'header') {
            if (currentIndex === selectedIndex) {
              handleAction(row.type, row.item);
              return;
            }
            currentIndex++;
          }
        }
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedIndex, selectableCount, flattenedResults, query, results]);

  if (!isOpen) return null;

  let currentSelectableIndex = 0;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity"
        onClick={() => setIsOpen(false)}
      />
      
      {/* Palette */}
      <div className="relative w-full max-w-2xl transform overflow-hidden rounded-2xl bg-white shadow-2xl transition-all border border-slate-200 flex flex-col max-h-[80vh]">
        
        {/* Search Input */}
        <div className="relative flex items-center border-b border-slate-100 px-4">
          <Search className="w-5 h-5 text-slate-400" />
          <input
            ref={inputRef}
            type="text"
            className="w-full bg-transparent py-4 pl-4 pr-12 text-slate-900 placeholder:text-slate-400 focus:outline-none sm:text-lg"
            placeholder="Search projects, tasks, comments, and labels..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {loading && (
            <div className="absolute right-4 top-1/2 -translate-y-1/2">
              <Loader2 className="w-5 h-5 text-slate-400 animate-spin" />
            </div>
          )}
          <div className="absolute right-4 top-1/2 -translate-y-1/2 flex gap-1">
             <kbd className="hidden sm:inline-flex items-center gap-1 rounded border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-medium text-slate-400">
                ESC
             </kbd>
          </div>
        </div>

        {/* Results Body */}
        <div className="flex-1 overflow-y-auto p-2" ref={listRef}>
          {!query.trim() && recentSearches.length > 0 && (
            <div className="p-2">
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 px-2">Recent Searches</h3>
              <ul className="space-y-1">
                {recentSearches.map((term, idx) => (
                  <li key={idx}>
                    <button
                      onClick={() => handleRecentClick(term)}
                      className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                    >
                      <Clock className="w-4 h-4 text-slate-400" />
                      {term}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {!query.trim() && recentSearches.length === 0 && (
            <div className="py-14 text-center text-sm sm:text-base text-slate-500">
              Type to start searching...
            </div>
          )}

          {query.trim() && !loading && selectableCount === 0 && (
            <div className="py-14 text-center text-sm sm:text-base text-slate-500">
              No results found for <span className="font-semibold text-slate-700">"{query}"</span>
            </div>
          )}

          {flattenedResults.length > 0 && (
            <ul className="space-y-1">
              {flattenedResults.map((row, idx) => {
                if (row.type === 'header') {
                  return (
                    <li key={`header-${idx}`} className="px-4 py-2 mt-2">
                      <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">{row.label}</h3>
                    </li>
                  );
                }

                const isSelected = currentSelectableIndex === selectedIndex;
                const itemIndex = currentSelectableIndex;
                currentSelectableIndex++;

                let Icon = Flag;
                let title = '';
                let subtitle = '';
                
                if (row.type === 'project') {
                  Icon = Flag;
                  title = row.item.name;
                  subtitle = row.item.description || 'Project';
                } else if (row.type === 'task') {
                  Icon = CheckSquare;
                  title = row.item.title;
                  subtitle = `In ${row.item.project?.name || 'Project'}`;
                } else if (row.type === 'comment') {
                  Icon = MessageSquare;
                  title = `Comment by ${row.item.author?.name}`;
                  subtitle = row.item.content;
                } else if (row.type === 'label') {
                  Icon = Tag;
                  title = row.item.name;
                  subtitle = `In ${row.item.project?.name || 'Project'}`;
                }

                return (
                  <li key={`item-${row.type}-${row.item._id}`}>
                    <button
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-colors ${
                        isSelected ? 'bg-blue-600 text-white shadow-md' : 'hover:bg-slate-50 text-slate-700'
                      }`}
                      onClick={() => handleAction(row.type, row.item)}
                      onMouseEnter={() => setSelectedIndex(itemIndex)}
                    >
                      <Icon className={`w-5 h-5 flex-shrink-0 ${isSelected ? 'text-blue-200' : 'text-slate-400'}`} />
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-semibold truncate ${isSelected ? 'text-white' : 'text-slate-900'}`}>
                          {title}
                        </p>
                        <p className={`text-xs truncate mt-0.5 ${isSelected ? 'text-blue-100' : 'text-slate-500'}`}>
                          {subtitle}
                        </p>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
        
        {/* Footer */}
        <div className="border-t border-slate-100 bg-slate-50 px-4 py-3 sm:flex hidden items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <kbd className="rounded border border-slate-200 bg-white px-1.5 py-0.5 font-medium">↵</kbd> to select
            </span>
            <span className="flex items-center gap-1">
              <kbd className="rounded border border-slate-200 bg-white px-1.5 py-0.5 font-medium">↑</kbd>
              <kbd className="rounded border border-slate-200 bg-white px-1.5 py-0.5 font-medium">↓</kbd> to navigate
            </span>
          </div>
          <div>Global Search</div>
        </div>
      </div>
    </div>
  );
}
