import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Period, PeriodTurmaDiscipline, Turma, Discipline } from '@/types/question';
import {
  fetchPeriods, postPeriod, activatePeriod, deletePeriod,
  fetchPeriodTurmaDisciplines, addPeriodTurmaDiscipline, removePeriodTurmaDiscipline,
  fetchTurmas, fetchDisciplines,
} from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { fetchMe } from '@/lib/api';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Loader2, Plus, Trash2, CheckCircle2, Calendar, BookOpen, GraduationCap, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onClose: () => void;
}

export function PeriodManager({ open, onClose }: Props) {
  const { updateUser } = useAuth();
  const queryClient = useQueryClient();

  const [selectedPeriodId, setSelectedPeriodId] = useState<string | null>(null);
  const [newYear, setNewYear] = useState<string>(String(new Date().getFullYear()));
  const [newSemester, setNewSemester] = useState<string>('1');
  const [addTurmaId, setAddTurmaId] = useState<string>('');
  const [addDisciplineId, setAddDisciplineId] = useState<string>('');

  const { data: periods = [], isLoading: loadingPeriods } = useQuery<Period[]>({
    queryKey: ['periods'],
    queryFn: fetchPeriods,
    enabled: open,
  });

  const { data: turmas = [] } = useQuery<Turma[]>({
    queryKey: ['turmas'],
    queryFn: fetchTurmas,
    enabled: open,
  });

  const { data: disciplines = [] } = useQuery<Discipline[]>({
    queryKey: ['disciplines'],
    queryFn: fetchDisciplines,
    enabled: open,
  });

  const { data: turmaDisciplines = [], isLoading: loadingTD } = useQuery<PeriodTurmaDiscipline[]>({
    queryKey: ['period-td', selectedPeriodId],
    queryFn: () => fetchPeriodTurmaDisciplines(selectedPeriodId!),
    enabled: !!selectedPeriodId,
  });

  const createPeriodMutation = useMutation({
    mutationFn: () => postPeriod(Number(newYear), Number(newSemester)),
    onSuccess: (p) => {
      queryClient.invalidateQueries({ queryKey: ['periods'] });
      toast.success(`Período ${p.label} criado!`);
      setSelectedPeriodId(p.id);
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || 'Erro ao criar período. Verifique se já existe.';
      toast.error(msg);
    },
  });

  const activateMutation = useMutation({
    mutationFn: activatePeriod,
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ['periods'] });
      const me = await fetchMe();
      updateUser(me);
      toast.success('Período ativo atualizado!');
    },
    onError: () => toast.error('Erro ao ativar período.'),
  });

  const deletePeriodMutation = useMutation({
    mutationFn: deletePeriod,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['periods'] });
      setSelectedPeriodId(null);
      toast.success('Período removido.');
    },
    onError: () => toast.error('Erro ao remover período.'),
  });

  const addTDMutation = useMutation({
    mutationFn: () => addPeriodTurmaDiscipline(selectedPeriodId!, Number(addTurmaId), Number(addDisciplineId)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['period-td', selectedPeriodId] });
      setAddTurmaId('');
      setAddDisciplineId('');
      toast.success('Combinação adicionada!');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Erro ao adicionar.');
    },
  });

  const removeTDMutation = useMutation({
    mutationFn: (itemId: string) => removePeriodTurmaDiscipline(selectedPeriodId!, itemId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['period-td', selectedPeriodId] });
      toast.success('Combinação removida.');
    },
    onError: () => toast.error('Erro ao remover.'),
  });

  const selectedPeriod = periods.find(p => p.id === selectedPeriodId);
  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 5 }, (_, i) => currentYear - 1 + i);

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Calendar className="h-5 w-5 text-primary" />
            Gerenciar Períodos Letivos
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
          {/* Coluna Esquerda: Lista de Períodos */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Seus Períodos</h3>

            {/* Criar novo período */}
            <div className="p-3 rounded-lg border border-dashed border-primary/30 bg-primary/5 space-y-2">
              <p className="text-xs font-semibold text-primary">Novo Período</p>
              <div className="flex gap-2">
                <Select value={newYear} onValueChange={setNewYear}>
                  <SelectTrigger className="flex-1 h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {yearOptions.map(y => (
                      <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={newSemester} onValueChange={setNewSemester}>
                  <SelectTrigger className="w-20 h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1º</SelectItem>
                    <SelectItem value="2">2º</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  size="sm"
                  className="h-8 px-3"
                  onClick={() => createPeriodMutation.mutate()}
                  disabled={createPeriodMutation.isPending}
                >
                  {createPeriodMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                </Button>
              </div>
            </div>

            {loadingPeriods ? (
              <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
            ) : periods.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Nenhum período cadastrado.</p>
            ) : (
              <div className="space-y-1.5">
                {periods.map(p => (
                  <div
                    key={p.id}
                    onClick={() => setSelectedPeriodId(p.id)}
                    className={`flex items-center justify-between p-2.5 rounded-lg border cursor-pointer transition-all group ${
                      selectedPeriodId === p.id
                        ? 'border-primary bg-primary/10 shadow-sm'
                        : 'border-border hover:border-primary/40 hover:bg-accent/30'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm">{p.label}</span>
                      {p.is_active && (
                        <Badge className="h-4 px-1.5 text-[9px] bg-green-500/20 text-green-700 border-green-500/30 font-bold">
                          ATIVO
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {!p.is_active && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 px-2 text-[10px] text-primary hover:bg-primary/10"
                          onClick={e => { e.stopPropagation(); activateMutation.mutate(p.id); }}
                          disabled={activateMutation.isPending}
                        >
                          <CheckCircle2 className="h-3 w-3 mr-1" /> Ativar
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0 text-destructive hover:bg-destructive/10"
                        onClick={e => { e.stopPropagation(); if (confirm(`Remover período ${p.label}?`)) deletePeriodMutation.mutate(p.id); }}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Coluna Direita: Turmas/Disciplinas do Período */}
          <div className="space-y-3">
            {selectedPeriod ? (
              <>
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  Período {selectedPeriod.label} — Turmas &amp; Disciplinas
                </h3>

                {/* Adicionar combinação */}
                <div className="p-3 rounded-lg border border-dashed border-primary/30 bg-primary/5 space-y-2">
                  <p className="text-xs font-semibold text-primary">Adicionar combinação</p>
                  <div className="space-y-1.5">
                    <Select value={addTurmaId} onValueChange={setAddTurmaId}>
                      <SelectTrigger className="h-8 text-sm w-full">
                        <SelectValue placeholder="Selecione a turma..." />
                      </SelectTrigger>
                      <SelectContent>
                        {turmas.map(t => (
                          <SelectItem key={t.id} value={t.id}>{t.nome} ({t.codigo})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={addDisciplineId} onValueChange={setAddDisciplineId}>
                      <SelectTrigger className="h-8 text-sm w-full">
                        <SelectValue placeholder="Selecione a disciplina..." />
                      </SelectTrigger>
                      <SelectContent>
                        {disciplines.map(d => (
                          <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      className="w-full h-8 text-sm gap-1.5"
                      onClick={() => addTDMutation.mutate()}
                      disabled={!addTurmaId || !addDisciplineId || addTDMutation.isPending}
                    >
                      {addTDMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                      Adicionar
                    </Button>
                  </div>
                </div>

                {loadingTD ? (
                  <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
                ) : turmaDisciplines.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-3">
                    Nenhuma combinação cadastrada.<br />
                    <span className="text-xs">Adicione acima as turmas e disciplinas deste período.</span>
                  </p>
                ) : (
                  <div className="space-y-1.5">
                    {turmaDisciplines.map(item => (
                      <div key={item.id} className="flex items-center justify-between p-2 rounded-md border border-border bg-accent/20 group">
                        <div className="flex flex-col gap-0.5 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <GraduationCap className="h-3 w-3 text-primary flex-shrink-0" />
                            <span className="text-xs font-semibold truncate">{item.turma?.nome} ({item.turma?.codigo})</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <BookOpen className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                            <span className="text-xs text-muted-foreground truncate">{item.discipline?.name}</span>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0 text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                          onClick={() => removeTDMutation.mutate(item.id)}
                          disabled={removeTDMutation.isPending}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center py-8 text-muted-foreground">
                <Calendar className="h-10 w-10 mb-3 opacity-30" />
                <p className="text-sm font-medium">Selecione um período</p>
                <p className="text-xs mt-1">Clique em um período à esquerda para gerenciar suas turmas e disciplinas.</p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
