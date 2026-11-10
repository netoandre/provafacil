import { saveAs } from 'file-saver';
import { asBlob } from 'html-docx-js-typescript';
import { Exam } from '@/types/question';

async function getBase64ImageFromUrl(url: string): Promise<string> {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        resolve(reader.result as string);
      };
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error('Erro ao carregar imagem:', url, error);
    return '';
  }
}

export async function generateDocx(exam: Exam) {
  const logoEsq = await getBase64ImageFromUrl('/logo_esquerda.png');
  const logoDir = await getBase64ImageFromUrl('/logo_direita.png');

  const universidade = exam.turma?.universidade || 'UNIVERSIDADE DA AMAZÔNIA';
  const curso = exam.turma?.curso || 'CIÊNCIA DA COMPUTAÇÃO';
  const disciplina = exam.discipline?.name || '';
  const professor = exam.professorName || '';
  const turmaCodigo = exam.turma?.codigo || '';
  const turmaNome = exam.turma?.nome || '';
  const tipoAvaliacao = exam.evaluationType || exam.tipoProva || '1ª Avaliação';

  const objectiveQuestions = exam.questions.filter(q => q.question.type === 'objetiva');
  let gabaritoHtml = '';

  let htmlString = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <title>${exam.title}</title>
      <style>
        body { font-family: Arial, Helvetica, sans-serif; font-size: 11pt; color: #000; }
        
        .header-top { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
        .header-top td { border: none; vertical-align: middle; }
        .header-top .logo { width: 20%; text-align: center; }
        .header-top .logo img { max-width: 100px; max-height: 80px; }
        .header-top .text-center { width: 60%; text-align: center; font-weight: bold; font-size: 11pt; line-height: 1.2; color: #595959; }
        .header-top .text-center div { margin-bottom: 2px; }
        
        .info-table { width: 100%; border-collapse: collapse; margin-bottom: 2px; font-size: 10pt; font-weight: bold; table-layout: fixed; }
        .info-table th, .info-table td { border: 2px solid #000; padding: 6px; vertical-align: middle; }
        .bg-blue { background-color: #dbe5f1; }
        .text-center { text-align: center; }
        .font-medium { font-weight: normal; }
        .uppercase { text-transform: uppercase; }
        
        .attention-box { border: 1px solid #000; padding: 10px; font-size: 9pt; margin-bottom: 15px; margin-top: 10px; line-height: 1.3; }
        
        .gabarito-grid { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 10pt; }
        .gabarito-grid td { border: 1px solid #000; padding: 4px; }
        
        .question-container { margin-bottom: 20px; text-align: justify; page-break-inside: avoid; }
        .alternatives { padding-left: 20px; margin-top: 5px; }
        .alternative { margin-bottom: 5px; }
        
        /* GABARITO PROFESSOR */
        .gabarito-prof-table { width: 100%; border-collapse: collapse; margin-top: 40px; text-align: center; font-size: 11pt; }
        .gabarito-prof-table th, .gabarito-prof-table td { border: 1px solid #000; padding: 8px; }
      </style>
    </head>
    <body>
      <table class="header-top">
        <tr>
          <td class="logo">
            ${logoEsq ? `<img src="${logoEsq}" alt="" />` : ''}
          </td>
          <td class="text-center">
            <div>${universidade.toUpperCase()}</div>
            <div>CURSO DE ${curso.toUpperCase()}</div>
            <div>DISCIPLINA: ${disciplina.toUpperCase()}</div>
            <div style="font-size: 14pt; margin-top: 5px;">${tipoAvaliacao}</div>
          </td>
          <td class="logo">
            ${logoDir ? `<img src="${logoDir}" alt="" />` : ''}
          </td>
        </tr>
      </table>

      <table class="info-table">
        <tr style="height: 35px;">
          <td class="bg-blue text-center uppercase" style="width: 20%;">ALUNO</td>
          <td colspan="3" style="width: 50%;"></td>
          <td class="bg-blue text-center uppercase" style="font-size: 8pt; width: 15%;">MATRÍCULA</td>
          <td style="width: 15%;"></td>
        </tr>
        <tr style="height: 35px;">
          <td class="bg-blue text-center uppercase">DISCIPLINA</td>
          <td colspan="3" class="text-center font-medium uppercase">${disciplina}</td>
          <td class="bg-blue text-center uppercase" style="font-size: 8pt;">DATA DA PROVA</td>
          <td></td>
        </tr>
        <tr style="height: 35px;">
          <td class="bg-blue text-center uppercase">PROFESSOR</td>
          <td colspan="3" class="text-center font-medium uppercase">${professor}</td>
          <td class="bg-blue text-center uppercase" style="font-size: 8pt;">TIPO DE PROVA</td>
          <td class="text-center uppercase">${exam.tipoProva || 'A'}</td>
        </tr>
        <tr style="height: 35px;">
          <td class="bg-blue text-center uppercase" style="width: 20%;">TURMA</td>
          <td class="text-center font-medium uppercase" style="width: 23%;">${turmaNome}</td>
          <td class="bg-blue text-center uppercase" style="font-size: 8pt;">CÓDIGO DA<br/>TURMA</td>
          <td class="text-center font-medium uppercase" style="font-size: 9pt; width: 13%;">${turmaCodigo}</td>
          <td class="bg-blue text-center uppercase" style="width: 15%;">NOTA</td>
          <td style="width: 15%;"></td>
        </tr>
      </table>
      <div style="text-align: right; font-size: 8pt; font-family: Arial; margin-bottom: 10px;">CCG-MDL-17 Versão 01</div>

      <div class="attention-box">
        <strong>ATENÇÃO:</strong><br/>
        - A avaliação somente poderá ser entregue depois de decorridos 50 min de seu início.<br/>
        - Caneta esferográfica azul ou preta. Provas entregues escritas a lápis <strong>NÃO</strong> serão corrigidas.<br/>
        - Será atribuída nota zero a aluno que devolver sua prova em branco, independentemente de ter assinado a Ata de Prova.<br/>
        - Ao aluno flagrado <strong>utilizando meios ilícitos ou não autorizados pelo professor para responder a avaliação</strong> será atribuída nota zero e, mediante representação do professor, responderá a Procedimento Administrativo Disciplinar, com base no Código de Ética.
      </div>

      ${gabaritoHtml}
  `;

  let objIndex = 0;
  let subIndex = 0;
  
  const gabaritoProf: { questao: number; resposta: string }[] = [];

  exam.questions.forEach((eq) => {
    const isObj = eq.question.type === 'objetiva';
    if (isObj) {
      objIndex++;
    } else {
      subIndex++;
    }

    const label = isObj ? `<strong>${objIndex}.</strong>` : `<strong>Questão Discursiva ${subIndex}.</strong>`;
    const scoreText = eq.score > 0 ? `(${eq.score.toLocaleString('pt-BR', { minimumFractionDigits: 1 })} ${eq.score === 1 ? 'pt' : 'pts'})` : '';

    htmlString += `
      <div class="question-container">
        <div style="display: flex; gap: 4px; margin-bottom: 8px;">
          ${label} ${eq.question.text} <strong>${scoreText}</strong>
        </div>
    `;

    if (isObj && eq.shuffledAlternatives) {
      htmlString += `<div class="alternatives">`;
      eq.shuffledAlternatives.forEach((alt, i) => {
        const letter = String.fromCharCode(97 + i); // a, b, c, d
        htmlString += `<div class="alternative" style="display: flex; gap: 8px;"><strong style="width: 20px;">${letter})</strong> <span>${alt.text}</span></div>`;
      });
      htmlString += `</div>`;
    } else {
      htmlString += `
        <div style="margin-top: 20px; border-bottom: 1px solid #ccc; height: 30px;"></div>
        <div style="border-bottom: 1px solid #ccc; height: 30px;"></div>
        <div style="border-bottom: 1px solid #ccc; height: 30px;"></div>
      `;
    }

    htmlString += `</div>`;
  });

  htmlString += `
    </body>
    </html>
  `;

  const blob = await asBlob(htmlString, {
    orientation: 'portrait',
    margins: { top: 720, right: 720, bottom: 720, left: 720 }
  });

  saveAs(blob as Blob, `${exam.title.replace(/\s+/g, '_')}.docx`);
}
