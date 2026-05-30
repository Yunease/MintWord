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
