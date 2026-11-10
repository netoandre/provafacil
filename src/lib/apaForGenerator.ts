import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { Exam } from '@/types/question';

export interface ApaForData {
  quantidadeProvas: number;
  folhaResposta: 'sim' | 'nao';
}

export async function generateApaFor(exam: Exam, data: ApaForData) {
  const response = await fetch('/APA-FOR.xlsx');
  const arrayBuffer = await response.arrayBuffer();

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(arrayBuffer);

  const sheet = workbook.worksheets[0]; 

  const setCell = (cellRef: string, value: any) => {
    const cell = sheet.getCell(cellRef);
    cell.value = value;
  };

  const curso = exam.turma?.curso || '';
  setCell('B13', curso);
  setCell('B41', curso);

  const disciplina = exam.discipline?.name || '';
  setCell('B14', disciplina);
  setCell('B42', disciplina);

  const turmaCodigo = exam.turma?.codigo || exam.turma?.nome || '';
  setCell('B16', turmaCodigo);
  setCell('B44', turmaCodigo);

  const qtd = data.quantidadeProvas;
  ['H38', 'H45', 'H9', 'H17', 'E18', 'E46'].forEach(ref => setCell(ref, qtd));

  const date = new Date();
  const months = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
  const dataExtenso = `Belém - PA, ${date.getDate()} de ${months[date.getMonth()]} de ${date.getFullYear()}`;
  setCell('A22', dataExtenso);
  setCell('A50', dataExtenso);

  const periodo = exam.period?.label || exam.turma?.periodo || '';
  setCell('E16', periodo);
  setCell('E44', periodo);

  const turno = exam.turma?.turno || '';
  setCell('H16', turno);
  setCell('H44', turno);

  const tipo = exam.tipoProva || '1ª Avaliação';
  if (tipo === '1ª Avaliação' || tipo === 'Av1') {
    setCell('B8', 'SIM');
    setCell('B36', 'SIM');
  } else if (tipo === '2ª Avaliação' || tipo === 'Av2') {
    setCell('B9', 'SIM');
    setCell('B37', 'SIM');
  } else if (tipo === '2ª Chamada') {
    setCell('B10', 'SIM');
    setCell('B38', 'SIM');
  } else if (tipo === 'Prova Final' || tipo === 'Final') {
    setCell('B11', 'SIM');
    setCell('B39', 'SIM');
  }

  const buffer = await workbook.xlsx.writeBuffer();
  saveAs(new Blob([buffer]), `APA_FOR_${exam.title.replace(/\s+/g, '_')}.xlsx`);
}
