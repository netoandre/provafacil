import { useState } from 'react';
import { Question } from '@/types/question';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Edit, Trash2, Check, GraduationCap, ChevronDown, ChevronUp, Sparkles, BrainCircuit, BarChart3, History } from 'lucide-react';

interface QuestionCardProps {
  question: Question;
  onEdit: (q: Question) => void;
  onDelete: (id: string) => void;
  selectable?: boolean;
  selected?: boolean;
  onToggleSelect?: (id: string) => void;
  disciplineName?: string | null;
  score?: number;
  onScoreChange?: (score: number) => void;
  onGenerateAlternative?: (q: Question) => void;
}

export function QuestionCard({ 
  question, 
  onEdit, 
  onDelete, 
  selectable, 
  selected, 
  onToggleSelect, 
  disciplineName,
  score,
  onScoreChange,
  onGenerateAlternative
}: QuestionCardProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <Card className={`border-border transition-all ${selectable ? 'cursor-pointer hover:border-primary' : ''} ${selected ? 'ring-2 ring-primary border-primary bg-accent/30' : ''}`}
      onClick={selectable ? () => onToggleSelect?.(question.id) : undefined}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0 flex items-start gap-3">
            {selectable && (
              <div className="flex flex-col items-center gap-1.5 flex-shrink-0 mt-0.5">
                <div
                  className={`flex-shrink-0 inline-flex items-center justify-center w-5 h-5 rounded border transition-colors ${selected ? 'bg-primary border-primary text-primary-foreground' : 'border-border'}`}
                >
                  {selected && <Check className="h-3 w-3" />}
                </div>
                {selected && onScoreChange && (
                  <div className="animate-in fade-in zoom-in-95 duration-200">
                    <Input
                      type="number"
                      step="0.25"
                      min="0"
                      value={score ?? 0}
                      onChange={(e) => onScoreChange(e.target.value ? parseFloat(e.target.value) : 0)}
                      onClick={(e) => e.stopPropagation()}
                      className="w-14 h-7 text-[10px] text-center font-bold px-1 bg-background/50 border-primary/20"
                      title="Pontuação"
                    />
                  </div>
                )}
              </div>
            )}
            <div 
              className={`text-sm font-medium leading-relaxed ${!expanded ? 'line-clamp-2' : ''}`}
              dangerouslySetInnerHTML={{ __html: question.text }}
            />
          </div>
          <div className="flex gap-1 flex-shrink-0">
            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}>
              {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
            <>
              {onGenerateAlternative && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-amber-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/20"
                  onClick={(e) => { e.stopPropagation(); onGenerateAlternative(question); }}
                  title="Gerar versão alternativa com IA"
                >
                  <Sparkles className="h-4 w-4" />
                </Button>
              )}
              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" onClick={(e) => { e.stopPropagation(); onEdit(question); }}>
                <Edit className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={(e) => { e.stopPropagation(); onDelete(question.id); }}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </>
          </div>
        </div>

        {expanded && question.type === 'objetiva' && (
          <div className="mt-3 space-y-1 pl-2 border-l-2 border-border ml-7">
            {question.alternatives.map((alt, i) => (
              <div key={alt.id} className={`text-sm flex items-baseline gap-2 ${alt.isCorrect ? 'text-success font-medium' : 'text-muted-foreground'}`}>
                <span className="font-mono text-xs">{String.fromCharCode(65 + i)}</span>
                <span dangerouslySetInnerHTML={{ __html: alt.text }} />
                {alt.isCorrect && <Check className="h-3 w-3 flex-shrink-0" />}
              </div>
            ))}
          </div>
        )}

        <div className={`mt-3 flex flex-wrap gap-1.5 items-center ${selectable ? 'ml-7' : ''}`}>
          <Badge variant="outline" className={`text-xs ${question.type === 'objetiva' ? 'border-primary/30 text-primary' : 'border-amber-500/30 text-amber-600'}`}>
            {question.type === 'objetiva' ? 'Objetiva' : 'Subjetiva'}
          </Badge>
          {question.evaluation && (
            <Badge variant="secondary" className="text-xs bg-indigo-500/10 text-indigo-700 border-indigo-500/20 gap-1 capitalize">
              <BarChart3 className="h-3 w-3" /> {question.evaluation}ª Avaliação
            </Badge>
          )}
          {question.difficulty && (
            <Badge 
              variant="secondary" 
              className={`text-xs gap-1 border-opacity-30 ${
                question.difficulty === 'Fácil' ? 'bg-green-500/10 text-green-700 border-green-500' :
                question.difficulty === 'Médio' ? 'bg-amber-500/10 text-amber-700 border-amber-500' :
                'bg-red-500/10 text-red-700 border-red-500'
              }`}
            >
              <BrainCircuit className="h-3 w-3" /> {question.difficulty}
            </Badge>
          )}
          {question.isAdapted && (
            <Badge variant="outline" className="text-xs bg-blue-500/5 text-blue-600 border-blue-500/30 gap-1">
              <History className="h-3 w-3" /> Adaptada
            </Badge>
          )}
          {selected && (
            <Badge variant="default" className="text-[10px] bg-primary text-primary-foreground font-bold px-1.5 h-5">
              <Check className="h-3 w-3 mr-1" /> JÁ NA PROVA
            </Badge>
          )}
          {disciplineName && (
            <Badge variant="outline" className="text-xs gap-1">
              <GraduationCap className="h-3 w-3" /> {disciplineName}
            </Badge>
          )}
          {question.tags.map(tag => (
            <Badge key={tag} variant="secondary" className="bg-tag text-tag-foreground text-xs">
              {tag}
            </Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
