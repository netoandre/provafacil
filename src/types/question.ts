export interface Alternative {
  id: string;
  text: string;
  isCorrect: boolean;
}

export type QuestionType = 'objetiva' | 'subjetiva';

export interface Question {
  id: string;
  text: string;
  type: 'objetiva' | 'subjetiva';
  disciplineId?: string;
  tags: string[];
  alternatives: Alternative[];
  evaluation?: string;
  difficulty?: string;
  isAdapted?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Discipline {
  id: string;
  name: string;
}

export interface Turma {
  id: string;
  nome: string;
  codigo: string;
  curso: string;
  universidade: string;
  periodo?: string;
  turno?: string;
}

export interface Tag {
  id: string;
  name: string;
}

export interface ExamQuestion {
  question: Question;
  shuffledAlternatives: Alternative[];
  correctIndex: number;
  score: number;
}

export interface Period {
  id: string;
  year: number;
  semester: number;
  label: string; // ex: "2026.1"
  is_active: boolean;
}

export interface PeriodTurmaDiscipline {
  id: string;
  period_id: string;
  turma: { id: string; nome: string; codigo: string } | null;
  discipline: { id: string; name: string } | null;
}

export interface User {
  id: string;
  name: string;
  email: string;
  active_period: Period | null;
}

export interface Exam {
  id: string;
  title: string;
  questions: ExamQuestion[];
  discipline?: Discipline;
  turma?: Turma;
  professorName?: string;
  tipoProva?: string;
  evaluationType?: string;
  totalScore?: number;
  createdAt: string;
  period?: Period;
}

export interface PostExamPayload {
  title: string;
  discipline_id?: number | null;
  questions: { id: number; score: number }[];
  turma_id?: number | null;
  professor_name?: string;
  tipo_prova?: string;
  evaluation_type?: string;
  period_id?: number | null;
}
