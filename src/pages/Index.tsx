import { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Question, Exam, Discipline, Turma, PeriodTurmaDiscipline } from '@/types/question';
import { 
  fetchQuestions, 
  fetchDisciplines, 
  fetchTags, 
  fetchExams, 
  fetchTurmas,
  postExam, 
  fetchExamKey,
  deleteQuestion,
  postBulkDeleteQuestions,
  putQuestion,
  deleteExam,
  putExam,
  fetchExam,
  duplicateExam,
  fetchPeriodTurmaDisciplines,
} from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

import { QuestionForm } from '@/components/QuestionForm';
import { QuestionCard } from '@/components/QuestionCard';
import { BatchPasteDialog } from '@/components/BatchPasteDialog';
import { AIGeneratorDialog } from '@/components/AIGeneratorDialog';
import { ExamPreview } from '@/components/ExamPreview';
import { AnswerKeyView } from '@/components/AnswerKeyView';
import { PrintableExam } from '@/components/PrintableExam';
import { TagInput } from '@/components/TagInput';
import { DisciplineManager } from '@/components/DisciplineManager';
import { TagManager } from '@/components/TagManager';
import { TurmaManager } from '@/components/TurmaManager';
import { PeriodManager } from '@/components/PeriodManager';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Plus, Search, FileText, BookOpen, Shuffle, Trash2, ClipboardList,
  GraduationCap, Tags, ClipboardPaste, Loader2, Sparkles, Calendar,
  LogOut, Copy, ChevronDown, User as UserIcon, Check, Settings, X, Pencil, Edit,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';

export default function Index() {
  const queryClient = useQueryClient();
  const { user, logout } = useAuth();

  // Active period from user context
  const activePeriod = user?.active_period ?? null;

  // 1. Data Fetching Centralizado
  const { data: questions = [], isLoading: loadingQuestions } = useQuery({ queryKey: ['questions'], queryFn: fetchQuestions });
  const { data: exams = [], isLoading: loadingExams } = useQuery({ queryKey: ['exams'], queryFn: fetchExams });
  const { data: disciplines = [] } = useQuery({ queryKey: ['disciplines'], queryFn: fetchDisciplines });
  const { data: serverTags = [] } = useQuery({ queryKey: ['tags'], queryFn: fetchTags });
  const { data: turmas = [] } = useQuery<Turma[]>({ queryKey: ['turmas'], queryFn: fetchTurmas });

  // Turmas+Disciplinas do período ativo
  const { data: periodTurmaDisciplines = [] } = useQuery<PeriodTurmaDiscipline[]>({
    queryKey: ['period-td', activePeriod?.id],
    queryFn: () => fetchPeriodTurmaDisciplines(activePeriod!.id),
    enabled: !!activePeriod,
  });

  const allTags = useMemo(() => serverTags.map(t => t.name), [serverTags]);

  const [showForm, setShowForm] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | undefined>();
  const [search, setSearch] = useState('');
  const [filterTags, setFilterTags] = useState<string[]>([]);
  const [filterDisciplineId, setFilterDisciplineId] = useState<string>('');
  const [showDisciplineManager, setShowDisciplineManager] = useState(false);
  const [showTagManager, setShowTagManager] = useState(false);
  const [showTurmaManager, setShowTurmaManager] = useState(false);
  const [showPeriodManager, setShowPeriodManager] = useState(false);
  const [showBatchPaste, setShowBatchPaste] = useState(false);
  const [showAIGenerator, setShowAIGenerator] = useState(false);
  
  const [examFilterTurmaId, setExamFilterTurmaId] = useState<string>('all');
  const [examFilterDisciplineId, setExamFilterDisciplineId] = useState<string>('all');
  
  // Novos filtros de questões
  const [filterEvaluation, setFilterEvaluation] = useState<string>('all');
  const [filterDifficulty, setFilterDifficulty] = useState<string>('all');
  const [filterIsAdapted, setFilterIsAdapted] = useState<string>('all');


  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [questionScores, setQuestionScores] = useState<Record<string, number>>({});
  const [activeTab, setActiveTab] = useState('banco');
  const [examTitle, setExamTitle] = useState('');
  const [selectedTurmaId, setSelectedTurmaId] = useState<string>('');
  const [fontSize, setFontSize] = useState(Number(localStorage.getItem('font_size')) || 12);

  // Modo de seleção turma/disc: 'period' = pré-selecionado pelo período, 'free' = livre
  const [tdMode, setTdMode] = useState<'period' | 'free'>('period');
  const [selectedPeriodTdId, setSelectedPeriodTdId] = useState<string>('');

  useEffect(() => {
    localStorage.setItem('font_size', fontSize.toString());
  }, [fontSize]);

  // Quando muda o item de período selecionado, atualiza disciplina e turma automaticamente
  useEffect(() => {
    if (tdMode === 'period' && selectedPeriodTdId) {
      const item = periodTurmaDisciplines.find(td => td.id === selectedPeriodTdId);
      if (item) {
        setFilterDisciplineId(item.discipline?.id || '');
        setSelectedTurmaId(item.turma?.id || '');
      }
    }
  }, [selectedPeriodTdId, periodTurmaDisciplines, tdMode]);

  // Computeds
  const filteredQuestions = useMemo(() => {
    return questions.filter(q => {
      const matchesSearch = !search || q.text.toLowerCase().includes(search.toLowerCase());
      const matchesTags = filterTags.length === 0 || filterTags.every(t => q.tags.includes(t));
      const matchesDiscipline = !filterDisciplineId || q.disciplineId === filterDisciplineId;
      
      const matchesEvaluation = filterEvaluation === 'all' || q.evaluation === filterEvaluation;
      const matchesDifficulty = filterDifficulty === 'all' || q.difficulty === filterDifficulty;
      const matchesAdapted = filterIsAdapted === 'all' || 
        (filterIsAdapted === 'adapted' && q.isAdapted) || 
        (filterIsAdapted === 'not-adapted' && !q.isAdapted);

      return matchesSearch && matchesTags && matchesDiscipline && matchesEvaluation && matchesDifficulty && matchesAdapted;
    });
  }, [questions, search, filterTags, filterDisciplineId, filterEvaluation, filterDifficulty, filterIsAdapted]);
  
  // Histórico de provas filtrado e agrupado por período
  const groupedExams = useMemo(() => {
    // 1. Filtrar
    const filtered = exams.filter(exam => {
      const matchesTurma = examFilterTurmaId === 'all' || (exam.turma?.id && String(exam.turma.id) === examFilterTurmaId);
      const matchesDiscipline = examFilterDisciplineId === 'all' || (exam.discipline?.id && String(exam.discipline.id) === examFilterDisciplineId);
      return matchesTurma && matchesDiscipline;
    });
    
    // 2. Agrupar
    const groups: Record<string, Exam[]> = {};
    filtered.forEach(exam => {
      const periodLabel = exam.period?.label || 'Sem Período';
      if (!groups[periodLabel]) groups[periodLabel] = [];
      groups[periodLabel].push(exam);
    });
    
    return groups;
  }, [exams, examFilterTurmaId, examFilterDisciplineId]);


  // Exam generation state
  const [generatedExam, setGeneratedExam] = useState<Exam | null>(null);
  const [viewingExam, setViewingExam] = useState<Exam | null>(null);
  const [editingExamId, setEditingExamId] = useState<string | null>(null);
  const [useStandardTitle, setUseStandardTitle] = useState(true);
  const [examEvaluation, setExamEvaluation] = useState('1ª Avaliação');
  const [examType, setExamType] = useState('A');

  const [showMetadataDialog, setShowMetadataDialog] = useState(false);
  const [examMetadata, setExamMetadata] = useState<{
    id: string;
    title: string;
    turma_id: string;
    discipline_id: string;
    tipo_prova: string;
    evaluation_type: string;
  } | null>(null);

  const [aiMode, setAiMode] = useState<'generate' | 'alternative' | 'adapt'>('generate');
  const [selectedExamForAdapt, setSelectedExamForAdapt] = useState<Exam | null>(null);
  const [selectedQuestionForAI, setSelectedQuestionForAI] = useState<any>(null);
  const [loadingFullExamId, setLoadingFullExamId] = useState<string | null>(null);
  const [loadingEditExamId, setLoadingEditExamId] = useState<string | null>(null);

  // Bulk delete
  const bulkDeleteMutation = useMutation<void, Error, string[]>({
    mutationFn: postBulkDeleteQuestions,
    onSuccess: () => {
      toast.success('Questões excluídas com sucesso!');
      setSelectedIds(new Set());
      queryClient.invalidateQueries({ queryKey: ['questions'] });
    },
    onError: () => {
      toast.error('Erro ao excluir questões em lote.');
    }
  });

  const handleBulkDelete = () => {
     if (selectedIds.size === 0) return;
     if (window.confirm(`Deseja realmente excluir as ${selectedIds.size} questões selecionadas? Esta ação não pode ser desfeita.`)) {
       bulkDeleteMutation.mutate(Array.from(selectedIds));
     }
  };

  const resetForm = () => {
    setEditingExamId(null);
    setSelectedIds(new Set());
    setQuestionScores({});
    setExamTitle('');
    setExamType('A');
    setExamEvaluation('1ª Avaliação');
    setUseStandardTitle(true);
    setTdMode('period');
  };

  const handleCancelEdit = () => {
    resetForm();
    // Volta para a aba de provas ou banco? Geralmente banco.
    setActiveTab('banco');
  };

  // Mutations
  const createExamMutation = useMutation({
    mutationFn: postExam,
    onSuccess: (newExam) => {
      setGeneratedExam(newExam);
      resetForm();
      queryClient.invalidateQueries({ queryKey: ['exams'] });
      toast.success('Prova gerada com sucesso!');
    },
    onError: () => {
      toast.error('Erro ao gerar a prova.');
    }
  });

  const updateExamMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string, payload: any }) => putExam(id, payload),
    onSuccess: (updatedExam: Exam) => {
      setGeneratedExam(updatedExam);
      resetForm();
      queryClient.invalidateQueries({ queryKey: ['exams'] });
      toast.success('Prova atualizada com sucesso!');
    },
    onError: () => {
      toast.error('Erro ao atualizar a prova.');
    }
  });

  const getKeysMutation = useMutation({
    mutationFn: fetchExamKey,
    onSuccess: (examWithKeys) => {
      setViewingExam(examWithKeys);
    },
    onError: () => {
      toast.error('Erro ao buscar o gabarito.');
    }
  });
  
  const deleteQuestionMutation = useMutation({
    mutationFn: deleteQuestion,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['questions'] });
      toast.success('Questão excluída com sucesso!');
    },
    onError: () => {
      toast.error('Erro ao excluir a questão.');
    }
  });

  const deleteExamMutation = useMutation({
    mutationFn: deleteExam,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exams'] });
      toast.success('Prova excluída com sucesso!');
    },
    onError: () => {
      toast.error('Erro ao excluir a prova.');
    }
  });

  const duplicateExamMutation = useMutation({
    mutationFn: duplicateExam,
    onSuccess: (newExam) => {
      queryClient.invalidateQueries({ queryKey: ['exams'] });
      toast.success(`Prova duplicada para o período ${activePeriod?.label ?? 'atual'}!`);
    },
    onError: () => {
      toast.error('Erro ao duplicar a prova.');
    }
  });

  // Handlers
  const handleSaveQuestion = () => {
    setShowForm(false);
    setEditingQuestion(undefined);
  };

  const handleBatchSave = () => {
    setShowBatchPaste(false);
  };

  const handleDeleteQuestion = (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir esta questão?')) {
      deleteQuestionMutation.mutate(id);
    }
  };

  const handleEdit = (q: Question) => {
    setEditingQuestion(q);
    setShowForm(true);
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        const nextScores = { ...questionScores };
        delete nextScores[id];
        setQuestionScores(nextScores);
      } else {
        next.add(id);
        setQuestionScores(prevScores => ({ ...prevScores, [id]: 0 }));
      }
      return next;
    });
  };

  const handleGenerateExam = () => {
    if (selectedIds.size === 0) {
      toast.error('Selecione pelo menos uma questão!');
      return;
    }
    if (!filterDisciplineId) {
      toast.error('Por favor, selecione uma disciplina antes de gerar a prova.');
      return;
    }
    
    let finalTitle = examTitle.trim();
    if (useStandardTitle) {
      const disciplineName = getDisciplineName(filterDisciplineId) || 'Prova';
      const typePart = examType.trim() ? ` - ${examType.trim()}` : '';
      finalTitle = `${disciplineName} - ${examEvaluation}${typePart}`;
    }

    if (!finalTitle) {
      toast.error('Digite um título para a prova!');
      return;
    }

    const disc_id = filterDisciplineId ? Number(filterDisciplineId) : null;
    
    const payload = {
      title: finalTitle,
      discipline_id: disc_id,
      questions: Array.from(selectedIds).map(id => ({
        id: Number(id),
        score: questionScores[id] || 0
      })),
      turma_id: (selectedTurmaId && selectedTurmaId !== 'none') ? Number(selectedTurmaId) : null,
      tipo_prova: examType,
      evaluation_type: examEvaluation,
      period_id: activePeriod ? Number(activePeriod.id) : null,
    };

    if (editingExamId) {
      updateExamMutation.mutate({ id: editingExamId, payload });
    } else {
      createExamMutation.mutate(payload);
    }
  };

  const quickFilters = ['1ª Avaliação', '2ª Avaliação', 'Adaptada'];

  const toggleQuickFilter = (tag: string) => {
    const t = tag.toLowerCase();
    setFilterTags(prev => 
      prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]
    );
  };

  const handleEditExam = async (exam: Exam) => {
    if (!exam) return;
    
    setLoadingEditExamId(exam.id);
    try {
      const fullExam = await fetchExam(exam.id);
      
      setEditingExamId(String(fullExam.id));
      setExamTitle(fullExam.title || '');
      setSelectedTurmaId(fullExam.turma?.id ? String(fullExam.turma.id) : 'none');
      setExamType(fullExam.tipoProva || '');
      setExamEvaluation(fullExam.evaluationType || '1ª Avaliação');
      setUseStandardTitle(false);
      setTdMode('free');
      
      if (fullExam.discipline?.id) {
        setFilterDisciplineId(String(fullExam.discipline.id));
      }
      
      const ids = new Set<string>();
      const scores: Record<string, number> = {};
      
      if (Array.isArray(fullExam.questions)) {
        fullExam.questions.forEach((eq: any) => {
          if (eq?.question?.id) {
            const qId = String(eq.question.id);
            ids.add(qId);
            scores[qId] = Number(eq.score || 0);
          }
        });
      }
      
      setSelectedIds(ids);
      setQuestionScores(scores);
      
      setActiveTab('gerar');
      setGeneratedExam(null); 
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (e) {
      toast.error('Erro ao carregar detalhes da prova.');
      console.error(e);
    } finally {
      setLoadingEditExamId(null);
    }
  };



  const handleDeleteExam = (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir esta prova?')) {
      deleteExamMutation.mutate(id);
    }
  };

  const handleDuplicateExam = (exam: Exam) => {
    const toLabel = activePeriod?.label ? ` para ${activePeriod.label}` : '';
    if (window.confirm(`Duplicar "${exam.title}"${toLabel}?`)) {
      duplicateExamMutation.mutate(exam.id);
    }
  };

  const handleViewExamKeys = (exam: Exam) => {
    setViewingExam(exam);
    getKeysMutation.mutate(exam.id);
  };

  const getDisciplineName = (id?: string | number | null) => {
    if (id === undefined || id === null || id === '') return '';
    const searchId = String(id);
    return disciplines.find(d => String(d.id) === searchId)?.name || '';
  };
  
  const handleAdaptExam = async (exam: Exam) => {
    setLoadingFullExamId(exam.id);
    try {
      const fullExam = await fetchExam(exam.id);
      setSelectedExamForAdapt(fullExam);
      setAiMode('adapt');
      setShowAIGenerator(true);
    } catch (e) {
      toast.error('Gostaria de adaptar esta prova, mas houve um erro ao carregar as questões originais.');
    } finally {
      setLoadingFullExamId(null);
    }
  };

  const stats = {
    total: questions.length,
    objetivas: questions.filter(q => q.type === 'objetiva').length,
    subjetivas: questions.filter(q => q.type === 'subjetiva').length,
    provas: exams.length,
  };

  return (
    <div className="min-h-screen bg-background font-sans">
      <header className="border-b border-border bg-card sticky top-0 z-40">
        <div className="container max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
              <BookOpen className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-serif text-xl font-bold text-foreground leading-tight">ProvaFácil</h1>
              <p className="text-xs text-muted-foreground hidden sm:block">Gerencie questões e gere provas</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Período Ativo */}
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 font-semibold h-9"
              onClick={() => setShowPeriodManager(true)}
            >
              <Calendar className="h-3.5 w-3.5" />
              {activePeriod ? (
                <span className="text-primary">{activePeriod.label}</span>
              ) : (
                <span className="text-muted-foreground text-xs">Sem período</span>
              )}
              <ChevronDown className="h-3 w-3 text-muted-foreground" />
            </Button>

            {/* Menu Gerenciar */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-1.5 h-9">
                  <Settings className="h-4 w-4 text-muted-foreground" /> 
                  <span className="hidden sm:inline">Gerenciar</span>
                  <ChevronDown className="h-3 w-3 opacity-50 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => setShowTurmaManager(true)}>
                  <GraduationCap className="h-4 w-4 mr-2 opacity-70" /> Turmas
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setShowDisciplineManager(true)}>
                  <BookOpen className="h-4 w-4 mr-2 opacity-70" /> Disciplinas
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setShowTagManager(true)}>
                  <Tags className="h-4 w-4 mr-2 opacity-70" /> Tags
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Menu Incluir Questões + (Destacado) */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button className="gap-1.5 h-9 bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm">
                  <Plus className="h-4 w-4" />
                  <span className="hidden sm:inline">Incluir Questões</span>
                  <ChevronDown className="h-3 w-3 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem onClick={() => { setEditingQuestion(undefined); setShowForm(true); }}>
                  <Plus className="h-4 w-4 mr-2 opacity-70" /> Nova questão
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setShowBatchPaste(true)}>
                  <ClipboardPaste className="h-4 w-4 mr-2 opacity-70" /> Colar várias questões
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setShowAIGenerator(true)} className="text-primary font-medium focus:text-primary">
                  <Sparkles className="h-4 w-4 mr-2" /> Gerar com IA
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Perfil e Logout Agrupado */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-9 w-9 rounded-full bg-accent hover:bg-accent/80 flex items-center justify-center p-0 ml-1 border border-border/50">
                   <UserIcon className="h-5 w-5 text-accent-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-60">
                <div className="flex flex-col space-y-1 p-3 bg-accent/20 border-b border-border">
                  <p className="text-sm font-semibold leading-none">{user?.name}</p>
                  <p className="text-xs leading-none text-muted-foreground truncate">{user?.email}</p>
                </div>
                <div className="p-1">
                  <DropdownMenuItem onClick={logout} className="text-destructive focus:text-destructive focus:bg-destructive/10 cursor-pointer">
                    <LogOut className="h-4 w-4 mr-2" /> Sair da conta
                  </DropdownMenuItem>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <main className="container max-w-5xl mx-auto px-4 py-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total', value: stats.total, icon: FileText },
            { label: 'Objetivas', value: stats.objetivas, icon: ClipboardList },
            { label: 'Subjetivas', value: stats.subjetivas, icon: BookOpen },
            { label: 'Provas', value: stats.provas, icon: Shuffle },
          ].map(s => (
            <Card key={s.label} className="border-border">
              <CardContent className="p-3 flex items-center gap-3">
                <div className="w-9 h-9 rounded-md bg-accent flex items-center justify-center flex-shrink-0">
                  <s.icon className="h-4 w-4 text-accent-foreground" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground leading-none">{s.value}</p>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full sm:w-auto">
            <TabsTrigger value="banco" className="flex-1 sm:flex-none gap-1.5">
              <FileText className="h-4 w-4" /> Banco
            </TabsTrigger>
            <TabsTrigger value="gerar" className="flex-1 sm:flex-none gap-1.5">
              <Shuffle className="h-4 w-4" /> Gerar Prova
            </TabsTrigger>
            <TabsTrigger value="provas" className="flex-1 sm:flex-none gap-1.5">
              <BookOpen className="h-4 w-4" /> Provas
            </TabsTrigger>
          </TabsList>

          {/* Banco de Questões */}
          <TabsContent value="banco" className="space-y-4 mt-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Buscar questões..."
                  className="pl-9"
                />
              </div>
              <Select value={filterDisciplineId} onValueChange={(v) => setFilterDisciplineId(v === 'all' ? '' : v)}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="Todas disciplinas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas disciplinas</SelectItem>
                  {disciplines.map(d => (
                    <SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex flex-col gap-2">
              <Label className="text-sm text-muted-foreground mb-1 block">Avaliação</Label>
              <Select value={filterEvaluation} onValueChange={setFilterEvaluation}>
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="1">1ª Avaliação</SelectItem>
                  <SelectItem value="2">2ª Avaliação</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-2">
              <Label className="text-sm text-muted-foreground mb-1 block">Dificuldade</Label>
              <Select value={filterDifficulty} onValueChange={setFilterDifficulty}>
                <SelectTrigger className="w-full sm:w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="Fácil">Fácil</SelectItem>
                  <SelectItem value="Médio">Médio</SelectItem>
                  <SelectItem value="Difícil">Difícil</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-2">
              <Label className="text-sm text-muted-foreground mb-1 block">Tipo</Label>
              <Select value={filterIsAdapted} onValueChange={setFilterIsAdapted}>
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas questões</SelectItem>
                  <SelectItem value="not-adapted">Originais</SelectItem>
                  <SelectItem value="adapted">Adaptadas</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label className="text-sm text-muted-foreground mb-1 block">Filtrar por tags</Label>
              <div className="flex flex-wrap gap-2 mb-2">
                {quickFilters.map(tag => {
                  const isActive = filterTags.includes(tag.toLowerCase());
                  return (
                    <Badge
                      key={tag}
                      variant={isActive ? "default" : "outline"}
                      className={`cursor-pointer transition-all gap-1.5 py-1.5 px-3 rounded-full text-xs font-semibold ${
                        isActive 
                          ? 'bg-primary text-primary-foreground border-primary' 
                          : 'bg-background hover:bg-accent text-muted-foreground border-border'
                      }`}
                      onClick={() => toggleQuickFilter(tag)}
                    >
                      {tag}
                      {isActive && <X className="h-3 w-3 ml-1 opacity-70" onClick={(e) => { e.stopPropagation(); toggleQuickFilter(tag); }} />}
                    </Badge>
                  );
                })}
              </div>
              <TagInput tags={filterTags} onChange={setFilterTags} suggestions={allTags} placeholder="Filtrar por tag..." />
            </div>

            {loadingQuestions ? (
               <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>
            ) : filteredQuestions.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="p-8 text-center">
                  <FileText className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
                  <p className="text-muted-foreground font-medium">Nenhuma questão encontrada</p>
                  <Button className="mt-4" variant="outline" onClick={() => setShowForm(true)}>
                    <Plus className="h-4 w-4 mr-1" /> Nova Questão
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-accent/20 p-3 rounded-lg border border-primary/20">
                  <div className="flex items-center gap-3">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="h-8"
                      onClick={() => {
                        const allSelected = filteredQuestions.every(q => selectedIds.has(q.id));
                        if (allSelected) {
                          const newSet = new Set(selectedIds);
                          filteredQuestions.forEach(q => newSet.delete(q.id));
                          setSelectedIds(newSet);
                        } else {
                          const newSet = new Set(selectedIds);
                          filteredQuestions.forEach(q => newSet.add(q.id));
                          setSelectedIds(newSet);
                        }
                      }}
                    >
                       {filteredQuestions.every(q => selectedIds.has(q.id)) ? 'Desmarcar Todas' : 'Selecionar Todas do Filtro'}
                    </Button>
                    <span className="text-sm font-medium">{selectedIds.size} selecionada(s)</span>
                  </div>
                  {selectedIds.size > 0 && (
                    <Button 
                      variant="destructive" 
                      size="sm" 
                      className="h-8 gap-1.5"
                      onClick={handleBulkDelete}
                      disabled={bulkDeleteMutation.isPending}
                    >
                      {bulkDeleteMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />} 
                      Excluir {selectedIds.size} itens
                    </Button>
                  )}
                </div>

                <div className="space-y-3">
                  {filteredQuestions.map(q => (
                    <QuestionCard 
                      key={q.id} 
                      question={q} 
                      onEdit={handleEdit} 
                      onDelete={handleDeleteQuestion} 
                      disciplineName={getDisciplineName(q.disciplineId)}
                      selectable
                      selected={selectedIds.has(q.id)}
                      onToggleSelect={toggleSelect}
                      score={questionScores[q.id]}
                      onScoreChange={(s) => setQuestionScores(prev => ({ ...prev, [q.id]: s }))}
                      onGenerateAlternative={(question) => {
                        setSelectedQuestionForAI(question);
                        setAiMode('alternative');
                        setShowAIGenerator(true);
                      }}
                    />
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          {/* Gerar Prova */}
          <TabsContent value="gerar" className="space-y-4 mt-4">
            {generatedExam ? (
              <div className="space-y-4">
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => { 
                    setGeneratedExam(null); 
                    if (!editingExamId) {
                      setSelectedIds(new Set()); 
                      setExamTitle(''); 
                    }
                  }}>
                    ← {editingExamId ? 'Voltar para Edição' : 'Nova Prova'}
                  </Button>
                  <div className="flex items-center gap-3 border border-primary/20 bg-primary/5 px-4 py-2 rounded-full shadow-sm ml-auto animate-in fade-in slide-in-from-top-1">
                    <div className="flex items-center gap-2">
                      <Label className="text-[10px] font-black uppercase text-primary/70 tracking-widest whitespace-nowrap">Fonte do Exame</Label>
                      <div className="flex items-center gap-3">
                         <Input 
                            type="range" 
                            min="10" 
                            max="22" 
                            step="1" 
                            value={fontSize} 
                            onChange={(e) => setFontSize(parseInt(e.target.value))}
                            className="h-1.5 w-32 cursor-pointer accent-primary"
                         />
                         <Badge variant="secondary" className="font-mono font-bold text-xs px-2 shadow-inner border-primary/10 bg-white">
                           {fontSize}pt
                         </Badge>
                      </div>
                    </div>
                  </div>
                </div>
                <ExamPreview exam={generatedExam} fontSize={fontSize} />
                <AnswerKeyView exam={generatedExam} />

              </div>
            ) : (
              <>
                <Card>
                  <CardContent className="p-4 space-y-4">

                    {/* Professor (read-only do contexto) */}
                    <div className="flex items-center gap-2 p-3 bg-primary/5 rounded-lg border border-primary/10">
                      <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                        <UserIcon className="h-4 w-4 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs text-muted-foreground font-medium">Professor</p>
                        <p className="text-sm font-semibold text-foreground">{user?.name}</p>
                      </div>
                      {activePeriod && (
                        <Badge className="ml-auto bg-green-500/15 text-green-700 border-green-500/30 text-xs font-bold">
                          Período {activePeriod.label}
                        </Badge>
                      )}
                    </div>

                    {/* Seletor Turma/Disciplina */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="font-medium">Turma e Disciplina</Label>
                        <div className="flex items-center gap-1.5 text-xs">
                          <button
                            className={`px-2 py-1 rounded-md font-semibold transition-all ${tdMode === 'period' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                            onClick={() => setTdMode('period')}
                          >
                            Do Período
                          </button>
                          <button
                            className={`px-2 py-1 rounded-md font-semibold transition-all ${tdMode === 'free' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                            onClick={() => setTdMode('free')}
                          >
                            Livre
                          </button>
                        </div>
                      </div>

                      {tdMode === 'period' ? (
                        periodTurmaDisciplines.length > 0 ? (
                          <Select value={selectedPeriodTdId} onValueChange={setSelectedPeriodTdId}>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione turma/disciplina do período..." />
                            </SelectTrigger>
                            <SelectContent>
                              {periodTurmaDisciplines.map(td => (
                                <SelectItem key={td.id} value={td.id}>
                                  {td.turma?.nome} ({td.turma?.codigo}) — {td.discipline?.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <div className="p-3 rounded-lg border border-dashed border-amber-400/50 bg-amber-50/50 text-center">
                            <p className="text-xs text-amber-700 font-medium">
                              {activePeriod
                                ? `Nenhuma turma/disciplina configurada para o período ${activePeriod.label}.`
                                : 'Nenhum período ativo. Configure um período no botão do header.'}
                            </p>
                            <button
                              className="text-xs text-primary font-semibold underline mt-1"
                              onClick={() => setShowPeriodManager(true)}
                            >
                              Configurar período →
                            </button>
                          </div>
                        )
                      ) : (
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <Label className="text-xs text-muted-foreground mb-1 block">Turma</Label>
                            <Select value={selectedTurmaId} onValueChange={setSelectedTurmaId}>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione a turma" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">Nenhuma</SelectItem>
                                {turmas.map(t => (
                                  <SelectItem key={t.id} value={t.id}>{t.nome} - {t.codigo}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground mb-1 block">Disciplina</Label>
                            <Select value={filterDisciplineId} onValueChange={(v) => setFilterDisciplineId(v === 'all' ? '' : v)}>
                              <SelectTrigger>
                                <SelectValue placeholder="Todas" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">Todas</SelectItem>
                                {disciplines.map(d => (
                                  <SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-2">
                      <Label className="font-medium text-base">Título da Prova</Label>
                      <div className="flex items-center gap-2">
                        <Label htmlFor="standard-title" className="text-sm font-normal text-muted-foreground mr-1">Usar Padrão</Label>
                        <Switch id="standard-title" checked={useStandardTitle} onCheckedChange={setUseStandardTitle} />
                      </div>
                    </div>

                    {useStandardTitle ? (
                      <div className="space-y-3 p-3 bg-muted/30 rounded-lg border border-border">
                        <div className="flex flex-col sm:flex-row gap-3">
                          <div className="flex-1">
                            <Label className="text-sm mb-1.5 block">Disciplina</Label>
                            <Input value={getDisciplineName(filterDisciplineId) || 'Selecione uma disciplina...'} disabled className="bg-muted text-muted-foreground/80" />
                          </div>
                          <div className="flex-1">
                            <Label className="text-sm mb-1.5 block">Avaliação</Label>
                            <Select value={examEvaluation} onValueChange={setExamEvaluation}>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="1ª Avaliação">1ª Avaliação</SelectItem>
                                <SelectItem value="2ª Avaliação">2ª Avaliação</SelectItem>
                                <SelectItem value="2ª Chamada">2ª Chamada</SelectItem>
                                <SelectItem value="Prova Final">Prova Final</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="flex-1">
                            <Label className="text-sm mb-1.5 block">Tipo (Ex: A/B)</Label>
                            <Input value={examType} onChange={e => setExamType(e.target.value)} placeholder="Ex: A" />
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground text-center sm:text-left pt-1">
                          Pré-visualização: <span className="font-semibold text-foreground">{getDisciplineName(filterDisciplineId) || 'Prova'} - {examEvaluation}{examType.trim() ? ` - ${examType.trim()}` : ''}</span>
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2 pb-2">
                        <Label className="font-medium text-sm">Título Personalizado</Label>
                        <Input value={examTitle} onChange={e => setExamTitle(e.target.value)} placeholder="Ex: Prova de Matemática - 1º Bimestre" />
                      </div>
                    )}

                    <div className="flex flex-col sm:flex-row gap-3 border-t border-border pt-4">
                      <div className="flex-1">
                        <Label className="text-sm text-muted-foreground mb-2 block">Filtrar questões por tags</Label>
                        <TagInput tags={filterTags} onChange={setFilterTags} suggestions={allTags} placeholder="Filtrar por tag..." />
                      </div>
                      <div className="flex flex-wrap gap-3">
                        {tdMode === 'free' && (
                          <div>
                            <Label className="text-sm text-muted-foreground mb-2 block">Disciplina</Label>
                            <Select value={filterDisciplineId} onValueChange={(v) => setFilterDisciplineId(v === 'all' ? '' : v)}>
                              <SelectTrigger className="w-full sm:w-40">
                                <SelectValue placeholder="Todas" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">Todas</SelectItem>
                                {disciplines.map(d => (
                                  <SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                        <div>
                          <Label className="text-sm text-muted-foreground mb-2 block">Avaliação</Label>
                          <Select value={filterEvaluation} onValueChange={setFilterEvaluation}>
                            <SelectTrigger className="w-full sm:w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">Todas</SelectItem>
                              <SelectItem value="1">1ª</SelectItem>
                              <SelectItem value="2">2ª</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-sm text-muted-foreground mb-2 block">Dificuldade</Label>
                          <Select value={filterDifficulty} onValueChange={setFilterDifficulty}>
                            <SelectTrigger className="w-full sm:w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">Todas</SelectItem>
                              <SelectItem value="Fácil">Fácil</SelectItem>
                              <SelectItem value="Médio">Médio</SelectItem>
                              <SelectItem value="Difícil">Difícil</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-sm text-muted-foreground mb-2 block">Tipo</Label>
                          <Select value={filterIsAdapted} onValueChange={setFilterIsAdapted}>
                            <SelectTrigger className="w-full sm:w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">Todas</SelectItem>
                              <SelectItem value="not-adapted">Originais</SelectItem>
                              <SelectItem value="adapted">Adaptadas</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                    {selectedIds.size > 0 && (
                      <div className="mt-6 border-t border-border pt-4 space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Shuffle className="h-5 w-5 text-primary" />
                            <h3 className="font-bold text-lg text-foreground">Questões na Prova</h3>
                          </div>
                          <Badge variant="default" className="bg-primary text-primary-foreground font-black px-3 py-1 text-sm shadow-sm">
                            Total: {(Object.values(questionScores).reduce((acc, curr) => acc + (Number(curr) || 0), 0) || 0).toFixed(2)} pts
                          </Badge>
                        </div>
                        
                        <div className="grid gap-3 pr-2">
                          {Array.from(selectedIds).map(id => {
                            const q = questions.find(question => String(question.id) === String(id));
                            if (!q) return null;
                            return (
                              <div key={id} className="flex items-start gap-4 p-3 rounded-lg bg-accent/10 border border-primary/20 group hover:border-primary/40 transition-all shadow-sm">
                                <div className="flex-shrink-0 pt-1">
                                  <div className="space-y-1">
                                    <Label htmlFor={`score-${id}`} className="text-[9px] uppercase font-black text-muted-foreground block text-center tracking-tighter">Peso</Label>
                                    <Input
                                      id={`score-${id}`}
                                      type="number"
                                      step="0.25"
                                      min="0"
                                      className="w-16 h-9 text-center font-bold bg-background border-primary/30 shadow-sm transition-all focus:ring-2 focus:ring-primary/20"
                                      value={questionScores[id] ?? 0}
                                      onChange={(e) => setQuestionScores(prev => ({ 
                                        ...prev, 
                                        [id]: e.target.value ? parseFloat(e.target.value) : 0 
                                      }))}
                                    />
                                  </div>
                                </div>
                                <div className="flex-1 min-w-0 pt-1">
                                  <p className="text-sm font-semibold line-clamp-2 text-foreground/90 mb-1" dangerouslySetInnerHTML={{ __html: q.text }} />
                                  <div className="flex items-center gap-2">
                                    <Badge variant="outline" className="text-[9px] uppercase font-black tracking-widest h-4 px-1.5">{q.type === 'objetiva' ? 'Obj' : 'Sub'}</Badge>
                                    <span className="text-[9px] text-primary/70 font-bold uppercase truncate">{getDisciplineName(q.disciplineId)}</span>
                                  </div>
                                </div>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                  onClick={() => toggleSelect(id)}
                                  title="Remover da prova"
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-end gap-2 pt-4 border-t border-border mt-4">
                      {editingExamId && (
                        <Button variant="ghost" onClick={handleCancelEdit} className="text-muted-foreground">
                          Cancelar Edição
                        </Button>
                      )}
                      <Button onClick={handleGenerateExam} className="h-11 px-8 gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-md" disabled={createExamMutation.isPending || updateExamMutation.isPending || selectedIds.size === 0}>
                        {(createExamMutation.isPending || updateExamMutation.isPending) ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="h-5 w-5" />} 
                        {editingExamId ? 'Finalizar e Salvar Alterações' : `Gerar e Visualizar Prova`}
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <div className="pt-8 space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
                    <div>
                      <h2 className="text-xl font-bold flex items-center gap-2">
                        <Search className="h-5 w-5 text-muted-foreground" />
                        Incluir do Banco de Questões
                      </h2>
                      <p className="text-sm text-muted-foreground">Busque e adicione mais questões à sua prova</p>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-9 font-semibold"
                        onClick={() => {
                          const allSelected = filteredQuestions.length > 0 && filteredQuestions.every(q => selectedIds.has(q.id));
                          if (allSelected) {
                            setSelectedIds(new Set());
                            setQuestionScores({});
                          } else {
                            const newSet = new Set(selectedIds);
                            const newScores = { ...questionScores };
                            filteredQuestions.forEach(q => {
                              newSet.add(q.id);
                              if (newScores[q.id] === undefined) newScores[q.id] = 0;
                            });
                            setSelectedIds(newSet);
                            setQuestionScores(newScores);
                          }
                        }}
                      >
                        {filteredQuestions.length > 0 && filteredQuestions.every(q => selectedIds.has(q.id)) ? 'Desmarcar Todas' : 'Selecionar Todas do Filtro'}
                      </Button>
                      <Badge variant="secondary" className="h-9 px-3 text-sm font-bold">
                        {selectedIds.size} selecionada(s)
                      </Badge>
                    </div>
                  </div>

                  {filteredQuestions.length === 0 ? (
                    <div className="p-12 text-center border-2 border-dashed border-border rounded-xl">
                      <Search className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                      <p className="text-muted-foreground font-medium">Nenhuma questão encontrada com os filtros atuais.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {filteredQuestions.map(q => (
                        <QuestionCard
                          key={q.id}
                          question={q}
                          onEdit={handleEdit}
                          onDelete={handleDeleteQuestion}
                          selectable
                          selected={selectedIds.has(q.id)}
                          onToggleSelect={toggleSelect}
                          disciplineName={getDisciplineName(q.disciplineId)}
                          score={questionScores[q.id]}
                          onScoreChange={(s) => setQuestionScores(prev => ({ ...prev, [q.id]: s }))}
                          onGenerateAlternative={(question) => {
                            setSelectedQuestionForAI(question);
                            setAiMode('alternative');
                            setShowAIGenerator(true);
                          }}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </TabsContent>

          {/* Provas Geradas */}
          <TabsContent value="provas" className="space-y-6 mt-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {/* Filtros da aba de histórico */}
            <div className="flex flex-col sm:flex-row gap-3 p-4 bg-muted/30 rounded-xl border border-border shadow-sm">
              <div className="flex-1">
                <Label className="text-[10px] uppercase font-black text-muted-foreground tracking-widest mb-1.5 block">Filtrar por Turma</Label>
                <Select value={examFilterTurmaId} onValueChange={setExamFilterTurmaId}>
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="Todas as Turmas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as Turmas</SelectItem>
                    {turmas.map(t => (
                      <SelectItem key={t.id} value={String(t.id)}>{t.nome} - {t.codigo}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1">
                <Label className="text-[10px] uppercase font-black text-muted-foreground tracking-widest mb-1.5 block">Filtrar por Disciplina</Label>
                <Select value={examFilterDisciplineId} onValueChange={setExamFilterDisciplineId}>
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="Todas as Disciplinas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as Disciplinas</SelectItem>
                    {disciplines.map(d => (
                      <SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {loadingExams ? (
               <div className="flex justify-center p-12"><Loader2 className="w-10 h-10 animate-spin text-primary/40" /></div>
            ) : Object.keys(groupedExams).length === 0 ? (
              <Card className="border-dashed border-2">
                <CardContent className="p-12 text-center">
                  <div className="w-16 h-16 bg-muted/50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <BookOpen className="h-8 w-8 text-muted-foreground/40" />
                  </div>
                  <p className="text-muted-foreground font-semibold">Nenhuma prova encontrada para os filtros selecionados</p>
                  <Button variant="link" onClick={() => { setExamFilterTurmaId('all'); setExamFilterDisciplineId('all'); }} className="text-primary mt-2">
                    Limpar filtros
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-8">
                {Object.entries(groupedExams).sort((a, b) => b[0].localeCompare(a[0])).map(([period, periodExams]) => (
                  <div key={period} className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="h-px flex-1 bg-border/60"></div>
                      <Badge variant="secondary" className="px-3 py-1 text-xs font-bold uppercase tracking-wider bg-primary/5 text-primary border-primary/20">
                        Período {period}
                      </Badge>
                      <div className="h-px flex-6 bg-border/60"></div>
                    </div>

                    <div className="space-y-3">
                      {periodExams.map(exam => (
                        <Card key={exam.id} className="border-border hover:shadow-md transition-all group overflow-hidden">
                          <CardContent className="p-4 flex items-center justify-between gap-4">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <p className="font-bold text-base truncate group-hover:text-primary transition-colors">{exam.title}</p>
                                {exam.turma && (
                                  <Badge variant="outline" className="text-[10px] bg-primary/10 font-bold px-1.5 h-4 border-primary/30 text-primary">
                                    {exam.turma.nome}
                                  </Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                                <span className="flex items-center gap-1">
                                  <BookOpen className="w-3 h-3" />
                                  {exam.questions?.length || 0} questões
                                </span>
                                <span className="flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  {new Date(exam.createdAt).toLocaleDateString('pt-BR')}
                                </span>
                                {exam.discipline && (
                                  <span className="flex items-center gap-1 bg-muted/60 px-1.5 py-0.5 rounded border border-border/40">
                                    <GraduationCap className="w-3 h-3" />
                                    {exam.discipline.name}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex gap-1.5 flex-shrink-0">
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8 gap-1.5 border-primary/20 text-primary hover:bg-primary/5 shadow-sm"
                                onClick={() => {
                                  setExamMetadata({
                                    id: String(exam.id),
                                    title: exam.title || '',
                                    turma_id: exam.turma?.id ? String(exam.turma.id) : 'none',
                                    discipline_id: exam.discipline?.id ? String(exam.discipline.id) : '',
                                    tipo_prova: exam.tipoProva || '',
                                    evaluation_type: exam.evaluationType || '',
                                  });
                                  setShowMetadataDialog(true);
                                }}
                              >
                                <Pencil className="w-3 h-3" />
                                <span className="hidden sm:inline">Info</span>
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8 gap-1.5 border-amber-500/20 text-amber-600 hover:bg-amber-50 shadow-sm"
                                onClick={() => handleAdaptExam(exam)}
                                disabled={loadingFullExamId === exam.id}
                              >
                                {loadingFullExamId === exam.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                                <span className="hidden sm:inline">Adaptar</span>
                              </Button>
                              <Button variant="outline" size="sm" onClick={() => handleEditExam(exam)} className="h-8 gap-1.5 shadow-sm border-border/60" disabled={loadingEditExamId === exam.id}>
                                {loadingEditExamId === exam.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Edit className="w-3 h-3" />}
                                <span className="hidden sm:inline">Questões</span>
                              </Button>
                              <div className="w-[1px] h-8 bg-border hidden sm:block mx-1"></div>
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-primary hover:border-primary/40 shadow-inner"
                                onClick={() => handleViewExamKeys(exam)}
                                disabled={getKeysMutation.isPending}
                                title="Ver Gabarito"
                              >
                                {getKeysMutation.isPending && getKeysMutation.variables === exam.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="h-3.5 w-3.5" />}
                              </Button>
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-indigo-600 hover:border-indigo-200 shadow-inner"
                                onClick={() => handleDuplicateExam(exam)}
                                disabled={duplicateExamMutation.isPending}
                                title={`Duplicar para período ${activePeriod?.label ?? 'atual'}`}
                              >
                                {duplicateExamMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Copy className="h-3.5 w-3.5" />}
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/5" onClick={() => handleDeleteExam(exam.id)}>
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>

      {/* Question Form Dialog */}
      <Dialog open={showForm} onOpenChange={(open) => { setShowForm(open); if (!open) setEditingQuestion(undefined); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="sr-only">{editingQuestion ? 'Editar' : 'Nova'} Questão</DialogTitle>
          </DialogHeader>
          <QuestionForm
            question={editingQuestion}
            onSave={handleSaveQuestion}
            onCancel={() => { setShowForm(false); setEditingQuestion(undefined); }}
          />
        </DialogContent>
      </Dialog>

      {/* Exam View Dialog */}
      <Dialog open={!!viewingExam} onOpenChange={(open) => { if (!open) setViewingExam(null); }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="flex flex-row items-center justify-between border-b pb-4 mb-4">
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              Visualizar Prova
            </DialogTitle>
            <div className="flex items-center gap-4 bg-muted/50 px-4 py-2 rounded-full border border-border mr-6">
              <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Fonte</Label>
              <div className="flex items-center gap-3">
                <Input 
                  type="range" 
                  min="10" 
                  max="22" 
                  step="1" 
                  value={fontSize} 
                  onChange={(e) => setFontSize(parseInt(e.target.value))}
                  className="h-1.5 w-24 cursor-pointer accent-primary"
                />
                <Badge variant="secondary" className="font-mono font-bold text-xs bg-background">
                  {fontSize}pt
                </Badge>
              </div>
            </div>
          </DialogHeader>
          {viewingExam && (
            <div className="space-y-6">
              <div className="bg-card rounded-lg border p-1 shadow-inner">
                <ExamPreview exam={viewingExam} fontSize={fontSize} />
              </div>
              <div className="bg-card rounded-lg border p-1 shadow-inner">
                <AnswerKeyView exam={viewingExam} />
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Discipline Manager */}
      <DisciplineManager
        open={showDisciplineManager}
        onOpenChange={setShowDisciplineManager}
        onUpdate={() => queryClient.invalidateQueries({ queryKey: ['disciplines'] })}
      />

      {/* Tag Manager */}
      <TagManager
        open={showTagManager}
        onOpenChange={setShowTagManager}
        onUpdate={() => queryClient.invalidateQueries({ queryKey: ['tags'] })}
      />

      {/* Batch Paste */}
      <BatchPasteDialog
        open={showBatchPaste}
        onOpenChange={setShowBatchPaste}
        onSave={handleBatchSave}
      />

      {/* AI Question Generator */}
      <AIGeneratorDialog
        open={showAIGenerator}
        onOpenChange={setShowAIGenerator}
        mode={aiMode}
        originalExam={selectedExamForAdapt}
        originalQuestion={selectedQuestionForAI}
        onSave={() => {
          queryClient.invalidateQueries({ queryKey: ['questions'] });
          queryClient.invalidateQueries({ queryKey: ['exams'] });
        }}
        disciplines={disciplines}
        tags={serverTags}
      />

      {/* Turma Manager */}
      <TurmaManager
        open={showTurmaManager}
        onOpenChange={setShowTurmaManager}
      />

      {/* Period Manager */}
      <PeriodManager
        open={showPeriodManager}
        onClose={() => setShowPeriodManager(false)}
      />

      {/* Exam Metadata Dialog */}
      <Dialog open={showMetadataDialog} onOpenChange={setShowMetadataDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Editar Informações da Prova</DialogTitle>
            <DialogDescription>
              Altere os dados básicos da prova sem afetar a ordem das questões ou o gabarito.
            </DialogDescription>
          </DialogHeader>
          {examMetadata && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Título da Prova</Label>
                <Input
                  value={examMetadata.title}
                  onChange={(e) => setExamMetadata({ ...examMetadata, title: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Turma</Label>
                  <Select
                    value={examMetadata.turma_id}
                    onValueChange={(v) => setExamMetadata({ ...examMetadata, turma_id: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nenhuma</SelectItem>
                      {turmas.map(t => (
                        <SelectItem key={t.id} value={String(t.id)}>{t.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Disciplina</Label>
                  <Select
                    value={examMetadata.discipline_id}
                    onValueChange={(v) => setExamMetadata({ ...examMetadata, discipline_id: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {disciplines.map(d => (
                        <SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Avaliação</Label>
                  <Select
                    value={examMetadata.evaluation_type}
                    onValueChange={(v) => setExamMetadata({ ...examMetadata, evaluation_type: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1ª Avaliação">1ª Avaliação</SelectItem>
                      <SelectItem value="2ª Avaliação">2ª Avaliação</SelectItem>
                      <SelectItem value="2ª Chamada">2ª Chamada</SelectItem>
                      <SelectItem value="Prova Final">Prova Final</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Tipo (Ex: A/B)</Label>
                  <Input
                    value={examMetadata.tipo_prova}
                    onChange={(e) => setExamMetadata({ ...examMetadata, tipo_prova: e.target.value })}
                    placeholder="Ex: A"
                  />
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowMetadataDialog(false)}>Cancelar</Button>
            <Button
              onClick={() => {
                if (examMetadata) {
                  updateExamMutation.mutate({
                    id: examMetadata.id,
                    payload: {
                      title: examMetadata.title,
                      turma_id: examMetadata.turma_id !== 'none' ? Number(examMetadata.turma_id) : null,
                      discipline_id: examMetadata.discipline_id ? Number(examMetadata.discipline_id) : null,
                      tipo_prova: examMetadata.tipo_prova,
                      evaluation_type: examMetadata.evaluation_type,
                    }
                  });
                  setShowMetadataDialog(false);
                }
              }}
              disabled={updateExamMutation.isPending}
            >
              {updateExamMutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Salvar Alterações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Printable Exam (Single Instance for Print Consistency) */}
      {viewingExam ? (
        <PrintableExam exam={viewingExam} fontSize={fontSize} />
      ) : generatedExam ? (
        <PrintableExam exam={generatedExam} fontSize={fontSize} />
      ) : null}
    </div>
  );
}
