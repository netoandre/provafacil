import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Turma } from '@/types/question';
import { fetchTurmas, postTurma, putTurma, deleteTurma } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, GraduationCap, Loader2, Save, Pencil, Trash2, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface TurmaManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TurmaManager({ open, onOpenChange }: TurmaManagerProps) {
  const queryClient = useQueryClient();
  const { data: turmas = [], isLoading } = useQuery({ 
    queryKey: ['turmas'], 
    queryFn: fetchTurmas 
  });

  const [isCreating, setIsCreating] = useState(false);
  const [editingTurmaId, setEditingTurmaId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<Turma>>({
    nome: '',
    codigo: '',
    curso: '',
    universidade: '',
    periodo: '',
    turno: '',
  });

  const createMutation = useMutation({
    mutationFn: postTurma,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['turmas'] });
      toast.success('Turma criada com sucesso!');
      resetForm();
    },
    onError: () => toast.error('Erro ao criar turma.'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Turma> }) => putTurma(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['turmas'] });
      toast.success('Turma atualizada com sucesso!');
      resetForm();
    },
    onError: () => toast.error('Erro ao atualizar turma.'),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteTurma,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['turmas'] });
      toast.success('Turma excluída com sucesso!');
    },
    onError: () => toast.error('Erro ao excluir turma.'),
  });

  const resetForm = () => {
    setIsCreating(false);
    setEditingTurmaId(null);
    setFormData({ nome: '', codigo: '', curso: '', universidade: '', periodo: '', turno: '' });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nome || !formData.codigo || !formData.curso || !formData.universidade) {
      toast.error('Preencha os campos obrigatórios!');
      return;
    }

    if (editingTurmaId) {
      updateMutation.mutate({ id: editingTurmaId, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (turma: Turma) => {
    setFormData({
      nome: turma.nome,
      codigo: turma.codigo,
      curso: turma.curso,
      universidade: turma.universidade,
      periodo: turma.periodo,
      turno: turma.turno,
    });
    setEditingTurmaId(turma.id);
    setIsCreating(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Tem certeza que deseja excluir esta turma?')) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5" />
            Gerenciar Turmas
          </DialogTitle>
        </DialogHeader>

        {isCreating ? (
          <div className="space-y-4">
            <Button variant="ghost" size="sm" onClick={resetForm} className="pl-0 text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-4 w-4 mr-1" /> Voltar para lista
            </Button>
            
            <form onSubmit={handleSubmit} className="space-y-4 py-2 border-t pt-4">
              <h3 className="text-sm font-semibold">{editingTurmaId ? 'Editar Turma' : 'Nova Turma'}</h3>
              
              <div className="space-y-2">
                <Label>Nome da Turma (Ex: MANHÃ)</Label>
                <Input 
                  value={formData.nome} 
                  onChange={e => setFormData({ ...formData, nome: e.target.value })} 
                  placeholder="Ex: TADS Noite"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Código (Ex: ALC0400...)</Label>
                  <Input 
                    value={formData.codigo} 
                    onChange={e => setFormData({ ...formData, codigo: e.target.value })} 
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Universidade</Label>
                  <Input 
                    value={formData.universidade} 
                    onChange={e => setFormData({ ...formData, universidade: e.target.value })} 
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Curso</Label>
                <Input 
                  value={formData.curso} 
                  onChange={e => setFormData({ ...formData, curso: e.target.value })} 
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Período (Opcional)</Label>
                  <Input 
                    value={formData.periodo} 
                    onChange={e => setFormData({ ...formData, periodo: e.target.value })} 
                  />
                </div>
                <div className="space-y-2">
                  <Label>Turno (Opcional)</Label>
                  <Input 
                    value={formData.turno} 
                    onChange={e => setFormData({ ...formData, turno: e.target.value })} 
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="ghost" onClick={resetForm}>Cancelar</Button>
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                  {(createMutation.isPending || updateMutation.isPending) ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  {editingTurmaId ? 'Atualizar' : 'Salvar'}
                </Button>
              </div>
            </form>
          </div>
        ) : (
          <div className="space-y-4 py-4">
            <Button onClick={() => setIsCreating(true)} className="w-full gap-2">
              <Plus className="h-4 w-4" /> Nova Turma
            </Button>
            
            <div className="max-h-[300px] overflow-y-auto space-y-2 pr-1">
              {isLoading ? (
                <div className="flex justify-center p-4"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
              ) : turmas.length === 0 ? (
                <p className="text-center text-muted-foreground text-sm py-8">Nenhuma turma cadastrada.</p>
              ) : (
                turmas.map(t => (
                  <Card key={t.id} className="border-border">
                    <CardContent className="p-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-bold text-sm">{t.nome}</p>
                          <p className="text-xs text-muted-foreground uppercase">{t.curso}</p>
                          <p className="text-[10px] text-muted-foreground">{t.universidade}</p>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <code className="bg-muted px-1.5 py-0.5 rounded text-[10px] font-mono">{t.codigo}</code>
                          <div className="flex gap-1 mt-1">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-7 w-7 text-muted-foreground hover:text-primary"
                              onClick={() => handleEdit(t)}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-7 w-7 text-muted-foreground hover:text-destructive"
                              onClick={() => handleDelete(t.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
