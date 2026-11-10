import axios from 'axios';
import {
  mapQuestionFromApi,
  mapDisciplineFromApi,
  mapTagFromApi,
  mapExamFromApi,
  mapTurmaFromApi,
  mapPeriodFromApi,
  mapPeriodTurmaDisciplineFromApi,
  mapUserFromApi,
} from './adapters';
import { Question, Exam, Discipline, Tag, Turma, Period, PeriodTurmaDiscipline, User } from '@/types/question';

// Base API instance
export const api = axios.create({
  baseURL: 'http://provafacil-api.test/api',
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// Injeta o token de autenticação em todas as requisições
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// =======================
// Auth
// =======================

export async function authLogin(email: string, password: string): Promise<{ user: User; token: string }> {
  const { data } = await api.post('/auth/login', { email, password });
  return { user: mapUserFromApi(data.user), token: data.token };
}

export async function authRegister(name: string, email: string, password: string, passwordConfirmation: string): Promise<{ user: User; token: string }> {
  const { data } = await api.post('/auth/register', {
    name,
    email,
    password,
    password_confirmation: passwordConfirmation,
  });
  return { user: mapUserFromApi(data.user), token: data.token };
}

export async function authLogout(): Promise<void> {
  await api.post('/auth/logout');
}

export async function fetchMe(): Promise<User> {
  const { data } = await api.get('/auth/me');
  return mapUserFromApi(data);
}

export async function authForgotPassword(email: string): Promise<void> {
  await api.post('/auth/forgot-password', { email });
}

export async function authResetPassword(payload: any): Promise<void> {
  await api.post('/auth/reset-password', payload);
}


// =======================
// Períodos
// =======================

export async function fetchPeriods(): Promise<Period[]> {
  const { data } = await api.get('/periods');
  return (data || []).map(mapPeriodFromApi);
}

export async function postPeriod(year: number, semester: number): Promise<Period> {
  const { data } = await api.post('/periods', { year, semester });
  return mapPeriodFromApi(data);
}

export async function activatePeriod(id: string): Promise<Period> {
  const { data } = await api.post(`/periods/${id}/activate`);
  return mapPeriodFromApi(data);
}

export async function deletePeriod(id: string): Promise<void> {
  await api.delete(`/periods/${id}`);
}

export async function fetchPeriodTurmaDisciplines(periodId: string): Promise<PeriodTurmaDiscipline[]> {
  const { data } = await api.get(`/periods/${periodId}/turma-disciplines`);
  return (data || []).map(mapPeriodTurmaDisciplineFromApi);
}

export async function addPeriodTurmaDiscipline(periodId: string, turmaId: number, disciplineId: number): Promise<PeriodTurmaDiscipline> {
  const { data } = await api.post(`/periods/${periodId}/turma-disciplines`, {
    turma_id: turmaId,
    discipline_id: disciplineId,
  });
  return mapPeriodTurmaDisciplineFromApi(data);
}

export async function removePeriodTurmaDiscipline(periodId: string, itemId: string): Promise<void> {
  await api.delete(`/periods/${periodId}/turma-disciplines/${itemId}`);
}

// =======================
// Disciplines
// =======================

export async function fetchDisciplines(): Promise<Discipline[]> {
  const { data } = await api.get('/disciplines');
  return (data || []).map(mapDisciplineFromApi);
}

export async function postDiscipline(name: string): Promise<Discipline> {
  const { data } = await api.post('/disciplines', { name });
  return mapDisciplineFromApi(data);
}

export async function deleteDiscipline(id: string): Promise<void> {
  await api.delete(`/disciplines/${id}`);
}

// =======================
// Turmas
// =======================

export async function fetchTurmas(): Promise<Turma[]> {
  const response = await api.get('/turmas');
  return response.data.map(mapTurmaFromApi);
}

export async function postTurma(data: Partial<Turma>): Promise<Turma> {
  const response = await api.post('/turmas', data);
  return mapTurmaFromApi(response.data);
}

export async function putTurma(id: string, data: Partial<Turma>): Promise<Turma> {
  const response = await api.put(`/turmas/${id}`, data);
  return mapTurmaFromApi(response.data);
}

export async function deleteTurma(id: string): Promise<void> {
  await api.delete(`/turmas/${id}`);
}

// =======================
// Tags
// =======================

export async function fetchTags(): Promise<Tag[]> {
  const { data } = await api.get('/tags');
  return (data || []).map(mapTagFromApi);
}

export async function postTag(name: string): Promise<Tag> {
  const { data } = await api.post('/tags', { name });
  return mapTagFromApi(data);
}

export async function deleteTag(id: string): Promise<void> {
  await api.delete(`/tags/${id}`);
}

// =======================
// Questions
// =======================

export async function fetchQuestions(): Promise<Question[]> {
  const { data } = await api.get('/questions');
  return (data || []).map(mapQuestionFromApi);
}

export interface PostQuestionPayload {
  title: string;
  type: 'objective' | 'subjective';
  score?: number;
  disciplines?: number[];
  tags?: string[];
  evaluation?: string | null;
  difficulty?: string | null;
  is_adapted?: boolean;
  alternatives?: { text: string; is_correct: boolean }[];
}

export async function postQuestion(payload: PostQuestionPayload): Promise<Question> {
  const { data } = await api.post('/questions', payload);
  return mapQuestionFromApi(data);
}

export async function putQuestion(id: string, payload: PostQuestionPayload): Promise<Question> {
  const { data } = await api.put(`/questions/${id}`, payload);
  return mapQuestionFromApi(data);
}

export async function deleteQuestion(id: string): Promise<void> {
  await api.delete(`/questions/${id}`);
}

export async function postBulkDeleteQuestions(ids: string[]): Promise<void> {
  await api.post('/questions/bulk-delete', { ids: ids.map(Number) });
}

export interface AIQuestionPayload {
  mode?: 'generate' | 'alternative' | 'adapt';
  discipline: string;
  theme?: string;
  themes?: string[];
  style: 'direta' | 'enade';
  complexity: 'fácil' | 'médio' | 'difícil';
  is_adapted: boolean;
  include_code: boolean;
  statement_length: 'curto' | 'longo';
  alternative_length: 'curtas' | 'longas';
  marking_type: 'correta' | 'incorreta' | 'afirmativas';
  type: 'objective' | 'subjective';
  alternatives_count?: number;
  extra_context?: string;
  count: number;
  original_question?: any;
  original_questions?: any[];
}

export async function generateAIQuestion(payload: AIQuestionPayload): Promise<any[]> {
  const { data } = await api.post('/ai/generate-question', payload);
  return Array.isArray(data) ? data : [data];
}

// =======================
// Exams
// =======================

export async function fetchExams(): Promise<Exam[]> {
  const { data } = await api.get('/exams');
  const list = data.data || data;
  return (list || []).map(mapExamFromApi);
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

export async function postExam(payload: PostExamPayload): Promise<Exam> {
  const { data } = await api.post('/exams', payload);
  return mapExamFromApi(data);
}

export async function putExam(id: string, payload: PostExamPayload): Promise<Exam> {
  const { data } = await api.put(`/exams/${id}`, payload);
  return mapExamFromApi(data);
}

export async function fetchExam(id: string): Promise<Exam> {
  const { data } = await api.get(`/exams/${id}`);
  return mapExamFromApi(data);
}

export async function fetchExamKey(id: string): Promise<Exam> {
  const { data } = await api.get(`/exams/${id}/key`);
  return mapExamFromApi(data);
}

export async function deleteExam(id: string): Promise<void> {
  await api.delete(`/exams/${id}`);
}

export async function duplicateExam(id: string): Promise<Exam> {
  const { data } = await api.post(`/exams/${id}/duplicate`);
  return mapExamFromApi(data);
}
