import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { parseMultipleQuestions, parseAnswerKey, ParsedQuestion } from '@/lib/question-parser';
import { fetchTags, fetchDisciplines, postQuestion } from '@/lib/api';
import { TagInput } from './TagInput';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ClipboardPaste, Check, AlertCircle, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const escapeHtml = (unsafe: string) => {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
};

interface BatchPasteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: () => void;
}

export function BatchPasteDialog({ open, onOpenChange, onSave }: BatchPasteDialogProps) {
  const queryClient = useQueryClient();
  const [raw, setRaw] = useState('');
  const [step, setStep] = useState<'paste' | 'review'>('paste');
  const [parsedQuestions, setParsedQuestions] = useState<ParsedQuestion[]>([]);
  const [correctIndices, setCorrectIndices] = useState<(number | null)[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [disciplineId, setDisciplineId] = useState('');
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
  const [answerKey, setAnswerKey] = useState('');

  const { data: serverTags = [] } = useQuery({ queryKey: ['tags'], queryFn: fetchTags, enabled: open });
  const { data: disciplines = [] } = useQuery({ queryKey: ['disciplines'], queryFn: fetchDisciplines, enabled: open });
  const allTags = useMemo(() => serverTags.map(t => t.name), [serverTags]);

  const createQuestionMutation = useMutation({
    mutationFn: postQuestion,
  });

  const handleParse = () => {
    const results = parseMultipleQuestions(raw);
    const keyData = parseAnswerKey(answerKey);
    
    setParsedQuestions(results);
    
    let objectiveIdx = 0;
    
    // Auto-map correctly based on answerKey
    const initialCorrect = results.map((pq, idx) => {
      if (pq.type === 'subjective') return null;
      
      let letter = '';
      if (Array.isArray(keyData)) {
        // Sequential mapping (skips subjective)
        if (objectiveIdx < keyData.length) {
          letter = keyData[objectiveIdx];
          objectiveIdx++;
        }
      } else {
        // Numbered mapping (e.g. 1-A 3-B)
        letter = keyData[idx + 1] || '';
      }
      
      if (letter) {
        const altIdx = letter.charCodeAt(0) - 65; // A=0, B=1...
        if (altIdx >= 0 && altIdx < pq.alternatives.length) {
          return altIdx;
        }
      }
      return null;
    });
    
    setCorrectIndices(initialCorrect);
    if (results.length > 0) setStep('review');
  };


  const setCorrect = (qIdx: number, altIdx: number) => {
    setCorrectIndices(prev => prev.map((v, i) => i === qIdx ? altIdx : v));
  };

  const allCorrectMarked = useMemo(
    () => parsedQuestions.every((pq, i) => pq.type === 'subjective' || correctIndices[i] !== null),
    [parsedQuestions, correctIndices]
  );

  const handleSave = async () => {
    if (!allCorrectMarked) return;
    
    let successCount = 0;
    
    // Dispare as mutacoes sequencialmente ou via Promisse.all
    // Para nao sobrecarregar o back, faremos sequencial.
    for (let i = 0; i < parsedQuestions.length; i++) {
        const pq = parsedQuestions[i];
        const correctIdx = correctIndices[i];
        
        try {
            await createQuestionMutation.mutateAsync({
                title: escapeHtml(pq.statement),
                type: pq.type,
                score: pq.score ?? 1,
                disciplines: disciplineId && disciplineId !== 'none' && !isNaN(Number(disciplineId)) ? [Number(disciplineId)] : [],
                tags: tags, // Backend expects array of strings (tag names)
                alternatives: pq.type === 'objective' 
                    ? pq.alternatives.map((text, aIdx) => ({
                        text,
                        is_correct: correctIdx === aIdx
                    }))
                    : []
            });
            successCount++;
        } catch (error: any) {
            console.error('Falha ao salvar questão', pq, error);
            const msg = error.response?.data?.message || 'Erro de validação';
            const details = error.response?.data?.errors ? Object.values(error.response.data.errors).flat().join(', ') : '';
            toast.error(`Falha na Questão ${i + 1}: ${msg} ${details}`);
        }
    }
    
    queryClient.invalidateQueries({ queryKey: ['questions'] });
    toast.success(`${successCount} questão(ões) cadastrada(s) na API!`);
    
    if (successCount < parsedQuestions.length) {
         toast.error(`${parsedQuestions.length - successCount} falharam.`);
    }

    onSave(); // call parent
    resetAndClose();
  };

  const resetAndClose = () => {
    setRaw('');
    setStep('paste');
    setParsedQuestions([]);
    setCorrectIndices([]);
    setTags([]);
    setDisciplineId('');
    setExpandedIdx(null);
    setAnswerKey('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v && !createQuestionMutation.isPending) resetAndClose(); else if (v) onOpenChange(v); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardPaste className="h-5 w-5" /> Colar Várias Questões
          </DialogTitle>
        </DialogHeader>

        {step === 'paste' && (
          <div className="space-y-4 flex-1 overflow-y-auto">
            <div className="space-y-2">
              <Label>Cole as questões numeradas abaixo:</Label>
              <Textarea
                value={raw}
                onChange={e => setRaw(e.target.value)}
                placeholder={`Exemplo:\n1) Qual a capital do Brasil?\nA) São Paulo\nB) Brasília\nC) Rio de Janeiro\nD) Salvador\n\n2) Descreva o ciclo da água.`}
                className="min-h-[200px] resize-y font-mono text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label>Gabarito (Opcional):</Label>
              <Textarea
                value={answerKey}
                onChange={e => setAnswerKey(e.target.value)}
                placeholder="Ex: 1-A 2:B ou A B C..."
                className="min-h-[60px] resize-none font-mono text-sm"
              />
              <p className="text-[10px] text-muted-foreground italic">* Só será aplicado às questões objetivas em ordem.</p>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={resetAndClose}>Cancelar</Button>
              <Button onClick={handleParse} disabled={!raw.trim()}>
                Reconhecer Questões
              </Button>
            </div>
          </div>
        )}

        {step === 'review' && (
          <div className="space-y-4 flex-1 overflow-y-auto overflow-x-hidden flex flex-col pr-1">
            <div className="flex items-center gap-2 text-sm shrink-0">
              {parsedQuestions.length > 0 ? (
                <span className="flex items-center gap-1.5 text-primary font-medium">
                  <Check className="h-4 w-4" />
                  {parsedQuestions.length} questão(ões) reconhecida(s)
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-destructive">
                  <AlertCircle className="h-4 w-4" />
                  Nenhuma questão reconhecida
                </span>
              )}
            </div>

            {/* Shared discipline & tags */}
            <div className="space-y-3 rounded-lg border border-border p-3 shrink-0">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Aplicar a todas as questões</p>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Disciplina</Label>
                <Select value={disciplineId} onValueChange={setDisciplineId} disabled={createQuestionMutation.isPending}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhuma</SelectItem>
                    {disciplines.map(d => (
                      <SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Tags</Label>
                <TagInput tags={tags} onChange={setTags} suggestions={allTags} placeholder="Adicionar tag..." />
              </div>
            </div>

            {/* Question list */}
            <div className="flex-1 pb-2">
              <div className="space-y-2">
                {parsedQuestions.map((pq, qIdx) => {
                  const isExpanded = expandedIdx === qIdx;
                  const correctIdx = correctIndices[qIdx];
                  return (
                    <div key={qIdx} className="rounded-lg border border-border overflow-hidden">
                      <button
                        type="button"
                        onClick={() => setExpandedIdx(isExpanded ? null : qIdx)}
                        className="w-full flex items-center justify-between gap-2 p-3 text-left hover:bg-accent/50 transition-colors"
                        disabled={createQuestionMutation.isPending}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">
                            {qIdx + 1}
                          </span>
                          <span className="text-sm truncate font-medium">
                            {pq.type === 'subjective' && <span className="text-amber-600 mr-2">[Subjetiva]</span>}
                            {pq.statement.substring(0, 80)}{pq.statement.length > 80 ? '...' : ''}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {correctIdx !== null && (
                            <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded font-medium">
                              {String.fromCharCode(65 + correctIdx)}
                            </span>
                          )}
                          {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                        </div>
                      </button>
                      {isExpanded && (
                        <div className="border-t border-border p-3 space-y-2 bg-muted/30">
                          <p className="text-sm whitespace-pre-wrap">{pq.statement}</p>
                          
                          {pq.type === 'objective' ? (
                            <>
                              <p className="text-xs text-muted-foreground font-medium">Clique na alternativa correta:</p>
                              <div className="space-y-1">
                                {pq.alternatives.map((alt, aIdx) => (
                                  <button
                                    key={aIdx}
                                    type="button"
                                    onClick={() => setCorrect(qIdx, aIdx)}
                                    disabled={createQuestionMutation.isPending}
                                    className={`w-full text-left text-sm p-2 rounded flex items-center gap-2 transition-colors ${
                                      correctIdx === aIdx
                                        ? 'bg-primary/15 text-primary ring-1 ring-primary/30'
                                        : 'hover:bg-accent'
                                    }`}
                                  >
                                    <span className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs font-medium ${
                                      correctIdx === aIdx
                                        ? 'bg-primary border-primary text-primary-foreground'
                                        : 'border-border text-muted-foreground'
                                    }`}>
                                      {correctIdx === aIdx ? <Check className="h-3 w-3" /> : String.fromCharCode(65 + aIdx)}
                                    </span>
                                    {alt}
                                  </button>
                                ))}
                              </div>
                            </>
                          ) : (
                            <p className="text-xs bg-amber-50 text-amber-700 border border-amber-200 p-2 rounded">
                              Questão reconhecida como <strong>subjetiva</strong>. Nenhuma alternativa foi detectada.
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {!allCorrectMarked && parsedQuestions.length > 0 && (
              <p className="text-xs text-destructive flex items-center gap-1">
                <AlertCircle className="h-3.5 w-3.5" />
                Marque a alternativa correta em cada questão antes de salvar.
              </p>
            )}

            <div className="flex gap-2 justify-end pt-1 shrink-0 pb-2">
              <Button variant="outline" onClick={() => setStep('paste')} disabled={createQuestionMutation.isPending}>Voltar</Button>
              <Button onClick={handleSave} disabled={parsedQuestions.length === 0 || !allCorrectMarked || createQuestionMutation.isPending} className="gap-2">
                {createQuestionMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {createQuestionMutation.isPending ? 'Salvando...' : `Salvar ${parsedQuestions.length} Questão(ões)`}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}