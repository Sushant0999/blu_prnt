import type {
  CatalogContent,
  CasesContent,
  InterviewContent,
  FlashcardsContent,
  LessonContent,
} from '../types/content';
import type { LldProblem, LldPattern } from '../core/types/lld';

class ContentRepositoryImpl {
  private catalogCache: CatalogContent | null = null;
  private casesCache: CasesContent | null = null;
  private interviewCache: InterviewContent | null = null;
  private flashcardsCache: FlashcardsContent | null = null;
  private lessonsCache: Map<string, LessonContent> = new Map();
  private lldProblemsCache: LldProblem[] | null = null;
  private lldPatternsCache: LldPattern[] | null = null;

  async getCatalog(): Promise<CatalogContent> {
    if (this.catalogCache) return this.catalogCache;
    const res = await fetch('/content/catalog.json');
    if (!res.ok) throw new Error(`Failed to load catalog.json: ${res.statusText}`);
    this.catalogCache = await res.json();
    return this.catalogCache!;
  }

  async getLesson(lessonId: string): Promise<LessonContent> {
    const cached = this.lessonsCache.get(lessonId);
    if (cached) return cached;
    const res = await fetch(`/content/lessons/${lessonId}.json`);
    if (!res.ok) throw new Error(`Failed to load lesson '${lessonId}': ${res.statusText}`);
    const data: LessonContent = await res.json();
    this.lessonsCache.set(lessonId, data);
    return data;
  }

  async getCases(): Promise<CasesContent> {
    if (this.casesCache) return this.casesCache;
    const res = await fetch('/content/cases.json');
    if (!res.ok) throw new Error(`Failed to load cases.json: ${res.statusText}`);
    this.casesCache = await res.json();
    return this.casesCache!;
  }

  async getInterviewPrompts(): Promise<InterviewContent> {
    if (this.interviewCache) return this.interviewCache;
    const res = await fetch('/content/interview.json');
    if (!res.ok) throw new Error(`Failed to load interview.json: ${res.statusText}`);
    this.interviewCache = await res.json();
    return this.interviewCache!;
  }

  async getFlashcards(): Promise<FlashcardsContent> {
    if (this.flashcardsCache) return this.flashcardsCache;
    const res = await fetch('/content/flashcards.json');
    if (!res.ok) throw new Error(`Failed to load flashcards.json: ${res.statusText}`);
    this.flashcardsCache = await res.json();
    return this.flashcardsCache!;
  }

  async getLldProblems(): Promise<LldProblem[]> {
    if (this.lldProblemsCache) return this.lldProblemsCache;
    const res = await fetch('/content/lld-problems.json');
    if (!res.ok) throw new Error(`Failed to load lld-problems.json: ${res.statusText}`);
    this.lldProblemsCache = await res.json();
    return this.lldProblemsCache!;
  }

  async getLldProblem(id: string): Promise<LldProblem | undefined> {
    const problems = await this.getLldProblems();
    return problems.find((p) => p.id === id);
  }

  async getLldPatterns(): Promise<LldPattern[]> {
    if (this.lldPatternsCache) return this.lldPatternsCache;
    const res = await fetch('/content/lld-patterns.json');
    if (!res.ok) throw new Error(`Failed to load lld-patterns.json: ${res.statusText}`);
    this.lldPatternsCache = await res.json();
    return this.lldPatternsCache!;
  }

  async getLldPattern(id: string): Promise<LldPattern | undefined> {
    const patterns = await this.getLldPatterns();
    return patterns.find((p) => p.id === id);
  }

  clearMemoryCache(): void {
    this.catalogCache = null;
    this.casesCache = null;
    this.interviewCache = null;
    this.flashcardsCache = null;
    this.lessonsCache.clear();
    this.lldProblemsCache = null;
    this.lldPatternsCache = null;
  }
}

export const ContentRepository = new ContentRepositoryImpl();
