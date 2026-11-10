import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { User, Plus, Trash2, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

interface ProfessorManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate?: () => void;
}

export function ProfessorManager({ open, onOpenChange, onUpdate }: ProfessorManagerProps) {
  const [professors, setProfessors] = useState<string[]>([]);
  const [newName, setNewName] = useState('');

  useEffect(() => {
    if (open) {
      const saved = localStorage.getItem('saved_professors');
      if (saved) {
        setProfessors(JSON.parse(saved));
      }
    }
  }, [open]);

  const handleAdd = () => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    if (professors.includes(trimmed)) {
      toast.error('Este professor já está cadastrado.');
      return;
    }
    const next = [...professors, trimmed];
    setProfessors(next);
    localStorage.setItem('saved_professors', JSON.stringify(next));
    setNewName('');
    toast.success('Professor adicionado à lista local.');
    onUpdate?.();
  };

  const handleDelete = (name: string) => {
    const next = professors.filter(p => p !== name);
    setProfessors(next);
    localStorage.setItem('saved_professors', JSON.stringify(next));
    onUpdate?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" /> Gerenciar Professores
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex items-end gap-2">
            <div className="space-y-1.5 flex-1">
              <Label htmlFor="prof-name">Novo Professor</Label>
              <Input
                id="prof-name"
                placeholder="Ex: Prof. André"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAdd()}
              />
            </div>
            <Button onClick={handleAdd} className="gap-1">
              <Plus className="h-4 w-4" /> Adicionar
            </Button>
          </div>

          <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
            {professors.length === 0 ? (
              <p className="text-sm text-muted-foreground italic text-center py-4">Nenhum professor cadastrado localmente.</p>
            ) : (
              professors.map(name => (
                <div key={name} className="flex items-center justify-between p-2 rounded-lg border border-border bg-muted/30">
                  <span className="text-sm font-medium">{name}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(name)}
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))
            )}
          </div>

          <div className="pt-2 text-[10px] text-muted-foreground flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3" /> Estes nomes ficam salvos apenas neste navegador.
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
