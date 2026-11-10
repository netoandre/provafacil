import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Exam } from '@/types/question';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { TagInput } from './TagInput';
import {
  Sparkles,
  Loader2,
  Wand2,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Pencil,
  Save,
  X,
  Plus,
  Trash2,
  Check,
  ArrowLeft,
} from 'lucide-react';
import { generateAIQuestion, postQuestion, AIQuestionPayload, fetchDisciplines, fetchTags } from '@/lib/api';
import { toast } from 'sonner';

interface AIGeneratorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Mode of the generator: 'generate' (standard), 'alternative' (one from one), 'adapt' (bulk from list) */
  mode?: 'generate' | 'alternative' | 'adapt';
  /** Original question to use in 'alternative' mode */
  originalQuestion?: any;
  /** List of questions to use in bulk 'adapt' mode */
  initialQuestions?: any[];
  /** If adapting an entire exam, providing this will allow creating the new exam automatically */
  originalExam?: Exam | null;
  /** Called when used inline in QuestionForm (single question apply) */
  onQuestionGenerated?: (question: any) => void;
  /** Called after bulk save to API — for standalone mode from Index */
  onSave?: () => void;
  disciplines?: any[];
  tags?: any[];
}

interface GeneratedQuestion {
  title: string;
  description: string;
  type: 'objective' | 'subjective';
  score: number;
  alternatives: { text: string; is_correct: boolean }[];
}

export function AIGeneratorDialog({
  open,
  onOpenChange,
  mode = 'generate',
  originalQuestion,
  initialQuestions = [],
  originalExam,
  onQuestionGenerated,
  onSave,
  disciplines: propDisciplines,
  tags: propTags,
}: AIGeneratorDialogProps) {
  const queryClient = useQueryClient();

  // Fetch disciplines/tags if not provided via props (standalone mode)
  const { data: fetchedDisciplines = [] } = useQuery({
    queryKey: ['disciplines'],
    queryFn: fetchDisciplines,
    enabled: open && !propDisciplines,
  });
  const { data: fetchedTags = [] } = useQuery({
    queryKey: ['tags'],
    queryFn: fetchTags,
    enabled: open && !propTags,
  });

  const disciplines = propDisciplines ?? fetchedDisciplines;
  const serverTags = propTags ?? fetchedTags;
  const allTagNames = serverTags.map((t: any) => t.name);

  // ─── Steps ───────────────────────────────────────────────────
  const [step, setStep] = useState<'config' | 'review'>('config');

  // ─── Config form states ───────────────────────────────────────
  const [discipline, setDiscipline] = useState('');
  const [themes, setThemes] = useState<string[]>([]);
  const [themeInput, setThemeInput] = useState('');
  const [count, setCount] = useState('1');
  const [style, setStyle] = useState<'direta' | 'enade'>('direta');
  const [complexity, setComplexity] = useState<'fácil' | 'médio' | 'difícil'>('médio');
  const [isAdapted, setIsAdapted] = useState(false);
  const [includeCode, setIncludeCode] = useState(false);
  const [statementLength, setStatementLength] = useState<'curto' | 'longo'>('curto');
  const [alternativeLength, setAlternativeLength] = useState<'curtas' | 'longas'>('curtas');
  const [markingType, setMarkingType] = useState<'correta' | 'incorreta' | 'afirmativas'>('correta');
  const [type, setType] = useState<'objective' | 'subjective'>('objective');
  const [alternativesCount, setAlternativesCount] = useState('5');
  const [extraContext, setExtraContext] = useState('');

  // ─── Review states ────────────────────────────────────────────
  const [loading, setLoading] = useState(false);
  const [generatedQuestions, setGeneratedQuestions] = useState<GeneratedQuestion[]>([]);
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [editData, setEditData] = useState<GeneratedQuestion | null>(null);

  // Per-question selection (which to save) and individual tags
  const [selectedForSave, setSelectedForSave] = useState<Set<number>>(new Set());
  const [questionTags, setQuestionTags] = useState<Record<number, string[]>>({});

  // Shared metadata for save-all
  const [saveDisciplineId, setSaveDisciplineId] = useState('');
  const [saveTags, setSaveTags] = useState<string[]>([]);
  const [saveEvaluation, setSaveEvaluation] = useState<string>('none');
  const [questionEvaluations, setQuestionEvaluations] = useState<Record<number, string>>({});

  const [saving, setSaving] = useState(false);

  // ─── Auto-match discipline ────────────────────────────────────
  const autoMatchDiscipline = (typedName: string) => {
    if (!typedName.trim() || disciplines.length === 0) return '';
    const lower = typedName.toLowerCase().trim();
    // Exact match first
    const exact = disciplines.find((d: any) => d.name.toLowerCase() === lower);
    if (exact) return String(exact.id);
    // Partial / contains match
    const partial = disciplines.find((d: any) =>
      d.name.toLowerCase().includes(lower) || lower.includes(d.name.toLowerCase())
    );
    return partial ? String(partial.id) : '';
  };

  const themeInputRef = useRef<HTMLInputElement>(null);

  // ─── Theme tag helpers ────────────────────────────────────────
  const addTheme = () => {
    const t = themeInput.trim();
    if (t && !themes.includes(t)) setThemes(prev => [...prev, t]);
    setThemeInput('');
    themeInputRef.current?.focus();
  };

  const removeTheme = (t: string) => setThemes(prev => prev.filter(x => x !== t));

  // Initialize form if adapting
  useEffect(() => {
    if (open) {
      if (mode === 'adapt' && originalExam) {
        const disciplineName = originalExam.discipline?.name || '';
        setDiscipline(disciplineName);
        setThemes(originalExam.questions?.map(q => q.question.tags[0]).filter(Boolean) as string[] || []);
        setIsAdapted(true);
        setCount(String(originalExam.questions?.length || 1));
      } else if (mode === 'alternative' && originalQuestion) {
        // Encontrar o nome da disciplina a partir do ID
        const disc = disciplines.find(d => String(d.id) === String(originalQuestion.disciplineId));
        setDiscipline(disc?.name || '');
        setThemes(originalQuestion.tags || []);
        setCount('1');
        setType(originalQuestion.type);
      }
    }
  }, [open, mode, originalExam, originalQuestion]);

  // ─── Generate ─────────────────────────────────────────────────
  const handleGenerate = async () => {
    // Validation: Themes/Discipline only mandatory for fresh generation
    if (mode === 'generate') {
      if (!discipline.trim()) {
        toast.error('Por favor, informe a disciplina.');
        return;
      }
      if (themes.length === 0 && !themeInput.trim()) {
        toast.error('Adicione pelo menos um tema/conteúdo.');
        return;
      }
    }

    const finalThemes = [...themes];
    if (themeInput.trim()) finalThemes.push(themeInput.trim());

    setLoading(true);
    setGeneratedQuestions([]);

    const originalQs = initialQuestions.length > 0 
      ? initialQuestions 
      : (originalExam?.questions.map(eq => eq.question) || []);

    const payload: AIQuestionPayload = {
      mode: mode === 'generate' ? 'generate' : (mode === 'alternative' ? 'alternative' : 'adapt'),
      discipline: discipline || 'Geral',
      themes: finalThemes,
      count: mode === 'adapt' ? (originalQs.length || 1) : (parseInt(count) || 1),
      style,
      complexity,
      is_adapted: isAdapted || mode === 'adapt',
      include_code: includeCode,
      statement_length: statementLength,
      alternative_length: alternativeLength,
      marking_type: markingType,
      type,
      alternatives_count: parseInt(alternativesCount),
      extra_context: extraContext,
      original_question: originalQuestion,
      original_questions: originalQs,
    };

    try {
      const results = await generateAIQuestion(payload);
      setGeneratedQuestions(results);
      
      // Pre-select all questions label mapping
      setSelectedForSave(new Set(results.map((_: any, i: number) => i)));
      
      const initialTags: Record<number, string[]> = {};
      results.forEach((q: any, i: number) => {
        // Tag base: if we're adapting/alternative, carry over from the EXACT original question
        let baseTags: string[] = [];
        
        if (mode === 'alternative' && originalQuestion) {
          baseTags = originalQuestion.tags || [];
        } else if (mode === 'adapt' && originalQs[i]) {
          // One-to-one mapping
          baseTags = originalQs[i].tags || [];
        } else {
          baseTags = [...finalThemes];
        }

        const tags = [...baseTags];
        if (q.theme && !tags.includes(q.theme)) tags.push(q.theme);
        if (isAdapted || mode === 'adapt') {
            if (!tags.some(t => t.toLowerCase() === 'adaptada')) {
                tags.push('adaptada');
            }
        }
        initialTags[i] = Array.from(new Set(tags.map(t => t.toLowerCase())));
      });
      setQuestionTags(initialTags);
      
      // Auto-match discipline if not already set
      if (!discipline) {
        const matched = autoMatchDiscipline(discipline || (mode === 'alternative' ? originalQuestion?.disciplineName : originalExam?.discipline?.name));
        if (matched) setSaveDisciplineId(matched);
      } else {
        const matched = autoMatchDiscipline(discipline);
        if (matched) setSaveDisciplineId(matched);
      }
      
      setStep('review');
      toast.success(`${results.length} questão(ões) gerada(s) com sucesso!`);
    } catch (error: any) {
      console.error(error);
      toast.error(error.response?.data?.message || 'Erro ao gerar questões com IA.');
    } finally {
      setLoading(false);
    }
  };

  // ─── Edit helpers ─────────────────────────────────────────────
  const startEdit = (idx: number) => {
    setEditingIdx(idx);
    setEditData(JSON.parse(JSON.stringify(generatedQuestions[idx])));
    setExpandedIdx(idx);
  };

  const saveEdit = (idx: number) => {
    if (!editData) return;
    setGeneratedQuestions(prev => prev.map((q, i) => i === idx ? editData : q));
    setEditingIdx(null);
    setEditData(null);
  };

  const cancelEdit = () => {
    setEditingIdx(null);
    setEditData(null);
  };

  const updateEditAltText = (aIdx: number, text: string) => {
    if (!editData) return;
    setEditData(prev => ({
      ...prev!,
      alternatives: prev!.alternatives.map((a, i) => i === aIdx ? { ...a, text } : a),
    }));
  };
  const setEditCorrect = (aIdx: number) => {
    if (!editData) return;
    setEditData(prev => ({
      ...prev!,
      alternatives: prev!.alternatives.map((a, i) => ({ ...a, is_correct: i === aIdx })),
    }));
  };

  // ─── Apply single to form (QuestionForm mode) ─────────────────
  const handleApplySingle = (q: GeneratedQuestion) => {
    if (onQuestionGenerated) {
      onQuestionGenerated(q);
      onOpenChange(false);
      resetDialog();
    }
  };

  // ─── Bulk save (standalone mode from Index) ───────────────────
  const handleSaveAll = async () => {
    const toSave = generatedQuestions.filter((_, i) => selectedForSave.has(i));
    if (toSave.length === 0) {
      toast.error('Selecione ao menos uma questão para salvar.');
      return;
    }
    setSaving(true);
    let successCount = 0;
    const savedQuestionIds: number[] = [];

    for (let i = 0; i < generatedQuestions.length; i++) {
      if (!selectedForSave.has(i)) continue;
      const q = generatedQuestions[i];
      
      // Determine final discipline ID
      let finalDisciplineId = saveDisciplineId;
      if (mode === 'adapt' && originalExam?.discipline?.id) {
          finalDisciplineId = String(originalExam.discipline.id);
      } else if (mode === 'alternative' && originalQuestion?.disciplineId) {
          finalDisciplineId = String(originalQuestion.disciplineId);
      }

      // Merge global tags + individual tags, deduplicated
      const perQTags = questionTags[i] ?? [];
      const mergedTagNames = Array.from(new Set([...saveTags, ...perQTags]));
      
      try {
        // Determine final evaluation
        const perQEval = questionEvaluations[i];
        const finalEvaluation = (perQEval && perQEval !== 'none') 
          ? perQEval 
          : (saveEvaluation !== 'none' ? saveEvaluation : null);

        const savedQ = await postQuestion({
          title: q.title,
          type: q.type,
          score: q.score ?? 1,
          disciplines: finalDisciplineId && finalDisciplineId !== 'none' ? [Number(finalDisciplineId)] : [],
          tags: mergedTagNames,
          evaluation: finalEvaluation,
          alternatives: q.type === 'objective' ? q.alternatives : [],
        });
        savedQuestionIds.push(Number(savedQ.id));
        successCount++;
      } catch (error: any) {
        console.error('Falha ao salvar questão', q, error);
        const msg = error.response?.data?.message || 'Erro de validação';
        const details = error.response?.data?.errors ? Object.values(error.response.data.errors).flat().join(', ') : '';
        toast.error(`Falha na Questão ${i + 1}: ${msg} ${details}`);
      }
    }

    // Se estivermos adaptando uma prova, criamos a nova prova automaticamente
    if (mode === 'adapt' && originalExam && savedQuestionIds.length > 0) {
      try {
        const { postExam } = await import('@/lib/api');
        await postExam({
          title: `${originalExam.title} (Adaptada)`,
          discipline_id: originalExam.discipline?.id ? Number(originalExam.discipline.id) : null,
          turma_id: originalExam.turma?.id ? Number(originalExam.turma.id) : null,
          questions: savedQuestionIds.map(id => ({ id, score: 1 })), // Pontuação padrão 1 para todas
          tipo_prova: 'Adaptada',
          evaluation_type: originalExam.evaluationType,
          period_id: originalExam.period?.id ? Number(originalExam.period.id) : null,
        });
        toast.success('Nova prova adaptada criada com sucesso!');
        queryClient.invalidateQueries({ queryKey: ['exams'] });
      } catch (e) {
        console.error('Falha ao criar prova adaptada', e);
        toast.error('Questões salvas, mas houve erro ao criar a nova prova.');
      }
    }

    queryClient.invalidateQueries({ queryKey: ['questions'] });
    toast.success(`${successCount} questão(ões) salva(s) no banco!`);
    if (successCount < toSave.length) {
      toast.error(`${toSave.length - successCount} falharam.`);
    }

    setSaving(false);
    if (onSave) onSave();
    onOpenChange(false);
    resetDialog();
  };

  // ─── Reset ────────────────────────────────────────────────────
  const resetDialog = () => {
    setStep('config');
    setGeneratedQuestions([]);
    setExpandedIdx(null);
    setEditingIdx(null);
    setEditData(null);
    setSaveDisciplineId('');
    setSaveTags([]);
    setSaveEvaluation('none');
    setQuestionEvaluations({});
    setSelectedForSave(new Set());
    setQuestionTags({});
  };

  const isBulkMode = !!onSave && !onQuestionGenerated;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) resetDialog(); onOpenChange(v); }}>
      <DialogContent className="sm:max-w-[750px] max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center gap-2 text-primary">
            <Sparkles className="w-5 h-5" />
            {mode === 'generate' && 'Gerador de Questões com IA'}
            {mode === 'alternative' && 'Gerar Versão Alternativa'}
            {mode === 'adapt' && 'Gerar Prova Adaptada'}
          </DialogTitle>
          <DialogDescription>
            {step === 'config'
              ? (mode === 'adapt' 
                  ? 'As questões da prova original serão adaptadas para uma linguagem mais direta e acessível.'
                  : 'Configure os parâmetros e quantidade de questões a gerar.')
              : `${generatedQuestions.length} questão(ões) gerada(s). Revise, edite e salve.`}
          </DialogDescription>
        </DialogHeader>

        {/* ─── STEP: CONFIG ─────────────────────────────────────── */}
        {step === 'config' && (
          <div className="flex-1 overflow-y-auto pr-1">
            <div className="grid gap-5 py-2">

              {/* Discipline + Count (Visible only in generate mode) */}
              {mode === 'generate' && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="ai-discipline">📌 Disciplina</Label>
                    <Input
                      id="ai-discipline"
                      list="ai-discipline-list"
                      placeholder="Ex: Desenvolvimento Web..."
                      value={discipline}
                      onChange={(e) => setDiscipline(e.target.value)}
                    />
                    <datalist id="ai-discipline-list">
                      {disciplines.map((d: any) => (
                        <option key={d.id} value={d.name} />
                      ))}
                    </datalist>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="ai-count">📌 Quantidade</Label>
                    <Select value={count} onValueChange={setCount}>
                      <SelectTrigger id="ai-count">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 15, 20].map(n => (
                          <SelectItem key={n} value={String(n)}>{n} questão{n > 1 ? 'ões' : ''}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {/* Themes (Only in generate mode) */}
              {mode === 'generate' && (
                <div className="grid gap-2">
                  <Label>📌 Conteúdo / Temas</Label>
                  <div className="flex gap-2">
                    <Input
                      ref={themeInputRef}
                      list="ai-theme-list"
                      placeholder="Ex: React Hooks, Funções Arrays... (pressione Enter)"
                      value={themeInput}
                      onChange={(e) => setThemeInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTheme(); } }}
                    />
                    <datalist id="ai-theme-list">
                      {serverTags.map((t: any) => (
                        <option key={t.id || t.name} value={t.name} />
                      ))}
                    </datalist>
                    <Button type="button" variant="outline" size="icon" onClick={addTheme}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  {themes.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {themes.map(t => (
                        <Badge key={t} variant="secondary" className="gap-1 pl-2">
                          {t}
                          <button type="button" onClick={() => removeTheme(t)} className="ml-0.5 hover:text-destructive">
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground italic">
                    Adicione vários temas — a IA distribuirá as questões entre eles.
                  </p>
                </div>
              )}

              {/* Type / Style / Complexity (Only visibility based on mode) */}
              {mode !== 'adapt' && (
                <div className={`grid ${mode === 'alternative' ? 'grid-cols-2' : 'grid-cols-3'} gap-4`}>
                  <div className="grid gap-2">
                    <Label>📌 Tipo de Questão</Label>
                    <Select value={type} onValueChange={(v: any) => setType(v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="objective">Objetiva</SelectItem>
                        <SelectItem value="subjective">Subjetiva</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label>📌 Estilo</Label>
                    <Select value={style} onValueChange={(v: any) => setStyle(v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="direta">Direta</SelectItem>
                        <SelectItem value="enade">Estilo ENADE</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {mode === 'generate' && (
                    <div className="grid gap-2">
                      <Label>📌 Dificuldade</Label>
                      <Select value={complexity} onValueChange={(v: any) => setComplexity(v)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="fácil">Fácil</SelectItem>
                          <SelectItem value="médio">Médio</SelectItem>
                          <SelectItem value="difícil">Difícil</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              )}

              {/* Objective options */}
              {type === 'objective' && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Qtd. Alternativas</Label>
                    <Select value={alternativesCount} onValueChange={setAlternativesCount}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="3">3 Alternativas</SelectItem>
                        <SelectItem value="4">4 Alternativas</SelectItem>
                        <SelectItem value="5">5 Alternativas</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label>Tipo de Marcação</Label>
                    <Select value={markingType} onValueChange={(v: any) => setMarkingType(v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="correta">Marcar Correta</SelectItem>
                        <SelectItem value="incorreta">Marcar Incorreta</SelectItem>
                        <SelectItem value="afirmativas">Afirmativas (I, II, III...)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {/* Length options */}
              <div className="grid grid-cols-2 gap-4 border-t pt-4">
                <div className="grid gap-2">
                  <Label>Tamanho do Enunciado</Label>
                  <Select value={statementLength} onValueChange={(v: any) => setStatementLength(v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="curto">Curto (Acessível)</SelectItem>
                      <SelectItem value="longo">Longo (Contextualizado)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {type === 'objective' && (
                  <div className="grid gap-2">
                    <Label>Tamanho das Alternativas</Label>
                    <Select value={alternativeLength} onValueChange={(v: any) => setAlternativeLength(v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="curtas">Curtas</SelectItem>
                        <SelectItem value="longas">Longas</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              {/* Toggles */}
              <div className={`grid ${mode === 'generate' ? 'grid-cols-2' : 'grid-cols-1'} gap-6 border-t pt-4`}>
                <div className="flex items-center justify-between space-x-2">
                  <Label htmlFor="ai-include-code" className="flex flex-col gap-1 cursor-pointer">
                    <span>📌 Incluir trecho de código</span>
                    <span className="font-normal text-xs text-muted-foreground italic text-wrap">Se houver código na base, ele será mantido e formatado.</span>
                  </Label>
                  <Switch id="ai-include-code" checked={includeCode} onCheckedChange={setIncludeCode} />
                </div>
                {mode === 'generate' && (
                  <div className="flex items-center justify-between space-x-2">
                    <Label htmlFor="ai-adapted" className="flex flex-col gap-1 cursor-pointer">
                      <span>📌 Questão Adaptada</span>
                      <span className="font-normal text-xs text-muted-foreground italic">Simples e sem pegadinhas</span>
                    </Label>
                    <Switch id="ai-adapted" checked={isAdapted} onCheckedChange={setIsAdapted} />
                  </div>
                )}
              </div>

              {/* Extra context */}
              <div className="grid gap-2">
                <Label htmlFor="ai-extra">📌 Informações Adicionais (Opcional)</Label>
                <Textarea
                  id="ai-extra"
                  placeholder="Ex: Foque no autor X, use tal terminologia..."
                  value={extraContext}
                  onChange={(e) => setExtraContext(e.target.value)}
                  rows={2}
                />
              </div>
            </div>
          </div>
        )}

        {/* ─── STEP: REVIEW ─────────────────────────────────────── */}
        {step === 'review' && (
          <div className="flex-1 overflow-y-auto flex flex-col gap-4 pr-1 py-2">

            {/* Save-all metadata (only in bulk/standalone mode) */}
            {isBulkMode && (
              <div className="space-y-3 rounded-lg border border-border p-3 shrink-0">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Aplicar a todas as questões</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-sm">Disciplina</Label>
                    <Select value={saveDisciplineId} onValueChange={setSaveDisciplineId} disabled={saving}>
                      <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Nenhuma</SelectItem>
                        {disciplines.map((d: any) => (
                          <SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-sm">Tags</Label>
                    <TagInput tags={saveTags} onChange={setSaveTags} suggestions={allTagNames} placeholder="Adicionar tag..." />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-sm">Avaliação</Label>
                    <Select value={saveEvaluation} onValueChange={setSaveEvaluation} disabled={saving}>
                      <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Nenhuma</SelectItem>
                        <SelectItem value="1">1ª Avaliação</SelectItem>
                        <SelectItem value="2">2ª Avaliação</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}

            {/* Select-all bar + question list */}
            <div className="space-y-2 flex-1">
              {/* Select-all toolbar */}
              <div className="flex items-center justify-between text-xs text-muted-foreground pb-1">
                <span className="font-medium">
                  {selectedForSave.size} de {generatedQuestions.length} selecionada(s) para salvar
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="text-primary hover:underline font-medium"
                    onClick={() => setSelectedForSave(new Set(generatedQuestions.map((_, i) => i)))}
                    disabled={saving}
                  >
                    Selecionar todas
                  </button>
                  <span>·</span>
                  <button
                    type="button"
                    className="hover:underline"
                    onClick={() => setSelectedForSave(new Set())}
                    disabled={saving}
                  >
                    Desmarcar todas
                  </button>
                </div>
              </div>
              {generatedQuestions.map((q, qIdx) => {
                const isExpanded = expandedIdx === qIdx;
                const isEditing = editingIdx === qIdx;
                const currentQ = isEditing ? editData! : q;

                return (
                  <div
                    key={qIdx}
                    className={`rounded-lg border overflow-hidden transition-opacity ${
                      isBulkMode && !selectedForSave.has(qIdx)
                        ? 'border-border/50 opacity-50'
                        : 'border-border'
                    }`}
                  >
                    {/* Header row */}
                    <div className="flex items-center gap-2 p-3">
                      {/* Selection checkbox (bulk mode only) */}
                      {isBulkMode && (
                        <button
                          type="button"
                          disabled={saving}
                          onClick={() => {
                            setSelectedForSave(prev => {
                              const next = new Set(prev);
                              if (next.has(qIdx)) next.delete(qIdx);
                              else next.add(qIdx);
                              return next;
                            });
                          }}
                          className={`flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                            selectedForSave.has(qIdx)
                              ? 'bg-primary border-primary text-white'
                              : 'border-border hover:border-primary'
                          }`}
                          title={selectedForSave.has(qIdx) ? 'Remover da seleção' : 'Incluir na seleção'}
                        >
                          {selectedForSave.has(qIdx) && <Check className="h-3 w-3" />}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setExpandedIdx(isExpanded ? null : qIdx)}
                        className="flex items-center gap-2 flex-1 text-left hover:opacity-80 transition-opacity min-w-0"
                        disabled={saving}
                      >
                        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">
                          {qIdx + 1}
                        </span>
                        <span className="text-sm truncate font-medium">
                          {q.type === 'subjective' && <span className="text-amber-600 mr-2">[Subjetiva]</span>}
                          <span>{(q.title || '').replace(/<[^>]*>/g, '').substring(0, 90) + ((q.title || '').length > 90 ? '...' : '')}</span>
                        </span>
                        {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground flex-shrink-0" /> : <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />}
                      </button>

                      {/* Action buttons */}
                      <div className="flex gap-1 shrink-0">
                        {!isBulkMode && (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="gap-1 text-xs h-7 border-primary/30 hover:border-primary text-primary"
                            onClick={() => handleApplySingle(q)}
                            disabled={saving}
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Aplicar
                          </Button>
                        )}
                        {!isEditing ? (
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7"
                            onClick={() => startEdit(qIdx)}
                            disabled={saving}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                        ) : (
                          <>
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 text-green-600 hover:text-green-700"
                              onClick={() => saveEdit(qIdx)}
                            >
                              <Save className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 text-muted-foreground"
                              onClick={cancelEdit}
                            >
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Expanded content */}
                    {isExpanded && (
                      <div className="border-t border-border p-3 space-y-3 bg-muted/30">
                        {/* Statement */}
                        {isEditing ? (
                          <div className="space-y-1">
                            <Label className="text-xs font-medium">Enunciado:</Label>
                            <Textarea
                              value={editData!.title}
                              onChange={(e) => setEditData(prev => ({ ...prev!, title: e.target.value }))}
                              rows={3}
                              className="text-sm font-mono"
                            />
                          </div>
                        ) : (
                          <div
                            className="text-sm prose prose-sm dark:prose-invert max-w-none"
                            dangerouslySetInnerHTML={{ __html: currentQ.title || '<i>(Sem enunciado gerado)</i>' }}
                          />
                        )}

                        {/* Alternatives */}
                        {currentQ.type === 'objective' && currentQ.alternatives?.length > 0 && (
                          <div className="space-y-1">
                            <p className="text-xs text-muted-foreground font-medium">Alternativas:</p>
                            {currentQ.alternatives.map((alt, aIdx) => (
                              <div
                                key={aIdx}
                                className={`flex items-center gap-2 p-2 rounded text-sm border ${alt.is_correct ? 'bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700' : 'border-border bg-background'}`}
                              >
                                {isEditing ? (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => setEditCorrect(aIdx)}
                                      className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                                        editData!.alternatives[aIdx]?.is_correct
                                          ? 'bg-primary border-primary text-white'
                                          : 'border-border hover:border-primary'
                                      }`}
                                    >
                                      {editData!.alternatives[aIdx]?.is_correct
                                        ? <Check className="h-3 w-3" />
                                        : <span className="text-[10px] font-medium">{String.fromCharCode(65 + aIdx)}</span>
                                      }
                                    </button>
                                    <Input
                                      value={editData!.alternatives[aIdx]?.text ?? ''}
                                      onChange={(e) => updateEditAltText(aIdx, e.target.value)}
                                      className="flex-1 h-7 text-sm"
                                    />
                                  </>
                                ) : (
                                  <>
                                    <span className="font-bold text-xs w-5 flex-shrink-0">{String.fromCharCode(65 + aIdx)})</span>
                                    <span className="flex-1">{alt.text}</span>
                                    {alt.is_correct && (
                                      <span className="text-[10px] font-bold text-green-600 uppercase">Correta</span>
                                    )}
                                  </>
                                )}
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Gabarito / Description */}
                        <div className="pt-2 border-t border-dashed">
                          {isEditing ? (
                            <div className="space-y-1">
                              <Label className="text-xs font-medium">Gabarito/Justificativa:</Label>
                              <Textarea
                                value={editData!.description}
                                onChange={(e) => setEditData(prev => ({ ...prev!, description: e.target.value }))}
                                rows={2}
                                className="text-sm"
                              />
                            </div>
                          ) : (
                            <>
                              <p className="text-xs font-bold text-muted-foreground uppercase">Gabarito/Justificativa:</p>
                              <p className="text-sm italic mt-1">{currentQ.description || 'Não informada.'}</p>
                            </>
                          )}
                        </div>

                        {/* Individual tags and evaluation (only in bulk mode) */}
                        {isBulkMode && (
                          <div className="pt-2 border-t border-dashed grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                              <p className="text-xs font-bold text-muted-foreground uppercase">Avaliação desta questão</p>
                              <Select 
                                value={questionEvaluations[qIdx] || 'none'} 
                                onValueChange={(val) => setQuestionEvaluations(prev => ({ ...prev, [qIdx]: val }))}
                                disabled={saving}
                              >
                                <SelectTrigger className="h-8 text-xs">
                                  <SelectValue placeholder="Padrão (global)" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="none">Padrão (global)</SelectItem>
                                  <SelectItem value="1">1ª Avaliação</SelectItem>
                                  <SelectItem value="2">2ª Avaliação</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-1">
                              <p className="text-xs font-bold text-muted-foreground uppercase">Tags desta questão</p>
                              <TagInput
                                tags={questionTags[qIdx] ?? []}
                                onChange={(tags) => setQuestionTags(prev => ({ ...prev, [qIdx]: tags }))}
                                suggestions={allTagNames}
                                placeholder="Tags específicas..."
                              />
                            </div>
                            {saveTags.length > 0 && (
                              <p className="text-[10px] text-muted-foreground italic col-span-2">
                                As tags globais ({saveTags.join(', ')}) também serão aplicadas.
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ─── FOOTER ───────────────────────────────────────────── */}
        <div className="flex items-center justify-between gap-2 pt-3 border-t shrink-0">
          {step === 'config' ? (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>Cancelar</Button>
              <Button onClick={handleGenerate} disabled={loading} className="gap-2">
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Gerando com Gemini...
                  </>
                ) : (
                  <>
                    <Wand2 className="w-4 h-4" />
                    Gerar {count === '1' ? 'Questão' : `${count} Questões`}
                  </>
                )}
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={() => { setStep('config'); setGeneratedQuestions([]); }}
                disabled={saving}
                className="gap-1.5"
              >
                <ArrowLeft className="h-4 w-4" />
                Nova Geração
              </Button>
              {isBulkMode && (
                <Button onClick={handleSaveAll} disabled={saving || selectedForSave.size === 0} className="gap-2">
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      Salvar {selectedForSave.size} Questão(ões)
                    </>
                  )}
                </Button>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
