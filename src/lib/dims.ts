// As escalas do registro (ver docs/SPEC.md, seção 3). Polo desagradável sempre à esquerda.

export type DimKey =
  | 'humor'
  | 'calma'
  | 'energia'
  | 'interesse'
  | 'paciencia'
  | 'clareza'
  | 'sono_qualidade'
  | 'descanso'
  | 'satisfacao'
  | 'conexao'

export type Dim = { key: DimKey; label: string; p0: string; p1: string; q: string }

// 11 degraus por escala (0, 10, 20 ... 100). A palavra nomeia uma faixa. O valor guardado continua de 0 a 100.
export const WORDS: Record<DimKey, string[]> = {
  humor: ['arrasado', 'desolado', 'triste', 'abatido', 'para baixo', 'neutro', 'bem', 'de bom humor', 'contente', 'feliz', 'efusivo'],
  calma: ['em pânico', 'aflito', 'muito ansioso', 'ansioso', 'inquieto', 'neutro', 'estável', 'tranquilo', 'calmo', 'sereno', 'em paz'],
  energia: ['exausto', 'esgotado', 'sem forças', 'cansado', 'lento', 'neutro', 'disposto', 'ativo', 'com energia', 'animado', 'elétrico'],
  interesse: ['vazio', 'apático', 'indiferente', 'desinteressado', 'morno', 'neutro', 'curioso', 'interessado', 'engajado', 'motivado', 'empolgado'],
  paciencia: ['explosivo', 'furioso', 'irritado', 'impaciente', 'sensível', 'neutro', 'tolerante', 'paciente', 'tranquilo', 'leve', 'imperturbável'],
  clareza: ['confusa', 'enevoada', 'nebulosa', 'dispersa', 'lenta', 'neutra', 'presente', 'clara', 'focada', 'afiada', 'cristalina'],
  sono_qualidade: ['péssimo', 'muito ruim', 'ruim', 'agitado', 'irregular', 'razoável', 'ok', 'bom', 'muito bom', 'profundo', 'ótimo'],
  descanso: ['destruído', 'exausto', 'muito cansado', 'cansado', 'sonolento', 'neutro', 'razoável', 'descansado', 'bem descansado', 'renovado', 'novo em folha'],
  satisfacao: ['angustiado', 'aflito', 'frustrado', 'insatisfeito', 'incomodado', 'neutro', 'ok', 'satisfeito', 'contente', 'realizado', 'pleno'],
  conexao: ['sozinho', 'isolado', 'distante', 'desconectado', 'reservado', 'neutro', 'presente', 'próximo', 'conectado', 'acolhido', 'em casa'],
}

export const stepOf = (v: number) => Math.max(0, Math.min(10, Math.round(v / 10)))
export const wordFor = (key: DimKey, v: number) => WORDS[key][stepOf(v)]

export const DIMS: Record<DimKey, Dim> = {
  humor: { key: 'humor', label: 'humor', p0: 'triste', p1: 'feliz', q: 'Como está o seu humor agora?' },
  calma: { key: 'calma', label: 'tensão', p0: 'ansioso', p1: 'calmo', q: 'Quanta calma você sente agora?' },
  energia: { key: 'energia', label: 'energia', p0: 'esgotado', p1: 'com energia', q: 'Quanta energia você tem agora?' },
  interesse: { key: 'interesse', label: 'interesse', p0: 'apático', p1: 'engajado', q: 'Quanto interesse você sente pelas coisas?' },
  paciencia: { key: 'paciencia', label: 'paciência', p0: 'irritado', p1: 'tranquilo', q: 'Como está a sua paciência?' },
  clareza: { key: 'clareza', label: 'mente', p0: 'nebulosa', p1: 'clara', q: 'Como está a sua mente?' },
  sono_qualidade: { key: 'sono_qualidade', label: 'qualidade do sono', p0: 'péssimo', p1: 'ótimo', q: 'Como foi o seu sono?' },
  descanso: { key: 'descanso', label: 'descanso', p0: 'cansado', p1: 'descansado', q: 'Você acordou descansado?' },
  satisfacao: { key: 'satisfacao', label: 'o dia', p0: 'angustiado', p1: 'satisfeito', q: 'Como você se sente sobre o dia de hoje?' },
  conexao: { key: 'conexao', label: 'conexão', p0: 'isolado', p1: 'conectado', q: 'Quão conectado você se sentiu com as pessoas hoje?' },
}

export const CORE: DimKey[] = ['humor', 'calma', 'energia', 'interesse', 'paciencia', 'clareza']
export const MORNING_EXTRA: DimKey[] = ['sono_qualidade', 'descanso']
export const NIGHT_EXTRA: DimKey[] = ['satisfacao', 'conexao']

// o índice (maré) deixa a energia de fora: energia alta nem sempre é boa
export const INDEX_KEYS: DimKey[] = ['humor', 'calma', 'interesse', 'paciencia', 'clareza']

export const DEFAULT_TAGS = [
  'exercício',
  'ar livre',
  'socializei',
  'álcool',
  'cafeína tarde',
  'tela até tarde',
  'conflito',
  'trabalho pesado',
  'dor física',
]

export type EventType = 'medicacao' | 'bom' | 'dificil' | 'saude' | 'outro'

export const EVENT_TYPES: { key: EventType; label: string; glyph: string }[] = [
  { key: 'medicacao', label: 'medicação', glyph: '◆' },
  { key: 'bom', label: 'bom', glyph: '●' },
  { key: 'dificil', label: 'difícil', glyph: '○' },
  { key: 'saude', label: 'saúde', glyph: '+' },
  { key: 'outro', label: 'outro', glyph: '·' },
]
