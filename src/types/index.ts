export interface Deck {
  id: string;
  name: string;
  description: string;
  language_from: string;
  language_to: string;
  card_count: number;
  created_at: string;
  updated_at: string;
}

export interface Card {
  id: string;
  deck_id: string;
  front: string;
  back: string;
  phonetic: string;
  example_sentence: string;
  ease_factor: number;
  interval: number;
  repetitions: number;
  next_review_at: string;
  created_at: string;
  updated_at: string;
  notes: string;
  mastered: boolean;
}

export interface StudyCard {
  id: string;
  deck_id: string;
  front: string;
  back: string;
  phonetic: string;
  example_sentence: string;
  notes: string;
  language_from: string;
  language_to: string;
}

export interface ReviewStats {
  total_cards: number;
  due_today: number;
  studied_today: number;
  new_today: number;
}

export interface HeatmapDay {
  date: string;
  count: number;
}

export interface SessionResult {
  card_id: string;
  front: string;
  back: string;
  rating: number;
  mastered: boolean;
}

export interface DeckProgress {
  total_count: number;
  studied_count: number;
  mastered_count: number;
  due_count: number;
}

export interface Article {
  id: string;
  title: string;
  content: string;
  source: string;
  created_at: string;
  questions: Question[] | null;
}

export interface ArticleSummary {
  id: string;
  title: string;
  source: string;
  created_at: string;
  has_questions: boolean;
}

export interface Question {
  id: string;
  question: string;
  options: string[];
  answer: number;
}

export interface ProviderConfig {
  providerId: string;
  url: string;
  apiKey: string;
  modelId: string;
  modelName: string;
  apiMode: 'chat_completions' | 'anthropic_messages' | 'openai_responses' | 'gemini_native';
  thinkingEffort?: string;
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  topK?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  repetitionPenalty?: number;
  thinkingBudget?: number;
  subOptionValues?: Record<string, string>;
}

export interface CompositionSummary {
  id: string;
  title: string;
  source: string;
  created_at: string;
  has_review: boolean;
}

export interface Composition {
  id: string;
  title: string;
  content: string;
  source: string;
  created_at: string;
  review: CompositionReview | null;
}

export interface CompositionReview {
  score: number;
  corrections: Correction[];
  suggestions: string[];
}

export interface Correction {
  original: string;
  corrected: string;
  explanation: string;
}

export interface ImportFieldMapping {
  front: string[];
  back: string[];
  phonetic: string[];
  example_sentence: string[];
}

export interface ImportReport {
  imported_count: number;
  total_notes: number;
  skipped_count: number;
  source_format: string;
  matched_fields: ImportFieldMapping;
  missing_fields: string[];
  used_fallback_mapping: boolean;
}

export interface FieldMappingSelection {
  front: string | null;
  back: string | null;
  phonetic: string | null;
  example_sentence: string | null;
}

export interface ImportPreview {
  source_format: string;
  columns: string[];
  total_rows: number;
  sample_rows: string[][];
  smart_mapping: FieldMappingSelection;
}
