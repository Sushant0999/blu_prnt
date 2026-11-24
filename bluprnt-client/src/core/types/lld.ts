export type Difficulty = 'easy' | 'medium' | 'hard';
export type Visibility = '+' | '-' | '#' | '~';
export type ClassKind = 'class' | 'interface' | 'abstract' | 'enum';
export type RelationKind =
  | 'inheritance'      // solid line, hollow triangle
  | 'implementation'   // dashed line, hollow triangle
  | 'association'      // solid line, open arrow
  | 'aggregation'      // solid line, hollow diamond
  | 'composition'      // solid line, filled diamond
  | 'dependency';      // dashed line, open arrow

export interface ClassMember {
  id: string;
  visibility: Visibility;
  name: string;
  type: string;          // field type or method return type
  params?: string;       // methods only, e.g. "vehicle: Vehicle, hours: int"
  isStatic?: boolean;
  isAbstract?: boolean;
}

export interface ClassNodeData {
  name: string;
  kind: ClassKind;
  fields: ClassMember[];
  methods: ClassMember[];
  enumValues?: string[];
}

export interface ClassEdgeData {
  kind: RelationKind;
  label?: string;
  sourceMultiplicity?: string;  // e.g. "1", "0..*"
  targetMultiplicity?: string;
}

export interface LldDiagram {
  nodes: Record<string, { id: string; position: { x: number; y: number }; data: ClassNodeData }>;
  edges: Record<string, { id: string; source: string; target: string; data: ClassEdgeData }>;
}

export interface LldProblem {
  id: string;                     // e.g. "parking-lot"
  title: string;
  difficulty: Difficulty;
  tags: string[];                 // e.g. ["oop", "strategy", "concurrency"]
  summary: string;                // 1-2 sentences
  requirements: string[];         // functional requirements
  constraints: string[];          // non-functional or scope limits
  hints: string[];                // revealed one at a time
  keyEntities: string[];          // used for the self-review checklist
  selfReviewChecklist: string[];  // questions the learner answers about their own design
  referenceDiagram: LldDiagram;
  referenceNotes: string;         // markdown: why the design looks this way
  relatedPatternIds: string[];
  commonMistakes: string[];
}

export interface LldPatternQuizQuestion {
  question: string;
  options: string[];
  answerIndex: number;
  explanation: string;
}

export interface LldPatternFlashcard {
  front: string;
  back: string;
}

export interface LldPattern {
  id: string;                     // e.g. "strategy"
  name: string;
  category: 'creational' | 'structural' | 'behavioral';
  intent: string;
  problemItSolves: string;
  whenToUse: string[];
  whenNotToUse: string[];
  diagram: LldDiagram;
  javaCode: string;               // complete small example
  demoId?: string;                // optional interactive demo component key
  relatedProblemIds: string[];
  quiz: LldPatternQuizQuestion[];
  flashcards: LldPatternFlashcard[];
}

export interface LldDesignRecord {
  id: string;
  problemId: string | null;
  title: string;
  diagram: LldDiagram;
  notes: string;
  checklistState: Record<string, boolean>;
  updatedAt: string;
  status: 'draft' | 'submitted';
}

export interface LldProgressRecord {
  problemId: string;
  status: 'not-started' | 'in-progress' | 'completed';
  hintsUsed: number;
  referenceViewedAt?: string;
  completedAt?: string;
}
