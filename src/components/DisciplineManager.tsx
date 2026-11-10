import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchDisciplines, postDiscipline, deleteDiscipline } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Trash2, GraduationCap, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface DisciplineManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: () => void;
}

export function DisciplineManager({ open, onOpenChange, onUpdate }: DisciplineManagerProps) {
  const queryClient = useQueryClient();
  const [newName, setNewName] = useState('');

  const { data: disciplines = [], isLoading } = useQuery({ 
    queryKey: ['disciplines'], 
    queryFn: fetchDisciplines,
    enabled: open // Only fetch when dialog is open
  });

  const createMutation = useMutation({
    mutationFn: postDiscipline,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['disciplines'] });
      setNewName('');
      onUpdate();
      toast.success('Disciplina adicionada com sucesso!');
    },
    onError: () => {
      toast.error('Erro ao adicionar disciplina.');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: deleteDiscipline,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['disciplines'] });
      onUpdate();
      toast.success('Disciplina excluída com sucesso!');
    },
    onError: () => {
      toast.error('Erro ao excluir a disciplina na API.');
    }
  });

  const handleAdd = () => {
    const name = newName.trim();
    if (!name) return;
    if (disciplines.some(d => d.name.toLowerCase() === name.toLowerCase())) {
      toast.error('Disciplina já existe!');
      return;
    }
    createMutation.mutate(name);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir esta disciplina?')) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5" /> Gerenciar Disciplinas
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex gap-2">
            <Input
              value={newName}
              onChange={e => setNewName(e.target.value)}
              placeholder="Nova disciplina..."
              onKeyDown={e => e.key === 'Enter' && handleAdd()}
              disabled={createMutation.isPending}
            />
            <Button onClick={handleAdd} size="icon" className="flex-shrink-0" disabled={createMutation.isPending}>
              {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            </Button>
          </div>
          <div className="space-y-1 max-h-60 overflow-auto">
            {isLoading ? (
              <div className="flex justify-center py-4"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            ) : disciplines.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Nenhuma disciplina cadastrada</p>
            ) : (
              disciplines.map(d => (
                <div key={d.id} className="flex items-center justify-between px-3 py-2 rounded-md hover:bg-muted transition-colors">
                  <span className="text-sm">{d.name}</span>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => handleDelete(d.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
