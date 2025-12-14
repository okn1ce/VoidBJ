import React, { useState, useEffect, useRef } from 'react';
import { GameState, PlayingCard, GamePhase, CardUpgrade, Consumable, Passive, GlobalState, MetaUpgrade } from './types';
import { createDeck, shuffleDeck, calculateHandScore, moveHighValueCardToTop } from './utils/gameLogic';
import { INITIAL_CREDITS, INITIAL_ESSENCE, CORRUPTION_THRESHOLD_BASE, UPGRADES, CONSUMABLES, PASSIVES, HOUSE_DEBUFFS, STARTING_UPGRADE_IDS, META_UPGRADES } from './constants';
import { Card } from './components/Card';
import { Button } from './components/Button';
import { Coins, Zap, Skull, ShieldAlert, Hammer, Play, Terminal, Trash2, Disc, Cpu, Bug, AlertTriangle, Power, Save, Music, Volume2, VolumeX, Upload, Lock, Unlock, Database, Hexagon, ArrowRight } from 'lucide-react';

const SAVE_KEY_RUN = 'VOID_BJ_RUN_V1';
const SAVE_KEY_GLOBAL = 'VOID_BJ_GLOBAL_V1';
const DEFAULT_TRACK = "https://actions.google.com/sounds/v1/science_fiction/scifi_industrial_loop.ogg";

type AppView = 'menu' | 'mainframe' | 'game';

export const App: React.FC = () => {
  
  // --- GLOBAL STATE (PERSISTENT) ---
  const [globalState, setGlobalState] = useState<GlobalState>(() => {
      const saved = localStorage.getItem(SAVE_KEY_GLOBAL);
      if (saved) {
          try { return JSON.parse(saved); } catch (e) { console.error("Global save corrupted"); }
      }
      return { fragments: 0, unlockedHacks: [], totalRuns: 0 };
  });

  // --- GAME STATE (CURRENT RUN) ---
  const [state, setState] = useState<GameState | null>(() => {
    // Attempt to load run
    const saved = localStorage.getItem(SAVE_KEY_RUN);
    if (saved) {
        try {
            const parsed = JSON.parse(saved);
            // Migration
            if (!parsed.unlockedUpgrades) parsed.unlockedUpgrades = STARTING_UPGRADE_IDS;
            if (!parsed.offeredUpgradeIds) parsed.offeredUpgradeIds = [];
            return parsed;
        } catch (e) {
            console.error("Run save corrupted");
        }
    }
    return null;
  });

  const [view, setView] = useState<AppView>(() => {
      // If we have an active run state, go to game
      return state ? 'game' : 'menu';
  });

  const [betAmount, setBetAmount] = useState(10);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);

  // --- MUSIC STATE ---
  const audioRef = useRef<HTMLAudioElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [hasTrack, setHasTrack] = useState(true); // Default to true for default track

  // --- INITIALIZATION ---
  useEffect(() => {
    // Set default track
    if (audioRef.current) {
        audioRef.current.src = DEFAULT_TRACK;
        audioRef.current.volume = 0.3;
    }
  }, []);

  // --- PERSISTENCE EFFECTS ---
  useEffect(() => {
    localStorage.setItem(SAVE_KEY_GLOBAL, JSON.stringify(globalState));
  }, [globalState]);

  useEffect(() => {
    if (state) {
        localStorage.setItem(SAVE_KEY_RUN, JSON.stringify(state));
    } else {
        localStorage.removeItem(SAVE_KEY_RUN);
    }
  }, [state]);

  // Re-init draw pile on load if needed
  useEffect(() => {
    if (state && state.drawPile.length === 0 && state.playerDeck.length > 0 && state.phase === 'betting') {
         setState(prev => prev ? ({
            ...prev,
            drawPile: shuffleDeck([...prev.playerDeck])
         }) : null);
    }
  }, []);

  // --- MUSIC HANDLERS ---
  const tryPlayMusic = () => {
      if (audioRef.current && !isPlaying && !isMuted) {
          audioRef.current.play()
            .then(() => setIsPlaying(true))
            .catch(e => console.log("Audio autoplay blocked until interaction"));
      }
  };

  const handleMusicUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && audioRef.current) {
        const url = URL.createObjectURL(file);
        audioRef.current.src = url;
        audioRef.current.volume = 0.5;
        audioRef.current.play().then(() => {
            setIsPlaying(true);
            setHasTrack(true);
        }).catch(e => console.error("Audio play failed", e));
    }
  };

  const togglePlay = () => {
      if (!audioRef.current) return;
      if (isPlaying) {
          audioRef.current.pause();
          setIsPlaying(false);
      } else {
          audioRef.current.play();
          setIsPlaying(true);
      }
  };

  const toggleMute = () => {
      if (!audioRef.current) return;
      audioRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
  };

  // --- META PROGRESSION HELPERS ---
  const hasHack = (id: string) => globalState.unlockedHacks.includes(id);

  const startRun = () => {
      tryPlayMusic(); // Ensure music starts on run start
      
      // Apply Meta Upgrades
      let startCredits = INITIAL_CREDITS;
      let startEssence = INITIAL_ESSENCE;
      let startInventory: Consumable[] = [];
      let startThreshold = CORRUPTION_THRESHOLD_BASE;

      if (hasHack('cache_injection')) startCredits += 25;
      if (hasHack('essence_leak')) startEssence += 10;
      if (hasHack('threat_dampener')) startThreshold += 2;
      if (hasHack('firewall_bypass')) {
          const spike = CONSUMABLES.find(c => c.id === 'data_spike');
          if (spike) startInventory.push(spike);
      }

      const freshDeck = shuffleDeck(createDeck());
      
      setState({
          credits: startCredits,
          essence: startEssence,
          playerDeck: freshDeck,
          drawPile: shuffleDeck([...freshDeck]),
          discardPile: [],
          inventory: startInventory,
          activePassives: [],
          unlockedUpgrades: STARTING_UPGRADE_IDS,
          offeredUpgradeIds: [],
          playerHand: [],
          dealerHand: [],
          dealerCardRevealed: false,
          currentBet: 0,
          houseLevel: 1,
          corruptionTokens: 0,
          corruptionThreshold: startThreshold,
          phase: 'betting',
          message: "System initialized. Place your bet."
      });
      setView('game');
      setBetAmount(10);
      setGlobalState(prev => ({ ...prev, totalRuns: prev.totalRuns + 1 }));
  };

  const returnToMainframe = () => {
      tryPlayMusic();
      setState(null);
      setView('mainframe');
  };

  const enterMainframe = () => {
      tryPlayMusic();
      setView('mainframe');
  };

  const buyMetaUpgrade = (upgrade: MetaUpgrade) => {
      if (globalState.fragments >= upgrade.cost && !hasHack(upgrade.id)) {
          setGlobalState(prev => ({
              ...prev,
              fragments: prev.fragments - upgrade.cost,
              unlockedHacks: [...prev.unlockedHacks, upgrade.id]
          }));
      }
  };

  // --- GAMEPLAY HELPERS ---
  const hasPassive = (id: string) => state ? state.activePassives.some(p => p.id === id) : false;

  const drawCard = (currentDrawPile: PlayingCard[], currentDiscardPile: PlayingCard[]) => {
    let newDraw = [...currentDrawPile];
    let newDiscard = [...currentDiscardPile];
    if (newDraw.length === 0) {
      newDraw = shuffleDeck(newDiscard);
      newDiscard = [];
    }
    const card = newDraw.pop()!;
    return { card, newDraw, newDiscard };
  };

  const processCardEffects = (card: PlayingCard, currentEssence: number, currentCredits: number, currentCorruption: number) => {
    if (!state) return { essenceDelta: 0, creditDelta: 0, corruptionDelta: 0 };
    let essenceGain = 1;
    let creditGain = 0;
    let corruptionChange = 0;
    
    // Safety check for card
    if (!card) return { essenceDelta: 0, creditDelta: 0, corruptionDelta: 0 };

    // House Level 3 Curse: Essence Tax
    if (state.houseLevel === 3) essenceGain = 0;
    
    // Card Upgrades
    if (card.upgrades) {
        card.upgrades.forEach(upg => {
          if (upg.effectType === 'bonus_essence') essenceGain += upg.value;
          if (upg.effectType === 'bonus_credits') creditGain += upg.value;
          if (upg.effectType === 'reduce_corruption') corruptionChange -= upg.value;
          if (upg.effectType === 'risk_corruption') {
             creditGain += upg.value;
             corruptionChange += 1;
          }
          if (upg.id === 'hybrid_chip') essenceGain += 1; 
          if (upg.id === 'essence_converter') creditGain -= 5;
        });
    }

    return { essenceDelta: essenceGain, creditDelta: creditGain, corruptionDelta: corruptionChange };
  };

  // --- ACTIONS ---
  const placeBet = () => {
    if (!state) return;
    if (state.credits < betAmount) {
      setState(s => s ? ({ ...s, message: "Not enough credits." }) : null);
      return;
    }

    const extraEssence = hasPassive('auto_miner') ? 1 : 0;
    const backupEssence = (state.essence === 0 && hasPassive('backup_battery')) ? 5 : 0;

    let { drawPile, discardPile } = state;
    const playerHand: PlayingCard[] = [];
    const dealerHand: PlayingCard[] = [];
    
    let totalEssenceGain = extraEssence + backupEssence;
    let totalCreditGain = 0;
    let totalCorruptionDelta = 0;

    // Draw Loop
    const p1 = drawCard(drawPile, discardPile);
    drawPile = p1.newDraw; discardPile = p1.newDiscard;
    if (p1.card) {
        playerHand.push(p1.card);
        const eff1 = processCardEffects(p1.card, state.essence, state.credits, state.corruptionTokens);
        totalEssenceGain += eff1.essenceDelta;
        totalCreditGain += eff1.creditDelta;
        totalCorruptionDelta += eff1.corruptionDelta;
    }

    const isBoss = state.houseLevel > 0 && state.houseLevel % 5 === 0;
    const dealerDeck = shuffleDeck(createDeck());
    
    if (isBoss) {
        const kingIdx = dealerDeck.findIndex(c => c.rank === 'K');
        if (kingIdx > -1) {
            const king = dealerDeck.splice(kingIdx, 1)[0];
            dealerDeck.push(king); 
        }
    }
    
    dealerHand.push(dealerDeck.pop()!);

    const p2 = drawCard(drawPile, discardPile);
    drawPile = p2.newDraw; discardPile = p2.newDiscard;
    if (p2.card) {
        playerHand.push(p2.card);
        const eff2 = processCardEffects(p2.card, state.essence, state.credits, state.corruptionTokens);
        totalEssenceGain += eff2.essenceDelta;
        totalCreditGain += eff2.creditDelta;
        totalCorruptionDelta += eff2.corruptionDelta;
    }

    dealerHand.push(dealerDeck.pop()!);

    const pScore = calculateHandScore(playerHand);
    let nextPhase: GamePhase = 'playing';
    let msg = isBoss ? "BOSS PROTOCOL ACTIVE: THE ARCHITECT" : "Hit or Stand?";

    if (pScore === 21) {
      nextPhase = 'dealer_turn';
    }

    setState(prev => prev ? ({
      ...prev,
      credits: prev.credits - betAmount + totalCreditGain,
      essence: prev.essence + totalEssenceGain,
      corruptionTokens: Math.max(0, prev.corruptionTokens + totalCorruptionDelta),
      currentBet: betAmount,
      dealerCardRevealed: false,
      playerHand,
      dealerHand,
      drawPile,
      discardPile,
      phase: nextPhase,
      message: msg
    }) : null);
  };

  const useConsumable = (index: number) => {
    if (!state) return;
    const item = state.inventory[index];
    if (!item) return;

    let newState = { ...state };
    let msg = `Used ${item.name}.`;

    if (item.type === 'reveal_dealer') {
        newState.dealerCardRevealed = true;
    } else if (item.type === 'reduce_threat') {
        newState.corruptionTokens = Math.max(0, newState.corruptionTokens - 2);
        msg = "Threat level reduced.";
    } else if (item.type === 'guarantee_10') {
        newState.drawPile = moveHighValueCardToTop(newState.drawPile);
        msg = "Next card override active.";
    }

    const newInventory = [...state.inventory];
    newInventory.splice(index, 1);
    newState.inventory = newInventory;
    newState.message = msg;
    
    setState(newState);
  };

  const hit = () => {
    if (!state) return;
    let { drawPile, discardPile, playerHand, essence, credits, corruptionTokens } = state;
    const draw = drawCard(drawPile, discardPile);
    const newCard = draw.card;
    if (newCard) {
        const newHand = [...playerHand, newCard];
        const effects = processCardEffects(newCard, essence, credits, corruptionTokens);
        
        let hitCost = 0;
        if (hasPassive('memory_leak')) hitCost = 1;

        const score = calculateHandScore(newHand);
        let nextPhase = state.phase;
        let msg = state.message;

        if (score > 21) {
          nextPhase = 'round_over';
          msg = "Bust!";
          setTimeout(() => resolveRound(newHand, state.dealerHand, state.currentBet, true), 500);
        } else if (score === 21) {
            setTimeout(() => stand(), 500);
        }

        setState(prev => prev ? ({
          ...prev,
          playerHand: newHand,
          drawPile: draw.newDraw,
          discardPile: draw.newDiscard,
          essence: prev.essence + effects.essenceDelta,
          credits: prev.credits + effects.creditDelta - hitCost,
          corruptionTokens: Math.max(0, prev.corruptionTokens + effects.corruptionDelta),
          phase: nextPhase,
          message: msg
        }) : null);
    }
  };

  const stand = () => {
    setState(prev => prev ? ({ ...prev, phase: 'dealer_turn', message: "Dealer's turn..." }) : null);
  };

  // --- DEALER AI LOGIC ---
  useEffect(() => {
    if (state && state.phase === 'dealer_turn') {
        const dScore = calculateHandScore(state.dealerHand);
        const standThreshold = state.houseLevel <= 3 ? 16 : 17;

        const timer = setTimeout(() => {
            if (dScore < standThreshold) {
                 const dealerDeck = shuffleDeck(createDeck());
                 const newCard = dealerDeck[0];
                 setState(prev => prev ? ({
                     ...prev,
                     dealerHand: [...prev.dealerHand, newCard]
                 }) : null);
            } else {
                 resolveRound(state.playerHand, state.dealerHand, state.currentBet);
            }
        }, 1200); 

        return () => clearTimeout(timer);
    }
  }, [state?.phase, state?.dealerHand.length]); // Dependencies slightly adjusted to trigger on phase or hand change

  const resolveRound = (pHand: PlayingCard[], dHand: PlayingCard[], bet: number, busted: boolean = false) => {
    if (!state) return;
    const pScore = calculateHandScore(pHand);
    const dScore = calculateHandScore(dHand);
    let win = false;
    let payout = 0;
    let essenceBonus = 0;
    let msg = "";
    const pBlackjack = (pHand.length === 2 && pScore === 21);
    const dBlackjack = (dHand.length === 2 && dScore === 21);
    const isBoss = state.houseLevel > 0 && state.houseLevel % 5 === 0;

    let extraEssence = 0;
    let extraCredits = 0;

    pHand.forEach(c => {
       c.upgrades?.forEach(u => {
           if (busted && u.effectType === 'on_bust_essence') extraEssence += u.value;
           if (pScore === 21 && u.effectType === 'on_21_credits') extraCredits += u.value;
       });
    });

    if (busted) {
      let shieldTriggered = false;
      pHand.forEach(c => {
         c.upgrades?.forEach(u => {
             if (u.effectType === 'shield' && Math.random() < u.value) shieldTriggered = true;
         });
      });

      if (shieldTriggered) {
          msg = "FAILURE MITIGATED [SHIELD].";
          win = false;
          payout = bet * 0.5;
      } else {
          msg = "Busted! House wins.";
          win = false;
      }
    } else if (dScore > 21) {
      msg = "Dealer busts! You win!";
      win = true;
      payout = bet * 2;
    } else if (pBlackjack) {
        if (dBlackjack) {
            msg = "Push.";
            payout = bet;
        } else {
            msg = "Blackjack! (3:2 Payout)";
            win = true;
            payout = bet + (bet * 1.5);
            essenceBonus += 25;
        }
    } else if (dBlackjack) {
        msg = "Dealer has Blackjack. House wins.";
        win = false;
    } else if (pScore > dScore) {
        msg = "You win!";
        win = true;
        payout = bet * 2;
        essenceBonus += 10;
    } else if (pScore === dScore) {
        if (state.houseLevel >= 7 || isBoss) {
             msg = isBoss ? "Boss wins Ties." : "Tie! House wins due to corruption.";
             win = false;
        } else if (state.houseLevel <= 2) {
             msg = "Tie! System yields to user.";
             win = true;
             payout = bet * 2; 
        } else {
             msg = "Push.";
             payout = bet;
        }
    } else {
        msg = "House wins.";
        win = false;
    }

    if (win) {
        let multi = 1;
        pHand.forEach(c => {
            c.upgrades?.forEach(u => {
                if (u.effectType === 'critical') multi += u.value;
            });
        });
        
        if (hasPassive('vip_protocol')) multi += 0.1;

        const profit = payout - bet;
        payout = bet + (profit * multi);
    }

    let newCorruption = state.corruptionTokens;
    let newHouseLevel = state.houseLevel;
    let newThreshold = state.corruptionThreshold;
    let newPassives = [...state.activePassives];
    let nextPhase: GamePhase = 'round_over';
    let newOfferedUpgrades: string[] = [];

    if (win) {
        newCorruption += 1;
        if (newCorruption >= newThreshold) {
            newHouseLevel += 1;
            newCorruption = 0;
            newThreshold += 2;
            msg += " The House grows stronger!";
            
            const locked = UPGRADES.filter(u => !state.unlockedUpgrades.includes(u.id));
            if (locked.length > 0) {
                const shuffled = [...locked].sort(() => 0.5 - Math.random());
                newOfferedUpgrades = shuffled.slice(0, 3).map(u => u.id);
                nextPhase = 'upgrade_selection';
            }

            if (newHouseLevel > 5 && newHouseLevel % 2 === 0) {
                 const curses = PASSIVES.filter(p => p.type === 'curse' && !newPassives.some(ap => ap.id === p.id));
                 if (curses.length > 0) {
                     const randomCurse = curses[Math.floor(Math.random() * curses.length)];
                     newPassives.push(randomCurse);
                     msg += ` SYSTEM GLITCH: ${randomCurse.name} DETECTED.`;
                 }
            }
        }
    }

    setState(prev => {
        if (!prev) return null;
        const currentCredits = prev.credits;
        const finalCredits = currentCredits + payout + extraCredits;
        
        let finalMsg = msg;
        
        if (finalCredits < 10) {
            nextPhase = 'game_over';
            finalMsg = "SYSTEM FAILURE: INSUFFICIENT FUNDS";
            // award fragments
            const fragmentsEarned = Math.floor((prev.houseLevel * 5) + (prev.essence / 10));
            setGlobalState(gs => ({...gs, fragments: gs.fragments + fragmentsEarned}));
        }
        
        return {
            ...prev,
            credits: finalCredits,
            essence: prev.essence + essenceBonus + extraEssence,
            phase: nextPhase,
            message: finalMsg,
            corruptionTokens: newCorruption,
            houseLevel: newHouseLevel,
            corruptionThreshold: newThreshold,
            activePassives: newPassives,
            discardPile: [...prev.discardPile, ...pHand, ...dHand],
            offeredUpgradeIds: newOfferedUpgrades
        };
    });
  };

  const selectNewUpgrade = (upgradeId: string) => {
      setState(prev => prev ? ({
          ...prev,
          unlockedUpgrades: [...prev.unlockedUpgrades, upgradeId],
          phase: 'round_over',
          message: "New Upgrade compiled into Supply.",
          offeredUpgradeIds: []
      }) : null);
  };

  const buyUpgrade = (upgrade: CardUpgrade) => {
    if (!state || !selectedCardId) return;
    let cost = upgrade.cost;
    if (state.houseLevel >= 4) cost = Math.floor(cost * 1.5);
    if (hasPassive('encryption_error')) cost = Math.floor(cost * 1.2);
    // Meta Upgrade: Priority Access
    if (hasHack('priority_access')) cost = Math.floor(cost * 0.9);

    if (state.essence < cost) return;

    const newMasterDeck = state.playerDeck.map(c => {
        if (c.id === selectedCardId) {
            return { ...c, upgrades: [...(c.upgrades || []), upgrade] };
        }
        return c;
    });

    setState(prev => prev ? ({
        ...prev,
        essence: prev.essence - cost,
        playerDeck: newMasterDeck,
        drawPile: prev.drawPile.map(c => c.id === selectedCardId ? { ...c, upgrades: [...(c.upgrades || []), upgrade] } : c),
        discardPile: prev.discardPile.map(c => c.id === selectedCardId ? { ...c, upgrades: [...(c.upgrades || []), upgrade] } : c),
        playerHand: prev.playerHand.map(c => c.id === selectedCardId ? { ...c, upgrades: [...(c.upgrades || []), upgrade] } : c),
    }) : null);
  };

  const buyConsumable = (item: Consumable) => {
    if (!state) return;
    let cost = item.cost;
    if (hasPassive('encryption_error')) cost = Math.floor(cost * 1.2);
    if (hasHack('priority_access')) cost = Math.floor(cost * 0.9);

    if (state.inventory.length >= 3) {
        setState(prev => prev ? ({...prev, message: "Inventory full."}) : null);
        return;
    }
    if (state.essence < cost) {
        setState(prev => prev ? ({...prev, message: "Not enough Essence."}) : null);
        return;
    }

    setState(prev => prev ? ({
        ...prev,
        essence: prev.essence - cost,
        inventory: [...prev.inventory, item],
        message: `Acquired ${item.name}.`
    }) : null);
  };

  const buyPassive = (passive: Passive) => {
    if (!state || !passive.cost) return; 
    let cost = passive.cost;
    if (hasPassive('encryption_error')) cost = Math.floor(cost * 1.2);
    if (hasHack('priority_access')) cost = Math.floor(cost * 0.9);

    if (state.essence < cost) {
         setState(prev => prev ? ({...prev, message: "Not enough Essence."}) : null);
         return;
    }
    if (hasPassive(passive.id)) return;

    setState(prev => prev ? ({
        ...prev,
        essence: prev.essence - cost,
        activePassives: [...prev.activePassives, passive],
        message: `System Module Installed: ${passive.name}`
    }) : null);
  };

  const purgeCard = () => {
    if (!state || !selectedCardId) return;
    const cost = 75 + (Math.max(0, 52 - state.playerDeck.length) * 10); 
    
    if (state.playerDeck.length <= 5) {
        setState(prev => prev ? ({...prev, message: "Deck too small to purge."}) : null);
        return;
    }
    
    if (state.essence < cost) {
         setState(prev => prev ? ({...prev, message: `Need ${cost} Essence to purge.`}) : null);
         return;
    }

    const newMasterDeck = state.playerDeck.filter(c => c.id !== selectedCardId);
    
    setState(prev => prev ? ({
        ...prev,
        essence: prev.essence - cost,
        playerDeck: newMasterDeck,
        drawPile: prev.drawPile.filter(c => c.id !== selectedCardId),
        discardPile: prev.discardPile.filter(c => c.id !== selectedCardId),
        message: "Card removed from database."
    }) : null);
    setSelectedCardId(null);
  };
  
  const goToForge = () => {
    setState(prev => prev ? ({ ...prev, phase: 'forge', message: "Entering the Forge..." }) : null);
  };

  const leaveForge = () => {
    setState(prev => prev ? ({ ...prev, phase: 'betting', message: "Place your bet to begin.", playerHand: [], dealerHand: [] }) : null);
  };

  // --- RENDERING HELPERS ---

  const renderCardList = (cards: PlayingCard[], title: string) => (
     <div className="flex flex-col gap-2 p-4 bg-black border border-slate-800 h-full overflow-y-auto relative">
        <div className="absolute top-0 right-0 p-1 text-xs text-slate-600">ID: DECK_MAIN</div>
        <h3 className="text-xl font-mono text-amber-500 mb-2 border-b border-amber-900/50 pb-2">{title} ({cards.length})</h3>
        <div className="grid grid-cols-4 gap-4 p-2">
            {[...cards].sort((a,b) => b.value - a.value).map(c => (
                <div 
                    key={c.id} 
                    onClick={() => setSelectedCardId(c.id)}
                    className={`cursor-pointer transform transition-all p-1 ${selectedCardId === c.id ? 'ring-1 ring-amber-500 bg-amber-900/10' : 'hover:bg-white/5'}`}
                >
                    <div className="scale-75 origin-top-left w-24 h-36">
                       <Card 
                          card={c} 
                       />
                    </div>
                </div>
            ))}
        </div>
     </div>
  );

  // --- MAIN RENDER ---
  const isBossLevel = state ? (state.houseLevel > 0 && state.houseLevel % 5 === 0) : false;
  const selectedCard = (state && selectedCardId) ? state.playerDeck.find(c => c.id === selectedCardId) : null;

  return (
    <div className={`crt-container font-mono crt-flicker-global ${isBossLevel ? 'bg-red-950/20' : ''}`}>
      <div className="crt-overlay"></div>
      <div className="vignette"></div>
      <div className="scanline-bar"></div>

      {/* Hidden Audio Element for User Music */}
      <audio ref={audioRef} loop />
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleMusicUpload} 
        accept="audio/*" 
        className="hidden" 
      />

      {/* --- MENU VIEW --- */}
      {view === 'menu' && (
          <div className="relative z-10 min-h-screen flex flex-col items-center justify-center p-4">
              <div className="text-center mb-12">
                  <h1 className="text-6xl font-mono text-amber-500 text-glow flicker tracking-[0.2em] font-bold mb-4">VOID_BJ.EXE</h1>
                  <p className="text-slate-400 tracking-widest text-lg">THE HOUSE ALWAYS WATCHES</p>
              </div>
              
              <div className="flex flex-col gap-6 w-full max-w-md">
                  <Button size="lg" onClick={enterMainframe} className="text-xl py-6 animate-pulse-slow">
                      <Database size={24} /> ENTER MAINFRAME
                  </Button>
                  <Button variant="secondary" onClick={() => startRun()} className="text-lg">
                      <Play size={20} /> INITIATE RUN
                  </Button>
              </div>

              <div className="mt-12 text-slate-600 text-xs text-center">
                  RUNS ATTEMPTED: {globalState.totalRuns} <br/>
                  SYSTEM INTEGRITY: STABLE
              </div>
          </div>
      )}

      {/* --- MAINFRAME VIEW (META SHOP) --- */}
      {view === 'mainframe' && (
          <div className="relative z-10 min-h-screen flex flex-col p-8">
              <div className="flex justify-between items-center mb-8 border-b border-slate-700 pb-4">
                  <div className="flex items-center gap-4">
                      <Hexagon size={32} className="text-purple-500" />
                      <h2 className="text-3xl text-purple-400 font-bold tracking-widest text-glow">THE MAINFRAME</h2>
                  </div>
                  <div className="flex items-center gap-2 border border-purple-900 bg-purple-900/20 px-4 py-2">
                      <span className="text-slate-400 text-sm">DATA FRAGMENTS:</span>
                      <span className="text-2xl text-purple-400 font-bold font-mono">{globalState.fragments}</span>
                  </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 flex-1 overflow-y-auto pb-20">
                  {META_UPGRADES.map(hack => {
                      const owned = hasHack(hack.id);
                      const canAfford = globalState.fragments >= hack.cost;

                      return (
                          <div key={hack.id} className={`p-6 border-2 flex flex-col justify-between h-64 transition-all ${owned ? 'border-teal-900 bg-teal-900/10' : canAfford ? 'border-slate-600 hover:border-purple-500 bg-slate-900/40' : 'border-slate-800 bg-black opacity-50'}`}>
                              <div>
                                  <div className="flex justify-between items-start mb-4">
                                      <h3 className={`text-xl font-bold ${owned ? 'text-teal-400' : 'text-slate-200'}`}>{hack.name}</h3>
                                      {owned ? <Unlock size={20} className="text-teal-500" /> : <Lock size={20} className="text-slate-600" />}
                                  </div>
                                  <p className="text-sm text-slate-400">{hack.description}</p>
                              </div>
                              
                              <div className="mt-4">
                                  {owned ? (
                                      <div className="w-full text-center py-2 bg-teal-900/20 text-teal-500 text-sm font-bold border border-teal-900">
                                          INSTALLED
                                      </div>
                                  ) : (
                                      <Button 
                                          variant="primary" 
                                          className="w-full"
                                          disabled={!canAfford}
                                          onClick={() => buyMetaUpgrade(hack)}
                                      >
                                          COMPILE ({hack.cost} DF)
                                      </Button>
                                  )}
                              </div>
                          </div>
                      );
                  })}
              </div>

              <div className="fixed bottom-8 right-8 flex gap-4">
                   <Button variant="secondary" onClick={() => setView('menu')}>
                       BACK TO MENU
                   </Button>
                   <Button variant="primary" size="lg" onClick={() => startRun()}>
                       INITIATE RUN <ArrowRight size={20} />
                   </Button>
              </div>
          </div>
      )}

      {/* --- GAME VIEW --- */}
      {view === 'game' && state && (
        <div className="relative z-10 min-h-screen flex flex-col p-4">
        
        {/* TOP HUD */}
        <div className="grid grid-cols-3 gap-4 mb-2 border-b-2 border-slate-800 pb-4">
            {/* LEFT: Stats */}
            <div className="flex gap-6 items-center">
                <div className="flex items-center gap-2">
                    <div className="p-2 border border-teal-800 bg-teal-900/10">
                        <Coins size={20} className="text-teal-400" />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-xs text-slate-500 uppercase">Credits</span>
                        <span className="text-xl text-teal-400 text-glow font-bold tracking-wider">{Math.floor(state.credits)}</span>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <div className="p-2 border border-purple-800 bg-purple-900/10">
                        <Zap size={20} className="text-purple-400" />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-xs text-slate-500 uppercase">Essence</span>
                        <span className="text-xl text-purple-400 text-glow font-bold tracking-wider">{state.essence}</span>
                    </div>
                </div>
            </div>

            {/* CENTER: Title */}
            <div className="flex justify-center items-center">
                <div className="border-x-2 border-slate-800 px-8 text-center">
                    <h1 className="text-3xl text-amber-500 text-glow flicker tracking-[0.2em] font-bold">VOID_BJ.EXE</h1>
                    <div className="text-xs text-slate-600 mt-1">VER 1.6.0 - THE MAINFRAME</div>
                </div>
            </div>

            {/* RIGHT: Danger Level */}
            <div className="flex flex-col items-end justify-center">
                <div className={`flex items-center gap-2 mb-1 ${isBossLevel ? 'text-red-500 animate-pulse' : 'text-orange-600'}`}>
                    {isBossLevel ? <AlertTriangle size={16} /> : <Skull size={16} />}
                    <span className="text-sm font-bold tracking-widest">{isBossLevel ? "BOSS DETECTED" : `THREAT_LEVEL: ${state.houseLevel}`}</span>
                </div>
                <div className="w-48 h-3 bg-black border border-slate-700 relative">
                    <div className="absolute inset-0" style={{background: 'repeating-linear-gradient(90deg, transparent 0, transparent 19%, #333 20%)'}}></div>
                    <div 
                        className={`h-full transition-all duration-500 shadow-[0_0_10px_rgba(234,88,12,0.5)] ${isBossLevel ? 'bg-red-600' : 'bg-orange-600'}`}
                        style={{ width: `${(state.corruptionTokens / state.corruptionThreshold) * 100}%` }}
                    />
                </div>
            </div>
        </div>

        {/* 3. NEW LAYOUT: Dedicated Active Passives Window + Main Area */}
        <div className="flex-1 flex gap-4 overflow-hidden min-h-0">
            
            {/* MAIN GAME AREA */}
            <main className={`flex-1 border-2 border-slate-800 bg-black/40 relative flex flex-col items-center justify-center p-8 backdrop-blur-sm overflow-y-auto ${isBossLevel ? 'shadow-[inset_0_0_50px_rgba(220,38,38,0.2)]' : ''}`}>
                
                {/* Corner Markers */}
                <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-amber-500/50"></div>
                <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-amber-500/50"></div>
                <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-amber-500/50"></div>
                <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-amber-500/50"></div>

                {/* GAME OVER OVERLAY */}
                {state.phase === 'game_over' && (
                    <div className="absolute inset-0 z-50 bg-black/90 flex flex-col items-center justify-center animate-fade-in">
                        <div className="border-4 border-red-600 p-12 bg-black shadow-[0_0_50px_rgba(220,38,38,0.5)] text-center max-w-2xl w-full mx-4">
                            <AlertTriangle size={64} className="text-red-600 mx-auto mb-6 animate-pulse" />
                            <h1 className="text-5xl font-mono text-red-600 text-glow flicker mb-4 tracking-widest">SYSTEM FAILURE</h1>
                            <div className="text-xl text-slate-400 font-mono mb-4 tracking-wider">CREDITS DEPLETED. CONNECTION SEVERED.</div>
                            
                            {/* FRAGMENTS AWARD */}
                            <div className="bg-purple-900/20 border border-purple-800 p-4 mb-8">
                                <div className="text-sm text-purple-300 mb-1">DATA FRAGMENTS RECOVERED</div>
                                <div className="text-3xl font-bold text-purple-400 text-glow">
                                    +{Math.floor((state.houseLevel * 5) + (state.essence / 10))}
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4 mb-8 text-left border-y border-slate-800 py-4">
                                <div>
                                    <span className="text-xs text-slate-600 uppercase block">Threat Level Reached</span>
                                    <span className="text-xl text-orange-500 font-bold">{state.houseLevel}</span>
                                </div>
                                <div>
                                    <span className="text-xs text-slate-600 uppercase block">Essence Harvested</span>
                                    <span className="text-xl text-purple-500 font-bold">{state.essence}</span>
                                </div>
                            </div>

                            <Button onClick={returnToMainframe} size="lg" variant="danger" className="w-full">
                                <Database size={20} /> RETURN TO MAINFRAME
                            </Button>
                        </div>
                    </div>
                )}

                {/* UPGRADE SELECTION OVERLAY */}
                {state.phase === 'upgrade_selection' && (
                    <div className="absolute inset-0 z-50 bg-black/95 flex flex-col items-center justify-center animate-fade-in p-8">
                        <h2 className="text-3xl font-mono text-amber-500 text-glow mb-2">SUPPLY LINE UPGRADE DETECTED</h2>
                        <p className="text-slate-400 mb-8 font-mono">Select one schematic to compile into the Forge Supply.</p>
                        
                        <div className="grid grid-cols-3 gap-6 w-full max-w-5xl">
                            {state.offeredUpgradeIds.map(id => {
                                const upgrade = UPGRADES.find(u => u.id === id);
                                if (!upgrade) return null;
                                return (
                                    <button 
                                        key={id}
                                        onClick={() => selectNewUpgrade(id)}
                                        className="group relative flex flex-col items-center p-6 border-2 border-slate-700 bg-slate-900/50 hover:border-amber-500 hover:bg-amber-900/20 transition-all text-left h-64"
                                    >
                                        <div className="absolute top-2 right-2 text-slate-600 group-hover:text-amber-500"><Unlock size={20} /></div>
                                        <h3 className="text-xl font-bold text-teal-400 mb-4 group-hover:text-teal-300">{upgrade.name}</h3>
                                        <div className="text-sm text-slate-300 mb-4 flex-1">{upgrade.description}</div>
                                        <div className="w-full border-t border-slate-700 pt-4 flex justify-between items-center text-xs font-mono text-slate-500">
                                            <span>BASE COST: {upgrade.cost} ESS</span>
                                            <span className="group-hover:text-amber-500 transition-colors">CLICK TO UNLOCK</span>
                                        </div>
                                    </button>
                                )
                            })}
                        </div>
                    </div>
                )}

                {state.phase === 'forge' ? (
                    // --- FORGE VIEW ---
                    <div className="w-full h-full grid grid-cols-12 gap-8 animate-fade-in">
                        <div className="col-span-6 h-[600px]">
                            {renderCardList(state.playerDeck, "Deck Management")}
                        </div>
                        
                        {/* Right Panel: Upgrades and Shop */}
                        <div className="col-span-6 flex flex-col gap-4 h-[600px]">
                            <div className="border border-slate-700 bg-slate-900/50 p-4 flex justify-between items-center">
                                <span className="text-amber-500 font-bold">The Forge & Supply</span>
                                <Button variant="secondary" size="sm" onClick={leaveForge}>Exit</Button>
                            </div>

                            <div className="flex-1 overflow-y-auto pr-2 flex flex-col gap-6">
                                
                                {/* SECTION: CARD MODS */}
                                <div className="border border-slate-700 bg-black p-4 flex flex-col gap-4">
                                    <h4 className="text-teal-500 font-bold border-b border-slate-800 pb-2">Card Modification</h4>
                                    {selectedCard ? (
                                        <>
                                            <div className="flex gap-4 items-center">
                                                <div className="scale-75 origin-left">
                                                    <Card 
                                                        card={selectedCard} 
                                                    />
                                                </div>
                                                <div className="flex-1">
                                                    <div className="text-xs text-slate-500 mb-2">Available Upgrades:</div>
                                                    <div className="flex flex-col gap-2">
                                                        {UPGRADES.filter(u => state.unlockedUpgrades.includes(u.id)).map(upg => {
                                                            let cost = state.houseLevel >= 4 ? Math.floor(upg.cost * 1.5) : upg.cost;
                                                            if (hasHack('priority_access')) cost = Math.floor(cost * 0.9);
                                                            const canAfford = state.essence >= cost;
                                                            return (
                                                                <button 
                                                                    key={upg.id}
                                                                    onClick={() => buyUpgrade(upg)}
                                                                    disabled={!canAfford}
                                                                    className={`flex flex-col gap-1 p-2 text-xs border transition-all text-left ${canAfford ? 'border-amber-900 bg-amber-900/10 hover:bg-amber-900/30 text-amber-500' : 'border-slate-800 text-slate-600'}`}
                                                                >
                                                                    <div className="flex justify-between w-full font-bold">
                                                                        <span>{upg.name}</span>
                                                                        <span>{cost} ESS</span>
                                                                    </div>
                                                                    <div className="text-[10px] opacity-80 leading-tight">
                                                                        {upg.description}
                                                                    </div>
                                                                </button>
                                                            )
                                                        })}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="border-t border-slate-800 pt-2">
                                                <div className="flex justify-between items-center">
                                                    <span className="text-red-900 text-xs uppercase">Danger Zone</span>
                                                    <Button variant="danger" size="sm" onClick={purgeCard}>
                                                        <Trash2 size={12} /> Purge Card ({75 + (Math.max(0, 52 - state.playerDeck.length) * 10)} ESS)
                                                    </Button>
                                                </div>
                                            </div>
                                        </>
                                    ) : (
                                        <div className="text-center py-8 text-slate-600 text-sm">Select a card on the left to modify or purge.</div>
                                    )}
                                </div>

                                {/* SECTION: SHOP (Consumables) */}
                                <div className="border border-slate-700 bg-black p-4 flex flex-col gap-4">
                                    <h4 className="text-teal-500 font-bold border-b border-slate-800 pb-2">Gadget Supply</h4>
                                    <div className="grid grid-cols-1 gap-2">
                                        {CONSUMABLES.map(item => {
                                            let cost = item.cost;
                                            if (hasPassive('encryption_error')) cost = Math.floor(cost * 1.2);
                                            if (hasHack('priority_access')) cost = Math.floor(cost * 0.9);
                                            const canAfford = state.essence >= cost;
                                            return (
                                                <button 
                                                    key={item.id}
                                                    onClick={() => buyConsumable(item)}
                                                    disabled={!canAfford || state.inventory.length >= 3}
                                                    className={`flex items-center justify-between p-3 border transition-all ${canAfford && state.inventory.length < 3 ? 'border-teal-900 hover:border-teal-500 bg-teal-900/10' : 'border-slate-800 opacity-50'}`}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <Disc size={18} className="text-teal-500" />
                                                        <div className="flex flex-col items-start">
                                                            <span className={`font-bold font-mono text-sm ${canAfford ? 'text-teal-400' : 'text-slate-600'}`}>{item.name}</span>
                                                            <span className="text-[10px] text-slate-500">{item.description}</span>
                                                        </div>
                                                    </div>
                                                    <span className={`font-mono text-sm ${canAfford ? 'text-purple-400' : 'text-slate-600'}`}>{cost} ESS</span>
                                                </button>
                                            )
                                        })}
                                    </div>
                                    <div className="text-xs text-slate-500 text-right">Inventory: {state.inventory.length} / 3</div>
                                </div>
                                
                                {/* SECTION: MODULES (BOONS) */}
                                <div className="border border-slate-700 bg-black p-4 flex flex-col gap-4">
                                    <h4 className="text-teal-500 font-bold border-b border-slate-800 pb-2">System Modules</h4>
                                    <div className="grid grid-cols-1 gap-2">
                                        {PASSIVES.filter(p => p.type === 'boon').map(item => {
                                            let cost = item.cost || 999;
                                            if (hasPassive('encryption_error')) cost = Math.floor(cost * 1.2);
                                            if (hasHack('priority_access')) cost = Math.floor(cost * 0.9);
                                            const canAfford = state.essence >= cost;
                                            const alreadyOwned = hasPassive(item.id);
                                            
                                            if (alreadyOwned) return null; // Don't show owned modules

                                            return (
                                                <button 
                                                    key={item.id}
                                                    onClick={() => buyPassive(item)}
                                                    disabled={!canAfford}
                                                    className={`flex items-center justify-between p-3 border transition-all ${canAfford ? 'border-teal-900 hover:border-teal-500 bg-teal-900/10' : 'border-slate-800 opacity-50'}`}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <Cpu size={18} className="text-teal-500" />
                                                        <div className="flex flex-col items-start text-left">
                                                            <span className={`font-bold font-mono text-sm ${canAfford ? 'text-teal-400' : 'text-slate-600'}`}>{item.name}</span>
                                                            <span className="text-[10px] text-slate-500">{item.description}</span>
                                                        </div>
                                                    </div>
                                                    <span className={`font-mono text-sm ${canAfford ? 'text-purple-400' : 'text-slate-600'}`}>{cost} ESS</span>
                                                </button>
                                            )
                                        })}
                                        {PASSIVES.filter(p => p.type === 'boon' && !hasPassive(p.id)).length === 0 && (
                                            <div className="text-xs text-slate-500 text-center">No modules available.</div>
                                        )}
                                    </div>
                                </div>

                            </div>
                        </div>
                    </div>
                ) : (
                    // --- TABLE VIEW ---
                    <div className="w-full max-w-5xl flex flex-col gap-10">
                        
                        {/* Dealer Section */}
                        <div className="flex flex-col items-center gap-4">
                            <div className={`text-xs uppercase tracking-widest mb-2 border-b pb-1 ${isBossLevel ? 'text-red-500 border-red-900 font-bold' : 'text-slate-600 border-slate-800'}`}>
                                {isBossLevel ? 'BOSS: THE ARCHITECT' : 'Dealer'}
                            </div>
                            <div className="flex gap-4 min-h-[150px]">
                                {state.dealerHand.map((card, idx) => (
                                    <Card 
                                        key={idx} 
                                        card={card} 
                                        hidden={!state.dealerCardRevealed && state.phase !== 'round_over' && state.phase !== 'game_over' && state.phase !== 'upgrade_selection' && idx === 1 && state.houseLevel < 6}
                                    />
                                ))}
                                {state.dealerHand.length === 0 && <div className="w-24 h-36 border-2 border-slate-800 border-dashed flex items-center justify-center text-slate-800">EMPTY</div>}
                            </div>
                            <div className="h-6">
                                {(state.dealerCardRevealed || state.phase === 'round_over' || state.phase === 'game_over' || state.phase === 'upgrade_selection') && state.dealerHand.length > 0 && (
                                    <span className="text-red-500 font-mono bg-red-900/20 px-2 py-1 border border-red-900 text-xs">Value: {calculateHandScore(state.dealerHand)}</span>
                                )}
                            </div>
                        </div>

                        {/* Terminal Output / Message Log - Fixed Overflow and Z-Index */}
                        <div className={`relative w-full h-24 bg-black border p-2 flex flex-col items-center justify-center z-20 ${isBossLevel ? 'border-red-800' : 'border-slate-800'}`}>
                            <div className={`absolute top-0 left-0 text-black text-[10px] px-1 font-bold ${isBossLevel ? 'bg-red-800' : 'bg-slate-800'}`}>Log</div>
                            <h2 className={`text-2xl font-mono text-center text-glow-sm ${isBossLevel ? 'text-red-500' : 'text-teal-400'}`}>{state.message}</h2>
                            {state.houseLevel > 1 && (
                                <div className="text-xs text-orange-600 mt-2 uppercase tracking-widest flex items-center justify-center gap-2 animate-pulse group relative cursor-help">
                                    <ShieldAlert size={12} />
                                    Active Curse: {HOUSE_DEBUFFS[Math.min(state.houseLevel, 7)]?.name || HOUSE_DEBUFFS[5].name}
                                    {/* Curse Tooltip - Z-index fixed */}
                                    <div className="absolute bottom-full mb-2 w-48 bg-slate-900 border border-slate-600 p-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 shadow-xl">
                                        <div className="text-xs font-bold text-red-500 mb-1">{HOUSE_DEBUFFS[Math.min(state.houseLevel, 7)]?.name || HOUSE_DEBUFFS[5].name}</div>
                                        <div className="text-[10px] text-slate-300">{HOUSE_DEBUFFS[Math.min(state.houseLevel, 7)]?.description || HOUSE_DEBUFFS[5].description}</div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Player Section */}
                        <div className="flex flex-col items-center gap-4">
                            <div className="text-xs text-slate-600 uppercase tracking-widest mb-2 border-b border-slate-800 pb-1">Player</div>
                            <div className="flex gap-4 min-h-[150px]">
                                {state.playerHand.map((card) => (
                                    <Card 
                                        key={card.id} 
                                        card={card} 
                                    />
                                ))}
                                {state.playerHand.length === 0 && <div className="w-24 h-36 border-2 border-slate-800 border-dashed flex items-center justify-center text-slate-800">EMPTY</div>}
                            </div>
                            <div className="h-6">
                                {state.playerHand.length > 0 && (
                                    <span className="text-teal-500 font-mono bg-teal-900/20 px-2 py-1 border border-teal-900 text-xs">Value: {calculateHandScore(state.playerHand)}</span>
                                )}
                            </div>
                        </div>

                        {/* Inventory HUD */}
                        {state.inventory.length > 0 && (state.phase === 'playing' || state.phase === 'betting') && (
                            <div className="absolute left-8 top-1/2 -translate-y-1/2 flex flex-col gap-2">
                                <div className="text-[10px] text-slate-500 uppercase tracking-widest mb-1">Gadgets</div>
                                {state.inventory.map((item, idx) => (
                                    <button 
                                        key={idx}
                                        onClick={() => state.phase === 'playing' ? useConsumable(idx) : null}
                                        disabled={state.phase !== 'playing'}
                                        className={`w-40 p-3 border bg-black flex items-center gap-3 transition-all ${state.phase === 'playing' ? 'border-teal-800 hover:border-teal-400 cursor-pointer hover:bg-teal-900/20' : 'border-slate-800 opacity-50 cursor-not-allowed'}`}
                                    >
                                        <Disc size={16} className="text-teal-500" />
                                        <div className="flex flex-col items-start overflow-hidden">
                                            <span className="text-xs text-teal-400 font-bold truncate w-full text-left">{item.name}</span>
                                            <span className="text-[9px] text-slate-500 truncate w-full text-left">{state.phase === 'playing' ? 'Click to Use' : 'In Standby'}</span>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* Command Console */}
                        <div className="mt-4 flex flex-col items-center gap-4 w-full">
                            {state.phase === 'betting' && (
                                <div className="flex items-center gap-8 w-full justify-center bg-slate-900/30 p-4 border-t border-slate-800">
                                    <div className="flex flex-col items-center gap-2">
                                        <label className="text-[10px] text-slate-500 uppercase">Bet Amount</label>
                                        <div className="flex items-center bg-black border border-slate-700">
                                            <button onClick={() => setBetAmount(Math.max(10, betAmount - 10))} className="px-4 py-2 text-slate-400 hover:text-white hover:bg-slate-800">-</button>
                                            <span className="w-24 text-center font-mono text-xl text-yellow-500">{betAmount}</span>
                                            <button onClick={() => setBetAmount(Math.min(state.credits, betAmount + 10))} className="px-4 py-2 text-slate-400 hover:text-white hover:bg-slate-800">+</button>
                                        </div>
                                    </div>
                                    <div className="h-12 w-px bg-slate-800"></div>
                                    <div className="flex gap-4">
                                        <Button onClick={placeBet} size="lg" variant="primary" disabled={state.credits < betAmount}>
                                            Deal Cards
                                        </Button>
                                        <Button variant="forge" onClick={goToForge}>
                                            <Hammer size={18} /> Open Forge
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {state.phase === 'playing' && (
                                <div className="flex gap-6 w-full justify-center p-4 border-t border-slate-800 bg-slate-900/30">
                                    <Button onClick={hit} variant="secondary" className="w-32">
                                        Hit
                                    </Button>
                                    <Button onClick={stand} variant="primary" className="w-32">
                                        Stand
                                    </Button>
                                    {state.playerHand.length === 2 && state.credits >= state.currentBet && (
                                        <Button 
                                            onClick={() => {
                                                setBetAmount(b => b * 2);
                                                setState(prev => prev ? ({ ...prev, credits: prev.credits - prev.currentBet, currentBet: prev.currentBet * 2 }) : null);
                                                
                                                // Double Logic Inline
                                                let { drawPile, discardPile, playerHand, essence, credits, corruptionTokens } = state;
                                                const draw = drawCard(drawPile, discardPile);
                                                const newCard = draw.card;
                                                if (newCard) {
                                                    const newHand = [...playerHand, newCard];
                                                    const effects = processCardEffects(newCard, essence, credits - state.currentBet, corruptionTokens);
                                                    
                                                    // Curse: Memory Leak on Double Down (it counts as a Hit)
                                                    let hitCost = 0;
                                                    if (hasPassive('memory_leak')) hitCost = 1;
                                                    
                                                    const score = calculateHandScore(newHand);
                                                    let msg = "Double Down!";
                                                    let nextPhase: GamePhase = 'dealer_turn';

                                                    if (score > 21) {
                                                        nextPhase = 'round_over';
                                                        msg = "Bust on Double!";
                                                        setState(prev => prev ? ({
                                                            ...prev,
                                                            playerHand: newHand,
                                                            drawPile: draw.newDraw,
                                                            discardPile: draw.newDiscard,
                                                            essence: prev.essence + effects.essenceDelta + 5,
                                                            credits: prev.credits - prev.currentBet + effects.creditDelta - hitCost,
                                                            corruptionTokens: Math.max(0, prev.corruptionTokens + effects.corruptionDelta),
                                                            currentBet: prev.currentBet * 2,
                                                            phase: nextPhase,
                                                            message: msg
                                                        }) : null);
                                                        setTimeout(() => resolveRound(newHand, state.dealerHand, state.currentBet * 2, true), 1000);
                                                        return;
                                                    }

                                                    setState(prev => prev ? ({
                                                        ...prev,
                                                        playerHand: newHand,
                                                        drawPile: draw.newDraw,
                                                        discardPile: draw.newDiscard,
                                                        essence: prev.essence + effects.essenceDelta + 5,
                                                        credits: prev.credits - prev.currentBet + effects.creditDelta - hitCost,
                                                        corruptionTokens: Math.max(0, prev.corruptionTokens + effects.corruptionDelta),
                                                        currentBet: prev.currentBet * 2,
                                                        phase: nextPhase,
                                                        message: msg
                                                    }) : null);
                                                }
                                            }} 
                                            variant="ghost" 
                                            className="border-yellow-700 text-yellow-600 hover:text-yellow-400"
                                        >
                                            Double Down
                                        </Button>
                                    )}
                                </div>
                            )}

                            {state.phase === 'round_over' && (
                                <div className="flex gap-4 animate-pulse w-full justify-center p-4 border-t border-slate-800 bg-slate-900/30">
                                    <Button onClick={() => setState(s => s ? ({ ...s, phase: 'betting', playerHand: [], dealerHand: [], message: "Place your bet to begin." }) : null)} size="lg" variant="primary">
                                        <Play size={18} /> Next Hand
                                    </Button>
                                    <Button variant="forge" onClick={goToForge}>
                                        <Hammer size={18} /> Open Forge
                                    </Button>
                                </div>
                            )}
                        </div>

                    </div>
                )}
            </main>

            {/* SIDE PANEL: SYSTEM MODULES (Visible mainly in non-forge, but keeping layout consistent) */}
            <div className="w-72 bg-black border-2 border-slate-800 p-4 flex flex-col gap-4 overflow-y-auto min-h-0">
                <div className="flex items-center gap-2 border-b border-slate-800 pb-2 mb-2">
                    <Cpu size={16} className="text-teal-500" />
                    <h3 className="text-sm font-bold text-teal-500 tracking-widest">ACTIVE PROTOCOLS</h3>
                </div>
                
                {state.activePassives.length === 0 && (
                    <div className="text-xs text-slate-600 text-center py-4 italic">No modules installed.</div>
                )}

                <div className="flex flex-col gap-3">
                    {state.activePassives.map((p, idx) => (
                        <div key={`${p.id}-${idx}`} className={`relative p-3 border ${p.type === 'boon' ? 'border-teal-900 bg-teal-900/10' : 'border-red-900 bg-red-900/10 animate-pulse-slow'}`}>
                            <div className="flex items-center justify-between mb-1">
                                <span className={`text-xs font-bold ${p.type === 'boon' ? 'text-teal-400' : 'text-red-400'}`}>{p.name}</span>
                                {p.type === 'boon' ? <Cpu size={12} className="text-teal-600" /> : <Bug size={12} className="text-red-600" />}
                            </div>
                            <div className="text-[10px] text-slate-400 leading-tight">
                                {p.description}
                            </div>
                        </div>
                    ))}
                </div>

                <div className="mt-auto flex flex-col gap-4">
                    {/* Audio Player Controls */}
                    <div className="border border-slate-800 p-3 bg-slate-900/20">
                         <div className="flex items-center justify-between mb-2">
                             <div className="flex items-center gap-2 text-slate-400">
                                 <Music size={14} />
                                 <span className="text-[10px] uppercase font-bold tracking-widest">Audio Feed</span>
                             </div>
                             {hasTrack && (
                                <div className="flex gap-2">
                                    <button onClick={toggleMute} className="text-slate-500 hover:text-teal-400">
                                        {isMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
                                    </button>
                                </div>
                             )}
                         </div>
                         
                         <div className="flex gap-2">
                             <Button 
                                variant="secondary" 
                                size="sm" 
                                className="flex-1 py-1"
                                onClick={() => fileInputRef.current?.click()}
                             >
                                <Upload size={12} /> <span className="text-[10px]">LOAD MP3</span>
                             </Button>
                             {hasTrack && (
                                 <Button 
                                    variant={isPlaying ? "primary" : "secondary"}
                                    size="sm"
                                    className="w-10 flex items-center justify-center py-1"
                                    onClick={togglePlay}
                                 >
                                    {isPlaying ? <span className="w-2 h-2 bg-current animate-pulse"></span> : <Play size={10} />}
                                 </Button>
                             )}
                         </div>
                    </div>

                    <div className="border-t border-slate-800 pt-4 text-center">
                        <div className="text-[10px] text-slate-600 mb-2">SYSTEM STATUS: {state.activePassives.filter(p => p.type === 'curse').length > 0 ? 'COMPROMISED' : 'STABLE'}</div>
                        <div className="flex items-center justify-center gap-1 text-[10px] text-slate-700">
                            <Save size={10} />
                            <span>PROGRESS SAVED</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};