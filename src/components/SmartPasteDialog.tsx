import { useState } from 'react';
import { parseQuestionText } from '@/lib/question-parser';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ClipboardPaste, Check, AlertCircle } from 'lucide-react';
import { Alternative } from '@/types/question';

interface SmartPasteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onParsed: (statement: string, alternatives: Alternative[], score?: number) => void;
}

export function SmartPasteDialog({ open, onOpenChange, onParsed }: SmartPasteDialogProps) {
  const [raw, setRaw] = useState('');
  const parsed = raw.trim() ? parseQuestionText(raw) : null;

  const handleApply = () => {
    if (!parsed) return;
    const alts: Alternative[] = parsed.alternatives.map(text => ({
      id: crypto.randomUUID(),
      text,
      isCorrect: false,
    }));
    onParsed(parsed.statement, alts);
    setRaw('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardPaste className="h-5 w-5" /> Colar Questão
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Cole a questão completa abaixo (enunciado + alternativas):</Label>
            <Textarea
              value={raw}
              onChange={e => setRaw(e.target.value)}
              placeholder={`Exemplo:\nQual é a capital do Brasil?\nA) São Paulo\nB) Rio de Janeiro\nC) Brasília\nD) Salvador`}
              className="min-h-[160px] resize-y font-mono text-sm"
            />
          </div>

          {raw.trim() && (
            <div className="rounded-lg border border-border p-4 space-y-3">
              {parsed ? (
                <>
                  <div className="flex items-center gap-2 text-success">
                    <Check className="h-4 w-4" />
                    <span className="text-sm font-medium">Questão reconhecida!</span>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">Enunciado:</p>
                    <p className="text-sm bg-muted p-2 rounded">{parsed.statement}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">Alternativas ({parsed.alternatives.length}):</p>
                    {parsed.alternatives.map((alt, i) => (
                      <p key={i} className="text-sm bg-muted p-2 rounded">
                        <span className="font-medium text-primary">{String.fromCharCode(65 + i)})</span> {alt}
                      </p>
                    ))}
                  </div>
                </>
              ) : (
                <div className="flex items-center gap-2 text-warning">
                  <AlertCircle className="h-4 w-4" />
                  <span className="text-sm">Não foi possível identificar as alternativas. Use o formato: A) texto, B) texto...</span>
                </div>
              )}
            </div>
          )}

          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => { setRaw(''); onOpenChange(false); }}>
              Cancelar
            </Button>
            <Button onClick={handleApply} disabled={!parsed}>
              Aplicar no Formulário
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
