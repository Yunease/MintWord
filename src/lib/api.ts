import { invoke } from '@tauri-apps/api/core';
import type { Deck, Card, StudyCard, ReviewStats, HeatmapDay, SessionResult, DeckProgress } from '../types';

export async function getDecks(): Promise<Deck[]> {
  return invoke('get_decks');
}

export async function createDeck(name: string, description: string, languageFrom = 'en', languageTo = 'zh'): Promise<Deck> {
  return invoke('create_deck', { name, description, languageFrom, languageTo });
}

export async function deleteDeck(deckId: string): Promise<void> {
  return invoke('delete_deck', { deckId });
}

export async function getCards(deckId: string): Promise<Card[]> {
  return invoke('get_cards', { deckId });
}

export async function addCard(deckId: string, front: string, back: string, phonetic = '', exampleSentence = ''): Promise<Card> {
  return invoke('add_card', { deckId, front, back, phonetic, exampleSentence });
}

export async function deleteCard(cardId: string): Promise<void> {
  return invoke('delete_card', { cardId });
}

export async function getStudyCards(deckId: string, limit = 20): Promise<StudyCard[]> {
  return invoke('get_study_cards', { deckId, limit });
}

export async function getStudyCardsAvailable(deckId: string): Promise<number> {
  return invoke('get_study_cards_available', { deckId });
}

export async function submitReviewSimple(cardId: string, rating: number, mastered: boolean): Promise<void> {
  return invoke('submit_review_simple', { cardId, rating, mastered });
}

export async function masterCard(cardId: string): Promise<void> {
  return invoke('master_card', { cardId });
}

export async function unmasterCard(cardId: string): Promise<void> {
  return invoke('unmaster_card', { cardId });
}

export async function updateCardNotes(cardId: string, notes: string): Promise<void> {
  return invoke('update_card_notes', { cardId, notes });
}

export async function getHeatmapData(): Promise<HeatmapDay[]> {
  return invoke('get_heatmap_data');
}

export async function exportSessionCsv(deckId: string, results: SessionResult[], filePath: string): Promise<void> {
  return invoke('export_session_csv', { deckId, results, filePath });
}

export async function getDeckDueCount(): Promise<[string, number][]> {
  return invoke('get_deck_due_count');
}

export async function getDeckProgress(deckId: string): Promise<DeckProgress> {
  return invoke('get_deck_progress', { deckId });
}

export async function getStats(): Promise<ReviewStats> {
  return invoke('get_stats');
}

export async function importCsvFile(deckId: string, filePath: string): Promise<number> {
  return invoke('import_csv_file', { deckId, filePath });
}

export async function bulkAddCards(deckId: string, text: string): Promise<number> {
  return invoke('bulk_add_cards', { deckId, text });
}

export async function speakText(text: string): Promise<void> {
  return invoke('speak_text', { text });
}

export async function speakAi(text: string, apiUrl: string, apiKey: string, voice: string, model: string): Promise<void> {
  return invoke('speak_ai', { text, apiUrl, apiKey, voice, model });
}

export async function getSetting(key: string): Promise<string | null> {
  return invoke('get_setting', { key });
}

export async function setSetting(key: string, value: string): Promise<void> {
  return invoke('set_setting', { key, value });
}
