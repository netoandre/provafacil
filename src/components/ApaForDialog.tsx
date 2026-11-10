import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface ApaForDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (data: { quantidadeProvas: number; folhaResposta: 'sim' | 'nao' }) => void;
}

export function ApaForDialog({ open, onOpenChange, onConfirm }: ApaForDialogProps) {
  const [quantidadeProvas, setQuantidadeProvas] = useState<number>(1);
  const [folhaResposta, setFolhaResposta] = useState<'sim' | 'nao'>('sim');

  const handleConfirm = () => {
    onConfirm({ quantidadeProvas, folhaResposta });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Gerar APA-FOR</DialogTitle>
          <DialogDescription>
            Preencha os dados complementares para gerar a planilha APA-FOR.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="quantidade" className="text-right">
              Qtd. Provas
            </Label>
            <Input
              id="quantidade"
              type="number"
              min={1}
              value={quantidadeProvas}
              onChange={(e) => setQuantidadeProvas(Number(e.target.value))}
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="folha" className="text-right">
              Folha Resposta
            </Label>
            <Select value={folhaResposta} onValueChange={(val: 'sim' | 'nao') => setFolhaResposta(val)}>
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sim">Sim</SelectItem>
                <SelectItem value="nao">Não</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleConfirm}>Gerar e Baixar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
