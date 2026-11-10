import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchTags, postTag, deleteTag } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Trash2, Tags, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface TagManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: () => void;
}

export function TagManager({ open, onOpenChange, onUpdate }: TagManagerProps) {
  const queryClient = useQueryClient();
  const [newName, setNewName] = useState('');

  const { data: tags = [], isLoading } = useQuery({ 
    queryKey: ['tags'], 
    queryFn: fetchTags,
    enabled: open // Only fetch when dialog is open
  });

  const createMutation = useMutation({
    mutationFn: postTag,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tags'] });
      setNewName('');
      onUpdate();
      toast.success('Tag adicionada com sucesso!');
    },
    onError: () => {
      toast.error('Erro ao adicionar a tag na API.');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: deleteTag,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tags'] });
      onUpdate();
      toast.success('Tag excluída com sucesso!');
    },
    onError: () => {
      toast.error('Erro ao excluir a tag na API.');
    }
  });

  const handleAdd = () => {
    const name = newName.trim().toLowerCase();
    if (!name) return;
    if (tags.some(t => t.name.toLowerCase() === name)) {
      toast.error('Esta tag já existe!');
      return;
    }
    createMutation.mutate(name);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir esta tag?')) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Tags className="h-5 w-5" /> Gerenciar Tags
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex gap-2">
            <Input
              value={newName}
              onChange={e => setNewName(e.target.value)}
              placeholder="Nova tag (ex: matemática)..."
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
            ) : tags.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Nenhuma tag cadastrada</p>
            ) : (
              tags.map(t => (
                <div key={t.id} className="flex items-center justify-between px-3 py-2 rounded-md hover:bg-muted transition-colors">
                  <span className="text-sm">{t.name}</span>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => handleDelete(t.id)}>
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
