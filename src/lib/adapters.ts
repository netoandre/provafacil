import { Question, Alternative, Exam, ExamQuestion, Discipline, Tag, Turma, Period, PeriodTurmaDiscipline, User } from '@/types/question';

export function mapAlternativeFromApi(apiData: any): Alternative {
  return {
    id: String(apiData.id || crypto.randomUUID()),
    text: apiData.text || '',
    isCorrect: Boolean(apiData.is_correct),
  };
}

export function mapQuestionFromApi(apiData: any): Question {
  return {
    id: String(apiData.id),
    text: apiData.title || apiData.text || '',
    type: apiData.type === 'objective' ? 'objetiva' : 'subjetiva',
    alternatives: Array.isArray(apiData.alternatives)
      ? apiData.alternatives.map(mapAlternativeFromApi)
      : [],
    tags: Array.isArray(apiData.tags) ? apiData.tags.map((t: any) => typeof t === 'string' ? t : t.name) : [],
    disciplineId: Array.isArray(apiData.disciplines) && apiData.disciplines.length > 0
      ? String(apiData.disciplines[0].id)
      : (apiData.discipline_id ? String(apiData.discipline_id) : undefined),
    evaluation: apiData.evaluation || undefined,
    difficulty: apiData.difficulty || 'Médio',
    isAdapted: Boolean(apiData.is_adapted),
    createdAt: apiData.created_at || new Date().toISOString(),
    updatedAt: apiData.updated_at || new Date().toISOString(),
  };
}

export function mapDisciplineFromApi(apiData: any): Discipline {
  return {
    id: String(apiData.id),
    name: apiData.name,
  };
}

export function mapTurmaFromApi(apiData: any): Turma {
  return {
    id: String(apiData.id),
    nome: apiData.nome,
    codigo: apiData.codigo,
    curso: apiData.curso,
    universidade: apiData.universidade,
    periodo: apiData.periodo,
    turno: apiData.turno,
  };
}

export function mapTagFromApi(apiData: any): Tag {
  return {
    id: String(apiData.id),
    name: apiData.name,
  };
}

export function mapPeriodFromApi(apiData: any): Period {
  return {
    id: String(apiData.id),
    year: Number(apiData.year),
    semester: Number(apiData.semester),
    label: apiData.label || `${apiData.year}.${apiData.semester}`,
    is_active: Boolean(apiData.is_active),
  };
}

export function mapPeriodTurmaDisciplineFromApi(apiData: any): PeriodTurmaDiscipline {
  return {
    id: String(apiData.id),
    period_id: String(apiData.period_id),
    turma: apiData.turma ? {
      id: String(apiData.turma.id),
      nome: apiData.turma.nome,
      codigo: apiData.turma.codigo,
    } : null,
    discipline: apiData.discipline ? {
      id: String(apiData.discipline.id),
      name: apiData.discipline.name,
    } : null,
  };
}

export function mapUserFromApi(apiData: any): User {
  return {
    id: String(apiData.id),
    name: apiData.name,
    email: apiData.email,
    active_period: apiData.active_period ? mapPeriodFromApi(apiData.active_period) : null,
  };
}

export function mapExamFromApi(apiData: any): Exam {
  return {
    id: String(apiData.id),
    title: apiData.title,
    questions: (apiData.questions || []).map((eq: any) => ({
      question: mapQuestionFromApi(eq),
      shuffledAlternatives: (eq.alternatives || []).map((alt: any) => ({
        id: String(alt.id),
        text: alt.text,
        isCorrect: !!alt.is_correct
      })),
      correctIndex: (eq.alternatives || []).findIndex((alt: any) => !!alt.is_correct),
      score: Number(eq.score || eq.pivot?.score || 0)
    })),
    discipline: apiData.discipline ? mapDisciplineFromApi(apiData.discipline) : undefined,
    turma: apiData.turma ? mapTurmaFromApi(apiData.turma) : undefined,
    professorName: apiData.professor_name,
    tipoProva: apiData.tipo_prova,
    evaluationType: apiData.evaluation_type,
    totalScore: apiData.total_score,
    createdAt: apiData.created_at,
    period: apiData.period ? mapPeriodFromApi(apiData.period) : undefined,
  };
}
