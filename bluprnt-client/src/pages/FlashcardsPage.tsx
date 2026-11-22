import React, { useState, useEffect, useMemo } from 'react';
import {
  Sparkles,
  RotateCw,
  CheckCircle2,
  AlertCircle,
  Flame,
  Layers,
  ChevronRight,
  BookOpen,
  Calendar,
} from 'lucide-react';
import { ContentRepository } from '../repository/ContentRepository';
import { calculateSm2 } from '../core/algorithms/sm2';
import { db } from '../db/database';
import { FlashcardDeck } from '../types/content';
import { SrsCardRecord } from '../types/storage';

export const FlashcardsPage: React.FC = () => {
  const [decks, setDecks] = useState<FlashcardDeck[]>([]);
  const [selectedDeckId, setSelectedDeckId] = useState<string>('all');
  const [srsRecords, setSrsRecords] = useState<Record<string, SrsCardRecord>>({});
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [loading, setLoading] = useState(true);

  // Load decks and Dexie SRS card progress
  const loadData = async () => {
    try {
      setLoading(true);
      const fetchedContent = await ContentRepository.getFlashcards();
      setDecks(fetchedContent.decks || []);

      const records = await db.srsCards.toArray();
      const map: Record<string, SrsCardRecord> = {};
      records.forEach((r) => {
        map[r.cardId] = r;
      });
      setSrsRecords(map);
    } catch (e) {
      console.error('Failed to load flashcards', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Compute active card queue
  const activeCards = useMemo(() => {
    if (decks.length === 0) return [];
    if (selectedDeckId === 'all') {
      return decks.flatMap((d) => d.cards);
    }
    const target = decks.find((d) => d.id === selectedDeckId);
    return target ? target.cards : [];
  }, [decks, selectedDeckId]);

  const currentCard = activeCards[currentCardIndex];

  // Calculate stats
  const totalReviewed = Object.keys(srsRecords).length;
  const now = Date.now();
  const dueCount = useMemo(() => {
    return activeCards.filter((c) => {
      const rec = srsRecords[c.id];
      return !rec || rec.dueDate <= now;
    }).length;
  }, [activeCards, srsRecords, now]);

  const handleRating = async (rating: 0 | 1 | 2 | 3) => {
    if (!currentCard) return;

    const existing = srsRecords[currentCard.id];
    const prevReps = existing?.repetitions || 0;
    const prevInterval = existing?.interval || 1;
    const prevEf = existing?.easeFactor || 2.5;

    const sm2Result = calculateSm2({
      rating,
      repetitions: prevReps,
      interval: prevInterval,
      easeFactor: prevEf,
    });

    const newRecord: SrsCardRecord = {
      cardId: currentCard.id,
      deckId: selectedDeckId === 'all' ? 'general' : selectedDeckId,
      repetitions: sm2Result.repetitions,
      interval: sm2Result.interval,
      easeFactor: sm2Result.easeFactor,
      dueDate: sm2Result.dueDate,
      lastReviewedAt: Date.now(),
    };

    await db.srsCards.put(newRecord);
    setSrsRecords((prev) => ({ ...prev, [currentCard.id]: newRecord }));

    // Move to next card
    setIsFlipped(false);
    if (currentCardIndex + 1 < activeCards.length) {
      setCurrentCardIndex((prev) => prev + 1);
    } else {
      setCurrentCardIndex(0); // loop back
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-slate-500 font-mono text-xs">
        Loading spaced repetition card queue...
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-wider bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            SuperMemo-2 Adaptive SRS
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
            System Design Flashcards
          </h1>
          <p className="text-xs md:text-sm text-slate-500 mt-1">
            Retain core distributed systems theorems, disk latency tradeoffs, and failure modes forever.
          </p>
        </div>

        {/* Due Metrics */}
        <div className="flex items-center gap-3">
          <div className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl flex items-center gap-2.5 shadow-sm">
            <Calendar className="w-5 h-5 text-brand-600" />
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-bold block">Due Today</span>
              <span className="text-base font-extrabold text-slate-900 dark:text-slate-100 font-mono">
                {dueCount} Cards
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Deck Selector Pills */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        <button
          onClick={() => {
            setSelectedDeckId('all');
            setCurrentCardIndex(0);
            setIsFlipped(false);
          }}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
            selectedDeckId === 'all'
              ? 'bg-brand-600 text-white shadow-sm'
              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:bg-slate-50'
          }`}
        >
          All Decks ({activeCards.length})
        </button>
        {decks.map((deck) => (
          <button
            key={deck.id}
            onClick={() => {
              setSelectedDeckId(deck.id);
              setCurrentCardIndex(0);
              setIsFlipped(false);
            }}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
              selectedDeckId === deck.id
                ? 'bg-brand-600 text-white shadow-sm'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:bg-slate-50'
            }`}
          >
            {deck.title}
          </button>
        ))}
      </div>

      {/* Main Flashcard Stage */}
      {currentCard ? (
        <div className="flex flex-col items-center justify-center space-y-6 pt-2">
          {/* Card Flip Container */}
          <div
            onClick={() => setIsFlipped(!isFlipped)}
            className="w-full max-w-xl h-80 rounded-3xl border-2 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-md p-8 flex flex-col justify-between cursor-pointer hover:border-brand-400 dark:hover:border-brand-600 transition-all select-none relative group"
          >
            <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
              <span className="uppercase tracking-wider font-bold">
                {isFlipped ? 'Answer' : 'Question Prompt'}
              </span>
              <span>
                Card {currentCardIndex + 1} of {activeCards.length}
              </span>
            </div>

            <div className="my-auto text-center px-4">
              {isFlipped ? (
                <p className="text-sm md:text-base text-slate-800 dark:text-slate-200 font-medium leading-relaxed">
                  {currentCard.back}
                </p>
              ) : (
                <h3 className="text-lg md:text-2xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
                  {currentCard.front}
                </h3>
              )}
            </div>

            <div className="flex items-center justify-center gap-1.5 text-xs text-slate-400 font-medium">
              <RotateCw className="w-3.5 h-3.5 group-hover:rotate-180 transition-transform duration-500" />
              <span>{isFlipped ? 'Click to view question' : 'Click card or press Space to reveal'}</span>
            </div>
          </div>

          {/* SM-2 Rating Controls (Revealed after flip) */}
          {isFlipped ? (
            <div className="w-full max-w-xl flex items-center justify-between gap-3">
              <button
                onClick={() => handleRating(0)}
                className="flex-1 py-3 px-2 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 font-bold text-xs hover:bg-rose-100 transition-colors shadow-sm text-center"
              >
                <div>Again</div>
                <div className="text-[10px] opacity-75 font-mono">1 day</div>
              </button>

              <button
                onClick={() => handleRating(1)}
                className="flex-1 py-3 px-2 rounded-2xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-900 text-amber-700 dark:text-amber-300 font-bold text-xs hover:bg-amber-100 transition-colors shadow-sm text-center"
              >
                <div>Hard</div>
                <div className="text-[10px] opacity-75 font-mono">~3 days</div>
              </button>

              <button
                onClick={() => handleRating(2)}
                className="flex-1 py-3 px-2 rounded-2xl bg-brand-50 dark:bg-brand-950/60 border border-brand-200 dark:border-brand-900 text-brand-700 dark:text-brand-300 font-bold text-xs hover:bg-brand-100 transition-colors shadow-sm text-center"
              >
                <div>Good</div>
                <div className="text-[10px] opacity-75 font-mono">~6 days</div>
              </button>

              <button
                onClick={() => handleRating(3)}
                className="flex-1 py-3 px-2 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-900 text-emerald-700 dark:text-emerald-300 font-bold text-xs hover:bg-emerald-100 transition-colors shadow-sm text-center"
              >
                <div>Easy</div>
                <div className="text-[10px] opacity-75 font-mono">~12 days</div>
              </button>
            </div>
          ) : (
            <button
              onClick={() => setIsFlipped(true)}
              className="px-6 py-2.5 rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-bold text-xs shadow-md"
            >
              Show Answer
            </button>
          )}
        </div>
      ) : (
        <div className="p-12 text-center text-slate-400 font-medium text-xs">
          No flashcards found in this deck.
        </div>
      )}
    </div>
  );
};
