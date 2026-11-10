import { useState, KeyboardEvent } from 'react';
import { X, ChevronDown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';

interface TagInputProps {
  tags: string[];
  onChange: (tags: string[]) => void;
  suggestions?: string[];
  placeholder?: string;
}

export function TagInput({ tags, onChange, suggestions = [], placeholder = "Adicionar tag..." }: TagInputProps) {
  const [input, setInput] = useState('');
  const [popoverOpen, setPopoverOpen] = useState(false);
  const priorityTags = ['1ª avaliação', '2ª avaliação', 'adaptada'];

  const sortedSuggestions = [...suggestions].sort((a, b) => {
    const aLower = a.toLowerCase();
    const bLower = b.toLowerCase();
    const aIdx = priorityTags.indexOf(aLower);
    const bIdx = priorityTags.indexOf(bLower);

    if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx;
    if (aIdx !== -1) return -1;
    if (bIdx !== -1) return 1;
    return a.localeCompare(b);
  });

  const filteredSuggestions = sortedSuggestions.filter(
    s => s.toLowerCase().includes(input.toLowerCase()) && !tags.includes(s)
  );

  const availableTags = sortedSuggestions.filter(s => !tags.includes(s));

  const addTag = (tag: string) => {
    const trimmed = tag.trim().toLowerCase();
    if (trimmed && !tags.includes(trimmed)) {
      onChange([...tags, trimmed]);
    }
    setInput('');
  };

  const removeTag = (tag: string) => {
    onChange(tags.filter(t => t !== tag));
  };

  const toggleTag = (tag: string) => {
    if (tags.includes(tag)) {
      removeTag(tag);
    } else {
      addTag(tag);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && input.trim()) {
      e.preventDefault();
      addTag(input);
    }
    if (e.key === 'Backspace' && !input && tags.length > 0) {
      removeTag(tags[tags.length - 1]);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {tags.map(tag => (
          <Badge key={tag} variant="secondary" className="bg-tag text-tag-foreground gap-1 px-2.5 py-1">
            {tag}
            <button onClick={() => removeTag(tag)} className="hover:text-destructive transition-colors">
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
      </div>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
          />
          {input && filteredSuggestions.length > 0 && (
            <div className="absolute z-10 top-full left-0 right-0 mt-1 bg-card border border-border rounded-md shadow-lg max-h-32 overflow-auto">
              {filteredSuggestions.map(s => (
                <button
                  key={s}
                  onMouseDown={() => addTag(s)}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>
        {suggestions.length > 0 && (
          <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="icon" className="flex-shrink-0">
                <ChevronDown className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-56 p-2 max-h-48 overflow-auto" align="end">
              {availableTags.length === 0 && tags.length === suggestions.length ? (
                <p className="text-sm text-muted-foreground text-center py-2">Todas selecionadas</p>
              ) : (
                suggestions.map(s => (
                  <label
                    key={s}
                    className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-accent cursor-pointer text-sm"
                  >
                    <Checkbox
                      checked={tags.includes(s)}
                      onCheckedChange={() => toggleTag(s)}
                    />
                    {s}
                  </label>
                ))
              )}
            </PopoverContent>
          </Popover>
        )}
      </div>
    </div>
  );
}
