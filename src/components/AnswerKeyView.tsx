import { Exam } from '@/types/question';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Copy } from 'lucide-react';
import { toast } from 'sonner';

interface AnswerKeyViewProps {
  exam: Exam;
}

export function AnswerKeyView({ exam }: AnswerKeyViewProps) {
  const answerKey = exam.questions
    .filter(eq => eq.question.type === 'objetiva')
    .map((eq, i) => ({
      number: i + 1,
      answer: String.fromCharCode(65 + eq.correctIndex)
    }));

  const handleCopyText = () => {
    const text = answerKey.map(item => `${item.number}-${item.answer}`).join(', ');
    navigator.clipboard.writeText(text);
    toast.success('Gabarito copiado em texto simples!');
  };

  return (
    <Card className="border-primary/30 bg-accent/20 print:hidden">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="font-serif text-lg">Gabarito — {exam.title}</CardTitle>
        <Button variant="outline" size="sm" onClick={handleCopyText} className="gap-2">
          <Copy className="h-4 w-4" /> Copiar Texto
        </Button>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 gap-2">
          {answerKey.map(item => (
            <div key={item.number} className="flex flex-col items-center gap-1 p-2 rounded-md bg-card border border-border">
              <span className="text-xs text-muted-foreground font-medium">{item.number}</span>
              <Badge className="bg-primary text-primary-foreground font-bold text-sm w-8 h-8 flex items-center justify-center rounded-full p-0">
                {item.answer}
              </Badge>
            </div>
          ))}
        </div>
        {exam.questions.some(eq => eq.question.type === 'subjetiva') && (
          <div className="mt-4 pt-3 border-t border-border">
            <p className="text-sm text-muted-foreground font-medium mb-2">Questões Subjetivas:</p>
            {exam.questions.filter(eq => eq.question.type === 'subjetiva').map((eq, i) => (
              <div key={eq.question.id} className="text-sm text-foreground mb-1">
                <span className="font-medium">Discursiva {i + 1}:</span> {eq.question.text.substring(0, 80)}...
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
