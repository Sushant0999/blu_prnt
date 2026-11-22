export interface QuizOption {
  id?: string;
  prompt: string;
  options: string[];
  correct: number;
  explanation: string;
}

export interface ResourceLink {
  title: string;
  url: string;
}

export interface ConceptBlock {
  title: string;
  body: string;
}

export interface LessonContent {
  id: string;
  title: string;
  intro: string;
  objectives: string[];
  body: string;
  keyIdea: string;
  sim?: string;
  diagramType?: string;
  concepts: ConceptBlock[];
  examples: string[];
  resources: ResourceLink[];
  quiz: QuizOption[];
}

export interface TopicItem {
  id: string;
  title: string;
  summary: string;
  lesson: string;
}

export interface CourseItem {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  description: string;
  topics: TopicItem[];
}

export interface CatalogContent {
  courses: CourseItem[];
}

export interface TargetMetric {
  label: string;
  value: string;
}

export interface CaseStudy {
  id: string;
  title: string;
  subtitle: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  tags: string[];
  readMinutes: number;
  icon: string;
  functional: string[];
  nonFunctional: string[];
  targets: TargetMetric[];
  deepDives: string[];
  commonMistakes: string[];
  seniorNotes: string;
}

export interface CasesContent {
  cases: CaseStudy[];
}

export interface InterviewPrompt {
  id: string;
  category: string;
  level: 'warmup' | 'deepdive';
  question: string;
  answer: string;
  keyPoints: string[];
  tradeoffs: string[];
}

export interface InterviewContent {
  prompts: InterviewPrompt[];
}

export interface Flashcard {
  id: string;
  front: string;
  back: string;
}

export interface FlashcardDeck {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  cards: Flashcard[];
}

export interface FlashcardsContent {
  decks: FlashcardDeck[];
}
