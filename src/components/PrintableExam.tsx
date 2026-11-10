import { Exam } from '@/types/question';

interface PrintableExamProps {
  exam: Exam;
  fontSize?: number;
}

export function PrintableExam({ exam, fontSize = 12 }: PrintableExamProps) {
  const objectiveQuestions = exam.questions.filter(q => q.question.type === 'objetiva');
  
  return (
    <div 
      className="printable-exam hidden print:block bg-white text-black p-0 leading-tight w-full min-h-[297mm]"
      style={{ 
        fontFamily: 'Arial, Helvetica, sans-serif', 
        fontSize: `${fontSize}pt`,
        '--exam-font-size': `${fontSize}pt`
      } as any}
    >
      {/* Header with Logos */}
      <div className="flex items-center justify-between mb-4">
        <img src="/logo_esquerda.png" alt="Logo Esquerda" className="h-16 object-contain" />
        <div className="text-center font-bold uppercase space-y-0.5 max-w-[60%]">
          <div style={{ fontSize: '0.85em' }}>{exam.turma?.universidade || 'UNIVERSIDADE'}</div>
          <div style={{ fontSize: '0.85em' }}>{exam.turma?.curso || 'CURSO'}</div>
          <div style={{ fontSize: '0.85em' }}>DISCIPLINA: {exam.discipline?.name || 'DISCIPLINA'}</div>
          <div className="mt-2" style={{ fontSize: '1.1em' }}>{exam.evaluationType || 'AVALIAÇÃO'}</div>
        </div>
        <img src="/logo_direita.png" alt="Logo Direita" className="h-16 object-contain" />
      </div>

      {/* Header Table (6 column grid for perfect alignment) */}
      <div className="mb-4">
        <table className="w-full border-collapse border-[1.5pt] border-black table-fixed">
          <tbody>
            <tr className="h-10">
              <td className="border border-black bg-[#dbe5f1] font-bold px-1 w-[20%] text-center uppercase">ALUNO</td>
              <td className="border border-black px-2 w-[50%]" colSpan={3}></td>
              <td className="border border-black bg-[#dbe5f1] font-bold px-1 w-[15%] text-center uppercase" style={{ fontSize: '0.75em' }}>MATRÍCULA</td>
              <td className="border border-black px-2 w-[15%]"></td>
            </tr>
            <tr className="h-10">
              <td className="border border-black bg-[#dbe5f1] font-bold px-1 text-center uppercase">DISCIPLINA</td>
              <td className="border border-black px-2 text-center font-medium" colSpan={3}>{exam.discipline?.name}</td>
              <td className="border border-black bg-[#dbe5f1] font-bold px-1 text-center uppercase" style={{ fontSize: '0.75em' }}>DATA DA PROVA</td>
              <td className="border border-black px-2"></td>
            </tr>
            <tr className="h-10">
              <td className="border border-black bg-[#dbe5f1] font-bold px-1 text-center uppercase">PROFESSOR</td>
              <td className="border border-black px-2 text-center font-medium uppercase" colSpan={3}>{exam.professorName}</td>
              <td className="border border-black bg-[#dbe5f1] font-bold px-1 text-center uppercase" style={{ fontSize: '0.75em' }}>TIPO DE PROVA</td>
              <td className="border border-black px-2 text-center font-bold uppercase leading-tight" style={{ fontSize: '0.92em' }}>{exam.tipoProva}</td>
            </tr>
            <tr className="h-10">
              <td className="border border-black bg-[#dbe5f1] font-bold px-1 text-center uppercase w-[20%]">TURMA</td>
              <td className="border border-black px-2 text-center font-medium uppercase w-[23%]">{exam.turma?.nome}</td>
              <td className="border border-black bg-[#dbe5f1] font-bold px-1 text-center uppercase leading-none" style={{ fontSize: '0.625em' }}>CÓDIGO DA TURMA</td>
              <td className="border border-black px-1 text-center font-medium w-[13%]" style={{ fontSize: '0.75em' }}>{exam.turma?.codigo}</td>
              <td className="border border-black bg-[#dbe5f1] font-bold px-1 text-center uppercase w-[15%]">NOTA</td>
              <td className="border border-black px-2 w-[15%]"></td>
            </tr>
          </tbody>
        </table>
        <div className="text-right mt-0.5 uppercase font-medium" style={{ fontSize: '0.58em' }}>CCG-MDL-17 Versão 01</div>
      </div>

      {/* Instructions Box */}
      <div className="mb-6">
        <div className="border border-black p-4 space-y-1" style={{ fontSize: '0.75em' }}>
          <div className="font-bold">ATENÇÃO:</div>
          <p>- A avaliação somente poderá ser entregue depois de decorridos 50 min de seu início.</p>
          <p>- Caneta esferográfica azul ou preta. Provas entregues escritas a lápis <span className="font-bold">NÃO</span> serão corrigidas.</p>
          <p>- Será atribuída nota zero a aluno que devolver sua prova em branco, independentemente de ter assinado a Ata de Prova.</p>
          <p>- Ao aluno flagrado <span className="font-bold">utilizando meios ilícitos ou não autorizados pelo professor para responder a avaliação</span> será atribuída nota zero e, mediante representação do professor, responderá a Procedimento Administrativo Disciplinar, com base no Código de Ética.</p>
        </div>
      </div>

      {/* Gabarito Grid */}
      <div className="mb-8">
        <div className="font-bold mb-1">GABARITO:</div>
        <div className="flex w-full border-l border-t border-black">
          {objectiveQuestions.map((_, i) => (
            <div key={i} className="flex-1 min-w-0">
              <div className="border-r border-b border-black bg-[#dbe5f1] text-center font-bold h-7 flex items-center justify-center">{i + 1}</div>
              <div className="border-r border-b border-black h-9"></div>
            </div>
          ))}
          {/* Fill the rest of the row with empty cells if we want 10 or similar? 
              User asked for 100% width, so flex-1 handles it. */}
        </div>
      </div>

      {/* Questions list */}
      <div className="space-y-6 pb-12">
        {exam.questions.map((eq, i) => (
          <div key={i} className="break-inside-avoid">
            <div className="font-bold mb-2 flex flex-wrap gap-x-1 items-baseline">
              <span>{i + 1}.</span>
              <div 
                className="block w-full [&_p]:m-0 [&_pre]:bg-zinc-50 [&_pre]:p-3 [&_pre]:rounded-md [&_pre]:my-2 [&_pre]:font-mono [&_pre]:text-[0.9em] [&_code]:bg-zinc-50 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:font-mono print:overflow-visible overflow-x-auto max-w-full" 
                dangerouslySetInnerHTML={{ __html: eq.question.text }} 
              />
              {eq.score > 0 && (
                <span className="ml-1 whitespace-nowrap">
                  ({eq.score.toLocaleString('pt-BR', { minimumFractionDigits: 1 })} {eq.score === 1 ? 'pt' : 'pts'})
                </span>
              )}
            </div>
            
            {eq.question.type === 'objetiva' ? (
              <div className="ml-6 space-y-1.5">
                {eq.shuffledAlternatives.map((alt, altIdx) => (
                  <div key={altIdx} className="flex gap-2">
                    <span className="font-bold w-5">{String.fromCharCode(97 + altIdx)})</span>
                    <span dangerouslySetInnerHTML={{ __html: alt.text }} />
                  </div>
                ))}
              </div>
            ) : (
              <div className="ml-4 space-y-2">
                <div className="border-b border-black/30 h-8"></div>
                <div className="border-b border-black/30 h-8"></div>
                <div className="border-b border-black/30 h-8"></div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
