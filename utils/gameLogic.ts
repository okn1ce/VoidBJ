import { PlayingCard, Suit, Rank, GameState } from '../types';

export const createDeck = (): PlayingCard[] => {
  const suits: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];
  const ranks: Rank[] = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
  
  const deck: PlayingCard[] = [];
  
  suits.forEach(suit => {
    ranks.forEach(rank => {
      let value = parseInt(rank);
      if (['J', 'Q', 'K'].includes(rank)) value = 10;
      if (rank === 'A') value = 11;

      deck.push({
        id: `${rank}-${suit}-${Math.random().toString(36).substr(2, 9)}`,
        suit,
        rank,
        value,
        upgrades: []
      });
    });
  });
  
  return deck;
};

export const shuffleDeck = (deck: PlayingCard[]): PlayingCard[] => {
  const newDeck = [...deck];
  for (let i = newDeck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newDeck[i], newDeck[j]] = [newDeck[j], newDeck[i]];
  }
  return newDeck;
};

export const moveHighValueCardToTop = (deck: PlayingCard[]): PlayingCard[] => {
  const newDeck = [...deck];
  const highValueIndex = newDeck.findIndex(c => c.value === 10);
  
  if (highValueIndex !== -1) {
    const card = newDeck.splice(highValueIndex, 1)[0];
    newDeck.push(card); // Push to end (which is the 'top' for pop())
  }
  return newDeck;
};

export const calculateHandScore = (hand: PlayingCard[]): number => {
  let score = 0;
  let aces = 0;

  hand.forEach(card => {
    score += card.value;
    if (card.rank === 'A') aces += 1;
  });

  while (score > 21 && aces > 0) {
    score -= 10;
    aces -= 1;
  }

  return score;
};

export const getCardDisplayValue = (rank: Rank): string => {
  return rank;
};

export const getSuitSymbol = (suit: Suit): string => {
  switch (suit) {
    case 'hearts': return '♥';
    case 'diamonds': return '♦';
    case 'clubs': return '♣';
    case 'spades': return '♠';
  }
};

export const getSuitColor = (suit: Suit): string => {
  // Retro CRT Palette:
  // Hearts/Diamonds -> Rust/Orange (Danger/Warning Color)
  // Clubs/Spades -> Teal/Cyan (System/Data Color)
  return (suit === 'hearts' || suit === 'diamonds') ? 'text-orange-600' : 'text-teal-500';
};