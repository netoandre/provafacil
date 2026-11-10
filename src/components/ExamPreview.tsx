import { Exam } from '@/types/question';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Printer, Copy, Check, Download, FileSpreadsheet } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { generateDocx } from '@/lib/docxGenerator';
import { generateApaFor } from '@/lib/apaForGenerator';
import { ApaForDialog } from './ApaForDialog';

interface ExamPreviewProps {
  exam: Exam;
  fontSize?: number;
}

export function ExamPreview({ exam, fontSize = 12 }: ExamPreviewProps) {
  const [copied, setCopied] = useState(false);
  const [apaForDialogOpen, setApaForDialogOpen] = useState(false);

  const handleDownloadDocx = async () => {
    try {
      await generateDocx(exam);
      toast.success('Download do DOCX iniciado!');
    } catch (error) {
      toast.error('Erro ao gerar DOCX');
      console.error(error);
    }
  };

  const handleGenerateApaFor = async (data: { quantidadeProvas: number; folhaResposta: 'sim' | 'nao' }) => {
    try {
      await generateApaFor(exam, data);
      toast.success('Download da planilha APA-FOR iniciado!');
    } catch (error) {
      toast.error('Erro ao gerar APA-FOR');
      console.error(error);
    }
  };

  const formatExamForCopy = (examData: Exam): string => {
    // Helper to strip HTML for plain text copy
    const stripHtml = (html: string) => {
      const doc = new DOMParser().parseFromString(html, 'text/html');
      return doc.body.textContent || '';
    };

    let text = `${examData.title}\n\n`;
    let objCount = 1;
    let subCount = 1;

    examData.questions.forEach((eq) => {
      const statement = stripHtml(eq.question.text);
      if (eq.question.type === 'objetiva') {
        text += `${objCount}. ${statement}\n`;
        eq.shuffledAlternatives.forEach((alt, i) => {
          text += `${String.fromCharCode(65 + i)}) ${alt.text}\n`;
        });
        text += '\n';
        objCount++;
      } else {
        text += `Questão Discursiva ${subCount}. ${statement}\n\n`;
        subCount++;
      }
    });

    return text;
  };

  const handleCopy = async () => {
    const text = formatExamForCopy(exam);
    await navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success('Prova copiada para a área de transferência!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  let objIndex = 0;
  let subIndex = 0;

  return (
    <Card className="print:hidden">
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle className="font-serif text-xl">{exam.title}</CardTitle>
        <div className="flex gap-2 flex-shrink-0">
          <Button onClick={handleCopy} variant="outline" size="sm" className="gap-2">
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? 'Copiado!' : 'Copiar'}
          </Button>
          <Button onClick={handleDownloadDocx} variant="outline" size="sm" className="gap-2">
            <Download className="h-4 w-4" /> DOCX
          </Button>
          <Button onClick={() => setApaForDialogOpen(true)} variant="outline" size="sm" className="gap-2">
            <FileSpreadsheet className="h-4 w-4" /> APA-FOR
          </Button>
          <Button onClick={handlePrint} variant="default" size="sm" className="gap-2">
            <Printer className="h-4 w-4" /> Imprimir
          </Button>
        </div>
      </CardHeader>
      <CardContent 
        className="space-y-6" 
        style={{ 
          fontSize: `${fontSize}pt`,
          '--exam-font-size': `${fontSize}pt`
        } as any}
      >
        {exam.questions.map((eq) => {
          const isObj = eq.question.type === 'objetiva';
          if (isObj) objIndex++;
          else subIndex++;

          return (
            <div key={eq.question.id} className="space-y-2 border-b border-border/50 pb-4 last:border-0">
              <div className="font-medium leading-relaxed">
                <span className="text-primary font-semibold">
                  {isObj ? `Questão ${objIndex})` : `Questão Discursiva ${subIndex})`}
                </span>{' '}
                <div 
                  className="inline-block [&_p]:m-0" 
                  dangerouslySetInnerHTML={{ __html: eq.question.text }} 
                />
                <span className="text-muted-foreground ml-2 whitespace-nowrap font-bold" style={{ fontSize: '0.75em' }}>
                  ({eq.score.toLocaleString('pt-BR', { minimumFractionDigits: 1 })} {eq.score === 1 ? 'pt' : 'pts'})
                </span>
              </div>
              {isObj && (
                <div className="space-y-1 pl-4">
                  {eq.shuffledAlternatives.map((alt, j) => (
                    <div key={alt.id} className="text-muted-foreground flex gap-2" style={{ fontSize: '0.875em' }}>
                      <span className="font-mono font-medium shrink-0">{String.fromCharCode(65 + j)})</span>
                      <span dangerouslySetInnerHTML={{ __html: alt.text }} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
      <ApaForDialog 
        open={apaForDialogOpen} 
        onOpenChange={setApaForDialogOpen} 
        onConfirm={handleGenerateApaFor} 
      />
    </Card>
  );
}
