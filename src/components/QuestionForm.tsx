import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Question, Alternative, QuestionType } from '@/types/question';
import { fetchTags, fetchDisciplines, postQuestion, putQuestion, PostQuestionPayload } from '@/lib/api';

import { TagInput } from './TagInput';
import { SmartPasteDialog } from './SmartPasteDialog';
import { AIGeneratorDialog } from './AIGeneratorDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Plus, Trash2, Check, ClipboardPaste, Loader2, Sparkles, BrainCircuit, BarChart3, GraduationCap } from 'lucide-react';
import { toast } from 'sonner';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

interface QuestionFormProps {
  question?: Question;
  onSave: () => void;
  onCancel?: () => void;
}

function createEmptyAlternative(): Alternative {
  return { id: crypto.randomUUID(), text: '', isCorrect: false };
}

const escapeHtml = (unsafe: string) => {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
};

export function QuestionForm({ question, onSave, onCancel }: QuestionFormProps) {
  const queryClient = useQueryClient();

  // Queries for selectors
  const { data: serverTags = [] } = useQuery({ queryKey: ['tags'], queryFn: fetchTags });
  const { data: disciplines = [] } = useQuery({ queryKey: ['disciplines'], queryFn: fetchDisciplines });
  
  const allTagNames = serverTags.map(t => t.name);

  const [text, setText] = useState(question?.text ?? '');
  const [type, setType] = useState<QuestionType>(question?.type ?? 'objetiva');
  const [alternatives, setAlternatives] = useState<Alternative[]>(
    question?.alternatives && question.alternatives.length > 0 
      ? question.alternatives 
      : [createEmptyAlternative(), createEmptyAlternative(), createEmptyAlternative(), createEmptyAlternative()]
  );
  const [tags, setTags] = useState<string[]>(question?.tags ?? []);
  const [disciplineId, setDisciplineId] = useState<string>(question?.disciplineId ?? '');
  const [evaluation, setEvaluation] = useState<string>(question?.evaluation ?? 'none');
  const [difficulty, setDifficulty] = useState<string>(question?.difficulty ?? 'Médio');
  const [isAdapted, setIsAdapted] = useState<boolean>(question?.isAdapted ?? false);
  const [showPaste, setShowPaste] = useState(false);
  const [showAIGenerator, setShowAIGenerator] = useState(false);
  
  // Sincronizar estado quando a questão mudar (necessário para edição)
  useEffect(() => {
    if (open) {
      setText(question?.text ?? '');
      setType(question?.type ?? 'objetiva');
      setAlternatives(
        question?.alternatives && question.alternatives.length > 0 
          ? [...question.alternatives] 
          : [createEmptyAlternative(), createEmptyAlternative(), createEmptyAlternative(), createEmptyAlternative()]
      );
      setTags(question?.tags ?? []);
      setDisciplineId(question?.disciplineId ?? 'none');
      setEvaluation(question?.evaluation ?? 'none');
      setDifficulty(question?.difficulty ?? 'Médio');
      setIsAdapted(question?.isAdapted ?? false);
    }
  }, [question, open]);

  const createQuestionMutation = useMutation({
    mutationFn: postQuestion,
    onSuccess: () => {
      toast.success('Questão cadastrada com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['questions'] });
      onSave(); // Closes modal
    },
    onError: () => {
      toast.error('Erro ao salvar a questão na API.');
    }
  });

  const updateQuestionMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: PostQuestionPayload }) => putQuestion(id, payload),
    onSuccess: () => {
      toast.success('Questão atualizada com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['questions'] });
      onSave(); // Closes modal
    },
    onError: () => {
      toast.error('Erro ao atualizar a questão na API.');
    }
  });

  const isPending = createQuestionMutation.isPending || updateQuestionMutation.isPending;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    
    // Valiations
    if (type === 'objetiva') {
      if (alternatives.some(a => !a.text.trim())) {
         toast.error('Preencha todas as alternativas.');
         return;
      }
      if (!alternatives.some(a => a.isCorrect)) {
         toast.error('Marque pelo menos uma alternativa como correta.');
         return;
      }
    }

    // Remapear para o formato do Laravel (PostQuestionPayload)
    // Usando as orientações contidas no Walkthrough
    const payload: PostQuestionPayload = {
      title: text.trim(),
      type: type === 'objetiva' ? 'objective' : 'subjective',
      disciplines: disciplineId && disciplineId !== 'none' ? [Number(disciplineId)] : [],
      tags: tags,
      evaluation: evaluation !== 'none' ? evaluation : null,
      difficulty: difficulty,
      is_adapted: isAdapted,
      alternatives: type === 'objetiva' ? alternatives.map(a => ({
        text: a.text,
        is_correct: a.isCorrect
      })) : [],
    };

    console.log('Enviando payload da questão:', payload);

    if (question?.id) {
      updateQuestionMutation.mutate({ id: String(question.id), payload });
    } else {
      createQuestionMutation.mutate(payload);
    }
  };

  const formatCodeBlocks = (text: string) => {
    if (text.includes('<pre>') || text.includes('<code>')) return text;

    const lines = text.split('\n');
    if (lines.length > 1 && (text.includes('{') || text.includes('</') || text.includes('=>') || text.includes(';'))) {
      return `<pre><code>${text}</code></pre>`;
    }
    return text.replace(/\n/g, '<br>');
  };

  const handlePasted = (statement: string, alts: Alternative[]) => {
    setText(formatCodeBlocks(statement));
    setAlternatives(alts.map(a => ({ ...a, text: formatCodeBlocks(a.text) })));
    setType(alts.length > 0 ? 'objetiva' : 'subjetiva');
  };

  const handleAIGenerated = (data: any) => {
    setText(data.title || '');
    
    const newType = data.type === 'objective' ? 'objetiva' : 'subjetiva';
    setType(newType);

    if (newType === 'objetiva' && data.alternatives) {
      setAlternatives(data.alternatives.map((alt: any) => ({
        id: crypto.randomUUID(),
        text: alt.text,
        isCorrect: alt.is_correct
      })));
    }
  };

  const setCorrectAlternative = (id: string) => {
    setAlternatives(alts => alts.map(a => ({ ...a, isCorrect: a.id === id })));
  };

  const updateAlternativeText = (id: string, newText: string) => {
    setAlternatives(alts => alts.map(a => a.id === id ? { ...a, text: newText } : a));
  };

  const addAlternative = () => {
    setAlternatives([...alternatives, createEmptyAlternative()]);
  };

  const removeAlternative = (id: string) => {
    if (alternatives.length <= 2) return;
    setAlternatives(alternatives.filter(a => a.id !== id));
  };

  return (
    <>
      <Card className="border-border">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="font-serif text-xl">
              {question ? 'Editar Questão' : 'Nova Questão'}
            </CardTitle>
            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm" className="gap-1.5 border-primary/30 hover:border-primary text-primary" onClick={() => setShowAIGenerator(true)}>
                <Sparkles className="h-4 w-4" /> Gerar com IA
              </Button>
              <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={() => setShowPaste(true)}>
                <ClipboardPaste className="h-4 w-4" /> Colar Questão
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="space-y-2 flex-1">
                <Label className="font-medium">Tipo da questão</Label>
                <RadioGroup
                  value={type}
                  onValueChange={(v) => setType(v as QuestionType)}
                  className="flex gap-4"
                >
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="objetiva" id="objetiva" />
                    <Label htmlFor="objetiva" className="cursor-pointer">Objetiva</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="subjetiva" id="subjetiva" />
                    <Label htmlFor="subjetiva" className="cursor-pointer">Subjetiva</Label>
                  </div>
                </RadioGroup>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="font-medium flex items-center gap-2">
                  <GraduationCap className="w-4 h-4 text-primary" />
                  Disciplina
                </Label>
                <Select value={disciplineId} onValueChange={setDisciplineId}>
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
                <Label className="font-medium flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-primary" />
                  Avaliação
                </Label>
                <Select value={evaluation} onValueChange={setEvaluation}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a avaliação..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Não definida</SelectItem>
                    <SelectItem value="1">1ª Avaliação</SelectItem>
                    <SelectItem value="2">2ª Avaliação</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="font-medium flex items-center gap-2">
                  <BrainCircuit className="w-4 h-4 text-primary" />
                  Dificuldade
                </Label>
                <Select value={difficulty} onValueChange={setDifficulty}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Fácil">Fácil</SelectItem>
                    <SelectItem value="Médio">Médio</SelectItem>
                    <SelectItem value="Difícil">Difícil</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between p-3 border rounded-lg bg-accent/20 h-[70px] mt-2 sm:mt-0">
                <div className="space-y-0.5">
                  <Label className="text-sm font-bold">Questão Adaptada</Label>
                  <p className="text-[10px] text-muted-foreground">Marque se esta questão foi modificada</p>
                </div>
                <Switch 
                  checked={isAdapted} 
                  onCheckedChange={setIsAdapted} 
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="text" className="font-medium">Enunciado da Questão</Label>
                <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-tight bg-accent px-1.5 py-0.5 rounded">Editor Ativo</div>
              </div>
              <div className="bg-background rounded-md border border-input min-h-[140px]">
                <ReactQuill 
                  theme="snow"
                  value={text}
                  onChange={setText}
                  placeholder="Digite o enunciado da questão aqui..."
                  modules={{
                    toolbar: [
                      ['bold', 'italic', 'underline', 'code'],
                      ['code-block'],
                      [{ 'color': [] }],
                      ['clean']
                    ],
                  }}
                  className="quill-editor"
                />
              </div>
            </div>

            {type === 'objetiva' && (
              <div className="space-y-3">
                <Label className="font-medium">Alternativas</Label>
                <p className="text-sm text-muted-foreground">Clique no círculo para marcar a alternativa correta</p>
                {alternatives.map((alt, i) => (
                  <div key={alt.id} className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setCorrectAlternative(alt.id)}
                      className={`flex-shrink-0 w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all ${
                        alt.isCorrect
                          ? 'bg-success border-success text-success-foreground'
                          : 'border-border hover:border-primary'
                      }`}
                    >
                      {alt.isCorrect ? <Check className="h-4 w-4" /> : (
                        <span className="text-xs font-medium text-muted-foreground">{String.fromCharCode(65 + i)}</span>
                      )}
                    </button>
                    <Input
                      value={alt.text}
                      onChange={e => updateAlternativeText(alt.id, e.target.value)}
                      placeholder={`Alternativa ${String.fromCharCode(65 + i)}`}
                      className="flex-1"
                      required
                    />
                    {alternatives.length > 2 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeAlternative(alt.id)}
                        className="text-muted-foreground hover:text-destructive flex-shrink-0"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button type="button" variant="outline" size="sm" onClick={addAlternative} className="gap-1">
                  <Plus className="h-4 w-4" /> Adicionar alternativa
                </Button>
              </div>
            )}

            <div className="space-y-2">
              <Label className="font-medium">Tags</Label>
              <TagInput tags={tags} onChange={setTags} suggestions={allTagNames} placeholder="Ex: matemática, álgebra, prova1..." />
            </div>

            <div className="flex gap-2 pt-2">
              <Button type="submit" className="font-medium gap-2" disabled={isPending}>
                {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                {question ? 'Salvar Alterações' : 'Cadastrar Questão'}
              </Button>
              {onCancel && (
                <Button type="button" variant="outline" onClick={onCancel} disabled={isPending}>Cancelar</Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      <SmartPasteDialog open={showPaste} onOpenChange={setShowPaste} onParsed={handlePasted} />
      <AIGeneratorDialog 
        open={showAIGenerator} 
        onOpenChange={setShowAIGenerator} 
        onQuestionGenerated={handleAIGenerated} 
        disciplines={disciplines}
        tags={serverTags}
      />
    </>
  );
}
