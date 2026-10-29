/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback, type JSX } from 'react';
// @ts-ignore
import discordGif from './assets/text/sidehustle-discord.gif';
import cardBaseImg from './assets/card/card_base.png';
import bloodMoonImg from './assets/card/blood_moon.png';

import {
  Skull,
  Flame,
  Sparkles,
  RefreshCw,
  Search,
  BookOpen,
  Wrench,
  X,
  Volume2,
  VolumeX,
  Shield,
  Zap,
  Award,
  ChevronRight,
  Eye,
  Info,
  ChevronDown,
  Layers,
  HelpCircle,
  RotateCcw,
  Menu,
  Bell
} from 'lucide-react';

// --- Types & Data Definitions ---
export type Tribe = 'No Class' | 'Reptile' | 'Avian' | 'Canine' | 'Hooved' | 'Insect' | 'ALL Classes';
export type CardInstance = any;
export const TRIBE_ICONS: Record<Tribe, string> = {
  'Canine': '🐺',
  'Insect': '🕷️',
  'Avian': '🦅',
  'Reptile': '🦎',
  'Hooved': '🦌',
  'ALL Classes': '✨',
  'No Class': ''
};

export interface CardDef {
  wasPlayedThisDuel?: boolean;
  battlesPlayed?: number;
  id?: string;
  name: string;
  class: Tribe;
  attack: number;
  health: number;
  cost?: number; // Blood cost
  boneCost?: number; // Bone cost
  emoji: string;
  sigils: string[];
  artUrl?: string; // Path or base64 data URI for custom card illustration
  tags?: string[];
  evolvesInto?: string;
  isSacrifice?: boolean;
  unsacrificable?: boolean;
  age?: number;
  sprintDir?: number;
  shieldBroken?: boolean;
  justTookDamage?: boolean;
  animatingStrike?: boolean;
  strikeOffset?: number;
  isDying?: boolean;
  
  // Added for Goobert duplicates
  isGoobertClone?: boolean;
  isMycologistCombined?: boolean;
  isAmalgam?: boolean;

  // Boss & combat mechanics
  isMassive?: boolean;
  hasAttackedThisTurn?: boolean;
}

export interface Totem {
  head: Tribe | null;
  body: string | null;
}

export type GamePhase = 'DRAW' | 'PLAY' | 'COMBAT' | 'ENEMY' | 'SEARCH' | 'GAME_OVER';

export type ScreenState =
  | 'SPLASH'
  | 'DECK_SELECT'
  | 'DRAFT'
  | 'DUEL'
  | 'VIEW_DECK'
  | 'DEV_MENU'
  | 'GAME_OVER'
  | 'EVENT_CROSSROADS'
  | 'EVENT_CAMPFIRE'
  | 'EVENT_ITEMS'
  | 'EVENT_ALTAR'
  | 'EVENT_TOTEM_CARVING'
  | 'EVENT_COST_BARGAIN'
  | 'EVENT_BONE_LORD'
  | 'EVENT_MYCOLOGIST'
  | 'EVENT_GOOBERT'
  | 'EVENT_CAVE_TRIAL'
  | 'EVENT_CARD_CHOICE'
  | 'EVENT_BUILD_TOTEM'
  | 'EVENT_HOARDER_SEARCH';

export interface RunStats {
  bossesDefeated: number;       // x
  scaleDamageDealt: number;     // y
  scaleDamageTaken: number;     // z
  cardsSacrificed: number;      // a
  enemyCardsDestroyed: number;  // b
  grizzlyWallsSurvived: number; // c
  clearedStages: number;        // w
  finalBossesDefeated: number;  // n
}

export type BossType = 'Zealot' | 'The Begotten' | 'BoneLord' | 'The Weaver' | null;

export interface BossCombatState {
  type: BossType;
  phase: number;
  phase1CardsPlayed: number;
  skipNextPlayerTurn: boolean;
  activeDialogue: string | null;
  bgHex: string;
  bgTransitionDuration: number;
  isRitualComplete: boolean;
  ritualEndedVoluntarily: boolean;
}

// --- Asset Path Helpers ---
const BASE = (import.meta.env.BASE_URL || '/').replace(/\/$/, '');

export const toAssetSlug = (str: string): string =>
  str.toLowerCase().replace(/[^a-z0-9]/g, '');

const CARD_ART_SLUG_ALIASES: Record<string, string> = {
  // Disk has oppossum.png, code expects opossum
  opossum: 'oppossum',
  oppossum: 'oppossum',

  // Disk has lammergier.png, code expects lammergeier
  lammergeier: 'lammergier',
  lammergier: 'lammergier',

  // Disk has vulture.png, code expects turkeyvulture
  turkeyvulture: 'vulture',
  vulture: 'vulture',

  // Disk has bee.png for Beehive / Brood
  beehive: 'bee',
  brood: 'bee',
  'house fly': 'maggots',
  housefly: 'maggots',

  // Trade Pelt mappings
  tradepelt: 'pelt',
  pelt: 'pelt',
  harepelt: 'pelt',
};

export const getCardArtUrl = (card: CardDef): string => {
  if (card.artUrl) return card.artUrl;
  const rawSlug = toAssetSlug(card.name || '');
  if (CARD_ART_SLUG_ALIASES[rawSlug]) {
    return `${BASE}/assets/cardart/${CARD_ART_SLUG_ALIASES[rawSlug]}.png`;
  }
  // Strip Fledgling evolution prefixes so art lookup maps to the base creature sprite
  const baseName = (card.name || '').replace(/^(Elder|Greater|God)\s+/i, '');
  const slug = toAssetSlug(baseName);
  const resolvedSlug = CARD_ART_SLUG_ALIASES[slug] || slug;
  return `${BASE}/assets/cardart/${resolvedSlug}.png?v=${Date.now()}`;
};

// Targeted offsets for specific sprites that need bespoke positioning
export const CARD_ART_OFFSETS: Record<string, string> = {
  'Raven': 'translate-y-1 translate-x-1',
  'Wild Bull': 'translate-y-1',
  'Amoeba': '-translate-y-1',
  'Stoat': 'translate-y-1.5 translate-x-1',
};

export const getSigilArtUrl = (sigilName: string): string => {
  return `${BASE}/assets/sigils/${toAssetSlug(sigilName)}.png`;
};

// Exact file registry to handle the mixed .jpg / .png extensions
const ARENA_BACKGROUND_FILES: Record<string, string> = {
  battle1: 'battlebg1.jpg',
  battle2: 'battlebg2.jpg',
  battle3: 'battlebg3.jpg',
  battle4: 'battlebg4.jpg',
  weaver: 'weaverboss.jpg',
  zealot: 'zealotboss.jpg',
  begotten: 'begottenboss.jpg',
  finalboss: 'finalboss.png',
  splash: 'splash.png',
  deckSelect: 'deck-selection.png',
  gameover: 'gameover.jpg',
  draft: 'draft.png',
  crossroads: 'crossroads-select.jpg',
  campfire: 'campfireevent.jpg',
  altar: 'altarevent.jpg',
  totemCarving: 'tribeeventbg.jpg',
  costBargain: 'costeventbg.jpg',
  bonelord: 'bonelordevent.png',
  trial: 'trialevent.jpg',
  cardChoice: 'choiceevent.png',
  weaverEvent: 'weaverevent.png',
};

export const getBackgroundUrl = (key: string): string => {
  const filename = ARENA_BACKGROUND_FILES[key] || `${toAssetSlug(key)}.jpg`;
  return `${BASE}/assets/backgrounds/${filename}`;
};

export const getArenaBackground = (stage: number, isBoss: boolean, bossName?: string): string => {
  if (isBoss) {
    const b = (bossName || '').toLowerCase();
    if (b.includes('weaver')) return getBackgroundUrl('weaver');
    if (b.includes('zealot')) return getBackgroundUrl('zealot');
    if (b.includes('begotten')) return getBackgroundUrl('begotten');
    return getBackgroundUrl('finalboss');
  }

  // Standard duel stages cycle battlebg1 through battlebg4
  const bgIndex = ((stage - 1) % 4) + 1;
  return getBackgroundUrl(`battle${bgIndex}`);
};

export const getScreenBgStyle = (filename: string): React.CSSProperties => ({
  backgroundImage: `radial-gradient(circle at 50% 45%, rgba(18, 12, 8, 0.62) 0%, rgba(10, 6, 4, 0.90) 100%), url(${BASE}/assets/backgrounds/${filename})`,
  backgroundSize: 'cover',
  backgroundPosition: 'center',
  backgroundRepeat: 'no-repeat',
});

// --- Sigils Configuration ---
export const SIGIL_MAPPING: Record<string, string> = {
  'Shadow': '🌑',  
  'Airborne': '🕊️',
  'Fecundity': '🌱',
  'Unkillable': '💀',
  'Worthy Sacrifice': '🩸',
  'Bifurcated Strike': '⑂',
  'Trifurcated Strike': '⑆',
  'Mighty Leap': '🛡️',
  'Rabbit Hole': '🕳️',
  'Touch of Death': '☠️',
  'Waterborne': '🌊',
  'Sprinter': '💨',
  'Fledgling': '🐣',
  'Armored': '⚜️',
  'Leader': '🚩',
  'Corpse Eater': '🍖',
  'Bloodlust': '🗡️',
  'Bellist': '🔔',
  'Double Strike': '⚡',
  'Loose Tail': '🦎',
  'Guardian': '🐾',
  'Hefty': '🧱',
  'Burrower': '⛏️',
  'Sharp Quills': '📌',
  'Hoarder': '🔎',
  'Many Lives': '♾️',
  'Morsel': '🍎',
  'Bone King': '👑',
  'Bone Digger': '🦴',
  'Scavenger': '⛏️',
  'Dam Builder': '🏞️',
  'Bees Within': '🐝',
  'Amorphous': '❓',
  'Stinky': '🤢',
  'Ant Spawner': '🐜',
  'Rampager': '🐗',
  'Made of Stone': '🗿',
  'Brittle': '🥀',
  'Tidal Lock': '🪐',
  'Omnistrike': '✴️',
};

export const SIGIL_DESCRIPTIONS: Record<string, string> = {
  'Airborne': "Strikes directly at the opponent's scale, ignoring opposing creatures unless they have Mighty Leap.",
  'Fecundity': "When played, a copy of this card is added to your hand.",
  'Unkillable': "When this creature perishes or is sacrificed, a copy returns to your hand.",
  'Worthy Sacrifice': "Counts as 3 Blood when sacrificed.",
  'Bifurcated Strike': "Strikes the opposing spaces to the left and right.",
  'Trifurcated Strike': "Strikes the opposing spaces to the left, center, and right.",
  'Mighty Leap': "Blocks opposing Airborne creatures.",
  'Rabbit Hole': "When played, a Rabbit (0/1) is added to your hand.",
  'Touch of Death': "Instantly kills any creature it damages.",
  'Waterborne': "Submerges during the opponent's turn, allowing them to attack over this creature directly.",
  'Sprinter': "Moves to an adjacent empty space at the end of the turn.",
  'Fledgling': "Matures into a stronger form after 1 turn on the board.",
  'Armored': "Negates the first instance of damage taken.",
  'Leader': "Grants +1 Attack to adjacent allied creatures.",
  'Corpse Eater': "If an allied creature perishes in combat, this card enters the board automatically from hand.",
  'Bloodlust': "Gains +1 Attack whenever it kills an opposing creature.",
  'Bellist': "When played, spawns Chimes (0/1) in adjacent empty spaces.",
  'Double Strike': "Strikes the opposing target space an additional time.",
  'Loose Tail': "When attacked, leaves a Tail (0/2) behind and slips into an adjacent space.",
  'Guardian': "When an opposing creature is played opposite an empty slot, leaps to block it.",
  'Hefty': "Moves to an adjacent space at turn end, pushing other creatures in that direction.",
  'Burrower': "When an empty space is attacked, moves to block incoming damage.",
  'Sharp Quills': "Deals 1 damage back to any creature that strikes it.",
  'Hoarder': "When played, allows you to search your deck for any card and draw it.",
  'Many Lives': "Can be sacrificed multiple times without perishing.",
  'Morsel': "When sacrificed, passes its Attack and Health to the next creature played.",
  'Bone King': "Yields 4 Bones instead of 1 when it perishes.",
  'Bone Digger': "Generates 1 Bone at the end of your turn.",
  'Scavenger': "Generates 1 Bone whenever any creature perishes.",
  'Dam Builder': "When played, spawns Dams (0/2) in adjacent empty spaces.",
  'Bees Within': "When struck, adds an Airborne Bee (1/1) to your hand.",
  'Amorphous': "When drawn, morphs into a random sigil.",
  'Stinky': "Reduces the Attack of the opposing creature by 1.",
  'Made of Stone': "Immune to Touch of Death and Stinky debuffs.",
  'Tidal Lock': "Pulls celestial gravity; forces all incoming attacks directly into itself.",
  'Shadow': "Stats are inverted under the Bone Lord's eclipse.",
  'Omnistrike': "Attacks all Creatures in zones. Can only attack directly on an empty board.",
  'Ant Spawner': "When played, a Worker Ant is added to your hand.",
  'Rampager': "Moves to an adjacent space, swapping positions with whatever stands there.",
};

// Base Cards & Tokens
export const TOKEN_SQUIRREL: CardDef = { name: "Squirrel", class: "No Class", attack: 0, health: 1, cost: 0, emoji: "🐿️", isSacrifice: true, sigils: [] };
export const TOKEN_RABBIT: CardDef = { name: "Rabbit", class: "No Class", attack: 0, health: 1, cost: 0, emoji: "🐇", isSacrifice: true, sigils: [] };
export const TOKEN_CHIME: CardDef = { name: "Chime", class: "No Class", attack: 0, health: 1, cost: 0, emoji: "🔔", isSacrifice: false, unsacrificable: true, sigils: [] };
export const TOKEN_DAM: CardDef = { name: "Dam", class: "No Class", attack: 0, health: 2, cost: 0, emoji: "🏠", isSacrifice: false, unsacrificable: true, sigils: [] };
export const TOKEN_TAIL: CardDef = { name: "Tail", class: "No Class", attack: 0, health: 2, cost: 0, emoji: "🦎", isSacrifice: false, unsacrificable: true, sigils: [] };
export const TOKEN_VERTIBRAE: CardDef = { name: "Vertibrae", class: "No Class", attack: 0, health: 1, cost: 0, emoji: "🦴", isSacrifice: false, unsacrificable: true, sigils: [] };
// Maps each tutorial rule directly to its spatial UI anchor on the tabletop
export const getTutorialDialoguePosition = (message: string | null): string => {
  if (!message) return 'fixed top-4 left-1/2 -translate-x-1/2 w-[90%] max-w-md';

  // 1. Above Player Hand
  if (
    message.includes('Squirrels are free') ||
    message.includes('Sacrifice cards in play')
  ) {
    return 'fixed bottom-40 sm:bottom-48 left-1/2 -translate-x-1/2 w-[90%] sm:w-auto max-w-sm z-50';
  }

  // 2. Above Enemy Card (Coyote in Lane 1)
  if (message.includes('Opposed cards clash')) {
    return 'fixed top-24 sm:top-32 left-1/2 -translate-x-1/2 sm:-translate-x-[62%] w-[88%] sm:w-auto max-w-xs sm:max-w-sm z-50';
  }

  // 3. Right Side of Blood Runnel (The Scale)
  if (message.includes('Take blood from your opponent')) {
    return 'fixed top-20 sm:top-28 right-2 sm:right-6 md:right-10 w-[85%] sm:w-auto max-w-xs z-50';
  }

  // 4. Above Bones Counter (Lower-right flank)
  if (message.includes('Bones build up')) {
    return 'fixed bottom-48 sm:bottom-56 right-4 sm:right-10 md:right-14 w-[85%] sm:w-auto max-w-xs z-50';
  }

  // 5. Over Turn End Button (Commit Talisman Plinth)
  if (message.includes('Commit to your actions')) {
    return 'fixed bottom-36 sm:bottom-44 left-4 sm:left-10 md:left-16 w-[85%] sm:w-auto max-w-xs z-50';
  }

  // 6. Over Enemy Back Row (Enemy Queue)
  if (message.includes('Enemy cards will move in')) {
    return 'fixed top-12 sm:top-16 left-1/2 -translate-x-1/2 w-[90%] sm:w-auto max-w-sm z-50';
  }

  // 7. On Player Turn 2 Start (Above Draw Decks)
  if (message.includes('Draw from only one deck')) {
    return 'fixed bottom-44 sm:bottom-52 right-4 sm:right-10 md:right-14 w-[85%] sm:w-auto max-w-xs z-50';
  }

  return 'fixed top-4 left-1/2 -translate-x-1/2 w-[90%] max-w-md z-50';
};
// --- Weaver's Needlework: Tribal Embroidered Patches ---
export const TRIBE_EMBROIDERY: Record<string, JSX.Element> = {
  Canine: (
    <svg className="w-5 h-5 mx-auto text-amber-200" viewBox="0 0 24 24" fill="currentColor">
      <path d="M4 5l3 4 5-2 5 2 3-4-2 9-3 3-3-1-3 1-3-3L4 5zm5 11l3 3 3-3H9z" />
      <circle cx="8" cy="11" r="1" fill="#140d08" />
      <circle cx="16" cy="11" r="1" fill="#140d08" />
    </svg>
  ),
  Avian: (
    <svg className="w-5 h-5 mx-auto text-amber-200" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 3l2 4 6-2-4 6 5 2-7 4-2 4-2-4-7-4 5-2-4-6 6 2 2-4z" />
      <circle cx="12" cy="10" r="1.5" fill="#140d08" />
    </svg>
  ),
  Insect: (
    <svg className="w-5 h-5 mx-auto text-amber-200" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2a3 3 0 00-3 3v1H6l2 3H6l2 3H5l3 3c.5 3 2.5 5 4 6 1.5-1 3.5-3 4-6l3-3h-3l2-3h-2l2-3h-3V5a3 3 0 00-3-3zm-1 6h2v4h-2V8zm0 5h2v4h-2v-4z" />
    </svg>
  ),
  Reptile: (
    <svg className="w-5 h-5 mx-auto text-amber-200" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 3c-3 0-5 2-5 5 0 2 1 3 2 4l-4 4 2 2 4-4c1 1 2 1 3 1s2 0 3-1l4 4 2-2-4-4c1-1 2-2 2-4 0-3-2-5-5-5zm-2 4a1 1 0 110 2 1 1 0 010-2zm4 0a1 1 0 110 2 1 1 0 010-2z" />
    </svg>
  ),
  Hooved: (
    <svg className="w-5 h-5 mx-auto text-amber-200" viewBox="0 0 24 24" fill="currentColor">
      <path d="M4 3l4 4-2 3 3-1 2 3h2l2-3 3 1-2-3 4-4-5 1-2-3-2 3-5-1zm6 10l-1 5 3 3 3-3-1-5h-4z" />
    </svg>
  ),
};
export const TOKEN_PELT: CardDef = { name: "Trade Pelt", class: "No Class", attack: 0, health: 1, cost: 0, emoji: "📜", isSacrifice: false, sigils: [] };
export const TOKEN_BEE: CardDef = { name: "Bee", class: "Insect", attack: 1, health: 1, cost: 0, emoji: "🐝", isSacrifice: false, sigils: ["Airborne"] };
export const CARD_STONE_WALL: CardDef = { id: 'stone_wall', name: 'Stone Wall', class: 'No Class', attack: 0, health: 4, cost: 0, boneCost: 0, emoji: '🏔️', sigils: ["Made of Stone"], unsacrificable: true };
export const CARD_FELLED_TREE: CardDef = { id: 'felled_tree', name: 'Felled Tree', class: 'No Class', attack: 0, health: 3, cost: 0, boneCost: 0, emoji: '🌳', sigils: ["Mighty Leap"], unsacrificable: true };
export const CARD_GRIZZLY: CardDef = { name: "Grizzly", class: "No Class", attack: 4, health: 6, cost: 3, emoji: "🐻", sigils: ["Mighty Leap"] };

export const MAIN_DECK_POOL: CardDef[] = [
  { name: "Amoeba", class: "No Class", attack: 1, health: 2, boneCost: 2, emoji: "🦠", sigils: ["Amorphous"] },
  { name: "Stoat", class: "No Class", attack: 1, health: 3, cost: 1, emoji: "🦦", sigils: [] },
  { name: "Bullfrog", class: "Reptile", attack: 1, health: 2, cost: 1, emoji: "🐸", sigils: ["Mighty Leap"] },
  { name: "Skink", class: "Reptile", attack: 1, health: 2, cost: 1, emoji: "🦎", sigils: ["Loose Tail"] },
  { name: "Sparrow", class: "Avian", attack: 1, health: 2, cost: 1, emoji: "🐦", sigils: ["Airborne"] },
  { name: "Warren", class: "No Class", attack: 0, health: 2, cost: 1, emoji: "🕳️", sigils: ["Rabbit Hole"] },
  { name: "Mantis", class: "Insect", attack: 1, health: 1, cost: 1, emoji: "🦗", sigils: ["Bifurcated Strike"] },
  { name: "Mantiseater", class: "Insect", attack: 1, health: 1, cost: 1, emoji: "👁️", sigils: ["Trifurcated Strike"] },
  { name: "Black Goat", class: "Hooved", attack: 0, health: 1, cost: 1, emoji: "🐐", sigils: ["Worthy Sacrifice"] },
  { name: "Worker Ant", class: "Insect", attack: 0, health: 2, cost: 1, emoji: "🐜", tags: ["Ant"], sigils: [] },
  { name: "Wolf", class: "Canine", attack: 3, health: 2, cost: 2, emoji: "🐺", sigils: [] },
  { name: "Raven", class: "Avian", attack: 2, health: 3, cost: 2, emoji: "🐦‍⬛", sigils: ["Airborne"] },
  { name: "Dire Wolf Pup", class: "Canine", attack: 1, health: 1, cost: 2, emoji: "🐶", sigils: ["Fledgling", "Bone Digger"], evolvesInto: "Dire Wolf" },
  { name: "Wild Bull", class: "Hooved", attack: 3, health: 2, cost: 2, emoji: "🐂", sigils: ["Rampager"] },
  { name: "Mud Turtle", class: "Reptile", attack: 2, health: 2, cost: 2, emoji: "🐢", sigils: ["Armored"] },
  { name: "Hodag", class: "Canine", attack: 1, health: 4, cost: 2, emoji: "👹", sigils: ["Bloodlust"] },
  { name: "The Daus", class: "Hooved", attack: 2, health: 2, cost: 2, emoji: "🐖", sigils: ["Bellist"] },
  { name: "Elk", class: "Hooved", attack: 2, health: 4, cost: 2, emoji: "🦌", sigils: ["Sprinter"] },
  { name: "Pronghorn", class: "Hooved", attack: 1, health: 3, cost: 2, emoji: "🦌", sigils: ["Sprinter", "Bifurcated Strike"] },
  { name: "River Snapper", class: "Reptile", attack: 1, health: 6, cost: 2, emoji: "🐢", sigils: [] },
  { name: "Bloodhound", class: "Canine", attack: 2, health: 3, cost: 2, emoji: "🐕", sigils: ["Guardian"] },
  { name: "Field Mice", class: "No Class", attack: 2, health: 2, cost: 2, emoji: "🐁", sigils: ["Fecundity"] },
  { name: "Adder", class: "Reptile", attack: 1, health: 1, cost: 2, emoji: "🐍", sigils: ["Touch of Death"] },
  { name: "Ant Queen", class: "Insect", attack: 0, health: 3, cost: 2, emoji: "👑", tags: ["Ant"], sigils: ["Ant Spawner"] },
  { name: "Grizzly", class: "No Class", attack: 4, health: 6, cost: 3, emoji: "🐻", sigils: [] },
  { name: "Moose Buck", class: "Hooved", attack: 3, health: 7, cost: 3, emoji: "🦌", sigils: ["Hefty"] },
  { name: "Dire Wolf", class: "Canine", attack: 2, health: 5, cost: 3, emoji: "🐺", sigils: ["Double Strike"] },
  { name: "Great White", class: "No Class", attack: 4, health: 2, cost: 3, emoji: "🦈", sigils: ["Waterborne"] },
  { name: "Opossum", class: "No Class", attack: 1, health: 1, boneCost: 2, emoji: "🐀", sigils: [] },
  { name: "Coyote", class: "Canine", attack: 2, health: 1, boneCost: 3, emoji: "🐺", sigils: [] },
  { name: "Cockroach", class: "Insect", attack: 1, health: 1, boneCost: 4, emoji: "💀", sigils: ["Unkillable"] },
  { name: "Rattler", class: "Reptile", attack: 3, health: 2, boneCost: 5, emoji: "🐍", sigils: [] },
  { name: "Alpha", class: "Canine", attack: 1, health: 2, boneCost: 4, emoji: "🐺", sigils: ["Leader"] },
  { name: "House Fly", class: "Insect", attack: 1, health: 2, boneCost: 4, emoji: "🐛", sigils: ["Corpse Eater"] },
  { name: "Wolverine", class: "No Class", attack: 1, health: 3, boneCost: 4, emoji: "🦡", sigils: ["Bloodlust"] },
  { name: "Demon Elk", class: "Hooved", attack: 1, health: 2, boneCost: 4, emoji: "🦌", sigils: ["Sprinter", "Touch of Death"] },
  { name: "Geck", class: "Reptile", attack: 1, health: 1, cost: 0, emoji: "🦎", sigils: [] },
  { name: "Magpie", class: "Avian", attack: 1, health: 1, cost: 2, emoji: "🦉", sigils: ["Airborne", "Hoarder"] },
  { name: "Mole", class: "No Class", attack: 0, health: 4, cost: 1, emoji: "🐹", sigils: ["Burrower"] },
  { name: "Porcupine", class: "No Class", attack: 1, health: 2, cost: 1, emoji: "🦔", sigils: ["Sharp Quills"] },
  { name: "Cat", class: "No Class", attack: 0, health: 1, cost: 1, emoji: "🐈", sigils: ["Many Lives"] },
  { name: "Mealworm", class: "Insect", attack: 0, health: 2, boneCost: 2, emoji: "🦋", sigils: ["Morsel"] },
  { name: "Rat King", class: "No Class", attack: 2, health: 1, cost: 2, emoji: "🐀", sigils: ["Bone King"] },
  { name: "Raccoon", class: "No Class", attack: 1, health: 1, boneCost: 3, emoji: "🦝", sigils: ["Scavenger"] },
  { name: "Beaver", class: "No Class", attack: 1, health: 3, cost: 2, emoji: "🚪", sigils: ["Dam Builder"] },
  { name: "Elk Fawn", class: "Hooved", attack: 1, health: 1, cost: 1, emoji: "🦌", sigils: ["Sprinter", "Fledgling"], evolvesInto: "Elk" },
  { name: "Flying Ant", class: "Insect", attack: 0, health: 1, cost: 1, emoji: "🐜", tags: ["Ant"], sigils: ["Airborne"] },
  { name: "Brood", class: "Insect", attack: 0, health: 2, cost: 1, emoji: "🍯", sigils: ["Bees Within"] },
  { name: "Tadpole", class: "Reptile", attack: 0, health: 1, cost: 0, emoji: "🐟", sigils: ["Waterborne", "Fledgling"], evolvesInto: "Bullfrog" },
  { name: "Ouroboros", class: "Reptile", attack: 1, health: 1, cost: 2, emoji: "🐉", sigils: ["Unkillable"] },
  { name: "Bat", class: "No Class", attack: 2, health: 1, boneCost: 4, emoji: "🦇", sigils: ["Airborne"] },
  { name: "Amalgam", class: "ALL Classes", attack: 3, health: 3, cost: 2, emoji: "🧬", sigils: [] },
  { name: "Lammergeier", class: "Avian", attack: 0, health: 4, cost: 3, emoji: "🦅", sigils: ["Airborne"] },
  { name: "River Otter", class: "No Class", attack: 1, health: 1, cost: 1, emoji: "🦦", sigils: ["Waterborne"] },
  { name: "Turkey Vulture", class: "Avian", attack: 3, health: 3, boneCost: 6, emoji: "🦃", sigils: ["Airborne"] },
  { name: "Wolf Cub", class: "Canine", attack: 1, health: 1, cost: 1, emoji: "🐾", sigils: ["Fledgling"], evolvesInto: "Wolf" },
  { name: "Skunk", class: "No Class", attack: 0, health: 3, cost: 1, emoji: "🦨", sigils: ["Stinky"] },

  // --- Utility, Incubators & Bone Economy ---
  { name: "Tsuchinoko", class: "Reptile", attack: 1, health: 1, boneCost: 2, emoji: "🐍", sigils: ["Worthy Sacrifice"] },
  { name: "Red Stray", class: "Canine", attack: 1, health: 2, cost: 1, emoji: "🐕", sigils: ["Bone King"] },
  { name: "Red Hound", class: "Canine", attack: 2, health: 3, cost: 2, emoji: "🐕", sigils: ["Bone Digger"] },
  { name: "Red Behemoth", class: "Canine", attack: 2, health: 5, cost: 2, emoji: "🐕", sigils: ["Bone Digger", "Hefty"] },
  { name: "Red Colossus", class: "Canine", attack: 3, health: 9, cost: 3, emoji: "🐕", sigils: ["Hefty", "Bloodlust"] },
  { name: "Jackal", class: "Canine", attack: 1, health: 2, boneCost: 4, emoji: "🐺", sigils: ["Guardian", "Corpse Eater"] },
  { name: "Armadillo", class: "No Class", attack: 0, health: 3, boneCost: 3, emoji: "🛡️", sigils: ["Armored"] },
  { name: "Cicada", class: "Insect", attack: 2, health: 1, boneCost: 3, emoji: "🦗", sigils: ["Airborne", "Brittle"] },
  { name: "Silkworm", class: "Insect", attack: 0, health: 1, cost: 0, emoji: "🐛", sigils: ["Fledgling"], evolvesInto: "Silken Moth" },
  { name: "Silken Moth", class: "Insect", attack: 2, health: 1, cost: 0, emoji: "🐛", sigils: ["Airborne"] },
  { name: "Hyphae", class: "No Class", attack: 0, health: 2, cost: 0, emoji: "🍄", sigils: ["Morsel", "Fledgling"], evolvesInto: "Mycelium" },
  { name: "Mycelium", class: "No Class", attack: 1, health: 3, cost: 0, emoji: "🍄", sigils: ["Stinky", "Rampager"] }
];

export const ALL_CARD_LOOKUP: Record<string, CardDef> = {
  "Squirrel": TOKEN_SQUIRREL,
  "Rabbit": TOKEN_RABBIT,
  "Chime": TOKEN_CHIME,
  "Dam": TOKEN_DAM,
  "Tail": TOKEN_TAIL,
  "Vertibrae": TOKEN_VERTIBRAE,
  "Trade Pelt": TOKEN_PELT,
  "Bee": TOKEN_BEE,
  "Stone Wall": CARD_STONE_WALL,
  "Felled Tree": CARD_FELLED_TREE,
};

// --- Custom Items & Item Token Definitions ---
export const CARD_FLAMING_SKELETON: CardDef = {
  id: 'flaming_skeleton',
  name: 'Flaming Skeleton',
  class: 'No Class',
  attack: 3,
  health: 1,
  cost: 0,
  boneCost: 0,
  emoji: '🔥',
  sigils: []
};

export type ItemId =
  | 'magical_hat'
  | 'bone_lords_horn'
  | 'joker_stamp'
  | 'large_matchbook'
  | 'coin_purse'
  | 'bronze_crucifix'
  | 'loaded_die'
  | 'bronze_acorn';

export interface ItemDef {
  id: ItemId;
  name: string;
  emoji: string;
  description: string;
}

export const ALL_ITEMS: Record<ItemId, ItemDef> = {
  magical_hat: {
    id: 'magical_hat',
    name: 'Magical Hat',
    emoji: '🎩',
    description: '50% chance to summon a Rabbit to hand, or crush a player slot with a Stone Wall.'
  },
  bone_lords_horn: {
    id: 'bone_lords_horn',
    name: "Bone Lord's Horn",
    emoji: '📯',
    description: 'Evolves all allied creatures into their tribal skeletal equivalents.'
  },
  joker_stamp: {
    id: 'joker_stamp',
    name: 'Joker Stamp',
    emoji: '🃏',
    description: 'Submerges an enemy front-row card: replaces sigils with Waterborne, sets stats to 0/1.'
  },
  large_matchbook: {
    id: 'large_matchbook',
    name: 'Large Matchbook',
    emoji: '🔥',
    description: 'Incinerates an enemy card and inflicts lingering Burn on opposing lanes.'
  },
  coin_purse: {
    id: 'coin_purse',
    name: 'Coin Purse',
    emoji: '💰',
    description: 'Provides +4 Bones. The Zealot might trade for it in Phase 2.'
  },
  bronze_crucifix: {
    id: 'bronze_crucifix',
    name: 'Bronze Crucifix',
    emoji: '✝️',
    description: 'Bypasses Bone Lord phases or dims the Blood Moon.'
  },
  loaded_die: {
    id: 'loaded_die',
    name: 'Loaded Die',
    emoji: '🎲',
    description: 'Roll to draw cards from chosen deck. Beware rolling a five.'
  },
  bronze_acorn: {
    id: 'bronze_acorn',
    name: 'Bronze Acorn',
    emoji: '🌰',
    description: 'Infuses all Squirrels with +1 Power and +1 Health for this duel.'
  }
};

MAIN_DECK_POOL.forEach(c => {
  ALL_CARD_LOOKUP[c.name] = c;
});

export const BOSS_EXCLUSIVE_CARDS: CardDef[] = [
  { name: "Skeleton", class: "No Class", attack: 1, health: 1, emoji: "💀", sigils: ["Brittle"] },
  { name: "Geist", class: "No Class", attack: 0, health: 7, emoji: "👻", sigils: ["Burrower", "Fledgling"], evolvesInto: "Ghast" },
  { name: "Ghast", class: "No Class", attack: 3, health: 9, emoji: "🌫️", sigils: ["Airborne", "Brittle"] },
  { name: "Skeleton Canine", class: "Canine", attack: 2, health: 2, emoji: "🦴", sigils: ["Double Strike"] },
  { name: "Exoskeleton", class: "Insect", attack: 1, health: 1, emoji: "🦂", sigils: ["Trifurcated Strike", "Brittle"] },
  { name: "Tortoise Shell", class: "Reptile", attack: 1, health: 2, emoji: "🐢", sigils: ["Waterborne"] },
  { name: "Anubis", class: "No Class", attack: 1, health: 4, emoji: "⚰️", sigils: ["Bifurcated Strike"] },
  { name: "Reaper", class: "Avian", attack: 4, health: 1, emoji: "⌛", sigils: ["Stinky", "Airborne"] },
  { name: "BLOOD MOON", class: "No Class", attack: 2, health: 80, emoji: "🌑", sigils: ["Mighty Leap", "Made of Stone", "Omnistrike", "Tidal Lock", "Stinky"], isMassive: true }
];

BOSS_EXCLUSIVE_CARDS.forEach(c => {
  ALL_CARD_LOOKUP[c.name] = c;
});

type EvolutionTarget = string | { target: string; chance: number }[];

const EVOLUTION_MAP: Record<string, EvolutionTarget> = {
  "Tadpole": [
    { target: "Bullfrog", chance: 40 },
    { target: "Mud Turtle", chance: 30 },
    { target: "River Snapper", chance: 15 },
    { target: "Tsuchinoko", chance: 10 },
    { target: "Great White", chance: 5 }
  ],
  "Elk Fawn": "Elk",
  "Dire Wolf Pup": "Dire Wolf",
  "Wolf Cub": "Wolf",
  "Elk": "Moose Buck",
  "Mantis": "Mantiseater",
  "Geist": "Ghast",
  "Cat": "Anubis",
  "Silkworm": "Silken Moth",
  "Hyphae": "Mycelium"
};

// Restricted pool of sigils for Boss totem in Woodcarver Boss
export const WOODCARVER_BOSS_TOTEM_SIGILS: string[] = [
  'Airborne',
  'Burrower',
  'Fledgling',
  'Hefty',
  'Sharp Quills',
  'Waterborne',
  'Bifurcated Strike',
  'Trifurcated Strike',
  'Mighty Leap'
];

// Cards strictly excluded from every enemy's card pool
export const ENEMY_EXCLUDED_CARD_NAMES = new Set([
  'Hodag',
  'Demon Elk',
  'Daus',
  'Magpie',
  'Raccoon',
  'Lammergeier',
  'Ouroboros',
  'Brood',
  'Geck',
  'Cat',
  'Black Goat',
  'Warren',
  'Silkworm',
  'Silken Moth',
  'Hyphae',
  'Mycelium',
  'Tsuchinoko',
  'Red Stray',
  'Red Colossus',
  'Red Behemoth'
]);

export const ENEMY_MAIN_DECK_POOL: CardDef[] = MAIN_DECK_POOL.filter(c => !ENEMY_EXCLUDED_CARD_NAMES.has(c.name));

export const EVENT_EXCLUDED_CARD_NAMES = new Set([
  'Red Stray',
  'Red Hound',
  'Red Behemoth',
  'Red Colossus',
  'Mycelium',
  'Silken Moth'
]);
export const EVENT_CARD_POOL: CardDef[] = MAIN_DECK_POOL.filter(c => !EVENT_EXCLUDED_CARD_NAMES.has(c.name));

export interface BossDialogueSet {
  greetings: string[];
  dismissals: string[];
}

export const BOSS_DIALOGUES: Record<string, BossDialogueSet> = {
  "The Woodcarver": {
    greetings: [
      "The wood speaks to me in whispers... let us see what it carves for you.",
      "Every piece of bark holds a spirit. Do you dare disturb them?",
      "My chisels are sharp, traveler. Let us test the grain of your resolve."
    ],
    dismissals: [
      "The grain was true... you have carved your own destiny today.",
      "My figures crumble to sawdust. Walk on, champion of the woods.",
      "The forest acknowledges your craft. Take your leave in peace."
    ]
  }
};

// Safe ID generator that guarantees strictly unique keys
let cardIdIndex = 1;
export function generateCardId(prefix = 'card'): string {
  return `${prefix}-${Date.now()}-${cardIdIndex++}-${Math.random().toString(36).substring(2, 9)}`;
}

export function cloneCard(def: CardDef, ouroborosBuffs = 0): CardDef {
  if (!def) {
    console.error("cloneCard received undefined card definition");
    return { name: "Void", class: "No Class", attack: 0, health: 1, emoji: "❓", sigils: [] };
  }
  const c: CardDef = JSON.parse(JSON.stringify(def));
  c.id = generateCardId(c.name.toLowerCase().replace(/\s+/g, '-'));
  if (c.name === "Ouroboros" && ouroborosBuffs > 0) {
    // Base stats are already permanently incremented in masterDeck; do not stack on clone
  }
  return c;
}

export function transformAmorphous(card: CardDef): CardDef {
  if (!card) return card;
  if (card.sigils && card.sigils.includes('Amorphous')) {
    const pool = Object.keys(SIGIL_MAPPING).filter(s => s !== 'Amorphous');
    card.sigils = card.sigils.filter(s => s !== 'Amorphous');
    card.sigils.push(pool[Math.floor(Math.random() * pool.length)]);
  }
  return card;
}

export function applyPlayerTotem(card: CardDef, activeTotem: Totem): CardDef {
  if (!card || !activeTotem.head || !activeTotem.body) return card;
  if (card.class === activeTotem.head || card.class === "ALL Classes") {
    if (!card.sigils) card.sigils = [];
    if (!card.sigils.includes(activeTotem.body)) {
      card.sigils = [...card.sigils, activeTotem.body];
    }
  }
  return card;
}

// --- Built-in Chiptune Audio Synthesizer ---
export interface TrackInstance {
  name: string;
  bus: GainNode;
  nodes: (AudioNode & { stop?: (when?: number) => void })[];
  timers: (ReturnType<typeof setTimeout> | ReturnType<typeof setInterval>)[];
  cleanup: () => void;
}

interface ChiptuneAudioType {
  [key: string]: any;
  ctx: AudioContext | null;
  currentTrack: string | null;
  activeInstance: TrackInstance | null;
  init: () => void;
  transitionTo: (trackName: string, startFn: (inst: TrackInstance) => void, fadeTime?: number) => void;
  stop: (fadeTime?: number) => void;
  playSynthPiano: (freqs: number[], bus: GainNode, duration?: number, gainLevel?: number) => void;
  playSlapBass: (freq: number, bus: GainNode, isPop?: boolean, duration?: number, gainLevel?: number) => void;
  playStrings: (chordFreqs: number[], bus: GainNode, duration?: number, gainLevel?: number) => void;
  playBrass: (freq: number, bus: GainNode, duration?: number, gainLevel?: number) => void;
  playPluck: (freq: number, bus: GainNode, duration?: number, gainLevel?: number) => void;
  playImpact: (pitch: number, bus: GainNode, decay?: number, gainLevel?: number) => void;
  playSwell?: (freq: number, dest: GainNode, duration?: number, gainLevel?: number) => void;
  playCabin: (fadeTime?: number) => void;
  playBattle: (fadeTime?: number) => void;
  playBoss: (fadeTime?: number) => void;
  playOrgan: (freqs: number[], bus: GainNode, duration?: number, gainLevel?: number) => void;
  playBoneClick: (freq: number, bus: GainNode, gainLevel?: number) => void;
  playFinalBoss: (fadeTime?: number) => void;
  playFinalBossPhase3: (fadeTime?: number) => void;
  playHarp: (freq: number, bus: GainNode, duration?: number, gainLevel?: number) => void;
  playBell: (freq: number, bus: GainNode, duration?: number, gainLevel?: number) => void;
  playFleshGroan: (startFreq: number, endFreq: number, bus: GainNode, duration?: number, gainLevel?: number) => void;
  playTheWeaver: (fadeTime?: number) => void;
  playTheZealot: (fadeTime?: number) => void;
  playTheBegotten: (fadeTime?: number) => void;
}

export const ChiptuneAudio: any = {
  ctx: null,
  currentTrack: null,
  activeInstance: null,
  musicVolume: 0.7,
  sfxVolume: 0.8,
  musicGain: null as GainNode | null,

  init() {
    try {
      if (!this.ctx) {
        const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        this.ctx = new AudioCtx();
      }
      if (this.ctx && !this.musicGain) {
        this.musicGain = this.ctx.createGain();
        this.musicGain.gain.setValueAtTime(this.musicVolume, this.ctx.currentTime);
        this.musicGain.connect(this.ctx.destination);
      }
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
    } catch {}
  },

  setMusicVolume(val: number) {
    const clamped = Math.max(0, Math.min(1, val));
    this.musicVolume = clamped;
    this.init();
    if (this.ctx && this.musicGain) {
      this.musicGain.gain.cancelScheduledValues(this.ctx.currentTime);
      this.musicGain.gain.setValueAtTime(clamped, this.ctx.currentTime);
    }
  },

  setSfxVolume(val: number) {
    const clamped = Math.max(0, Math.min(1, val));
    this.sfxVolume = clamped;
  },

  playSfxPreview() {
    this.init();
    if (!this.ctx || this.sfxVolume <= 0) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(587.33, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(880, this.ctx.currentTime + 0.09);
    gain.gain.setValueAtTime(0.25 * this.sfxVolume, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.12);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.12);
  },

  transitionTo(trackName: string, startFn: (inst: TrackInstance) => void, fadeTime = 1.5) {
    this.init();
    if (!this.ctx) return;
    if (this.currentTrack === trackName) return;

    const now = this.ctx.currentTime;

    if (this.activeInstance) {
      const old = this.activeInstance;
      old.bus.gain.cancelScheduledValues(now);
      old.bus.gain.setValueAtTime(old.bus.gain.value, now);
      old.bus.gain.linearRampToValueAtTime(0.0001, now + fadeTime);

      setTimeout(() => {
        old.cleanup();
      }, fadeTime * 1000);
    }

    const bus = this.ctx.createGain();
    bus.gain.setValueAtTime(0.0001, now);
    bus.gain.linearRampToValueAtTime(1.0, now + fadeTime);
    bus.connect(this.musicGain || this.ctx.destination);

    const instance: TrackInstance = {
      name: trackName,
      bus: bus,
      nodes: [],
      timers: [],
      cleanup() {
        this.timers.forEach(t => {
          clearInterval(t as unknown as number);
          clearTimeout(t as unknown as number);
        });
        this.nodes.forEach(n => {
          try {
            if (n.stop) n.stop();
            n.disconnect();
          } catch {}
        });
        try {
          this.bus.disconnect();
        } catch {}
      }
    };

    this.activeInstance = instance;
    this.currentTrack = trackName;
    startFn(instance);
  },

  stop(fadeTime = 1.0) {
    if (!this.activeInstance || !this.ctx) return;
    const now = this.ctx.currentTime;
    const old = this.activeInstance;

    old.bus.gain.cancelScheduledValues(now);
    old.bus.gain.setValueAtTime(old.bus.gain.value, now);
    old.bus.gain.linearRampToValueAtTime(0.0001, now + fadeTime);

    setTimeout(() => {
      old.cleanup();
    }, fadeTime * 1000);

    this.activeInstance = null;
    this.currentTrack = null;
  },

  // --- Specialized Instruments ---

  // Heavy, dark synth piano chord/strike
  playSynthPiano(freqs: number[], bus: GainNode, duration = 1.6, gainLevel = 0.22) {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    freqs.forEach(freq => {
      if (!this.ctx) return;
      const oscSine = this.ctx.createOscillator();
      const oscTri = this.ctx.createOscillator();
      const filter = this.ctx.createBiquadFilter();
      const gain = this.ctx.createGain();

      oscSine.type = 'sine';
      oscTri.type = 'triangle';

      // Slight hammer transient drop
      oscSine.frequency.setValueAtTime(freq * 1.02, now);
      oscSine.frequency.exponentialRampToValueAtTime(freq, now + 0.04);
      oscTri.frequency.setValueAtTime(freq, now);

      // Warm acoustic lowpass roll-off
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(850, now);
      filter.frequency.exponentialRampToValueAtTime(220, now + duration);

      // Piano decay curve
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(gainLevel / freqs.length, now + 0.015);
      gain.gain.exponentialRampToValueAtTime(gainLevel * 0.35, now + 0.3);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

      oscSine.connect(filter);
      oscTri.connect(filter);
      filter.connect(gain);
      gain.connect(bus);

      oscSine.start(now);
      oscTri.start(now);
      oscSine.stop(now + duration);
      oscTri.stop(now + duration);
    });
  },

  // Slap Bass: punchy sub-drive with a bright thumb/pop attack
  playSlapBass(freq: number, bus: GainNode, isPop = false, duration = 0.35, gainLevel = 0.26) {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = isPop ? 'sawtooth' : 'triangle';
    osc.frequency.setValueAtTime(freq, now);

    // Resonant slap filter sweep
    filter.type = 'lowpass';
    filter.Q.value = isPop ? 5.0 : 3.0;
    const startFilter = isPop ? 2800 : 1200;
    filter.frequency.setValueAtTime(startFilter, now);
    filter.frequency.exponentialRampToValueAtTime(140, now + 0.12);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(gainLevel, now + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(bus);

    osc.start(now);
    osc.stop(now + duration);

    // Perceptual transient click/thump
    const click = this.ctx.createOscillator();
    const clickGain = this.ctx.createGain();
    click.type = 'square';
    click.frequency.setValueAtTime(isPop ? 800 : 300, now);
    clickGain.gain.setValueAtTime(0.08, now);
    clickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.02);

    click.connect(clickGain);
    clickGain.connect(bus);
    click.start(now);
    click.stop(now + 0.02);
  },

  // Heavy 4-voice detuned string ensemble swell
  playStrings(chordFreqs: number[], bus: GainNode, duration = 2.8, gainLevel = 0.14) {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    chordFreqs.forEach(freq => {
      [-7, 7].forEach(cents => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const filter = this.ctx.createBiquadFilter();
        const gain = this.ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq * Math.pow(2, cents / 1200), now);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(700, now);

        // Lush orchestral swell & release
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.linearRampToValueAtTime(gainLevel / (chordFreqs.length * 2), now + 0.35);
        gain.gain.setValueAtTime(gainLevel * 0.7 / (chordFreqs.length * 2), now + duration * 0.7);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(bus);

        osc.start(now);
        osc.stop(now + duration);
      });
    });
  },

  // Toned-down brass accent
  playBrass(freq: number, bus: GainNode, duration = 0.6, gainLevel = 0.15) {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc1.type = 'sawtooth';
    osc2.type = 'sawtooth';
    osc1.frequency.setValueAtTime(freq, now);
    osc2.frequency.setValueAtTime(freq * 1.005, now);

    filter.type = 'lowpass';
    filter.Q.value = 2.5;
    filter.frequency.setValueAtTime(200, now);
    filter.frequency.exponentialRampToValueAtTime(900, now + 0.07);
    filter.frequency.exponentialRampToValueAtTime(150, now + duration);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(gainLevel, now + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    gain.connect(bus);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + duration);
    osc2.stop(now + duration);
  },

  playPluck(freq: number, bus: GainNode, duration = 1.8, gainLevel = 0.07) {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, now);
    gain.gain.setValueAtTime(gainLevel, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc.connect(gain);
    gain.connect(bus);
    osc.start(now);
    osc.stop(now + duration);
  },

  playImpact(pitch: number, bus: GainNode, decay = 0.4, gainLevel = 0.3) {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.frequency.setValueAtTime(pitch, now);
    osc.frequency.exponentialRampToValueAtTime(25, now + decay);
    gain.gain.setValueAtTime(gainLevel, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + decay);

    osc.connect(gain);
    gain.connect(bus);
    osc.start(now);
    osc.stop(now + decay);
  },

  // Slow, mournful bowed string/pad swell for ambient mid-range
  playSwell(freq: number, dest: GainNode, duration = 5.5, gainLevel = 0.06) {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    [-4, 4].forEach(detuneCents => {
      const osc = this.ctx.createOscillator();
      const filter = this.ctx.createBiquadFilter();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq * Math.pow(2, detuneCents / 1200), now);

      // Warm, muffled filter that opens slightly at the peak of the swell
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(160, now);
      filter.frequency.exponentialRampToValueAtTime(480, now + duration * 0.45);
      filter.frequency.exponentialRampToValueAtTime(140, now + duration);

      // Slow fade-in, long tail
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(gainLevel * 0.5, now + duration * 0.45);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(dest);

      osc.start(now);
      osc.stop(now + duration);
    });
  },

// --- Spatial & Utility Helpers ---
  createEchoBus(inst: any, delayTime = 0.36, feedbackAmt = 0.38, filterCutoff = 950) {
    if (!this.ctx) return inst.bus;
    const input = this.ctx.createGain();
    const delay = this.ctx.createDelay();
    const feedback = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    delay.delayTime.value = delayTime;
    feedback.gain.value = feedbackAmt;
    filter.type = 'lowpass';
    filter.frequency.value = filterCutoff;

    input.connect(inst.bus);
    input.connect(delay);
    delay.connect(filter);
    filter.connect(inst.bus);
    filter.connect(feedback);
    feedback.connect(delay);

    inst.nodes.push(input, delay, feedback, filter);
    return input;
  },

  // Brushed snare / organic percussion hit
  playBrushHit(dest: any, decay = 0.12, toneFreq = 900, gainLevel = 0.08) {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const bufferSize = Math.floor(this.ctx.sampleRate * decay);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.Q.value = 1.8;
    filter.frequency.setValueAtTime(toneFreq, now);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(gainLevel, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + decay);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(dest);
    noise.start(now);
  },

  // 1. Ambient (Reworked): Breathing drone, tape delay network, and bowed swells
  playCabin(fadeTime = 1.8) {
    this.transitionTo('cabin', (inst: any) => {
      if (!this.ctx) return;

      // --- A. Breathing Sub-Drone ---
      const droneFilter = this.ctx.createBiquadFilter();
      droneFilter.type = 'lowpass';
      droneFilter.frequency.value = 145;

      // Slow LFO to make the drone filter slowly open and close (~8s cycle)
      const lfo = this.ctx.createOscillator();
      const lfoGain = this.ctx.createGain();
      lfo.type = 'sine';
      lfo.frequency.value = 0.12;
      lfoGain.gain.value = 45; // Sweeps filter between 100Hz and 190Hz
      lfo.connect(lfoGain);
      lfoGain.connect(droneFilter.frequency);
      lfo.start();
      inst.nodes.push(lfo);

      const subGain = this.ctx.createGain();
      subGain.gain.value = 0.12;
      droneFilter.connect(subGain);
      subGain.connect(inst.bus);

      // D1, D2 detuned pair, plus a faint A2 fifth
      [
        { f: 36.71, type: 'sawtooth' as OscillatorType },
        { f: 73.42, type: 'sawtooth' as OscillatorType },
        { f: 73.85, type: 'sawtooth' as OscillatorType },
        { f: 110.00, type: 'triangle' as OscillatorType }
      ].forEach(v => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        osc.type = v.type;
        osc.frequency.value = v.f;
        osc.connect(droneFilter);
        osc.start();
        inst.nodes.push(osc);
      });

      // --- B. Dark Tape Delay Bus for Plucks ---
      const pluckBus = this.ctx.createGain();
      const delay = this.ctx.createDelay();
      const feedback = this.ctx.createGain();
      const delayFilter = this.ctx.createBiquadFilter();

      delay.delayTime.value = 0.48; // ~Half-second echo
      feedback.gain.value = 0.42;   // Decaying repeats
      delayFilter.type = 'lowpass';
      delayFilter.frequency.value = 900; // Darken each repeat

      // Dry path + Wet loop
      pluckBus.connect(inst.bus);
      pluckBus.connect(delay);
      delay.connect(delayFilter);
      delayFilter.connect(inst.bus);
      delayFilter.connect(feedback);
      feedback.connect(delay);

      // --- C. Generative Plucks & Arpeggio Rolls ---
      const palette = [
        98.00,  // G2
        110.00, // A2
        130.81, // C3
        146.83, // D3
        164.81, // E3
        174.61, // F3
        196.00, // G3
        220.00, // A3
        246.94, // B3 (Dorian natural 6th)
        261.63, // C4
        293.66, // D4
        329.63, // E4
        349.23, // F4
        440.00  // A4
      ];

      const schedulePluck = () => {
        if (this.activeInstance !== inst) return;
        const roll = Math.random();
        const idx = Math.floor(Math.random() * (palette.length - 3));
        const baseNote = palette[idx];

        if (roll > 0.72) {
          // 3-note slow rolled chord
          this.playPluck(baseNote, pluckBus, 3.0, 0.055);
          const t1 = setTimeout(() => {
            if (this.activeInstance === inst) this.playPluck(palette[idx + 1], pluckBus, 2.6, 0.045);
          }, 210);
          const t2 = setTimeout(() => {
            if (this.activeInstance === inst) this.playPluck(palette[idx + 3], pluckBus, 2.4, 0.035);
          }, 440);
          inst.timers.push(t1, t2);
        } else if (roll > 0.4) {
          // Harmonic dyad (fifth or fourth)
          this.playPluck(baseNote, pluckBus, 2.8, 0.055);
          const t = setTimeout(() => {
            if (this.activeInstance === inst) {
              this.playPluck(baseNote * 1.5, pluckBus, 2.2, 0.038);
            }
          }, 190);
          inst.timers.push(t);
        } else if (roll > 0.15) {
          // Lonely single note
          this.playPluck(baseNote, pluckBus, 2.4, 0.065);
        }

        const next = 1100 + Math.random() * 1900;
        const mainTimer = setTimeout(schedulePluck, next);
        inst.timers.push(mainTimer);
      };

      // --- D. Haunting Bowed Mid-Range Swells ---
      const swellNotes = [
        [146.83, 220.00], // D3 + A3 (Open fifth)
        [130.81, 196.00], // C3 + G3
        [174.61, 220.00], // F3 + A3 (Minor third warmth)
        [110.00, 164.81], // A2 + E3
        [146.83, 246.94]  // D3 + B3 (Dorian ache)
      ];

      const scheduleSwell = () => {
        if (this.activeInstance !== inst) return;
        const pair = swellNotes[Math.floor(Math.random() * swellNotes.length)];
        const dur = 4.5 + Math.random() * 2.5;

        pair.forEach(freq => {
          this.playSwell(freq, inst.bus, dur, 0.055);
        });

        const nextSwell = 5000 + Math.random() * 4000;
        const swellTimer = setTimeout(scheduleSwell, nextSwell);
        inst.timers.push(swellTimer);
      };

      schedulePluck();
      scheduleSwell();
    }, fadeTime);
  },

  // ==========================================
  // 2. BATTLE (64-Step Noir Synth Piano Groove)
  // ==========================================
  playBattle(fadeTime = 1.4) {
    this.transitionTo('battle', (inst: any) => {
      if (!this.ctx) return;
      const pianoEcho = this.createEchoBus(inst, 0.38, 0.28, 850);

      const chords: Record<number, number[]> = {
        0:  [73.42, 110.00, 146.83, 174.61], // Dm
        6:  [73.42, 164.81],                 // Dm9 push
        8:  [87.31, 130.81, 174.61, 220.00], // F
        16: [58.27, 116.54, 146.83, 174.61], // Bb
        22: [58.27, 130.81, 164.81],         // Bbmaj9 offbeat
        24: [55.00, 110.00, 138.59, 196.00], // A7
        32: [98.00, 146.83, 174.61, 220.00], // Gm9
        40: [73.42, 110.00, 146.83, 220.00], // Dm/F
        48: [82.41, 116.54, 146.83, 196.00], // Em7b5
        56: [55.00, 110.00, 146.83, 196.00], // A7sus4
        60: [55.00, 110.00, 138.59, 174.61]  // A7 resolve
      };

      const topMelody: Record<number, number> = {
        34: 293.66, 36: 329.63, 38: 349.23,
        42: 440.00, 44: 392.00, 46: 349.23,
        50: 329.63, 52: 293.66, 54: 277.18,
        58: 293.66, 62: 277.18
      };

      const bassline: (number | null)[] = [
        73.42, null, 73.42, null, 87.31, null, 73.42, 82.41,
        87.31, null, 87.31, 110.00, null, 87.31, 65.41, null,
        58.27, null, 58.27, null, 65.41, null, 58.27, 69.30,
        55.00, null, 55.00, 82.41, null, 73.42, 69.30, 61.74,
        49.00, null, 49.00, null, 58.27, null, 65.41, 73.42,
        73.42, null, 73.42, 65.41, null, 58.27, 55.00, null,
        41.20, null, 41.20, null, 58.27, null, 55.00, 49.00,
        55.00, null, 55.00, null, 55.00, 61.74, 65.41, 69.30
      ];

      let step = 0;
      const interval = setInterval(() => {
        if (!this.ctx) return;

        if (chords[step]) {
          this.playSynthPiano(chords[step], pianoEcho, 2.2, 0.22);
        }

        if (topMelody[step]) {
          this.playPluck(topMelody[step], pianoEcho, 1.4, 0.08);
        }

        if (step % 8 === 0) {
          this.playImpact(88, inst.bus, 0.4, 0.34);
        } else if (step % 8 === 3 && step > 31) {
          this.playImpact(72, inst.bus, 0.25, 0.2);
        }

        if (step % 8 === 4) {
          this.playImpact(68, inst.bus, 0.2, 0.18);
          this.playBrushHit(inst.bus, 0.14, 850, 0.08);
        } else if (step % 2 === 1) {
          this.playBrushHit(inst.bus, 0.05, 2400, step % 4 === 3 ? 0.03 : 0.015);
        }

        const note = bassline[step];
        if (note) {
          const osc = this.ctx.createOscillator();
          const filter = this.ctx.createBiquadFilter();
          const gain = this.ctx.createGain();

          osc.type = 'triangle';
          osc.frequency.setValueAtTime(note, this.ctx.currentTime);
          filter.type = 'lowpass';
          filter.frequency.value = 240;

          gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.26);

          osc.connect(filter);
          filter.connect(gain);
          gain.connect(inst.bus);

          osc.start();
          osc.stop(this.ctx.currentTime + 0.26);
        }

        step = (step + 1) % 64;
      }, 290);

      inst.timers.push(interval);
    }, fadeTime);
  },

  // --- Boss-Specific Instrument Generators ---

  // 1. Metallic Arachnid Harp / Harpsichord (for The Weaver)
  playHarp(freq: number, dest: any, duration = 0.85, gainLevel = 0.1) {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc1.type = 'sawtooth';
    osc2.type = 'triangle';
    osc1.frequency.setValueAtTime(freq, now);
    osc2.frequency.setValueAtTime(freq * 2, now);

    filter.type = 'lowpass';
    filter.Q.value = 3.5;
    filter.frequency.setValueAtTime(3200, now);
    filter.frequency.exponentialRampToValueAtTime(380, now + duration * 0.7);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(gainLevel, now + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    gain.connect(dest);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + duration);
    osc2.stop(now + duration);
  },

  // 2. Sanctuary Bronze Bell via FM Synthesis (for The Zealot)
  playBell(freq: number, dest: any, duration = 2.6, gainLevel = 0.16) {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    const carrier = this.ctx.createOscillator();
    const modulator = this.ctx.createOscillator();
    const modGain = this.ctx.createGain();
    const mainGain = this.ctx.createGain();

    carrier.type = 'sine';
    modulator.type = 'sine';
    carrier.frequency.setValueAtTime(freq, now);
    modulator.frequency.setValueAtTime(freq * 2.756, now);

    modGain.gain.setValueAtTime(freq * 1.8, now);
    modGain.gain.exponentialRampToValueAtTime(0.01, now + duration * 0.65);

    mainGain.gain.setValueAtTime(0.001, now);
    mainGain.gain.linearRampToValueAtTime(gainLevel, now + 0.01);
    mainGain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    modulator.connect(modGain);
    modGain.connect(carrier.frequency);
    carrier.connect(mainGain);
    mainGain.connect(dest);

    carrier.start(now);
    modulator.start(now);
    carrier.stop(now + duration);
    modulator.stop(now + duration);
  },

  // 3. Pitch-Gliding Biological Synth Groan (for The Begotten)
  playFleshGroan(startFreq: number, endFreq: number, dest: any, duration = 1.6, gainLevel = 0.22) {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const sub = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    sub.type = 'sine';

    osc.frequency.setValueAtTime(startFreq, now);
    osc.frequency.exponentialRampToValueAtTime(endFreq, now + duration * 0.85);
    sub.frequency.setValueAtTime(startFreq * 0.5, now);
    sub.frequency.exponentialRampToValueAtTime(endFreq * 0.5, now + duration * 0.85);

    filter.type = 'lowpass';
    filter.Q.value = 6.5;
    filter.frequency.setValueAtTime(180, now);
    filter.frequency.exponentialRampToValueAtTime(680, now + duration * 0.45);
    filter.frequency.exponentialRampToValueAtTime(110, now + duration);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(gainLevel, now + duration * 0.25);
    gain.gain.setValueAtTime(gainLevel * 0.8, now + duration * 0.7);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc.connect(filter);
    sub.connect(gain);
    filter.connect(gain);
    gain.connect(dest);

    osc.start(now);
    sub.start(now);
    osc.stop(now + duration);
    sub.stop(now + duration);
  },

  // ==========================================
  // BOSS TRACKS (Stubbed - routed to battle groove)
  // ==========================================
  playTheWeaver(fadeTime = 1.4) {
    this.playBattle(fadeTime);
  },

  playTheZealot(fadeTime = 1.4) {
    this.playBattle(fadeTime);
  },

  playTheBegotten(fadeTime = 1.8) {
    this.playBattle(fadeTime);
  },

  playFinalBoss(fadeTime = 2.0) {
    this.playBattle(fadeTime);
  },

  playFinalBossPhase3(fadeTime = 0.8) {
    this.playBattle(fadeTime);
  }
};

const chiptuneAudio = ChiptuneAudio;

// Built-in Web Audio API sound generator for game events
const playSound = (type: 'draw' | 'sacrifice' | 'play' | 'hit' | 'bell' | 'bone' | 'defeat' | 'victory' | 'armor') => {
  try {
    const sfxMult = typeof ChiptuneAudio.sfxVolume === 'number' ? ChiptuneAudio.sfxVolume : 0.8;
    if (sfxMult <= 0) return;

    let ctx = ChiptuneAudio.ctx;
    if (!ctx) {
      ChiptuneAudio.init();
      ctx = ChiptuneAudio.ctx;
    }
    if (!ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      ctx = new AudioCtx();
    }
    if (ctx.state === 'suspended') {
      ctx.resume();
    }
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    const now = ctx.currentTime;
    if (type === 'draw') {
      osc.frequency.setValueAtTime(320, now);
      osc.frequency.exponentialRampToValueAtTime(480, now + 0.1);
      gain.gain.setValueAtTime(0.12 * sfxMult, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
      osc.start(now);
      osc.stop(now + 0.1);
    } else if (type === 'sacrifice') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(140, now);
      osc.frequency.exponentialRampToValueAtTime(60, now + 0.22);
      gain.gain.setValueAtTime(0.25 * sfxMult, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
      osc.start(now);
      osc.stop(now + 0.22);
    } else if (type === 'play') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.exponentialRampToValueAtTime(440, now + 0.12);
      gain.gain.setValueAtTime(0.18 * sfxMult, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
      osc.start(now);
      osc.stop(now + 0.12);
    } else if (type === 'hit') {
      osc.type = 'square';
      osc.frequency.setValueAtTime(95, now);
      osc.frequency.exponentialRampToValueAtTime(35, now + 0.15);
      gain.gain.setValueAtTime(0.28 * sfxMult, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
      osc.start(now);
      osc.stop(now + 0.15);
    } else if (type === 'bone') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(560, now);
      osc.frequency.exponentialRampToValueAtTime(700, now + 0.08);
      gain.gain.setValueAtTime(0.15 * sfxMult, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
      osc.start(now);
      osc.stop(now + 0.08);
    } else if (type === 'bell') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.exponentialRampToValueAtTime(780, now + 0.5);
      gain.gain.setValueAtTime(0.2 * sfxMult, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
      osc.start(now);
      osc.stop(now + 0.5);
    } else if (type === 'victory') {
      osc.frequency.setValueAtTime(330, now);
      osc.frequency.setValueAtTime(440, now + 0.15);
      osc.frequency.setValueAtTime(660, now + 0.3);
      gain.gain.setValueAtTime(0.2 * sfxMult, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
      osc.start(now);
      osc.stop(now + 0.5);
    } else if (type === 'defeat') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(150, now);
      osc.frequency.exponentialRampToValueAtTime(40, now + 0.7);
      gain.gain.setValueAtTime(0.25 * sfxMult, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.7);
      osc.start(now);
      osc.stop(now + 0.7);
    } else if (type === 'armor') {
        // High-frequency metallic iron clang / deflection ring
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(1150, now);
        osc.frequency.exponentialRampToValueAtTime(380, now + 0.18);
        gain.gain.setValueAtTime(0.35 * sfxMult, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
        osc.start(now);
        osc.stop(now + 0.18);
    }
  } catch {
    // Audio context may require user gesture
  }
};

export const getStageBgClass = (s: number, isBoss: boolean): string => {
  if (isBoss) return 'bg-gradient-to-b from-[#26080e] via-[#150508] to-[#080204]';
  const cycle = ((s - 1) % 4) + 1;
  switch (cycle) {
    case 1: // Stage 1: Deep Woodland Green
      return 'bg-gradient-to-b from-[#0a1611] via-[#08110d] to-[#050a08]';
    case 2: // Stage 2: Murky Wetlands Cyan/Slate
      return 'bg-gradient-to-b from-[#09171b] via-[#061115] to-[#04090c]';
    case 3: // Stage 3: Frigid Snowline Indigo
      return 'bg-gradient-to-b from-[#0f1322] via-[#0a0d18] to-[#060810]';
    case 4: // Stage 4: Dusk Fire Embers
      return 'bg-gradient-to-b from-[#180e18] via-[#110912] to-[#09040a]';
    default:
      return 'bg-gradient-to-b from-[#0a1611] via-[#08110d] to-[#050a08]';
  }
};

// Universal audio reference bridge
const getAudioEngine = () => {
  try {
    if (typeof ChiptuneAudio !== 'undefined') return ChiptuneAudio;
    if (typeof chiptuneAudio !== 'undefined') return chiptuneAudio;
    if (typeof (window as any).ChiptuneAudio !== 'undefined') return (window as any).ChiptuneAudio;
    if (typeof (window as any).chiptuneAudio !== 'undefined') return (window as any).chiptuneAudio;
  } catch (_) {}
  return null;
};

// --- Diegetic Talisman Watcher Eye (Tracks Cursor via Direct DOM Transform) ---
const TalismanEye: React.FC<{ isTalismanPricked: boolean }> = ({ isTalismanPricked }) => {
  const socketRef = useRef<SVGGElement>(null);
  const pupilGroupRef = useRef<SVGGElement>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!socketRef.current || !pupilGroupRef.current) return;
      const btn = socketRef.current.closest('button');
      if (!btn) return;

      const rect = btn.getBoundingClientRect();
      const btnCenterX = rect.left + rect.width / 2;
      const btnCenterY = rect.top + rect.height / 2;
      const radius = rect.width / 2;

      const dx = e.clientX - btnCenterX;
      const dy = e.clientY - btnCenterY;
      const dist = Math.hypot(dx, dy);

      // Only track while the cursor is inside the button boundary; center immediately when outside
      if (dist > radius || dist < 1) {
        pupilGroupRef.current.setAttribute('transform', 'translate(0, 0)');
        return;
      }

      const angle = Math.atan2(dy, dx);
      const maxOffset = 3.6; // SVG units (contained within socket r=8.5)
      const pull = Math.min(dist / (radius * 0.85), 1);
      const eased = Math.sin(pull * (Math.PI / 2));
      const ox = (Math.cos(angle) * eased * maxOffset).toFixed(2);
      const oy = (Math.sin(angle) * eased * maxOffset).toFixed(2);

      pupilGroupRef.current.setAttribute('transform', `translate(${ox}, ${oy})`);
    };

    const handleMouseLeave = () => {
      if (pupilGroupRef.current) {
        pupilGroupRef.current.setAttribute('transform', 'translate(0, 0)');
      }
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    document.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, []);

  return (
    <g ref={socketRef} className="pointer-events-none select-none">
      <defs>
        {/* Clips the pupil and iris cleanly behind the ocular socket rim */}
        <clipPath id="talismanEyeSocketClip">
          <circle cx="50" cy="50" r="8.2" />
        </clipPath>
      </defs>

      {/* Sclera Base / Well */}
      <circle
        cx="50"
        cy="50"
        r="8.5"
        fill={isTalismanPricked ? "#220507" : "#130c09"}
        stroke={isTalismanPricked ? "#7f1d1d" : "#2a1b14"}
        strokeWidth="1.2"
        className="transition-colors duration-200"
      />

      {/* Organic Capillaries in Sclera */}
      <path
        d="M 44.5 48.5 Q 46.5 49.5 48 49.8 M 55.5 51 Q 53.5 50.5 52 50.2 M 49.5 44 Q 50 46 50.2 47.5"
        stroke={isTalismanPricked ? "rgba(239, 68, 68, 0.7)" : "rgba(185, 28, 28, 0.35)"}
        strokeWidth="0.5"
        fill="none"
        strokeLinecap="round"
      />

      {/* Moving Ocular Group (Tracks Player Cursor) */}
      <g clipPath="url(#talismanEyeSocketClip)">
          <g ref={pupilGroupRef} className="transition-transform duration-150 ease-out">
          {/* Iris Ring */}
          <circle
            cx="50"
            cy="50"
            r={isTalismanPricked ? "6.2" : "5.4"}
            fill={isTalismanPricked ? "#dc2626" : "#45140e"}
            stroke={isTalismanPricked ? "#ef4444" : "#7f1d1d"}
            strokeWidth="0.8"
            className="transition-colors duration-200 group-hover:fill-[#991b1b] group-hover:stroke-[#ef4444]"
          />

          {/* Centermost Circle: The Living Pupil */}
          <circle
            cx="50"
            cy="50"
            r={isTalismanPricked ? "3.8" : "3.0"}
            fill={isTalismanPricked ? "#7f1d1d" : "#080403"}
            stroke={isTalismanPricked ? "#ef4444" : "#1a0805"}
            strokeWidth="0.6"
            className="transition-all duration-200 group-hover:fill-[#000000]"
          />

          {/* Wet Specular Catchlight Glints */}
          <circle
            cx="48.2"
            cy="48.2"
            r="0.9"
            fill="#ffffff"
            opacity={isTalismanPricked ? "0.95" : "0.85"}
          />
          <circle
            cx="51.8"
            cy="51.8"
            r="0.5"
            fill="#ffffff"
            opacity={isTalismanPricked ? "0.7" : "0.45"}
          />
        </g>
      </g>

      {/* Socket Bevel Rim */}
      <circle
        cx="50"
        cy="50"
        r="8.5"
        fill="none"
        stroke={isTalismanPricked ? "#ef4444" : "#38251b"}
        strokeWidth="0.9"
        className="transition-colors duration-200 group-hover:stroke-[#ef4444]"
        style={{
          filter: isTalismanPricked
            ? 'drop-shadow(0 0 6px rgba(239, 68, 68, 0.9))'
            : undefined,
        }}
      />
    </g>
  );
};

// --- Volumetric Occult Smoke Cloud Transition (Hardware Canvas Particles) ---
const SMOKE_PUFFS = Array.from({ length: 84 }, (_, i) => {
  let fromLeft: boolean;
  let startX: number;
  let targetX: number;

  if (i < 28) {
    // Sector 1: Left Flank anchors (ensures left-side cards stay densely veiled)
    fromLeft = true;
    startX = -220 - ((i * 13) % 180);
    targetX = -40 + (i / 27) * 480 + ((i * 17) % 60 - 30);
  } else if (i < 56) {
    // Sector 2: Center Core billows (interlocking center meeting point)
    const j = i - 28;
    fromLeft = j % 2 === 0;
    startX = fromLeft ? -220 - (j * 12) : 1280 + 220 + (j * 12);
    targetX = 400 + (j / 27) * 480 + ((j * 19) % 60 - 30);
  } else {
    // Sector 3: Right Flank anchors (ensures right-side cards stay densely veiled)
    const j = i - 56;
    fromLeft = false;
    startX = 1280 + 220 + ((j * 13) % 180);
    targetX = 840 + (j / 27) * 480 + ((j * 17) % 60 - 30);
  }

  const baseY = 20 + ((i * 31) % 680);
  const baseR = 150 + ((i * 23) % 110);
  const spriteIdx = i % 4;
  const maxAlpha = [0.98, 0.90, 0.78, 0.50][spriteIdx];
  const driftY = -25 - ((i * 11) % 35);
  const speedMult = 0.85 + ((i * 13) % 35) / 100;

  return { fromLeft, startX, targetX, baseY, baseR, driftY, spriteIdx, maxAlpha, speedMult };
});

const createSmokeSprites = () => {
  const tones = [
    { r: 8, g: 6, b: 5, a: 0.98 },    // deep soot
    { r: 18, g: 14, b: 12, a: 0.90 }, // charcoal
    { r: 32, g: 26, b: 24, a: 0.78 }, // dark ash
    { r: 48, g: 40, b: 36, a: 0.50 }, // wisp highlight
  ];
  return tones.map(({ r, g, b, a }) => {
    const size = 256;
    const c = document.createElement('canvas');
    c.width = size;
    c.height = size;
    const ctx = c.getContext('2d');
    if (!ctx) return c;
    const half = size / 2;
    const grad = ctx.createRadialGradient(half, half, 0, half, half, half);
    grad.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${a})`);
    grad.addColorStop(0.35, `rgba(${r}, ${g}, ${b}, ${a * 0.85})`);
    grad.addColorStop(0.7, `rgba(${r}, ${g}, ${b}, ${a * 0.4})`);
    grad.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
    return c;
  });
};

const SmokeTransitionOverlay: React.FC<{ phase: 'IDLE' | 'IN' | 'OUT' }> = ({ phase }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const spritesRef = useRef<HTMLCanvasElement[] | null>(null);

  useEffect(() => {
    if (phase === 'IDLE') return;

    if (!spritesRef.current) {
      spritesRef.current = createSmokeSprites();
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const sprites = spritesRef.current;
    let animId: number;
    const startTime = performance.now();
    const duration = phase === 'IN' ? 550 : 600;

    const render = (now: number) => {
      const elapsed = now - startTime;
      const rawProgress = Math.min(1, elapsed / duration);

      ctx.clearRect(0, 0, 1280, 720);

      if (phase === 'IN') {
        const baseDark = Math.max(0, Math.min(1, (rawProgress - 0.35) / 0.65));

        // Draw rolling volumetric smoke puffs across all sectors
        for (const pt of SMOKE_PUFFS) {
          const t = Math.min(1, rawProgress * pt.speedMult);
          const tEased = 1 - Math.pow(1 - t, 3);
          const cx = pt.startX + (pt.targetX - pt.startX) * tEased;
          const cy = pt.baseY + pt.driftY * tEased;
          const cr = pt.baseR * (0.7 + 0.45 * tEased);
          const ca = Math.min(pt.maxAlpha, t * 1.4 * pt.maxAlpha);

          if (ca <= 0.01) continue;
          ctx.globalAlpha = ca;
          const sprite = sprites[pt.spriteIdx];
          ctx.drawImage(sprite, cx - cr, cy - cr, cr * 2, cr * 2);
        }

        // Deep soot base wash guarantees total blackout at peak
        if (baseDark > 0) {
          ctx.fillStyle = '#080605';
          ctx.globalAlpha = baseDark;
          ctx.fillRect(0, 0, 1280, 720);
        }
      } else if (phase === 'OUT') {
        const p = rawProgress * rawProgress;
        // Base dark fades in lockstep with the puffs rather than dying early
        const baseDark = Math.max(0, 1 - rawProgress * 1.15);

        if (baseDark > 0) {
          ctx.fillStyle = '#080605';
          ctx.globalAlpha = baseDark;
          ctx.fillRect(0, 0, 1280, 720);
        }

        // All three sectors expand, lift upward, and evaporate in unison
        for (const pt of SMOKE_PUFFS) {
          const driftX = (pt.fromLeft ? -200 : 200) * p;
          const cx = pt.targetX + driftX;
          const cy = pt.baseY + pt.driftY - (p * 60);
          const cr = pt.baseR * 1.15 * (1 + 0.35 * p);
          const ca = Math.max(0, pt.maxAlpha * (1 - rawProgress));

          if (ca <= 0.01) continue;
          ctx.globalAlpha = ca;
          const sprite = sprites[pt.spriteIdx];
          ctx.drawImage(sprite, cx - cr, cy - cr, cr * 2, cr * 2);
        }
      }

      ctx.globalAlpha = 1;

      if (rawProgress < 1) {
        animId = requestAnimationFrame(render);
      }
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [phase]);

  if (phase === 'IDLE') return null;

  return (
    <canvas
      ref={canvasRef}
      width={1280}
      height={720}
      className="absolute inset-0 pointer-events-auto select-none overflow-hidden"
      style={{ zIndex: 999 }}
    />
  );
};
const DISCORD_LOCK = {
  salt: "cce1168b088e90691675f91b195bfab1",
  iv: "c665a153f1cd6939973c66d5",
  data: "2ca5dfac6d42da6d5dea6ad952b9e0b42a5bb4a31e128b766ee46e35fef657d2cbd4988663839372d713b34b533b91a6ec078b68e4c3d701"
};

async function unlockSecretUrl(passcode: string): Promise<string | null> {
  try {
    const fromHex = (hex: string) => new Uint8Array(hex.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));
    const enc = new TextEncoder();
    const salt = fromHex(DISCORD_LOCK.salt);
    const iv = fromHex(DISCORD_LOCK.iv);
    const data = fromHex(DISCORD_LOCK.data);

    const keyMaterial = await window.crypto.subtle.importKey(
      "raw",
      enc.encode(passcode),
      "PBKDF2",
      false,
      ["deriveKey"]
    );

    const key = await window.crypto.subtle.deriveKey(
      { name: "PBKDF2", salt, iterations: 100000, hash: "SHA-256" },
      keyMaterial,
      { name: "AES-GCM", length: 256 },
      false,
      ["decrypt"]
    );

    const decrypted = await window.crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      key,
      data
    );

    return new TextDecoder().decode(decrypted);
  } catch {
    return null;
  }
}
export default function App() {
  // --- Game Flow & Navigation ---
  const [screen, setScreenRaw] = useState<ScreenState>('SPLASH');
  const [logs, setLogs] = useState<string[]>(['> System initialized. Awaiting lineage selection...']);
  const [showPauseMenu, setShowPauseMenu] = useState<boolean>(false);
  const [showAudioSettings, setShowAudioSettings] = useState<boolean>(false);
  const chiptuneAudio = ChiptuneAudio;
  const [previousScreen, setPreviousScreen] = useState<ScreenState>('DUEL');
  const [audioEnabled, setAudioEnabled] = useState<boolean>(true);
  // --- Cryptographic Discord Gate State ---
  const [showDiscordPrompt, setShowDiscordPrompt] = useState(false);
  const [discordInput, setDiscordInput] = useState('');
  const [discordError, setDiscordError] = useState(false);
  const [unlockedDiscordUrl, setUnlockedDiscordUrl] = useState<string | null>(() => {
    return sessionStorage.getItem('sacrificial_discord_unlocked');
  });

  const [showDevTools, setShowDevTools] = useState(false);
  const [devTapCount, setDevTapCount] = useState(0);
  const devTapTimerRef = useRef<number | null>(null);

  const handleSecretDevTap = () => {
    if (devTapTimerRef.current) clearTimeout(devTapTimerRef.current);
    const nextCount = devTapCount + 1;
    if (nextCount >= 5) {
      setShowDevTools(prev => !prev);
      setDevTapCount(0);
    } else {
      setDevTapCount(nextCount);
      devTapTimerRef.current = window.setTimeout(() => setDevTapCount(0), 2000);
    }
  };
  const handleDiscordClick = (e: React.MouseEvent) => {
    if (unlockedDiscordUrl) return;
    e.preventDefault();
    setShowDiscordPrompt(true);
  };

  const handleAttemptUnlock = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const url = await unlockSecretUrl(discordInput.trim());
    if (url) {
      setUnlockedDiscordUrl(url);
      sessionStorage.setItem('sacrificial_discord_unlocked', url);
      setShowDiscordPrompt(false);
      setDiscordError(false);
      window.open(url, '_blank', 'noopener,noreferrer');
    } else {
      setDiscordError(true);
      setDiscordInput('');
    }
  };

  // Atmospheric Occult Black Smoke Transition State
  const screenStageRef = useRef<HTMLDivElement>(null);
  const prevScreenRef = useRef<ScreenState>('SPLASH');
  const [smokePhase, setSmokePhase] = useState<'IDLE' | 'IN' | 'OUT'>('IDLE');
  const [menuFadingOut, setMenuFadingOut] = useState<boolean>(false);
  const transitionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const menuFadeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isMenuScreen = (s: ScreenState) =>
    s === 'VIEW_DECK' || s === 'DEV_MENU' || s === 'EVENT_HOARDER_SEARCH';

  const setScreen = useCallback((next: ScreenState | ((prev: ScreenState) => ScreenState)) => {
    const current = prevScreenRef.current;
    const nextVal = typeof next === 'function' ? next(current) : next;
    if (nextVal === current) return;

    // Save previous screen only when leaving active gameplay
    if (!isMenuScreen(current)) {
      setPreviousScreen(current);
    }

    // Closing a menu back to gameplay: fade out before unmounting
    if (isMenuScreen(current) && !isMenuScreen(nextVal)) {
      setMenuFadingOut(true);
      if (menuFadeTimerRef.current) clearTimeout(menuFadeTimerRef.current);
      menuFadeTimerRef.current = setTimeout(() => {
        setMenuFadingOut(false);
        prevScreenRef.current = nextVal;
        setScreenRaw(nextVal);
      }, 200);
      return;
    }

    const isConsecutiveDuel = current === 'DUEL' && nextVal === 'DUEL';
    const isSplash = nextVal === 'SPLASH';
    const isMenuTransition = isMenuScreen(current) || isMenuScreen(nextVal);

    // Suppress heavy transition for fast menus or splash screen
    if (!isConsecutiveDuel && !isSplash && !isMenuTransition) {
      if (transitionTimerRef.current) clearTimeout(transitionTimerRef.current);

      // Phase 1 (550ms): Soft volumetric smoke clouds roll inward from flanks
      setSmokePhase('IN');

      transitionTimerRef.current = setTimeout(() => {
        // Phase 2: Mount new screen safely behind pitch-black smoke blanket
        prevScreenRef.current = nextVal;
        setScreenRaw(nextVal);

        // Phase 3 (180ms hold): Allows card art and textures to paint completely
        transitionTimerRef.current = setTimeout(() => {
          setSmokePhase('OUT');

          // Phase 4 (600ms): Smoke lifts and dissipates away
          transitionTimerRef.current = setTimeout(() => {
            setSmokePhase('IDLE');
          }, 600);
        }, 180);
      }, 550);
    } else {
      setSmokePhase('IDLE');
      prevScreenRef.current = nextVal;
      setScreenRaw(nextVal);
    }
  }, []);

  // --- Campaign / Run State ---
  const [hasCompletedTutorial, setHasCompletedTutorial] = useState<boolean>(() => {
    try {
      return localStorage.getItem('sacrificial_scales_tutorial_done') === 'true';
    } catch {
      return true;
    }
  });
  const [isTutorialGlitching, setIsTutorialGlitching] = useState<boolean>(false);
  const [isTutorialDuel, setIsTutorialDuel] = useState<boolean>(false);
  const [dialogueQueue, setDialogueQueue] = useState<string[]>([]);
  const [dialogueTotalSteps, setDialogueTotalSteps] = useState<number>(1);
  const [tutorialSacrificeTriggered, setTutorialSacrificeTriggered] = useState<boolean>(false);
  const [tutorialQueueTriggered, setTutorialQueueTriggered] = useState<boolean>(false);
  const [tutorialTurn2Triggered, setTutorialTurn2Triggered] = useState<boolean>(false);
  const [encounter, setEncounter] = useState<number>(1);
  const [duelsCompleted, setDuelsCompleted] = useState<number>(0);
  const [stage, setStage] = useState<number>(1);
  const [level, setLevel] = useState<number>(1);
  const [currentStageName, setCurrentStageName] = useState<string>('Forgotten Graveyard');
  const [ouroborosBuffs, setOuroborosBuffs] = useState<number>(0);
  const [startingBones, setStartingBones] = useState<number>(0);
  const startingBonesRef = useRef<number>(0);
  useEffect(() => {
    startingBonesRef.current = startingBones;
  }, [startingBones]);
  const [totemPieces, setTotemPieces] = useState<Array<{ type: 'head' | 'body'; value: string }>>([]);
  const [activeTotem, setActiveTotem] = useState<Totem>({ head: null, body: null });
  const [masterDeck, setMasterDeck] = useState<CardDef[]>([]);
  const masterDeckRef = useRef<CardDef[]>([]);
  const [consecutiveOneTurnWins, setConsecutiveOneTurnWins] = useState<number>(0);
  const [otkCooldown, setOtkCooldown] = useState<number>(0);
  const [permanentScaleDebuff, setPermanentScaleDebuff] = useState<number>(0);
  const [pendingBossGrizzlyWall, setPendingBossGrizzlyWall] = useState<boolean>(false);
  const [isGrizzlyShaking, setIsGrizzlyShaking] = useState<boolean>(false);
  const [grizzlyWallActiveInDuel, setGrizzlyWallActiveInDuel] = useState<boolean>(false);
  useEffect(() => {
    masterDeckRef.current = masterDeck;
  }, [masterDeck]);

  // Hidden Run Statistics Trackers
  const [runStats, setRunStats] = useState<RunStats>({
    bossesDefeated: 0,
    scaleDamageDealt: 0,
    scaleDamageTaken: 0,
    cardsSacrificed: 0,
    enemyCardsDestroyed: 0,
    grizzlyWallsSurvived: 0,
    clearedStages: 0,
    finalBossesDefeated: 0,
  });

  // Visual-only trackers (preserves runStats and end-game scoring equations)
  const displayStage = (runStats?.bossesDefeated ?? 0) + 1;
  const displayDepth = (duelsCompleted % 6) + 1;

  // Boss Combat & Phase State
  const [bossState, setBossState] = useState<BossCombatState>({
    type: null,
    phase: 1,
    phase1CardsPlayed: 0,
    skipNextPlayerTurn: false,
    activeDialogue: null,
    bgHex: '#18181b',
    bgTransitionDuration: 0,
    isRitualComplete: false,
    ritualEndedVoluntarily: false,
  });

  // Calculate required scale damage to defeat opponent (base 5; 7 on run 2; 13 on run 3+)
  const getRequiredScaleWinDamage = useCallback((): number => {
    if (runStats.finalBossesDefeated >= 2) return 13;
    if (runStats.finalBossesDefeated === 1) return 7;
    return 5;
  }, [runStats.finalBossesDefeated]);

  // --- Duel Match State ---
  const [scale, setScale] = useState<number>(0); // player wins at >= getRequiredScaleWinDamage(), loses at <= -5
  const prevScaleRef = useRef<number>(scale);
  const [scaleRumble, setScaleRumble] = useState<boolean>(false);

  // --- Master Scaler & Calibrated Matrix Coordinate System (1280x720 reference) ---
  const gameContainerRef = useRef<HTMLDivElement>(null);
  const [currentScale, setCurrentScale] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      return Math.min(window.innerWidth / 1280, window.innerHeight / 720);
    }
    return 1;
  });
  const currentScaleRef = useRef<number>(1);

// --- Items System State ---
  const [items, setItems] = useState<(ItemId | null)[]>([
    'coin_purse',
    'magical_hat',
    'large_matchbook'
  ]);
  const [itemTargetMode, setItemTargetMode] = useState<ItemId | null>(null);
  const [itemTargetSourceSlot, setItemTargetSourceSlot] = useState<number | null>(null);
  const [crucifixUsedThisDuel, setCrucifixUsedThisDuel] = useState<boolean>(false);
  const [isAcornActive, setIsAcornActive] = useState<boolean>(false);
  const [dieModal, setDieModal] = useState<{ roll: number; count: number } | null>(null);
  const [isBoardShaking, setIsBoardShaking] = useState<boolean>(false);

  const updateScale = useCallback(() => {
    const scaleX = window.innerWidth / 1280;
    const scaleY = window.innerHeight / 720;
    const scale = Math.min(scaleX, scaleY);
    setCurrentScale(scale);
    currentScaleRef.current = scale;
    const container = document.getElementById('game-container');
    if (container) {
      container.style.setProperty('--active-scale', scale.toString());
    }
  }, []);

  useEffect(() => {
    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, [updateScale]);

  // Matrix Coordinate Calibrated Card Dragging State
  const [dragState, setDragState] = useState<{
    cardIndex: number;
    card: CardDef;
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
    hasMoved: boolean;
  } | null>(null);
  const [hoveredSlotLane, setHoveredSlotLane] = useState<number | null>(null);
  const playerSlotRefs = useRef<(HTMLDivElement | null)[]>([null, null, null, null]);

  const [phase, setPhase] = useState<GamePhase>('DRAW');
  const [turnNumber, setTurnNumber] = useState<number>(1);
  const [isAmpouleCracked, setIsAmpouleCracked] = useState<boolean>(false);
  const [blood, setBlood] = useState<number>(0);
  const [bones, setBones] = useState<number>(0);
  const [hand, setHand] = useState<CardDef[]>([]);
  const [deck, setDeck] = useState<CardDef[]>([]);
  const [selectedHandIndex, setSelectedHandIndex] = useState<number | null>(null);
  const [markedForSacrifice, setMarkedForSacrifice] = useState<number | null>(null);
  const [playerBoard, setPlayerBoard] = useState<(CardDef | null)[]>([null, null, null, null]);
  const [enemyBoard, setEnemyBoard] = useState<(CardDef | null)[]>([null, null, null, null]);
  const [enemyQueue, setEnemyQueue] = useState<(CardDef | null)[]>([null, null, null, null]);
  const [damagedQueueLane, setDamagedQueueLane] = useState<number | null>(null);
  const [enemyWavesLeft, setEnemyWavesLeft] = useState<number>(2);
  const [enemyMaxDuelCards, setEnemyMaxDuelCards] = useState<number>(10);
  const [enemyCardsPlayed, setEnemyCardsPlayed] = useState<number>(0);
  const enemyCardsPlayedRef = useRef<number>(0);

  // Boss State
  const [isBossMatch, setIsBossMatch] = useState<boolean>(false);
  const [musicVol, setMusicVol] = useState<number>(0.5);
  const [sfxVol, setSfxVol] = useState<number>(0.7);
  const [bossPhase, setBossPhase] = useState<number>(1);
  const [bossTotem, setBossTotem] = useState<{ class: Tribe; sigil: string } | null>(null);
  const [woodcarverClasses, setWoodcarverClasses] = useState<Tribe[]>([]);
  const [isPhaseTransition, setIsPhaseTransition] = useState<boolean>(false);
  const [isOverkill, setIsOverkill] = useState<boolean>(false);
  const [sacrificedUnkillableCardIds, setSacrificedUnkillableCardIds] = useState<string[]>([]);

  // Morsel stats passed to next played creature
  const [morselStats, setMorselStats] = useState<{ attack: number; health: number }>({ attack: 0, health: 0 });

  // Undo / backup snapshot for cancelling sacrifices before playing card
  const [backupState, setBackupState] = useState<{
    playerBoard: (CardDef | null)[];
    blood: number;
    bones: number;
    hand: CardDef[];
    morselStats: { attack: number; health: number };
  } | null>(null);

  // --- Modals & Inspect Views ---
  const [modalAlert, setModalAlert] = useState<{
    title: string;
    message: string;
    isWin?: boolean;
    btnText: string;
    onAction: () => void;
  } | null>(null);

  const [selectedDeckCardDetail, setSelectedDeckCardDetail] = useState<CardDef | null>(null);
  const [sigilDetailModal, setSigilDetailModal] = useState<{ name: string; desc: string } | null>(null);

  // Draft State
  const [draftPlayerDeck, setDraftPlayerDeck] = useState<CardDef[]>([]);
  const [draftTradePool, setDraftTradePool] = useState<(CardDef | null)[]>([]);
  const [draftTradesLeft, setDraftTradesLeft] = useState<number>(2);
  const [draftSelectedDeckIdx, setDraftSelectedDeckIdx] = useState<number | null>(null);
  const [draftSelectedTradeIdx, setDraftSelectedTradeIdx] = useState<number | null>(null);
  const [draftRevealedIndices, setDraftRevealedIndices] = useState<number[]>([0, 1, 2, 3, 4, 5, 6, 7]);
  const [draftFlippingDown, setDraftFlippingDown] = useState<boolean>(false);
  const [draftFlippingUp, setDraftFlippingUp] = useState<boolean>(false);

  // Crossroads & Event States
  const [crossroadsOptions, setCrossroadsOptions] = useState<string[]>([]);

// Event action lock to prevent double-clicks and spam
  const [isEventBusy, setIsEventBusy] = useState<boolean>(false);
  const [isTotemFadingOut, setIsTotemFadingOut] = useState<boolean>(false);
  const [totemChoicesHidden, setTotemChoicesHidden] = useState<boolean>(false);

  // Campfire Event
  const [campfireCardIdx, setCampfireCardIdx] = useState<number | null>(null);
  const [campfireBuffType, setCampfireBuffType] = useState<'attack' | 'health'>('attack');
  const [campfireStage, setCampfireStage] = useState<number>(0);
  const [isCampfireSafe, setIsCampfireSafe] = useState<boolean>(false);

  // Altar Event
  const [altarHostId, setAltarHostId] = useState<string | null>(null);
  const [altarSacrificeId, setAltarSacrificeId] = useState<string | null>(null);

  // Bone Lord Event
  const [boneLordSelectedIdx, setBoneLordSelectedIdx] = useState<number | null>(null);

  // Mycologist Event
  const [mycoSelectedIndices, setMycoSelectedIndices] = useState<number[]>([]);
  const [mycoHasDuplicates, setMycoHasDuplicates] = useState<boolean>(true);
  const [mycoOfferedCard, setMycoOfferedCard] = useState<CardDef | null>(null);

  // Goobert Event
  const [goobertSelectedIdx, setGoobertSelectedIdx] = useState<number | null>(null);

  // Cave Trial Event
  const [caveTrials, setCaveTrials] = useState<string[]>([]);
  const [caveSelectedTrial, setCaveSelectedTrial] = useState<string | null>(null);
  const [caveDrawnCards, setCaveDrawnCards] = useState<CardDef[]>([]);
  const [cavePassed, setCavePassed] = useState<boolean>(false);
  const [caveRewardCards, setCaveRewardCards] = useState<CardDef[]>([]);
  const [caveSelectedRewardIdx, setCaveSelectedRewardIdx] = useState<number | null>(null);

  // Card Choice Event
  const [choiceCards, setChoiceCards] = useState<CardDef[]>([]);
  const [choiceSelectedIdx, setChoiceSelectedIdx] = useState<number | null>(null);
  const [choiceRerollsLeft, setChoiceRerollsLeft] = useState<number>(1);

  // Hoarder Search Event
  const [hoarderSelectedIdx, setHoarderSelectedIdx] = useState<number | null>(null);

  // Totem Event
  const [totemRewardChoices, setTotemRewardChoices] = useState<Array<{ type: 'head' | 'body'; value: string }>>([]);
  const [selectedTotemRewardIdx, setSelectedTotemRewardIdx] = useState<number | null>(null);
  const [totemStage, setTotemStage] = useState<'REWARD' | 'ASSEMBLE'>('REWARD');
  const [assemblyHeadIdx, setAssemblyHeadIdx] = useState<number | null>(null);
  const [assemblyBodyIdx, setAssemblyBodyIdx] = useState<number | null>(null);
  const [carvingTribes, setCarvingTribes] = useState<Tribe[]>([]);
  const [costChoices, setCostChoices] = useState<Array<'1 Blood' | '2 Blood' | '3 Blood' | 'Bones'>>([]);

  // Combat Animation State Specifications
  const [activeAttacker, setActiveAttacker] = useState<{
    isPlayer: boolean;
    lane: number;
    targetLane: number;
    isAirborne: boolean;
    isDirect: boolean;
    direction: 'left' | 'right' | 'straight';
  } | null>(null);
  const [activeDefendingLane, setActiveDefendingLane] = useState<{ isPlayer: boolean; lane: number } | null>(null);
  const [damagedCard, setDamagedCard] = useState<{ isPlayer: boolean; lane: number } | null>(null);
  const [evolvingCards, setEvolvingCards] = useState<Array<{ isPlayer: boolean; lane: number; phase: 'up' | 'down' }>>([]);
  const [destroyedCard, setDestroyedCard] = useState<{ isPlayer: boolean; lane: number } | null>(null);
  const [sacrificingLane, setSacrificingLane] = useState<number | null>(null);
  const [hpFlashingCard, setHpFlashingCard] = useState<{ isPlayer: boolean; lane: number } | null>(null);
  const [jitteringCard, setJitteringCard] = useState<{ isPlayer: boolean; lane: number } | null>(null);
  const [droppingQueueLane, setDroppingQueueLane] = useState<number | null>(null);
  const [lateralMovements, setLateralMovements] = useState<Record<string, number>>({});
  const [isBoardRumbling, setIsBoardRumbling] = useState<boolean>(false);
  const [summonedCardIds, setSummonedCardIds] = useState<Set<string>>(new Set());

  const [boneShaking, setBoneShaking] = useState<boolean>(false);
  const [zeroPowerShakingCard, setZeroPowerShakingCard] = useState<{ isPlayer: boolean; lane: number } | null>(null);
  const [isEnemyRetracting, setIsEnemyRetracting] = useState<boolean>(false);
  const [totalOverkillDamage, setTotalOverkillDamage] = useState<number>(0);
  const [highestOverkill, setHighestOverkill] = useState<number>(0);
  const [showOverkill, setShowOverkill] = useState<boolean>(false);
  const [isTalismanPricked, setIsTalismanPricked] = useState<boolean>(false);
  const isCinematic = false;

  // --- Item Restock & Blood Bank Pricing ---
  const ITEM_COSTS: Record<ItemId, number> = {
    magical_hat: 2,
    coin_purse: 2,
    bronze_acorn: 3,
    bone_lords_horn: 3,
    loaded_die: 3,
    joker_stamp: 4,
    large_matchbook: 4,
  };

  const [itemChoices, setItemChoices] = useState<ItemId[]>([]);

  const startItemEvent = () => {
    const pool: ItemId[] = [
      'magical_hat',
      'bone_lords_horn',
      'joker_stamp',
      'large_matchbook',
      'coin_purse',
      'loaded_die',
      'bronze_acorn'
    ];
    const shuffled = [...pool].sort(() => Math.random() - 0.5).slice(0, 3);
    setItemChoices(shuffled);
    setScreen('EVENT_ITEMS');
  };

  const handleSelectItem = (selectedId: ItemId) => {
    const cost = ITEM_COSTS[selectedId] ?? 3;
    const emptySlot = items.findIndex(slot => slot === null);

    if (emptySlot === -1) {
      addLog("Your satchel is full. Consume or discard an item first.");
      return;
    }

    if (totalOverkillDamage < cost) {
      addLog(`Not enough blood. ${ALL_ITEMS[selectedId].name} costs ${cost} oz.`);
      return;
    }

    setTotalOverkillDamage(prev => Math.max(0, prev - cost));
    setItems(prev => {
      const next = [...prev];
      next[emptySlot] = selectedId;
      return next;
    });
    setItemChoices(prev => prev.filter(id => id !== selectedId));
    triggerSfx('draw');
    addLog(`Extracted ${ALL_ITEMS[selectedId].name} for ${cost} oz of blood.`);
  };

  useEffect(() => {
    if (phase === 'PLAY') {
      setIsTalismanPricked(false);
    }
  }, [phase]);

  // Combat Animation Async Helpers returning Promises
  const animateAttackLunge = async (attacker: {
    isPlayer: boolean;
    lane: number;
    targetLane: number;
    isAirborne: boolean;
    isDirect: boolean;
    direction: 'left' | 'right' | 'straight';
  }) => {
    setActiveAttacker(attacker);
    await new Promise(res => setTimeout(res, 400));
    setActiveAttacker(null);
  };

  const animateZeroPowerAttack = async (isPlayer: boolean, lane: number) => {
    setZeroPowerShakingCard({ isPlayer, lane });
    await new Promise(res => setTimeout(res, 350));
    setZeroPowerShakingCard(null);
  };

  const triggerBoneShake = () => {
    setBoneShaking(true);
    setTimeout(() => setBoneShaking(false), 350);
  };

  const animateCardDamage = async (isPlayer: boolean, lane: number) => {
    setDamagedCard({ isPlayer, lane });
    triggerSfx('hit');
    await new Promise(res => setTimeout(res, 150));
    setDamagedCard(null);
  };

  const animateCardDestroy = async (isPlayer: boolean, lane: number) => {
    setDestroyedCard({ isPlayer, lane });
    await new Promise(res => setTimeout(res, 200));
    setDestroyedCard(null);
  };

  const animateDirectDamageRumble = async () => {
    setIsBoardRumbling(true);
    triggerSfx('hit');
    await new Promise(res => setTimeout(res, 200));
    setIsBoardRumbling(false);
  };

  const triggerSigilJitter = async (isPlayer: boolean, lane: number) => {
    setJitteringCard({ isPlayer, lane });
    await new Promise(res => setTimeout(res, 100));
    setJitteringCard(null);
  };

  const triggerHpFlash = (isPlayer: boolean, lane: number) => {
    setHpFlashingCard({ isPlayer, lane });
    setTimeout(() => {
      setHpFlashingCard(prev => (prev?.isPlayer === isPlayer && prev?.lane === lane ? null : prev));
    }, 500);
  };

  const triggerLateralMove = async (cardId: string, deltaLanes: number) => {
    setLateralMovements(prev => ({ ...prev, [cardId]: deltaLanes }));
    await new Promise(res => setTimeout(res, 250));
    setLateralMovements(prev => {
      const next = { ...prev };
      delete next[cardId];
      return next;
    });
  };

  const triggerSummonWipe = (cardId?: string) => {
    if (!cardId) return;
    setSummonedCardIds(prev => new Set(prev).add(cardId));
    setTimeout(() => {
      setSummonedCardIds(prev => {
        const next = new Set(prev);
        next.delete(cardId);
        return next;
      });
    }, 320);
  };

  const buildStrikeTargets = (lane: number, sigils: string[]): number[] => {
    const hasBifurcated = sigils.includes('Bifurcated Strike');
    const hasTrifurcated = sigils.includes('Trifurcated Strike');
    const hasDouble = sigils.includes('Double Strike');

    let baseTargets: number[] = [];
    if (hasTrifurcated) {
      baseTargets = [lane - 1, lane, lane + 1];
    } else if (hasBifurcated) {
      baseTargets = [lane - 1, lane + 1];
    } else {
      baseTargets = [lane];
    }

    if (hasDouble) {
      const centerIdx = baseTargets.indexOf(lane);
      if (centerIdx !== -1) {
        baseTargets.splice(centerIdx + 1, 0, lane);
      } else {
        baseTargets.splice(1, 0, lane);
      }
    }

    // Boundary Validation: Discard off-board strikes (e.g. left-diagonal from lane 0 or right-diagonal from lane 3)
    // Completely omits off-board attacks from the animation and damage queue
    return baseTargets.filter(t => t >= 0 && t <= 3);
  };

  // Dev Console State
  const [devForceSubmenuOpen, setDevForceSubmenuOpen] = useState<boolean>(false);
  const [devTab, setDevTab] = useState<'ACTIONS' | 'ALTER_DECK' | 'CARDS' | 'SIGILS'>('ACTIONS');
  const [devCardSearch, setDevCardSearch] = useState<string>('');
  const [devCardsFilter, setDevCardsFilter] = useState<string>('');
  const [devAlterCard, setDevAlterCard] = useState<CardDef | null>(null);

  // Duel field ref for shake animations
  const duelFieldRef = useRef<HTMLDivElement>(null);
  const logBoxRef = useRef<HTMLDivElement>(null);

  const addLog = useCallback((msg: string) => {
    setLogs(prev => {
      const next = [...prev, `> ${msg}`];
      return next.slice(-40);
    });
  }, []);

  const triggerSfx = useCallback((type: 'draw' | 'sacrifice' | 'play' | 'hit' | 'bell' | 'bone' | 'defeat' | 'victory' | 'armor') => {
    if (audioEnabled) playSound(type);
  }, [audioEnabled]);

  // Trigger small rumble animation when scale increases or decreases
  useEffect(() => {
    if (prevScaleRef.current !== scale) {
      prevScaleRef.current = scale;
      setScaleRumble(true);
      const timer = setTimeout(() => setScaleRumble(false), 200);
      return () => clearTimeout(timer);
    }
  }, [scale]);

  // Arterial Shunt safety observer: fractures ampoule if pressure hits +4 on turn 1
  useEffect(() => {
    if (turnNumber === 1 && scale >= 4) {
      setIsAmpouleCracked(true);
    }
  }, [turnNumber, scale]);

  // Sync ChiptuneAudio BGM with screen state and mute status
  useEffect(() => {
    if (!audioEnabled) {
      ChiptuneAudio.stop();
      return;
    }

    // Battle music stops playing and is overwritten by ambient theme when opening Dev Tools or View Deck
    /// Do not interrupt or overwrite battle/boss music when inspecting overlays
    if (screen === 'VIEW_DECK' || screen === 'DEV_MENU' || screen === 'EVENT_HOARDER_SEARCH') {
      return;
    }

    if (screen === 'DUEL') {
      if (ChiptuneAudio.currentTrack !== 'battle') {
        ChiptuneAudio.playBattle();
      }
    } else if (screen === 'GAME_OVER' || screen === 'SPLASH') {
      ChiptuneAudio.stop();
    } else {
      if (ChiptuneAudio.currentTrack !== 'cabin') {
        ChiptuneAudio.playCabin();
      }
    }
  }, [screen, audioEnabled]);

  // Cleanup audio nodes on unmount
  useEffect(() => {
    return () => {
      ChiptuneAudio.stop();
    };
  }, []);

  // Shake animation trigger with 0.1s initial delay and 0.3s duration
  const shakeField = () => {
    setTimeout(() => {
      if (duelFieldRef.current) {
        duelFieldRef.current.classList.add('animate-shake');
        setTimeout(() => {
          duelFieldRef.current?.classList.remove('animate-shake');
        }, 300);
      }
    }, 100);
  };
  const [canvasScale, setCanvasScale] = useState(1);

  useEffect(() => {
    const updateCanvasSize = () => {
      const scaleX = window.innerWidth / 1280;
      const scaleY = window.innerHeight / 720;
      setCanvasScale(Math.min(scaleX, scaleY));
    };
    updateCanvasSize();
    window.addEventListener('resize', updateCanvasSize);
    return () => window.removeEventListener('resize', updateCanvasSize);
  }, []);
  const openViewDeck = () => {
    setPreviousScreen(screen);
    setScreen('VIEW_DECK');
  };

  const openDevMenu = () => {
    setPreviousScreen(screen);
    setScreen('DEV_MENU');
  };

  const handleRestartRun = () => {
    setScreen('SPLASH');
    setScale(0);
    setBlood(0);
    setTotalOverkillDamage(0);
    setHighestOverkill(0);
    setIsOverkill(false);
    setShowOverkill(false);
    setBones(startingBones);
    setStartingBones(0);
    startingBonesRef.current = 0;
    setHand([]);
    setDeck([]);
    setPlayerBoard([null, null, null, null]);
    setEnemyBoard([null, null, null, null]);
    setEnemyQueue([null, null, null, null]);
    setMasterDeck([]);
    setStage(1);
    setLevel(1);
    setDuelsCompleted(0);
    setBossPhase(1);
    setIsBossMatch(false);
    setBossTotem(null);
    setActiveTotem({ head: null, body: null });
    setTotemPieces([]);
    setTurnNumber(1);
    setIsAmpouleCracked(false);
    setShowPauseMenu(false);
    setModalAlert(null);
    setBossState({
      type: null,
      phase: 1,
      phase1CardsPlayed: 0,
      skipNextPlayerTurn: false,
      activeDialogue: null,
      bgHex: '#18181b',
      bgTransitionDuration: 0,
      isRitualComplete: false,
      ritualEndedVoluntarily: false,
    });
    setRunStats({
      bossesDefeated: 0,
      scaleDamageDealt: 0,
      scaleDamageTaken: 0,
      cardsSacrificed: 0,
      enemyCardsDestroyed: 0,
      grizzlyWallsSurvived: 0,
      clearedStages: 0,
      finalBossesDefeated: 0,
    });
  };

                                                 // Ant Count calculation across both sides of the board
  const getAntCount = useCallback((pBoard: (CardDef | null)[] = playerBoard, eBoard: (CardDef | null)[] = enemyBoard): number => {
    let count = 0;
    pBoard.forEach(c => { if (c?.tags?.includes('Ant')) count++; });
    eBoard.forEach(c => { if (c?.tags?.includes('Ant')) count++; });
    return count;
  }, [playerBoard, enemyBoard]);

  // Attack Calculation (Ants, Lammergeier, Leaders, Stinky, Vertibrae)
  const getCardAttack = useCallback((
    card: CardDef | null,
    laneIndex?: number,
    isPlayer?: boolean,
    customPBoard?: (CardDef | null)[],
    customEBoard?: (CardDef | null)[],
    isQueue?: boolean
  ): number => {
    if (!card) return 0;
    let base = card.attack || 0;

    const currentPBoard = customPBoard || playerBoard;
    const currentEBoard = customEBoard || enemyBoard;

    if (card.sigils?.includes('Shadow')) {
      // Under Shadow, base attack is locked to the swapped health value stored on the card.
      // Dynamic base bonuses (Ant count, Lammergeier bones) do not double-dip.
      base = card.attack || 0;
    } else if (card.sigils?.includes('Shadow')) {
      // Under Shadow, base attack is locked to the swapped health value stored on the card.
      // Dynamic base bonuses (Ant count, Lammergeier bones) do not double-dip.
      base = card.attack || 0;
    } else if (card.tags?.includes('Ant')) {
      base = getAntCount(currentPBoard, currentEBoard) + (card.attack || 0);
    } else if (card.name === "Lammergeier") {
      base = (isPlayer !== false ? Math.floor((bones || 0) / 2) : 0) + (card.attack || 0);
    }

    let leaderBonus = 0;
    let vertibraeBonus = 0;
    let stinkyPenalty = 0;

    // Leader buffs, Vertibrae buffs, and Stinky penalties strictly apply to active frontline combatants.
    // Backrow queue cards are waiting off-field and have no active adjacent neighbors.
    if (!isQueue && laneIndex !== undefined && isPlayer !== undefined) {
      const board = isPlayer ? currentPBoard : currentEBoard;
      const oppBoard = isPlayer ? currentEBoard : currentPBoard;

      const leftNeighbor = laneIndex > 0 ? board[laneIndex - 1] : null;
      const rightNeighbor = laneIndex < 3 ? board[laneIndex + 1] : null;

      // Only give the Leader buff if the neighbor is alive (health > 0)
      if (leftNeighbor && (leftNeighbor.health || 0) > 0 && leftNeighbor.sigils.includes('Leader')) {
        leaderBonus += 1;
      }
      if (rightNeighbor && (rightNeighbor.health || 0) > 0 && rightNeighbor.sigils.includes('Leader')) {
        leaderBonus += 1;
      }

      // Vertibrae had the exact same bug with Demon Elk, so we fix that too
      if (card.name === "Vertibrae") {
        if (leftNeighbor && (leftNeighbor.health || 0) > 0 && leftNeighbor.name === "Demon Elk") {
          vertibraeBonus += 1;
        }
        if (rightNeighbor && (rightNeighbor.health || 0) > 0 && rightNeighbor.name === "Demon Elk") {
          vertibraeBonus += 1;
        }
      }

      if (oppBoard[laneIndex]?.sigils.includes('Stinky')) {
        stinkyPenalty = 1;
      }
    }

    return Math.max(0, base + leaderBonus + vertibraeBonus - stinkyPenalty);
  }, [playerBoard, enemyBoard, bones, getAntCount]);

  // Stage names generator
  const STAGE_POOL = ["Forgotten Graveyard", "Sunken Crypts", "Desolate Ossuary", "Charnel Grounds"];
  const stagePoolRef = useRef<string[]>([...STAGE_POOL]);
  const getRandomStageName = (): string => {
    if (stagePoolRef.current.length === 0) {
      stagePoolRef.current = [...STAGE_POOL];
    }
    const idx = Math.floor(Math.random() * stagePoolRef.current.length);
    return stagePoolRef.current.splice(idx, 1)[0];
  };

  // --- Draw Mechanics ---
  const handleDraw = (type: 'sacrifice' | 'main') => {
    if (phase !== 'DRAW') return;
    let card: CardDef;
    if (type === 'sacrifice') {
      card = applyPlayerTotem(cloneCard(TOKEN_SQUIRREL, ouroborosBuffs), activeTotem);
      if (isAcornActive) {
        card.attack = (card.attack || 0) + 1;
        card.health = (card.health || 0) + 1;
      }
      addLog("Drew a Squirrel.");
    } else {
      if (deck.length === 0) {
        addLog("Your deck is empty! A Squirrel approaches out of pity.");
        card = applyPlayerTotem(cloneCard(TOKEN_SQUIRREL, ouroborosBuffs), activeTotem);
        if (isAcornActive) {
          card.attack = (card.attack || 0) + 1;
          card.health = (card.health || 0) + 1;
        }
      } else {
        const remaining = [...deck];
        const drawn = remaining.pop()!;
        setDeck(remaining);
        card = transformAmorphous(applyPlayerTotem(drawn, activeTotem));
        addLog(`Drew ${card.name}.`);
      }
    }
    setHand(prev => [...prev, card]);
    if (bossState.type === 'Zealot' && bossState.phase === 2 && bossState.skipNextPlayerTurn) {
      setBossState(prev => ({
        ...prev,
        activeDialogue: "Your prayers fall on deaf ears, heretic! Encased in stone and paralyzed by grace—watch as my serpent claims your strongest!",
      }));
    }

    // --- ITEM EFFECT: Flaming Skeleton Spread at End of Opponent Turn ---
    setEnemyBoard(prev => {
      const next = [...prev];
      let spreadOccurred = false;
      for (let i = 0; i < 4; i++) {
        if (next[i]?.name === 'Flaming Skeleton') {
          const adjLanes = [i - 1, i + 1].filter(l => l >= 0 && l <= 3);
          for (const adj of adjLanes) {
            if (next[adj]?.name === 'Skeleton') {
              next[adj] = {
                ...cloneCard(CARD_FLAMING_SKELETON),
                id: `flaming-skeleton-${Date.now()}-${adj}`
              };
              spreadOccurred = true;
              addLog(`The inferno catches! Skeleton in lane ${adj + 1} becomes a Flaming Skeleton.`);
            }
          }
        }
      }
      return spreadOccurred ? next : prev;
    });

    setPhase('PLAY');
    triggerSfx('draw');
  };

  // --- Hand Selection & Undo Backup ---
  const selectHandCard = (idx: number) => {
    if (phase !== 'PLAY') return;

    if (selectedHandIndex === idx) {
      // Deselect and restore backup if any sacrifices occurred
      if (backupState && (blood > backupState.blood || bones > backupState.bones || JSON.stringify(playerBoard) !== JSON.stringify(backupState.playerBoard))) {
        setPlayerBoard(backupState.playerBoard);
        setBlood(backupState.blood);
        setBones(backupState.bones);
        setHand(backupState.hand);
        setMorselStats(backupState.morselStats);
        addLog("Sacrifice sequence cancelled. Sacrificed creatures restored to board.");
      }
      setSelectedHandIndex(null);
      setBackupState(null);
      setMarkedForSacrifice(null);
      setSacrificedUnkillableCardIds([]);
    } else {
      if (selectedHandIndex !== null && backupState && (blood > backupState.blood || bones > backupState.bones || JSON.stringify(playerBoard) !== JSON.stringify(backupState.playerBoard))) {
        setPlayerBoard(backupState.playerBoard);
        setBlood(backupState.blood);
        setBones(backupState.bones);
        setHand(backupState.hand);
        setMorselStats(backupState.morselStats);
        addLog("Sacrifice sequence cancelled due to switching cards.");
        setSelectedHandIndex(null);
        setBackupState(null);
        setMarkedForSacrifice(null);
        setSacrificedUnkillableCardIds([]);
        return;
      }
      setSelectedHandIndex(idx);
      setBackupState({
        playerBoard: JSON.parse(JSON.stringify(playerBoard)),
        blood,
        bones,
        hand: JSON.parse(JSON.stringify(hand)),
        morselStats: { ...morselStats }
      });
      setMarkedForSacrifice(null);
      setSacrificedUnkillableCardIds([]);
    }
  };

  // --- Playing Cards & Sacrifices ---
  const handlePlayerSlotClick = useCallback(async (laneIndex: number, specificHandIndex?: number) => {
    if (phase !== 'PLAY' || sacrificingLane !== null) return;

    const activeHandIndex = specificHandIndex !== undefined ? specificHandIndex : selectedHandIndex;

    if (activeHandIndex === null) {
      if (playerBoard[laneIndex]) {
        addLog("Select a card from your hand first to play it or sacrifice for it.");
      }
      return;
    }

    const existingCard = playerBoard[laneIndex];

    // SACRIFICE LOGIC
    if (existingCard) {
      if (existingCard.id && sacrificedUnkillableCardIds.includes(existingCard.id)) {
        addLog(`${existingCard.name} has already been sacrificed for this summon.`);
        return;
      }
      const targetCard = hand[activeHandIndex];
      if (!targetCard) return;

      const requiredBlood = targetCard.cost || 0;
      if (requiredBlood <= 0) {
        addLog(`${targetCard.name} does not require blood.`);
        return;
      }

      if (blood >= requiredBlood) {
        addLog(`You already have enough blood to summon ${targetCard.name}.`);
        return;
      }

      const hasWorthySacrifice = existingCard.sigils.includes('Worthy Sacrifice');
      const isWorthyToken = (existingCard.name === 'Chime' || existingCard.name === 'Dam') && hasWorthySacrifice;

      if (existingCard.unsacrificable && !isWorthyToken) {
        addLog(`${existingCard.name} cannot be sacrificed.`);
        return;
      }

      const cardIdentifier = existingCard.id || existingCard.name || '';
      if (existingCard.sigils.includes('Unkillable') && sacrificedUnkillableCardIds.includes(cardIdentifier)) {
        addLog(`${existingCard.name} (Unkillable) has already been sacrificed for this summon attempt.`);
        return;
      }

      if (markedForSacrifice === laneIndex) {
        triggerSfx('sacrifice');

        if (existingCard.name === "Ouroboros") {
          const nextBuff = ouroborosBuffs + 1;
          setOuroborosBuffs(nextBuff);
          setMasterDeck(prev => prev.map(c => {
            if (c.name === "Ouroboros") {
              return { ...c, attack: (c.attack || 0) + 1, health: (c.health || 0) + 1 };
            }
            return c;
          }));
          addLog("Ouroboros was sacrificed! Its eternal form grows stronger (+1/+1).");
        }

        if (existingCard.sigils.includes('Morsel')) {
          setMorselStats(prev => ({
            attack: prev.attack + (existingCard.attack || 0),
            health: prev.health + (existingCard.health || 0)
          }));
          addLog(`Sacrificed ${existingCard.name}! Morsel buffs (+${existingCard.attack || 0}/+${existingCard.health || 0}) ready for next creature.`);
        }

        const bloodYield = existingCard.sigils.includes('Worthy Sacrifice') ? 3 : 1;
        const boneYield = existingCard.sigils.includes('Bone King') ? 4 : 1;

        setBlood(b => b + bloodYield);
        setBones(b => b + boneYield);
        setRunStats(prev => ({
          ...prev,
          cardsSacrificed: prev.cardsSacrificed + 1,
        }));
        addLog(`Sacrificed ${existingCard.name}. Gained ${bloodYield} Blood and ${boneYield} Bone(s).`);

        if (isTutorialDuel && !tutorialSacrificeTriggered) {
          setTutorialSacrificeTriggered(true);
          setDialogueTotalSteps(2);
          setBossState(prev => ({
            ...prev,
            activeDialogue: "Bones build up from every one of your creatures felled…",
          }));
          setDialogueQueue(["Commit to your actions."]);
        }

        setMarkedForSacrifice(null);

          if (existingCard.sigils.includes('Many Lives')) {
            setSacrificedUnkillableCardIds(prev => [...prev, existingCard.id || existingCard.name || '']);
            addLog(`${existingCard.name} was sacrificed but remains on the board thanks to Many Lives!`);
            return;
          }

          // Trigger physical collapse animation before clearing board slot
          setSacrificingLane(laneIndex);
          await new Promise(res => setTimeout(res, 220));
          setSacrificingLane(null);

          setPlayerBoard(prev => {
            const copy = [...prev];
            copy[laneIndex] = null;
            return copy;
          });

          if (existingCard.sigils.includes('Unkillable')) {
            setSacrificedUnkillableCardIds(prev => [...prev, cardIdentifier]);
            const masterCard = masterDeck.find(c => c.id === existingCard.id);
            const returned = cloneCard(masterCard || existingCard, ouroborosBuffs);
            if (existingCard.name === 'Ouroboros') {
              returned.attack = (existingCard.attack || 0) + 1;
              returned.health = (existingCard.health || 0) + 1;
            }
            setHand(prev => [...prev, applyPlayerTotem(transformAmorphous(returned), activeTotem)]);
            addLog(`${existingCard.name} returned to hand (Unkillable)!`);
          }
          return;
      } else {
        setMarkedForSacrifice(laneIndex);
        addLog(`${existingCard.name} marked for sacrifice. Click again to confirm.`);
        return;
      }
    }

    // PLAY CARD INTO EMPTY SLOT
    if (!existingCard && activeHandIndex !== null) {
      const cardToPlay = hand[activeHandIndex];
      if (!cardToPlay) return;
      const requiredBlood = cardToPlay.cost || 0;
      const requiredBones = cardToPlay.boneCost || 0;

      const canAfford = blood >= requiredBlood && bones >= requiredBones;

      if (!canAfford) {
        addLog(`Not enough resources! Requires ${requiredBlood ? `${requiredBlood} Blood ` : ''}${requiredBones ? `${requiredBones} Bones` : ''}.`);
        return;
      }

      // All blood must be consumed when a summon is successful
      setBlood(0);
      setBones(b => Math.max(0, b - requiredBones));
      if (requiredBones > 0) {
        triggerBoneShake();
      }

      const playedCard = cloneCard(cardToPlay, ouroborosBuffs);
      if (!playedCard.id) playedCard.id = `card-${Date.now()}-${Math.random()}`;
      triggerSummonWipe(playedCard.id);

      if (playedCard.name.startsWith("Red ")) {
        playedCard.wasPlayedThisDuel = true;
        setMasterDeck(prev => prev.map(c => 
          (c.id === cardToPlay.id || c.name === cardToPlay.name) 
            ? { ...c, wasPlayedThisDuel: true } 
            : c
        ));
      }

      if (morselStats.attack > 0 || morselStats.health > 0) {
        playedCard.attack = (playedCard.attack || 0) + morselStats.attack;
        playedCard.health = (playedCard.health || 0) + morselStats.health;
        addLog(`${playedCard.name} consumed the Morsel, gaining +${morselStats.attack}/+${morselStats.health}!`);
        setMorselStats({ attack: 0, health: 0 });
      }

      setPlayerBoard(prev => {
        const copy = [...prev];
        copy[laneIndex] = playedCard;
        return copy;
      });

      setHand(prev => prev.filter((_, idx) => idx !== activeHandIndex));
      setSelectedHandIndex(null);
      setBackupState(null);
      setMarkedForSacrifice(null);
      setSacrificedUnkillableCardIds([]);
      triggerSfx('play');
      addLog(`Played ${playedCard.name} in lane ${laneIndex + 1}.`);

      // On-play sigil triggers
      if (playedCard.sigils.includes('Fecundity')) {
        const fecundityCopy = cloneCard(playedCard, ouroborosBuffs);
        fecundityCopy.sigils = fecundityCopy.sigils.filter(s => s !== 'Fecundity');
        setHand(prev => [...prev, applyPlayerTotem(fecundityCopy, activeTotem)]);
        addLog(`${playedCard.name} duplicated into your hand!`);
      }
      if (playedCard.sigils.includes('Rabbit Hole')) {
        const extraSigils = playedCard.sigils.filter(s => s !== 'Rabbit Hole');
        const rabbit = cloneCard(TOKEN_RABBIT);
        extraSigils.forEach(s => {
          if (!rabbit.sigils.includes(s)) rabbit.sigils.push(s);
        });
        setHand(prev => [...prev, applyPlayerTotem(rabbit, activeTotem)]);
        addLog(`A Rabbit emerged from the Warren into your hand!${extraSigils.length > 0 ? ` (Inherited [${extraSigils.join(', ')}])` : ''}`);
      }
      if (playedCard.sigils.includes('Ant Spawner')) {
        const ant = cloneCard(ALL_CARD_LOOKUP['Worker Ant']);
        setHand(prev => [...prev, applyPlayerTotem(ant, activeTotem)]);
        addLog("A Worker Ant scurried into your hand!");
      }
      if (playedCard.sigils.includes('Bellist')) {
        const extraSigils = playedCard.sigils.filter(s => s !== 'Bellist');
        setPlayerBoard(prev => {
          const nextBoard = [...prev];
          const createChime = () => {
            const chime = cloneCard(TOKEN_CHIME);
            chime.id = `chime-${Date.now()}-${Math.random()}`;
            extraSigils.forEach(s => {
              if (!chime.sigils.includes(s)) chime.sigils.push(s);
            });
            triggerSummonWipe(chime.id);
            return applyPlayerTotem(chime, activeTotem);
          };
          if (laneIndex > 0 && !nextBoard[laneIndex - 1]) {
            nextBoard[laneIndex - 1] = createChime();
          }
          if (laneIndex < 3 && !nextBoard[laneIndex + 1]) {
            nextBoard[laneIndex + 1] = createChime();
          }
          return nextBoard;
        });
        addLog(`Chimes sounded, materializing in adjacent spaces!${extraSigils.length > 0 ? ` (Inherited [${extraSigils.join(', ')}])` : ''}`);
      }
      if (playedCard.sigils.includes('Dam Builder')) {
        const extraSigils = playedCard.sigils.filter(s => s !== 'Dam Builder');
        setPlayerBoard(prev => {
          const nextBoard = [...prev];
          const createDam = () => {
            const dam = cloneCard(TOKEN_DAM);
            dam.id = `dam-${Date.now()}-${Math.random()}`;
            extraSigils.forEach(s => {
              if (!dam.sigils.includes(s)) dam.sigils.push(s);
            });
            triggerSummonWipe(dam.id);
            return applyPlayerTotem(dam, activeTotem);
          };
          if (laneIndex > 0 && !nextBoard[laneIndex - 1]) {
            nextBoard[laneIndex - 1] = createDam();
          }
          if (laneIndex < 3 && !nextBoard[laneIndex + 1]) {
            nextBoard[laneIndex + 1] = createDam();
          }
          return nextBoard;
        });
        addLog(`Dams constructed in adjacent spaces!${extraSigils.length > 0 ? ` (Inherited [${extraSigils.join(', ')}])` : ''}`);
      }
      if (!enemyBoard[laneIndex]) {
        const guardianIdx = enemyBoard.findIndex(c => c?.sigils.includes('Guardian'));
        if (guardianIdx !== -1) {
          const gCard = enemyBoard[guardianIdx];
          if (gCard) {
            const cardId = gCard.id || `guardian-${guardianIdx}-${Date.now()}`;
            gCard.id = cardId;
            await triggerLateralMove(cardId, laneIndex - guardianIdx);
            setEnemyBoard(prev => {
              const nextBoard = [...prev];
              nextBoard[laneIndex] = gCard;
              nextBoard[guardianIdx] = null;
              return nextBoard;
            });
            addLog(`Enemy ${gCard.name} leaped to guard lane ${laneIndex + 1}!`);
          }
        }
      }
      if (playedCard.sigils.includes('Hoarder')) {
        if (deck.length > 0) {
          setScreen('EVENT_HOARDER_SEARCH');
        } else {
          addLog(`Your deck is empty. ${playedCard.name} found nothing.`);
        }
      }
    }
  }, [
    phase,
    selectedHandIndex,
    playerBoard,
    enemyBoard,
    blood,
    bones,
    hand,
    deck.length,
    markedForSacrifice,
    sacrificedUnkillableCardIds,
    ouroborosBuffs,
    masterDeck,
    activeTotem,
    morselStats,
    addLog,
    triggerSfx
  ]);

  // --- Calibrated Pointer Drag & Drop Calculation Handlers ---
  const handleHandCardPointerDown = (e: React.PointerEvent, idx: number) => {
    if (phase !== 'PLAY') return;
    if (e.button !== 0) return; // Primary pointer only

    const container = gameContainerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const scale = currentScaleRef.current || (rect.width > 0 ? rect.width / 1280 : 1);
    const virtualX = (e.clientX - rect.left) / scale;
    const virtualY = (e.clientY - rect.top) / scale;

    setDragState({
      cardIndex: idx,
      card: hand[idx],
      startX: virtualX,
      startY: virtualY,
      currentX: virtualX,
      currentY: virtualY,
      hasMoved: false,
    });
  };

  useEffect(() => {
    if (!dragState) return;

    const handleGlobalPointerMove = (e: PointerEvent) => {
      const container = gameContainerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const scale = currentScaleRef.current || (rect.width > 0 ? rect.width / 1280 : 1);
      const virtualX = (e.clientX - rect.left) / scale;
      const virtualY = (e.clientY - rect.top) / scale;

      const dist = Math.hypot(virtualX - dragState.startX, virtualY - dragState.startY);
      const hasMoved = dragState.hasMoved || dist > 6;

      setDragState(prev => (prev ? {
        ...prev,
        currentX: virtualX,
        currentY: virtualY,
        hasMoved,
      } : null));

      // Matrix Coordinate Calibrated Slot Targeting
      let foundLane: number | null = null;
      for (let lane = 0; lane < 4; lane++) {
        const slotEl = playerSlotRefs.current[lane];
        if (slotEl) {
          const slotRect = slotEl.getBoundingClientRect();
          const slotLeft = (slotRect.left - rect.left) / scale;
          const slotTop = (slotRect.top - rect.top) / scale;
          const slotWidth = slotRect.width / scale;
          const slotHeight = slotRect.height / scale;

          if (
            virtualX >= slotLeft - 10 &&
            virtualX <= slotLeft + slotWidth + 10 &&
            virtualY >= slotTop - 10 &&
            virtualY <= slotTop + slotHeight + 10
          ) {
            foundLane = lane;
            break;
          }
        }
      }
      setHoveredSlotLane(foundLane);
    };
// --- ITEM EFFECT: Burn Ticks at End of Player Turn ---
    setPlayerBoard(prev => {
      const next = [...prev];
      let boardChanged = false;
      for (let i = 0; i < 4; i++) {
        const c = next[i];
        if (c && (c as any).isBurned) {
          boardChanged = true;
          const newAtk = Math.max(0, (c.attack || 0) - 1);
          const newHp = (c.health || 0) - 2;
          if (newHp <= 0) {
            addLog(`The flames consume your ${c.name} in lane ${i + 1}.`);
            next[i] = null;
          } else {
            c.attack = newAtk;
            c.health = newHp;
            addLog(`Your ${c.name} in lane ${i + 1} suffers burn (-1 ATK, -2 HP).`);
          }
        }
      }
      return boardChanged ? next : prev;
    });
    const handleGlobalPointerUp = (e: PointerEvent) => {
      const container = gameContainerRef.current;
      const currentDrag = dragState;
      setDragState(null);
      setHoveredSlotLane(null);

      if (!container || !currentDrag) return;

      const rect = container.getBoundingClientRect();
      const scale = currentScaleRef.current || (rect.width > 0 ? rect.width / 1280 : 1);
      const virtualX = (e.clientX - rect.left) / scale;
      const virtualY = (e.clientY - rect.top) / scale;

      let targetLane: number | null = null;
      for (let lane = 0; lane < 4; lane++) {
        const slotEl = playerSlotRefs.current[lane];
        if (slotEl) {
          const slotRect = slotEl.getBoundingClientRect();
          const slotLeft = (slotRect.left - rect.left) / scale;
          const slotTop = (slotRect.top - rect.top) / scale;
          const slotWidth = slotRect.width / scale;
          const slotHeight = slotRect.height / scale;

          if (
            virtualX >= slotLeft - 10 &&
            virtualX <= slotLeft + slotWidth + 10 &&
            virtualY >= slotTop - 10 &&
            virtualY <= slotTop + slotHeight + 10
          ) {
            targetLane = lane;
            break;
          }
        }
      }

      if (currentDrag.hasMoved) {
        if (targetLane !== null) {
          handlePlayerSlotClick(targetLane, currentDrag.cardIndex);
        }
      } else {
        selectHandCard(currentDrag.cardIndex);
      }
    };

    window.addEventListener('pointermove', handleGlobalPointerMove);
    window.addEventListener('pointerup', handleGlobalPointerUp);
    window.addEventListener('pointercancel', handleGlobalPointerUp);

      return () => {
      window.removeEventListener('pointermove', handleGlobalPointerMove);
      window.removeEventListener('pointerup', handleGlobalPointerUp);
      window.removeEventListener('pointercancel', handleGlobalPointerUp);
    };
  }, [dragState]);

// --- Items Engine Execution Handlers ---
  const handleUseItem = (slotIndex: number) => {
    if (phase !== 'PLAY') return;
    const itemId = items[slotIndex];
    if (!itemId) return;

    // Targeted items toggle board selection mode
    if (itemId === 'joker_stamp' || itemId === 'large_matchbook') {
      if (itemTargetMode === itemId && itemTargetSourceSlot === slotIndex) {
        setItemTargetMode(null);
        setItemTargetSourceSlot(null);
        addLog('Targeting cancelled.');
      } else {
        setItemTargetMode(itemId);
        setItemTargetSourceSlot(slotIndex);
        addLog(`Select a creature on the opponent's front row to use ${ALL_ITEMS[itemId].name}.`);
      }
      return;
    }

    consumeAndExecuteItem(slotIndex, itemId);
  };

  const consumeAndExecuteItem = (slotIndex: number, itemId: ItemId) => {
    const nextItems = [...items];

    switch (itemId) {
      case 'magical_hat': {
        nextItems[slotIndex] = null;
        triggerSfx('draw');
        if (Math.random() < 0.5) {
          const rab = cloneCard(TOKEN_RABBIT);
          setHand(prev => [...prev, rab]);
          addLog("You reach into the Magical Hat... and pull out a Rabbit!");
        } else {
          const lane = Math.floor(Math.random() * 4);
          const stoneWallCard = ALL_CARD_LOOKUP['Stone Wall'] || {
            name: 'Stone Wall',
            class: 'Terrain' as any,
            attack: 0,
            health: 3,
            cost: 0,
            emoji: '🧱',
            sigils: []
          };
          setPlayerBoard(prev => {
            const next = [...prev];
            if (next[lane]) {
              addLog(`The Magical Hat drops a Stone Wall into lane ${lane + 1}, crushing your ${next[lane]!.name}!`);
            } else {
              addLog(`The Magical Hat manifests a Stone Wall in lane ${lane + 1}.`);
            }
            next[lane] = {
              ...cloneCard(stoneWallCard),
              id: `stone-hat-${Date.now()}`
            };
            return next;
          });
        }
        break;
      }

      case 'bone_lords_horn': {
        nextItems[slotIndex] = null;
        triggerSfx('bone');
        setIsBoardShaking(true);
        setTimeout(() => setIsBoardShaking(false), 600);

        setPlayerBoard(prev => {
          return prev.map((card, idx) => {
            if (!card) return null;
            let replacementKey = 'Skeleton';
            if (card.class === 'Insect') replacementKey = 'Exoskeleton';
            else if (card.class === 'Reptile') replacementKey = 'Tortoise Shell';
            else if (card.class === 'Canine') replacementKey = 'Skeleton Canine';
            else if (card.class === 'Hooved') replacementKey = 'Demon Elk';
            else if (card.class === 'Avian') replacementKey = 'Reaper';

            const baseCard = ALL_CARD_LOOKUP[replacementKey] || ALL_CARD_LOOKUP['Skeleton'];
            addLog(`Your ${card.name} evolves into a ${baseCard.name}!`);
            return {
              ...cloneCard(baseCard),
              id: `bonehorn-${Date.now()}-${idx}`
            };
          });
        });
        break;
      }

      case 'coin_purse': {
        if (isBossMatch && bossState?.type === 'Zealot' && bossPhase === 2) {
          nextItems[slotIndex] = 'bronze_crucifix';
          triggerSfx('bell');
          setModalAlert({
            title: 'Render Unto Caesar',
            message: 'The Zealot seizes the pouch of coins with feverish eyes and tosses you an ancient Bronze Crucifix in return.',
            btnText: 'Accept the Relic',
            onAction: () => setModalAlert(null as any)
          });
          addLog("The Zealot bartered the Bronze Crucifix for your Coin Purse.");
        } else {
          nextItems[slotIndex] = null;
          triggerSfx('bone');
          setBones(b => b + 4);
          addLog("You untie the Coin Purse, gathering 4 bones.");
        }
        break;
      }

      case 'bronze_crucifix': {
        if (!isBossMatch || bossState?.type !== 'BoneLord') {
          if (crucifixUsedThisDuel) {
            addLog("The Bronze Crucifix lies inert for the remainder of this duel.");
            return;
          }
          setCrucifixUsedThisDuel(true);
          addLog("...after picking this up, you don't really want to get rid of it just yet...");
          return;
        }

        nextItems[slotIndex] = null;
        triggerSfx('hit');

        if (bossPhase === 1 || bossPhase === 2) {
          addLog("The Bronze Crucifix radiates blinding radiance! The phase is severed.");
          setBossPhase(p => p + 1);
        } else if (bossPhase === 3) {
          setBossState(prev => ({ ...prev, isBloodMoonDarkened: true }));
          addLog("...the moon turns dark...");
          setModalAlert({
            title: 'The Bone Lord Speaks',
            message: '....fool.....',
            btnText: 'Witness',
            onAction: () => {
              setModalAlert(null as any);
              setBossPhase(p => p + 1);
            }
          });
        }
        break;
      }

      case 'loaded_die': {
        nextItems[slotIndex] = null;
        triggerSfx('draw');
        const roll = Math.floor(Math.random() * 6) + 1;
        if (roll === 5) {
          setHand(prev => {
            const count = prev.length;
            const rabbits = Array.from({ length: count }, () => cloneCard(TOKEN_RABBIT));
            addLog(`You rolled a 5! Your entire hand turns into ${count} Rabbits!`);
            return rabbits;
          });
        } else {
          const drawCount = (roll === 1 || roll === 3) ? 1 : Math.floor(roll / 2);
          setDieModal({ roll, count: drawCount });
        }
        break;
      }

      case 'bronze_acorn': {
        nextItems[slotIndex] = null;
        triggerSfx('play');
        setIsAcornActive(true);

        const buffCard = (c: CardDef | null) => {
          if (c && c.name === 'Squirrel') {
            return {
              ...c,
              attack: (c.attack || 0) + 1,
              health: (c.health || 0) + 1
            };
          }
          return c;
        };

        setPlayerBoard(prev => prev.map(buffCard));
        setHand(prev => prev.map(c => buffCard(c)!));
        addLog("The Bronze Acorn takes root. All Squirrels gain +1 Power and +1 Health!");
        break;
      }
    }

    setItems(nextItems);
  };

  const handleItemTargetLane = (laneIndex: number) => {
    if (!itemTargetMode || itemTargetSourceSlot === null) return;
    const targetCard = enemyBoard[laneIndex];
    if (!targetCard) return;

    const sourceSlot = itemTargetSourceSlot;
    const mode = itemTargetMode;

    if (mode === 'joker_stamp') {
      setEnemyBoard(prev => {
        const next = [...prev];
        if (next[laneIndex]) {
          next[laneIndex] = {
            ...next[laneIndex]!,
            sigils: ['Waterborne'],
            attack: 0,
            health: 1
          };
        }
        return next;
      });
      addLog(`The Joker Stamp brands enemy ${targetCard.name} with Waterborne, reducing it to 0/1.`);
    } else if (mode === 'large_matchbook') {
      if (targetCard.name === 'Stone Wall') {
        setIsBoardShaking(true);
        setTimeout(() => setIsBoardShaking(false), 500);
        addLog("The Stone Wall remains unscathed by the matchbook's flame!");
      } else if (targetCard.name === 'Skeleton') {
        setEnemyBoard(prev => {
          const next = [...prev];
          next[laneIndex] = {
            ...cloneCard(CARD_FLAMING_SKELETON),
            id: `flaming-skeleton-${Date.now()}`
          };
          return next;
        });
        addLog(`The Skeleton erupts into a Flaming Skeleton!`);
      } else {
        setEnemyBoard(prev => {
          const next = [...prev];
          next[laneIndex] = null;
          return next;
        });
        addLog(`The Large Matchbook incinerates enemy ${targetCard.name}!`);
      }

      // Inflict Burn on player's corresponding and adjacent columns
      setPlayerBoard(prev => {
        const next = [...prev];
        const affectedCols = [laneIndex - 1, laneIndex, laneIndex + 1].filter(c => c >= 0 && c <= 3);
        affectedCols.forEach(col => {
          const pc = next[col];
          if (pc) {
            (pc as any).isBurned = true;
            pc.attack = Math.max(0, (pc.attack || 0) - 1);
            pc.health = (pc.health || 0) - 2;
            if (pc.health <= 0) {
              addLog(`The backdraft burns away your ${pc.name} in lane ${col + 1}!`);
              next[col] = null;
            } else {
              addLog(`Your ${pc.name} in lane ${col + 1} catches fire (-1 ATK, -2 HP)!`);
            }
          }
        });
        return next;
      });
    }

    const nextItems = [...items];
    nextItems[sourceSlot] = null;
    setItems(nextItems);
    setItemTargetMode(null);
    setItemTargetSourceSlot(null);
  };
  
  // --- End Turn & Combat Resolution ---
  const handleEndTurn = async (forceForfeit: boolean = false) => {
    if (phase !== 'PLAY' && !forceForfeit) return;

    setSelectedHandIndex(null);
    setBackupState(null);
    setMarkedForSacrifice(null);
    setSacrificedUnkillableCardIds([]);
    setBlood(0);
    setMorselStats({ attack: 0, health: 0 });

    setPhase('COMBAT');
    if (!forceForfeit) {
      triggerSfx('bell');
      addLog("=== COMBAT: Player Assault ===");
    } else {
      addLog("=== TURN FORFEIT: Paralyzed by Divine Grace ===");
    }

    await executeCombatPhase(forceForfeit);
  };

  // --- Diegetic Blood-Prick Talisman Trigger ---
  const handleTalismanPrick = () => {
    if (phase !== 'PLAY' || isTalismanPricked) return;
    setIsTalismanPricked(true);
    triggerSfx('sacrifice');
    setTimeout(() => {
      handleEndTurn();
    }, 220);
  };

  // --- Movement Resolution with Lateral Translation Animations ---
  const resolveMovements = async (isPlayer: boolean, board: (CardDef | null)[]): Promise<(CardDef | null)[]> => {
    const nextBoard = [...board];
    const movedSet = new Set<string>();

    for (let i = 0; i < 4; i++) {
      const card = nextBoard[i];
      if (!card || !card.id || movedSet.has(card.id)) continue;

      const hasSprint = card.sigils.includes('Sprinter');
      const hasRampager = card.sigils.includes('Rampager');
      const hasHefty = card.sigils.includes('Hefty');
      if (!hasSprint && !hasRampager && !hasHefty) continue;

      movedSet.add(card.id);
      let dir = card.sprintDir ?? 1;
        let target = i + dir;

        // 1. SPRINTER: Moves into open space; bounces immediately off board edges
        if (hasSprint && !hasHefty && !hasRampager) {
          if (target < 0 || target > 3) {
            dir = -dir;
            target = i + dir;
          }

          const canMove = target >= 0 && target <= 3 && nextBoard[target] === null;

          if (canMove) {
            await triggerLateralMove(card.id, target - i);
            nextBoard[target] = card;
            if (card.name === "Demon Elk") {
              nextBoard[i] = isPlayer ? applyPlayerTotem(cloneCard(TOKEN_VERTIBRAE), activeTotem) : cloneCard(TOKEN_VERTIBRAE);
            } else {
              nextBoard[i] = null;
            }
            card.sprintDir = dir;
            addLog(`${isPlayer ? 'Your' : 'Enemy'} ${card.name} stepped into lane ${target + 1}.`);
            if (isPlayer) setPlayerBoard([...nextBoard]);
            else setEnemyBoard([...nextBoard]);
            await new Promise(res => setTimeout(res, 100));
          } else {
            card.sprintDir = -dir;
            addLog(`${isPlayer ? 'Your' : 'Enemy'} ${card.name} was blocked and turned around.`);
            if (isPlayer) setPlayerBoard([...nextBoard]);
            else setEnemyBoard([...nextBoard]);
          }
        }

        // 2. RAMPAGER: Displaces target card; bounces immediately off board edges
        else if (hasRampager) {
          if (target < 0 || target > 3) {
            dir = -dir;
            target = i + dir;
          }

          const canMove = target >= 0 && target <= 3;

          if (canMove) {
            const swapped = nextBoard[target];
            await Promise.all([
              triggerLateralMove(card.id, target - i),
              swapped?.id ? triggerLateralMove(swapped.id, i - target) : Promise.resolve(),
            ]);
            nextBoard[target] = card;
            nextBoard[i] = swapped;
            card.sprintDir = dir;
            addLog(`${isPlayer ? 'Your' : 'Enemy'} ${card.name} rampaged, displacing ${swapped?.name || 'empty space'}.`);
            if (isPlayer) setPlayerBoard([...nextBoard]);
            else setEnemyBoard([...nextBoard]);
            await new Promise(res => setTimeout(res, 100));
          } else {
            card.sprintDir = -dir;
            addLog(`${isPlayer ? 'Your' : 'Enemy'} ${card.name} hit the edge and turned around.`);
            if (isPlayer) setPlayerBoard([...nextBoard]);
            else setEnemyBoard([...nextBoard]);
          }
        }

        // 3. HEFTY: Shoves line toward nearest empty slot; bounces immediately off board edges
        else if (hasHefty) {
          if (target < 0 || target > 3) {
            dir = -dir;
            target = i + dir;
          }

          let emptySlot = -1;
          for (let j = target; j >= 0 && j <= 3; j += dir) {
            if (nextBoard[j] === null) {
              emptySlot = j;
              break;
            }
          }

          if (emptySlot !== -1) {
            const shiftPromises: Promise<void>[] = [];
            for (let j = emptySlot; j !== i; j -= dir) {
              const shiftCard = nextBoard[j - dir];
              if (shiftCard?.id) {
                shiftPromises.push(triggerLateralMove(shiftCard.id, dir));
              }
            }
            await Promise.all(shiftPromises);
            for (let j = emptySlot; j !== i; j -= dir) {
              nextBoard[j] = nextBoard[j - dir];
            }
            nextBoard[target] = card;
            if (card.name === "Demon Elk") {
              nextBoard[i] = isPlayer ? applyPlayerTotem(cloneCard(TOKEN_VERTIBRAE), activeTotem) : cloneCard(TOKEN_VERTIBRAE);
            } else {
              nextBoard[i] = null;
            }
            card.sprintDir = dir;
            addLog(`${card.name} shoved the line toward lane ${emptySlot + 1}.`);
            if (isPlayer) setPlayerBoard([...nextBoard]);
            else setEnemyBoard([...nextBoard]);
            await new Promise(res => setTimeout(res, 100));
          } else {
            card.sprintDir = -dir;
            addLog(`${card.name} could not shove and turned around.`);
            if (isPlayer) setPlayerBoard([...nextBoard]);
            else setEnemyBoard([...nextBoard]);
          }
        }
    }

    return nextBoard;
  };

  // --- Evolution Resolution ---
  const resolveEvolutions = async (isPlayer: boolean, board: (CardDef | null)[]): Promise<(CardDef | null)[]> => {
    // Find any cards maturing via Fledgling
    const evolvingLanes: number[] = [];
    board.forEach((card, idx) => {
      if (card && card.sigils.includes('Fledgling') && ((card.age || 0) + 1) >= 1) {
        evolvingLanes.push(idx);
      }
    });

    if (evolvingLanes.length > 0) {
      // Phase 1: Flip old card face-down to show card back
      setEvolvingCards(evolvingLanes.map(lane => ({ isPlayer, lane, phase: 'down' })));
      await new Promise(res => setTimeout(res, 250));
    }

    const nextBoard = board.map(card => {
      if (!card || !card.sigils.includes('Fledgling')) return card;
      const age = (card.age || 0) + 1;
      if (age >= 1) {
        const evoTarget = EVOLUTION_MAP[card.name] || card.evolvesInto;
        let evoName: string | undefined;

        if (Array.isArray(evoTarget)) {
          const roll = Math.random() * 100;
          let acc = 0;
          for (const opt of evoTarget) {
            acc += opt.chance;
            if (roll < acc) {
              evoName = opt.target;
              break;
            }
          }
          if (!evoName && evoTarget.length > 0) {
            evoName = evoTarget[0].target;
          }
        } else if (typeof evoTarget === 'string') {
          evoName = evoTarget;
        }

        if (evoName && ALL_CARD_LOOKUP[evoName]) {
            const evolved = cloneCard(ALL_CARD_LOOKUP[evoName], ouroborosBuffs);
            evolved.id = card.id;
            evolved.attack = (evolved.attack || 0) + Math.max(0, (card.attack || 0) - (ALL_CARD_LOOKUP[card.name]?.attack || 0));
            evolved.health = (evolved.health || 0) + Math.max(0, (card.health || 0) - (ALL_CARD_LOOKUP[card.name]?.health || 0));
            if (card.isGoobertClone) evolved.isGoobertClone = true;
            if (card.isMycologistCombined) evolved.isMycologistCombined = true;

            // Retain altar-transferred crests across evolution
            const basePreEvoSigils = ALL_CARD_LOOKUP[card.name]?.sigils || [];
            const inheritedSigils = (card.sigils || []).filter(s => {
              if (basePreEvoSigils.includes(s)) return false;
              if (s === 'Fledgling') return false;
              if (isPlayer && activeTotem && (card.class === activeTotem.head || activeTotem.head === 'ALL Classes') && s === activeTotem.body) {
                return false;
              }
              return true;
            });
            inheritedSigils.forEach(s => {
              if (!evolved.sigils.includes(s)) {
                evolved.sigils.push(s);
              }
            });

            addLog(`${isPlayer ? 'Your' : 'Enemy'} ${card.name} matured into a ${evoName}!`);
            return isPlayer ? applyPlayerTotem(evolved, activeTotem) : evolved;
          } else {
          const elder = { ...card };
          elder.name = `Elder ${card.name}`;
          elder.attack = (elder.attack || 0) + 1;
          elder.health = (elder.health || 0) + 2;
          elder.sigils = elder.sigils.filter(s => s !== 'Fledgling');
          addLog(`${isPlayer ? 'Your' : 'Enemy'} ${card.name} matured into an Elder form! (+1 ATK / +2 HP)`);
          return elder;
        }
      }
      return { ...card, age };
    });

    if (evolvingLanes.length > 0) {
      // Update board state mid-flip so the card reveals its evolved art
      if (isPlayer) {
        setPlayerBoard(nextBoard);
      } else {
        setEnemyBoard(nextBoard);
      }

      // Phase 2: Flip evolved card face-up onto the board
      setEvolvingCards(evolvingLanes.map(lane => ({ isPlayer, lane, phase: 'up' })));
      triggerSfx('play');
      await new Promise(res => setTimeout(res, 250));

      setEvolvingCards([]);
    }

    return nextBoard;
  };

  // --- Complete Combat Execution with Visual Pacing ---
  const executeCombatPhase = async (forceSkipPlayerStrikes: boolean = false) => {
    const sleep = (ms: number) => new Promise(res => setTimeout(res, ms));
    let currentScale = scale;
    let currPBoard = [...playerBoard];
    let currEBoard = [...enemyBoard];
    let currEQueue = [...enemyQueue];
    let currBones = bones;
    let handAdditions: CardDef[] = [];

    const checkScaleMatch = (val: number): 'WIN' | 'LOSS' | 'PHASE_SHIFT' | 'CONTINUE' => {
      const winTarget = getRequiredScaleWinDamage();
      if (val >= winTarget) {
        if (isBossMatch) {
          if ((bossState.type === 'The Weaver' || (bossState.type as any) === 'Woodcarver' || !bossState.type) && bossPhase === 1) return 'PHASE_SHIFT';
          if (bossState.type === 'Zealot' && bossPhase === 1) return 'PHASE_SHIFT';
          if (bossState.type === 'The Begotten' && bossPhase === 1) return 'PHASE_SHIFT';
          if (bossState.type === 'BoneLord' && (bossPhase === 1 || bossPhase === 2)) return 'PHASE_SHIFT';
        }
        return 'WIN';
      }
      if (val <= -5) {
        return 'LOSS';
      }
      return 'CONTINUE';
    };

    // 1. PLAYER STRIKES
    const shouldSkipPlayerStrikes = forceSkipPlayerStrikes || bossState.skipNextPlayerTurn;
    if (shouldSkipPlayerStrikes) {
      setBossState(prev => ({ ...prev, skipNextPlayerTurn: false }));
      addLog("=== THE ZEALOT: Your turn is skipped! Your creatures cannot strike or resolve sigils. ===");
      await sleep(800);
    }

    for (let lane = 0; lane < 4; lane++) {
      if (shouldSkipPlayerStrikes) break;

      const pCard = currPBoard[lane];
      if (!pCard) continue;

      pCard.hasAttackedThisTurn = true;

      const pAtk = getCardAttack(pCard, lane, true, currPBoard, currEBoard);
      if (pAtk <= 0) {
        // Cards with 0 power apply a shake animation in place of an attack, as they can not deal damage
        await animateZeroPowerAttack(true, lane);
        await sleep(150);
        continue;
      }

      const targets = buildStrikeTargets(lane, pCard.sigils);

      for (const tLane of targets) {
        if (!currPBoard[lane] || currPBoard[lane]!.health <= 0) break;

        // Massive entities (Blood Moon) occupy the entire enemy frontline
        const massiveCardIdx = currEBoard.findIndex(c => c?.isMassive);
        const hasMassive = massiveCardIdx !== -1;
        let eCard = hasMassive ? currEBoard[massiveCardIdx] : currEBoard[tLane];
        const targetSlotIndex = hasMassive ? massiveCardIdx : tLane;

        const isAirborne = pCard.sigils.includes('Airborne');

        if (!eCard) {
          const burrowerIdx = currEBoard.findIndex(c => c?.sigils.includes('Burrower') && (!isAirborne || c.sigils.includes('Mighty Leap')));
          if (burrowerIdx !== -1) {
            const burrowerCard = currEBoard[burrowerIdx];
            if (burrowerCard?.id) {
              await triggerLateralMove(burrowerCard.id, tLane - burrowerIdx);
            }
            currEBoard[tLane] = currEBoard[burrowerIdx];
            currEBoard[burrowerIdx] = null;
            eCard = currEBoard[tLane];
            addLog(`Enemy ${eCard?.name} burrowed to block lane ${tLane + 1}!`);
            setEnemyBoard([...currEBoard]);
            await sleep(150);
          }
        }

        const blocksAirborne = eCard && eCard.sigils.includes('Mighty Leap');
        const isSubmerged = eCard && eCard.sigils.includes('Waterborne');
        const hitsDirectly = (isAirborne && !blocksAirborne) || isSubmerged || !eCard;
        const isDirectLunge = hitsDirectly && !isAirborne;
        const direction: 'left' | 'right' | 'straight' = tLane < lane ? 'left' : tLane > lane ? 'right' : 'straight';

        // 1. Attack Lunge (asynchronously returning Promise)
        await animateAttackLunge({
          isPlayer: true,
          lane,
          targetLane: tLane,
          isAirborne,
          isDirect: isDirectLunge,
          direction,
        });

        if (eCard && !hitsDirectly) {
          // Loose Tail evasive drop
          if (eCard.sigils.includes('Loose Tail')) {
            const escapeLanes = [tLane + 1, tLane - 1].filter(l => l >= 0 && l <= 3 && !currEBoard[l]);
            if (escapeLanes.length > 0) {
              const currentTotalCards = currEBoard.filter(c => c !== null).length + currEQueue.filter(c => c !== null).length;
              if (isBossMatch || currentTotalCards < 6) {
                await triggerSigilJitter(false, tLane);
                const esc = escapeLanes[0];
                await triggerLateralMove(eCard.id || `tail-esc-${tLane}`, esc - tLane);
                currEBoard[esc] = { ...eCard, sigils: eCard.sigils.filter(s => s !== 'Loose Tail') };
                currEBoard[tLane] = cloneCard(TOKEN_TAIL);
                triggerSummonWipe(currEBoard[tLane].id);
                eCard = currEBoard[tLane];
                addLog(`Enemy ${currEBoard[esc]?.name} shed its tail and slipped away!`);
                setEnemyBoard([...currEBoard]);
                await sleep(150);
              }
            }
          }

          if (eCard.sigils.includes('Armored') && !eCard.shieldBroken) {
            await triggerSigilJitter(false, tLane);
            eCard.shieldBroken = true;
            triggerSfx('armor');
            addLog(`Enemy ${eCard.name}'s armor absorbed the attack!`);
            setEnemyBoard([...currEBoard]);
          } else {
            // Damage Reaction:
            // "Card Damaged: Target card applies a 0.15s shake animation and red hue flash. Displayed Health value must flash and decrement ONLY after the shake completes."
            await animateCardDamage(false, tLane);

            const prevEHealth = eCard.health;

            // Triggered INSIDE the resolved Promise of the damage shake:
            const isTouchOfDeathLethal = pCard.sigils.includes('Touch of Death') && !eCard.sigils.includes('Made of Stone');
            if (isTouchOfDeathLethal) {
              await triggerSigilJitter(true, lane);
              eCard.health = 0;
              addLog(`Touch of Death! Enemy ${eCard.name} perishes instantly.`);
            } else {
              eCard.health -= pAtk;
              addLog(`${pCard.name} dealt ${pAtk} damage to enemy ${eCard.name}.`);
            }
            triggerHpFlash(false, tLane);
            setEnemyBoard([...currEBoard]);

            // Sharp Quills counterattack from enemy
            if (eCard.sigils.includes('Sharp Quills')) {
              await triggerSigilJitter(false, tLane);
              await animateCardDamage(true, lane);
              pCard.health -= 1;
              triggerHpFlash(true, lane);
              setPlayerBoard([...currPBoard]);
              addLog(`Enemy ${eCard.name}'s Sharp Quills dealt 1 damage back to ${pCard.name}!`);

              if (pCard.sigils.includes('Bees Within')) {
                await triggerSigilJitter(true, lane);
                handAdditions.push(applyPlayerTotem(cloneCard(TOKEN_BEE), activeTotem));
                addLog(`Your ${pCard.name}'s Bees Within stirred a Bee into hand!`);
              }

              if (pCard.health <= 0) {
                // Card Destroyed: Upward vertical wipe/dissolve over 0.2s then remove
                await animateCardDestroy(true, lane);
                const bYield = pCard.sigils.includes('Bone King') ? 4 : 1;
                currBones += bYield;
                setBones(currBones);
                addLog(`Your ${pCard.name} perished from Sharp Quills. (+${bYield} Bones)`);

                if (pCard.name === "Ouroboros") {
                  setOuroborosBuffs(prev => prev + 1);
                  setMasterDeck(prev => prev.map(c => c.name === "Ouroboros" ? { ...c, attack: (c.attack || 0) + 1, health: (c.health || 0) + 1 } : c));
                }

                if (pCard.sigils.includes('Unkillable')) {
                  const m = masterDeck.find(c => c.id === pCard.id);
                  handAdditions.push(applyPlayerTotem(cloneCard(m || pCard, ouroborosBuffs), activeTotem));
                }

                currPBoard[lane] = null;
                setPlayerBoard([...currPBoard]);
              }
            }

            if (eCard.health <= 0) {
              addLog(`Enemy ${eCard.name} was slain!`);
              // Card Destroyed: Upward vertical wipe/dissolve over 0.2s then remove from DOM
              await animateCardDestroy(false, targetSlotIndex);
              currEBoard[targetSlotIndex] = null;
              setRunStats(s => ({ ...s, enemyCardsDestroyed: s.enemyCardsDestroyed + 1 }));
              setEnemyBoard([...currEBoard]);

              currPBoard.forEach((c, cIdx) => {
                if (c?.sigils.includes('Scavenger')) {
                  triggerSigilJitter(true, cIdx);
                  currBones += 1;
                  setBones(currBones);
                  addLog(`Scavenger gained 1 Bone from the slaughter.`);
                }
              });

              if (pCard.health > 0 && pCard.sigils.includes('Bloodlust')) {
                await triggerSigilJitter(true, lane);
                pCard.attack = (pCard.attack || 0) + 1;

                // Hodag's Bloodlust permanently commits its attack growth to masterDeck
                if (pCard.name === 'Hodag') {
                  setMasterDeck(prev =>
                    prev.map(c =>
                      c.id === pCard.id || c.name === 'Hodag'
                        ? { ...c, attack: (c.attack || 0) + 1 }
                        : c
                    )
                  );
                }

                setPlayerBoard([...currPBoard]);
                addLog(`${pCard.name}'s Bloodlust surged (+1 ATK)!`);
              }

              // Rule 1: Excess / Trample Damage
              // Excess combat damage never applies to the opponent's scale.
              // If a player card kills an enemy creature with excess damage and an enemy creature is directly
              // behind it in the back row of that same lane, apply the leftover excess damage to that back row creature.
              // This also applies to diagonal attacks: excess damage applies to whatever back row creature occupies
              // the destroyed creature's lane.
              if (pAtk > prevEHealth && prevEHealth > 0) {
                const excess = pAtk - prevEHealth;
                const backRowCard = currEQueue[tLane];

                if (backRowCard) {
                  if (backRowCard.sigils.includes('Armored') && !backRowCard.shieldBroken) {
                    await triggerSigilJitter(false, tLane);
                    backRowCard.shieldBroken = true;
                    setDamagedQueueLane(tLane);
                    triggerSfx('armor');
                    await sleep(150);
                    setDamagedQueueLane(null);
                    addLog(`Excess damage (${excess}) struck enemy ${backRowCard.name} in the back row, but its Armor absorbed the blow!`);
                    setEnemyQueue([...currEQueue]);
                  } else {
                    backRowCard.health -= excess;
                    setDamagedQueueLane(tLane);
                    triggerSfx('hit');
                    await sleep(150);
                    setDamagedQueueLane(null);
                    addLog(`Excess damage! Leftover ${excess} damage struck enemy ${backRowCard.name} in the back row (Lane ${tLane + 1})!`);

                    if (backRowCard.health <= 0) {
                      addLog(`Enemy ${backRowCard.name} in the back row was destroyed by excess damage!`);
                      currEQueue[tLane] = { ...backRowCard, isDying: true };
                      setEnemyQueue([...currEQueue]);
                      await sleep(300);
                      currEQueue[tLane] = null;
                      setEnemyQueue([...currEQueue]);

                      currPBoard.forEach((c, cIdx) => {
                        if (c?.sigils.includes('Scavenger')) {
                          triggerSigilJitter(true, cIdx);
                          currBones += 1;
                          setBones(currBones);
                          addLog(`Scavenger gained 1 Bone from the slaughter.`);
                        }
                      });
                    } else {
                      setEnemyQueue([...currEQueue]);
                    }
                  }
                } else {
                  addLog(`Excess damage (${excess}) dissipated — no enemy creature in back row of lane ${tLane + 1}.`);
                }
              }
            }
          }
        } else {
          // Direct Player/Enemy Damage: Screen-rumble shake applied across all board zones for 0.2s
          await animateDirectDamageRumble();

          // Step gauge 1 point at a time with tick sound
          let ventedThisStrike = 0;
          for (let pt = 0; pt < pAtk; pt++) {
            // Arterial Shunt: On Turn 1, hydraulic pressure cannot force the column past +4.
            // Excess volume diverts directly through the petcock into the banked ounce reservoir.
            if (turnNumber === 1 && currentScale >= 4) {
              ventedThisStrike += 1;
              setIsAmpouleCracked(true);
              setTotalOverkillDamage(prev => (prev || 0) + 1);
              triggerSfx('hit');
              await sleep(60);
            } else {
              currentScale += 1;
              setScale(currentScale);
              triggerSfx('hit');
              await sleep(80);
            }
          }

          if (ventedThisStrike > 0) {
            addLog(`${pCard.name} struck for ${pAtk}! Arterial shunt held gauge at +4; vented ${ventedThisStrike} oz into reservoir.`);
          } else {
            addLog(`${pCard.name} struck the opponent directly for ${pAtk}!`);
          }
        }

        // Sequential async pause between each hit
        await sleep(150);

        // Only Phase Shift interrupts immediately; normal WIN lets all lane attacks finish
        const matchStatus = checkScaleMatch(currentScale);
        const isBoneLordPhase2Shift = isBossMatch && bossState.type === 'BoneLord' && bossPhase === 2 && currentScale >= getRequiredScaleWinDamage();

        if (matchStatus === 'PHASE_SHIFT' || isBoneLordPhase2Shift) {
          const nextPhase = bossPhase + 1;
          setScale(-permanentScaleDebuff);
          setBossPhase(nextPhase);
          setIsPhaseTransition(true);
          triggerSfx('victory');

          // Pause between phases with phase transition display
          await sleep(2500);
          setIsPhaseTransition(false);

          if (pendingBossGrizzlyWall) {
            setPendingBossGrizzlyWall(false);
            setGrizzlyWallActiveInDuel(true);
            setConsecutiveOneTurnWins(0);
            setOtkCooldown(2);
            setIsGrizzlyShaking(true);
            setTimeout(() => setIsGrizzlyShaking(false), 1200);

            currEBoard = [0, 1, 2, 3].map(i => ({
              ...cloneCard(CARD_GRIZZLY),
              sigils: ['Mighty Leap'],
              id: `grizzly-boss-front-${Date.now()}-${i}`
            }));
            currEQueue = [0, 1, 2, 3].map(i => ({
              ...cloneCard(CARD_GRIZZLY),
              sigils: ['Mighty Leap'],
              id: `grizzly-boss-back-${Date.now()}-${i}`
            }));
            addLog("TOO FAST. TOO SOON. The Grizzly Wall floods the boss arena!");
          } else if (bossState.type === 'The Weaver' || (bossState.type as any) === 'Woodcarver') {
            // 1. Fadeout and wipe both frontline and queue
            setEnemyBoard(prev => prev.map(c => c ? { ...c, isDying: true } : null));
            setEnemyQueue(prev => prev.map(c => c ? { ...c, isDying: true } : null));
            await sleep(400);
            currEBoard = [null, null, null, null];
            currEQueue = [null, null, null, null];
            setEnemyBoard([null, null, null, null]);
            setEnemyQueue([null, null, null, null]);

           // 2. Weaver Phase 2: Flip to the opposite tribe and carve a lethal totem
            const p1Tribe: Tribe = woodcarverClasses[0] || 'Insect';
            const candidateTribes: Tribe[] = ['Canine', 'Avian', 'Insect', 'Hooved', 'Reptile'];
            const p2Tribe: Tribe = woodcarverClasses[1] && woodcarverClasses[1] !== p1Tribe
              ? woodcarverClasses[1]
              : (candidateTribes.filter(t => t !== p1Tribe)[Math.floor(Math.random() * 4)]);

            const lethalSigilPool = ['Touch of Death', 'Double Strike', 'Bifurcated Strike', 'Sharp Quills', 'Mighty Leap'];
            const chosenLethalSigil = lethalSigilPool[Math.floor(Math.random() * lethalSigilPool.length)];
            setBossTotem({ class: p2Tribe, sigil: chosenLethalSigil });

            // Siphon candidates exclusively from her second tribe
            const tribePool = ENEMY_MAIN_DECK_POOL.filter(c => c.class === p2Tribe || c.class === 'ALL Classes');
            const validPool = tribePool.length > 0 ? tribePool : ENEMY_MAIN_DECK_POOL;
            const lowTier = validPool.filter(c => (c.attack || 0) <= 1);
            const frontPool = lowTier.length > 0 ? lowTier : validPool;

            const makeP2Beast = (pool: CardDef[]) => {
              const beast = cloneCard(pool[Math.floor(Math.random() * pool.length)], 0);
              if ((beast.class === p2Tribe || beast.class === 'ALL Classes') && !beast.sigils.includes(chosenLethalSigil)) {
                beast.sigils.push(chosenLethalSigil);
              }
              return beast;
            };

            // Paced battlefield: 2 active frontliners and 1 queue reserve matching the new totem
            currEBoard = [
              null,
              makeP2Beast(frontPool),
              makeP2Beast(validPool),
              null,
            ];

            currEQueue = [
              null,
              null,
              makeP2Beast(validPool),
              null,
            ];

            setBossState(prev => ({
              ...prev,
              phase: 2,
              activeDialogue: "She tosses aside the first carving... fashioning a far more vicious effigy for what remains.",
            }));

            addLog("=== THE WEAVER: PHASE 2 INITIALIZED ===");
            addLog(`The Weaver carves a deadly totem: [${p2Tribe}] denizens gain [${chosenLethalSigil}]!`);
          } else if (bossState.type === 'Zealot') {
            // 1. Fadeout and wipe both frontline and queue
            setEnemyBoard(prev => prev.map(c => c ? { ...c, isDying: true } : null));
            setEnemyQueue(prev => prev.map(c => c ? { ...c, isDying: true } : null));
            await sleep(400);

            // Wipe The Zealot's battlefield clean entering Phase 2
            currEBoard = [null, null, null, null];
            currEQueue = [null, null, null, null];
            setEnemyBoard([null, null, null, null]);
            setEnemyQueue([null, null, null, null]);

            // Fill empty player slots with Stone Walls
            currPBoard = currPBoard.map(slot => (slot === null ? cloneCard(ALL_CARD_LOOKUP['Stone Wall'], 0) : slot));

            // Locate player's highest power card on board
            let targetCol = 0;
            let highestPower = -1;
            for (let c = 0; c < 4; c++) {
              const card = currPBoard[c];
              if (card) {
                const power = getCardAttack(card, c, true, currPBoard, currEBoard);
                if (power > highestPower) {
                  highestPower = power;
                  targetCol = c;
                }
              }
            }

            // Adder queued in lane confronting highest power card
            currEQueue[targetCol] = cloneCard(ALL_CARD_LOOKUP['Adder'], 0);

            setBossState(prev => ({
              ...prev,
              phase: 2,
              skipNextPlayerTurn: true,
            }));

            addLog("=== THE ZEALOT: PHASE 2 INITIALIZED ===");
            addLog("The battlefield is cleansed! Stone Walls encase your field, and an Adder coils in the queue!");
          } else if (bossState.type === 'The Begotten' || (bossState.type as any) === 'Goobert') {
            // 1. Fadeout and wipe both frontline and queue
            setEnemyBoard(prev => prev.map(c => c ? { ...c, isDying: true } : null));
            setEnemyQueue(prev => prev.map(c => c ? { ...c, isDying: true } : null));
            await sleep(400);
            currEBoard = [null, null, null, null];
            currEQueue = [null, null, null, null];
            setEnemyBoard([null, null, null, null]);
            setEnemyQueue([null, null, null, null]);

            let targetCol = 0;
            let highestPower = -1;
            for (let c = 0; c < 4; c++) {
              const card = currPBoard[c];
              if (card) {
                const power = getCardAttack(card, c, true, currPBoard, currEBoard);
                if (power > highestPower) {
                  highestPower = power;
                  targetCol = c;
                }
              }
            }

            currEBoard[targetCol] = transformAmorphous(cloneCard(ALL_CARD_LOOKUP['Amoeba'], 0));

            setBossState(prev => ({
              ...prev,
              phase: 2,
              activeDialogue: 'Do you have the new ink for my Stamps? My printing Press would love for you to say no!',
            }));
            addLog("=== THE BEGOTTEN: PHASE 2 INITIALIZED ===");
            addLog(`The Begotten paints an Amoeba directly into lane ${targetCol + 1}!`);
          } else if (bossState.type === 'BoneLord') {
            // Fadeout existing cards before Phase 2 or Phase 3 setup
            setEnemyBoard(prev => prev.map(c => c ? { ...c, isDying: true } : null));
            setEnemyQueue(prev => prev.map(c => c ? { ...c, isDying: true } : null));
            await sleep(400);
            currEBoard = [null, null, null, null];
            currEQueue = [null, null, null, null];
            setEnemyBoard([null, null, null, null]);
            setEnemyQueue([null, null, null, null]);
            if (bossPhase === 1) {
              // Reaper placed in an empty column opposing player, or opposing highest attack card
              let reaperCol = -1;
              const emptyCols = [0, 1, 2, 3].filter(c => currPBoard[c] === null);
              if (emptyCols.length > 0) {
                reaperCol = emptyCols[0];
              } else {
                let maxAtk = -1;
                for (let c = 0; c < 4; c++) {
                  const pCard = currPBoard[c];
                  if (pCard) {
                    const atk = getCardAttack(pCard, c, true, currPBoard, currEBoard);
                    if (atk > maxAtk) {
                      maxAtk = atk;
                      reaperCol = c;
                    }
                  }
                }
              }
              if (reaperCol === -1) reaperCol = 0;

              currEBoard[reaperCol] = cloneCard(ALL_CARD_LOOKUP['Reaper'], 0);

              const treeCard = ALL_CARD_LOOKUP['Felled Tree'] || {
                name: 'Felled Tree',
                class: 'No Class',
                attack: 0,
                health: 3,
                emoji: '🌳',
                sigils: ['Made of Stone'],
                unsacrificable: true,
              };
              const queueCols = [0, 1, 2, 3].filter(c => c !== reaperCol);
              currEQueue[queueCols[0] ?? 0] = cloneCard(treeCard, 0);
              currEQueue[queueCols[1] ?? 1] = cloneCard(ALL_CARD_LOOKUP['Skeleton'], 0);

              // Apply Shadow sigil to all player cards: swap power & health cleanly
              currPBoard = currPBoard.map((c, idx) => {
                if (!c) return null;
                const currentEffectiveAttack = getCardAttack(c, idx, true, currPBoard, currEBoard);
                return {
                  ...c,
                  attack: Math.max(0, c.health || 0),
                  health: Math.max(1, currentEffectiveAttack),
                  sigils: Array.from(new Set([...c.sigils, 'Shadow'])),
                };
              });

              setBossState(prev => ({
                ...prev,
                phase: 2,
                activeDialogue: '......',
              }));

              addLog("=== THE BONE LORD: PHASE 2 INITIALIZED ===");
              addLog("Shadow envelops your creatures! Power and health inverted!");
            } else if (bossPhase === 2) {
              // Phase 3: Blood Moon summons across the battlefield
              currEBoard = [cloneCard(ALL_CARD_LOOKUP['BLOOD MOON'], 0), null, null, null];
              currEQueue = [null, null, null, null];

              setBossState(prev => ({
                ...prev,
                phase: 3,
                activeDialogue: '....the Bone Lord’s gaze feels like it could rip the soul from your body….',
              }));

              addLog("=== THE BONE LORD: PHASE 3 - BLOOD MOON RISES ===");
            }
          }

          setEnemyWavesLeft(2);
          setEnemyBoard([...currEBoard]);
          setEnemyQueue([...currEQueue]);
          setPlayerBoard(currPBoard);
          setBones(currBones);
          setHand(prev => [...prev, ...handAdditions]);
          setScale(-permanentScaleDebuff);
          setTurnNumber(prev => prev + 1);
          setPhase('DRAW');
          addLog(`=== BOSS PHASE ${nextPhase}: A new turn begins! Draw from your Deck or Squirrels. ===`);
          return;
        }
      }
      await sleep(150);
    }

    setActiveAttacker(null);
    setActiveDefendingLane(null);

    // End of player attack turn: Bone Digger generation and Brittle destruction
    let bonesDug = 0;
    for (let c = 0; c < 4; c++) {
      const card = currPBoard[c];
      if (card && card.sigils.includes('Bone Digger')) {
        bonesDug += 1;
        currBones += 1;
        addLog(`${card.name}'s Bone Digger unearthed 1 Bone.`);
      }
      if (card && card.sigils.includes('Brittle') && card.hasAttackedThisTurn) {
        currBones += 2;
        currPBoard[c] = null;
        addLog(`Your ${card.name} perished from Brittle (+2 Bones).`);
      } else if (card) {
        card.hasAttackedThisTurn = false;
      }
    }

    if (bonesDug > 0) {
      triggerSfx('bone');
    }

    setBones(currBones);
    setPlayerBoard([...currPBoard]);

    // ALL attacks have completed — evaluate dynamic scale victory and overkill
    const targetWinDamage = getRequiredScaleWinDamage();
    if (currentScale >= targetWinDamage) {
      const overkillTotal = Math.max(0, currentScale - targetWinDamage);

      setRunStats(prev => ({
        ...prev,
        scaleDamageDealt: prev.scaleDamageDealt + Math.max(0, currentScale),
      }));

      if (overkillTotal > 0) {
        currentScale -= overkillTotal;
        setTotalOverkillDamage(prev => prev + overkillTotal);
        setHighestOverkill(prev => Math.max(prev, overkillTotal));
        setIsOverkill(true);
        setIsEnemyRetracting(true);
        setScale(currentScale);

        // 1. Give the CSS transition 750ms to finish translating off the top
        await sleep(750);

        // 2. Clear both enemy rows while cards are invisible so they can't snap back
        currEBoard = [null, null, null, null];
        currEQueue = [null, null, null, null];
        setEnemyBoard([null, null, null, null]);
        setEnemyQueue([null, null, null, null]);
        setIsEnemyRetracting(false);

        // 3. Keep the OVERKILL banner visible for impact
        await sleep(1400);
        setIsOverkill(false);
      }

      setScale(currentScale);
      setPlayerBoard(currPBoard);
      setEnemyBoard(currEBoard);
      setEnemyQueue(currEQueue);
      setPhase('GAME_OVER');
      triggerSfx('victory');

      await sleep(1500);
      handleWinMatch();
      return;
    }

    currPBoard = await resolveMovements(true, currPBoard);
    setPlayerBoard([...currPBoard]);
    await sleep(250);

    currPBoard = await resolveEvolutions(true, currPBoard);
    setPlayerBoard([...currPBoard]);
    await sleep(250);

    // 2. ENEMY COUNTERATTACK WITH PACING
    setPhase('ENEMY');
    addLog("=== COMBAT: Opponent Counter-Attack ===");
    await sleep(350);

    // Tidal Lock: Purges Squirrels and Rabbits on the player's side
    const enemyHasTidalLock = [...currEBoard, ...currEQueue].some(c => c?.sigils.includes('Tidal Lock'));
    if (enemyHasTidalLock) {
      let tidalPurged = false;
      for (let c = 0; c < 4; c++) {
        const pCard = currPBoard[c];
        if (pCard && (pCard.name === 'Squirrel' || pCard.name === 'Rabbit')) {
          currPBoard[c] = null;
          currBones += 1;
          tidalPurged = true;
        }
      }
      if (tidalPurged) {
        setPlayerBoard([...currPBoard]);
        setBones(currBones);
        addLog("Tidal Lock pulled the tides! All Squirrels and Rabbits on your field were consumed.");
        await sleep(400);
      }
    }

    // Advance Queued Opponents to Frontline step by step with translation animations
    for (let i = 0; i < 4; i++) {
      if (!currEBoard[i] && currEQueue[i]) {
        // Animate visual translation from queue slot to destination slot before re-parenting
        setDroppingQueueLane(i);
        await sleep(300);

        currEBoard[i] = currEQueue[i];
        currEQueue[i] = null;
        setDroppingQueueLane(null);

        addLog(`Enemy ${currEBoard[i]?.name} advanced to lane ${i + 1}.`);
        triggerSfx('play');
        setEnemyBoard([...currEBoard]);
        setEnemyQueue([...currEQueue]);
        await sleep(150);

        if (!currPBoard[i]) {
          const pGuardianIdx = currPBoard.findIndex(c => c?.sigils.includes('Guardian'));
          if (pGuardianIdx !== -1) {
            const pCardToMove = currPBoard[pGuardianIdx];
            if (pCardToMove?.id) {
              await triggerLateralMove(pCardToMove.id, i - pGuardianIdx);
            }
            currPBoard[i] = currPBoard[pGuardianIdx];
            currPBoard[pGuardianIdx] = null;
            addLog(`Your ${currPBoard[i]?.name} leaped to block lane ${i + 1}!`);
            setPlayerBoard([...currPBoard]);
            await sleep(150);
          }
        }
      }
    }

    // Enemy Frontline Strikes
    for (let lane = 0; lane < 4; lane++) {
      const eCard = currEBoard[lane];
      if (!eCard) continue;

      const eAtk = getCardAttack(eCard, lane, false, currPBoard, currEBoard);
      if (eAtk <= 0) {
        // Cards with 0 power apply a shake animation in place of an attack, as they can not deal damage
        await animateZeroPowerAttack(false, lane);
        await sleep(150);
        continue;
      }

      eCard.hasAttackedThisTurn = true;

      // Omnistrike: strikes each opposing occupied space from left to right; if none, strikes directly once
      let targets: number[] = [];
      if (eCard.sigils.includes('Omnistrike')) {
        const occupiedLanes = [0, 1, 2, 3].filter(l => currPBoard[l] !== null);
        targets = occupiedLanes.length > 0 ? occupiedLanes : [lane];
      } else {
        targets = buildStrikeTargets(lane, eCard.sigils);
      }

      for (const tLane of targets) {
        if (!currEBoard[lane] || currEBoard[lane]!.health <= 0) break;

        let pCard = currPBoard[tLane];
        const isAirborne = eCard.sigils.includes('Airborne');

        if (!pCard) {
          const burrowerIdx = currPBoard.findIndex(c => c?.sigils.includes('Burrower') && (!isAirborne || c.sigils.includes('Mighty Leap')));
          if (burrowerIdx !== -1) {
            const burrowerCard = currPBoard[burrowerIdx];
            if (burrowerCard?.id) {
              await triggerLateralMove(burrowerCard.id, tLane - burrowerIdx);
            }
            currPBoard[tLane] = currPBoard[burrowerIdx];
            currPBoard[burrowerIdx] = null;
            pCard = currPBoard[tLane];
            addLog(`Your ${pCard?.name} burrowed to defend lane ${tLane + 1}!`);
            setPlayerBoard([...currPBoard]);
            await sleep(150);
          }
        }

        const blocksAirborne = pCard && pCard.sigils.includes('Mighty Leap');
        const isSubmerged = pCard && pCard.sigils.includes('Waterborne');
        const hitsDirectly = (isAirborne && !blocksAirborne) || isSubmerged || !pCard;
        const isDirectLunge = hitsDirectly && !isAirborne;
        const direction: 'left' | 'right' | 'straight' = tLane < lane ? 'left' : tLane > lane ? 'right' : 'straight';

        // 1. Attack Lunge (asynchronously returning Promise)
        await animateAttackLunge({
          isPlayer: false,
          lane,
          targetLane: tLane,
          isAirborne,
          isDirect: isDirectLunge,
          direction,
        });

        if (pCard && !hitsDirectly) {
          if (pCard.sigils.includes('Loose Tail')) {
            const escapeLanes = [tLane + 1, tLane - 1].filter(l => l >= 0 && l <= 3 && !currPBoard[l]);
            if (escapeLanes.length > 0) {
              await triggerSigilJitter(true, tLane);
              const esc = escapeLanes[0];
              await triggerLateralMove(pCard.id || `p-tail-${tLane}`, esc - tLane);
              currPBoard[esc] = { ...pCard, sigils: pCard.sigils.filter(s => s !== 'Loose Tail') };
              currPBoard[tLane] = applyPlayerTotem(cloneCard(TOKEN_TAIL), activeTotem);
              triggerSummonWipe(currPBoard[tLane].id);
              pCard = currPBoard[tLane];
              addLog(`Your ${currPBoard[esc]?.name} slipped away, leaving its tail behind!`);
              setPlayerBoard([...currPBoard]);
              await sleep(150);
            }
          }

          if (pCard.sigils.includes('Armored') && !pCard.shieldBroken) {
            await triggerSigilJitter(true, tLane);
            pCard.shieldBroken = true;
            triggerSfx('armor');
            addLog(`Your ${pCard.name}'s armor absorbed the attack!`);
            setPlayerBoard([...currPBoard]);
          } else {
            // Damage Reaction:
            // "Card Damaged: Target card applies a 0.15s shake animation and red hue flash. Displayed Health value must flash and decrement ONLY after the shake completes."
            await animateCardDamage(true, tLane);

            // Made of Stone: Immune to Touch of Death
            const isTouchOfDeath = eCard.sigils.includes('Touch of Death') && !pCard.sigils.includes('Made of Stone');
            if (isTouchOfDeath) {
              await triggerSigilJitter(false, lane);
              pCard.health = 0;
              addLog(`Enemy ${eCard.name} struck with Touch of Death! Your ${pCard.name} perished.`);
            } else {
              pCard.health -= eAtk;
              addLog(`Enemy ${eCard.name} dealt ${eAtk} damage to your ${pCard.name}.`);
            }
            triggerHpFlash(true, tLane);
            setPlayerBoard([...currPBoard]);

            // The Daus Retribution
            if (pCard.name === "Chime") {
              const dausIdx = currPBoard.findIndex(c => c?.name === "The Daus");
              if (dausIdx !== -1) {
                const dausAtk = getCardAttack(currPBoard[dausIdx], dausIdx, true, currPBoard, currEBoard);
                const dausDir: 'left' | 'right' | 'straight' = lane < dausIdx ? 'left' : lane > dausIdx ? 'right' : 'straight';
                await triggerSigilJitter(true, dausIdx);
                await animateAttackLunge({
                  isPlayer: true,
                  lane: dausIdx,
                  targetLane: lane,
                  isAirborne: false,
                  isDirect: false,
                  direction: dausDir,
                });
                await animateCardDamage(false, lane);
                eCard.health -= dausAtk;
                triggerHpFlash(false, lane);
                addLog(`The Daus avenged the Chime, striking enemy ${eCard.name} for ${dausAtk}!`);
                if (eCard.health <= 0) {
                  await animateCardDestroy(false, lane);
                  currEBoard[lane] = null;
                  setRunStats(s => ({ ...s, enemyCardsDestroyed: s.enemyCardsDestroyed + 1 }));
                }
                setEnemyBoard([...currEBoard]);
                await sleep(150);
              }
            }

            // Player Sharp Quills
            if (pCard.sigils.includes('Sharp Quills')) {
              await triggerSigilJitter(true, tLane);
              await animateCardDamage(false, lane);
              eCard.health -= 1;
              triggerHpFlash(false, lane);
              addLog(`Your ${pCard.name}'s Sharp Quills dealt 1 damage back to enemy ${eCard.name}!`);
              if (eCard.health <= 0) {
                await animateCardDestroy(false, lane);
                currEBoard[lane] = null;
                setRunStats(s => ({ ...s, enemyCardsDestroyed: s.enemyCardsDestroyed + 1 }));
              }
              setEnemyBoard([...currEBoard]);
            }

            if (pCard.sigils.includes('Bees Within')) {
              await triggerSigilJitter(true, tLane);
              handAdditions.push(applyPlayerTotem(cloneCard(TOKEN_BEE), activeTotem));
              addLog(`Your ${pCard.name}'s Bees Within yielded a Bee to hand!`);
            }

            if (pCard.health <= 0) {
              await animateCardDestroy(true, tLane);
              const bYield = pCard.sigils.includes('Bone King') ? 4 : 1;
              currBones += bYield;
              setBones(currBones);
              addLog(`Your ${pCard.name} perished. (+${bYield} Bones)`);

              if (pCard.name === "Ouroboros") {
                setOuroborosBuffs(prev => prev + 1);
                setMasterDeck(prev => prev.map(c => c.name === "Ouroboros" ? { ...c, attack: (c.attack || 0) + 1, health: (c.health || 0) + 1 } : c));
              }

              if (pCard?.sigils.includes('Unkillable')) {
                const dying = pCard;
                // Match by ID or card name to grab persistent campfire/masterDeck upgrades
                const m = masterDeck.find(c => (dying.id && c.id === dying.id) || c.name === dying.name);
                const restoredDef = cloneCard(m || dying, ouroborosBuffs);

                // Restore full max health and wipe combat damage / temporary board penalties
                const baseLookup = ALL_CARD_LOOKUP[dying.name];
                restoredDef.health = m?.health ?? baseLookup?.health ?? dying.health;
                restoredDef.attack = m?.attack ?? baseLookup?.attack ?? dying.attack;

                handAdditions.push(applyPlayerTotem(restoredDef, activeTotem));
              }

              // Only pull a Corpse Eater from hand if that specific card instance hasn't already leaped onto the board this turn
                const ceIdx = hand.findIndex(
                  c => c.sigils.includes('Corpse Eater') && !currPBoard.some(b => b?.id === c.id)
                );
                if (ceIdx !== -1) {
                  const ceCard = hand[ceIdx];
                  // Filter by unique card ID so previously used instances are removed from hand state
                  setHand(h => h.filter(c => c.id !== ceCard.id));
                  triggerSummonWipe(ceCard.id);
                  currPBoard[tLane] = ceCard;
                  addLog(`Corpse Eater triggered! ${ceCard.name} leaped into the fray!`);
                } else {
                  currPBoard[tLane] = null;
                }
                setPlayerBoard([...currPBoard]);
            }
          }
        } else {
          // Direct Player/Enemy Damage: Screen-rumble shake applied across all board zones for 0.2s
          await animateDirectDamageRumble();
          currentScale -= eAtk;
          setRunStats(s => ({ ...s, scaleDamageTaken: s.scaleDamageTaken + eAtk }));
          setScale(currentScale);
          addLog(`Enemy ${eCard.name} struck you directly for ${eAtk}!`);
        }

        // Sequential async pause between each hit
        await sleep(150);

        const matchStatus = checkScaleMatch(currentScale);
        if (matchStatus === 'LOSS') {
          setScale(currentScale);
          setPlayerBoard(currPBoard);
          setEnemyBoard(currEBoard);
          setPhase('GAME_OVER');
          triggerSfx('defeat');
          handleLossMatch();
          return;
        }
      }
      await sleep(150);
    }

    setActiveAttacker(null);
    setActiveDefendingLane(null);

    // End of enemy attack turn: Brittle destruction
    for (let lane = 0; lane < 4; lane++) {
      const card = currEBoard[lane];
      if (card && card.sigils.includes('Brittle') && card.hasAttackedThisTurn) {
        await animateCardDestroy(false, lane);
        currEBoard[lane] = null;
        addLog(`Enemy ${card.name} perished from Brittle.`);
      } else if (card) {
        card.hasAttackedThisTurn = false;
      }
    }
    setEnemyBoard([...currEBoard]);

    currEBoard = await resolveMovements(false, currEBoard);
    setEnemyBoard([...currEBoard]);
    await sleep(250);

    currEBoard = await resolveEvolutions(false, currEBoard);
    setEnemyBoard([...currEBoard]);
    await sleep(250);

    // Wave / Reinforcement Placement with Boss-specific rules
    let canSpawn = false;
    if (isBossMatch) {
      if (bossState.type === 'BoneLord') {
        if (bossPhase === 1) {
          canSpawn = bossState.phase1CardsPlayed < 9;
        } else if (bossPhase === 2) {
          canSpawn = true;
        } else {
          canSpawn = false;
        }
      } else {
        canSpawn = enemyWavesLeft > 0;
      }
    } else {
      canSpawn = enemyCardsPlayedRef.current < enemyMaxDuelCards;
    }

    if (canSpawn) {
      const emptySlots = [0, 1, 2, 3].filter(i => !currEQueue[i]);
      if (emptySlots.length > 0) {
        if (isBossMatch) {
          let maxToSpawn = Math.min(emptySlots.length, 1 + Math.floor(Math.random() * 2));
          if (bossState.type === 'BoneLord' && bossPhase === 1) {
            maxToSpawn = Math.min(maxToSpawn, Math.max(0, 9 - bossState.phase1CardsPlayed));
          }

          let spawnedThisWave = 0;
          for (let i = 0; i < maxToSpawn; i++) {
            const targetSlot = emptySlots[i];
            const candidate = cloneCard(getRandomEnemyCard(), 0);

            // Zealot Phase 1: Non-Stone Wall cards gain a second random sigil
            if (bossState.type === 'Zealot' && bossPhase === 1 && candidate.name !== 'Stone Wall') {
              const bonusSigils = [
                'Airborne',
                'Burrower',
                'Double Strike',
                'Bifurcated Strike',
                'Mighty Leap',
                'Touch of Death',
                'Stinky',
                'Sharp Quills',
              ];
              const available = bonusSigils.filter(s => !candidate.sigils.includes(s));
              if (available.length > 0) {
                const randomSigil = available[Math.floor(Math.random() * available.length)];
                candidate.sigils = [...candidate.sigils, randomSigil];
              }
            }

            currEQueue[targetSlot] = candidate;
            spawnedThisWave++;
          }

          if (bossState.type === 'BoneLord' && bossPhase === 1) {
            setBossState(prev => ({
              ...prev,
              phase1CardsPlayed: prev.phase1CardsPlayed + spawnedThisWave,
            }));
          }

          if (bossState.type !== 'BoneLord' || bossPhase === 1) {
            setEnemyWavesLeft(w => Math.max(0, w - 1));
          }

          setEnemyQueue([...currEQueue]);
          await sleep(300);
        } else {
          // --- Scaled Turn Reinforcement Rules ---
          let maxAllowedTotalCards: number;
          let maxSpawnsThisTurn: number;
          let maxCardThreat: number;

          if (duelsCompleted === 0) {
            maxAllowedTotalCards = 2; // Strict 2-card cap across front + back combined
            maxSpawnsThisTurn = 1;    // Max 1 card queued per turn
            maxCardThreat = 2;        // Multi-strikers & lethal cards banned
          } else if (duelsCompleted === 1) {
            maxAllowedTotalCards = 3;
            maxSpawnsThisTurn = 1;
            maxCardThreat = 3;
          } else {
            maxAllowedTotalCards = 4;
            maxSpawnsThisTurn = Math.random() < 0.5 ? 1 : 2;
            maxCardThreat = 4;
          }

          const currentTotalEnemyCards = currEBoard.filter(c => c !== null).length + currEQueue.filter(c => c !== null).length;
          const remainingQuota = enemyMaxDuelCards - enemyCardsPlayedRef.current;

          if (currentTotalEnemyCards >= maxAllowedTotalCards) {
            addLog(`Opponent board is at capacity (${currentTotalEnemyCards}/${maxAllowedTotalCards} cards). No reinforcements queued.`);
          } else if (remainingQuota > 0) {
            const getThreat = (c: CardDef): number => {
              let strikeMultiplier = 1;
              if (c.sigils?.includes('Trifurcated Strike')) strikeMultiplier = 3;
              else if (c.sigils?.includes('Bifurcated Strike') || c.sigils?.includes('Double Strike')) strikeMultiplier = 2;

              const rawAtk = (c.attack || 0) * strikeMultiplier;
              const wallTax = (c.attack || 0) === 0 ? Math.max(1, Math.ceil((c.health || 1) / 2)) : 0;
              const touchOfDeathTax = c.sigils?.includes('Touch of Death') ? 2 : 0;

              return rawAtk + wallTax + touchOfDeathTax;
            };

            const slotsAvailable = maxAllowedTotalCards - currentTotalEnemyCards;
            const spawnCount = Math.min(emptySlots.length, maxSpawnsThisTurn, remainingQuota, slotsAvailable);
            let newlySpawned = 0;

            for (let i = 0; i < spawnCount; i++) {
              const targetSlot = emptySlots[i];
              const validPool = ENEMY_MAIN_DECK_POOL.filter(c => getThreat(c) <= maxCardThreat);
              if (validPool.length === 0) break;

              const candidate = transformAmorphous(cloneCard(validPool[Math.floor(Math.random() * validPool.length)], 0));
              currEQueue[targetSlot] = candidate;
              newlySpawned++;
            }

            if (newlySpawned > 0) {
              enemyCardsPlayedRef.current += newlySpawned;
              setEnemyCardsPlayed(enemyCardsPlayedRef.current);
              setEnemyQueue([...currEQueue]);
              await sleep(300);
            }
          }
        }
      }
    }
    setPlayerBoard(currPBoard);
    setEnemyBoard(currEBoard);
    setEnemyQueue(currEQueue);
    setScale(currentScale);
    setBones(currBones);
    if (handAdditions.length > 0) {
      setHand(prev => [...prev, ...handAdditions]);
    }

    setTurnNumber(prev => prev + 1);
    setPhase('DRAW');
    addLog("Your turn begins. Draw from your Deck or Sacrifice Squirrels.");

    // Tutorial Sequence: Enemy Back Row Queue -> Turn 2 Draw Pile Callout
    if (isTutorialDuel && turnNumber === 1) {
      const enemyHasQueued = currEQueue.some(slot => slot !== null);
      if (enemyHasQueued && !tutorialQueueTriggered) {
        setTutorialQueueTriggered(true);
        setTutorialTurn2Triggered(true);
        setDialogueTotalSteps(2);
        setBossState(prev => ({
          ...prev,
          activeDialogue: "Enemy cards will move in for the kill on their turn.",
        }));
        setDialogueQueue(["Draw from only one deck each turn."]);
      } else if (!tutorialTurn2Triggered) {
        setTutorialTurn2Triggered(true);
        setDialogueTotalSteps(1);
        setBossState(prev => ({
          ...prev,
          activeDialogue: "Draw from only one deck each turn.",
        }));
        setDialogueQueue([]);
      }
    }
  };

  const getRandomEnemyCard = (): CardDef => {
    if (isBossMatch) {
      if (bossState.type === 'Zealot') {
        const reptilePool = MAIN_DECK_POOL.filter(
          c => c.class === 'Reptile' || c.name === 'Amalgam' || c.name === 'Hodag'
        );
        const base = reptilePool[Math.floor(Math.random() * reptilePool.length)] || ALL_CARD_LOOKUP['Bullfrog'];
        const card = cloneCard(base, 0);

        if (bossPhase === 1 && card.name !== 'Stone Wall') {
          const extraSigilOptions = [
            'Airborne', 'Burrower', 'Double Strike', 'Bifurcated Strike',
            'Mighty Leap', 'Touch of Death', 'Stinky', 'Sharp Quills', 'Fledgling'
          ];
          const available = extraSigilOptions.filter(s => !card.sigils.includes(s));
          if (available.length > 0) {
            const extra = available[Math.floor(Math.random() * available.length)];
            card.sigils = [...card.sigils, extra];
          }
        }
        return card;
      }

      if (bossState.type === 'The Begotten' || (bossState.type as any) === 'Goobert') {
        const uniqueCardsMap = new Map<string, CardDef>();
        masterDeck.forEach(c => {
          if (!uniqueCardsMap.has(c.name) || Math.random() > 0.5) {
            uniqueCardsMap.set(c.name, c);
          }
        });

        const goobertCardCopies = Array.from(uniqueCardsMap.values()).map(c => {
          const clone = cloneCard(c, 0);
          clone.isGoobertClone = true;
          if (Math.random() > 0.5) {
            clone.attack = Math.max(0, clone.attack + (Math.random() > 0.5 ? 1 : -1));
          } else {
            clone.health = Math.max(1, clone.health + (Math.random() > 0.5 ? 1 : -1));
          }
          return clone;
        });

        const amoebaCard = ALL_CARD_LOOKUP['Amoeba'];
        const pool: CardDef[] = [
          ...Array(5).fill(null).map(() => transformAmorphous(cloneCard(amoebaCard, 0))),
          ...goobertCardCopies.map(c => transformAmorphous(c))
        ];

        return pool[Math.floor(Math.random() * pool.length)] || transformAmorphous(cloneCard(amoebaCard, 0));
      }

      if (bossState.type === 'BoneLord') {
        const boneLordPoolNames = [
          'Skeleton',
          'Geist',
          'Demon Elk',
          'Skeleton Canine',
          'Exoskeleton',
          'Tortoise Shell',
          'Anubis',
          'Reaper',
          'Demon Elk',
        ];
        const chosenName = boneLordPoolNames[Math.floor(Math.random() * boneLordPoolNames.length)];
        const base = ALL_CARD_LOOKUP[chosenName] || ALL_CARD_LOOKUP['Skeleton'];
        return cloneCard(base, 0);
      }
    }

    const pool = ENEMY_MAIN_DECK_POOL;
    const card = cloneCard(pool[Math.floor(Math.random() * pool.length)], 0);
    if (isBossMatch && bossTotem && card.class === bossTotem.class) {
      if (!card.sigils.includes(bossTotem.sigil)) {
        card.sigils.push(bossTotem.sigil);
      }
    }
    return card;
  };

  const calculateGrade = (stats: RunStats): { letter: string; color: string } => {
    let score = Math.round(
      stats.clearedStages * 1.5 +
      stats.bossesDefeated * 22 +
      stats.finalBossesDefeated * 35 +
      stats.enemyCardsDestroyed * 0.3 +
      stats.scaleDamageDealt * 0.15 -
      stats.scaleDamageTaken * 0.5
    );

    // Hard rank milestones: Skill & progression gating
    if (stats.bossesDefeated === 0 && stats.finalBossesDefeated === 0) {
      score = Math.min(score, 58); // Capped at C
    } else if (stats.bossesDefeated === 1 && stats.finalBossesDefeated === 0) {
      score = Math.min(score, 74); // Capped at B
    } else if (stats.bossesDefeated === 2 && stats.finalBossesDefeated === 0) {
      score = Math.min(score, 88); // Capped at A
    }

    const rawScore = Math.min(100, Math.max(0, score));

    let baseGrade = 'F';
    let color = 'text-red-600';

    if (rawScore >= 95) {
      baseGrade = 'S';
      color = 'text-amber-400';
    } else if (rawScore >= 80) {
      baseGrade = 'A';
      color = 'text-emerald-400';
    } else if (rawScore >= 70) {
      baseGrade = 'B';
      color = 'text-blue-400';
    } else if (rawScore >= 50) {
      baseGrade = 'C';
      color = 'text-neutral-100';
    } else if (rawScore >= 20) {
      baseGrade = 'D';
      color = 'text-orange-500';
    }

    let suffix = '';
    if (stats.finalBossesDefeated >= 1 || stats.bossesDefeated >= 4) suffix = '++';
    else if (stats.bossesDefeated === 3) suffix = '+';

    return { letter: `${baseGrade}${suffix}`, color };
  };

  const handleContinueRitual = () => {
    setBossState({
      type: null,
      phase: 1,
      phase1CardsPlayed: 0,
      skipNextPlayerTurn: false,
      activeDialogue: null,
      bgHex: '#18181b',
      bgTransitionDuration: 0,
      isRitualComplete: false,
      ritualEndedVoluntarily: false,
    });
    setDuelsCompleted(0);
    setStage(1);
    setLevel(1);
    setScreen('DUEL');
    startNextDuel(false);
  };

  const handleEndRitual = () => {
    setBossState(prev => ({
      ...prev,
      isRitualComplete: false,
      ritualEndedVoluntarily: true,
    }));
    setScreen('GAME_OVER');
  };

  const handleWinMatch = () => {
    if (isTutorialDuel) {
      setIsTutorialGlitching(true);
      try {
        localStorage.setItem('sacrificial_scales_tutorial_done', 'true');
      } catch (_) {}
      setHasCompletedTutorial(true);

      // Cut to title screen mid-tear
      setTimeout(() => {
        setIsTutorialDuel(false);
        setPlayerBoard([null, null, null, null]);
        setEnemyBoard([null, null, null, null]);
        setEnemyQueue([null, null, null, null]);
        setHand([]);
        setScreen('SPLASH');
      }, 550);

      // Settle distortion after landing on title screen
      setTimeout(() => {
        setIsTutorialGlitching(false);
      }, 1300);
      return;
    }

    setBossState(prev => ({
      ...prev,
      bgHex: '#0b0f19',
      bgTransitionDuration: 1.5,
    }));

    const nextDuels = duelsCompleted + 1;
    setDuelsCompleted(nextDuels);

    // Resolve multi-battle evolutions for the Red series
    setMasterDeck(prev => prev.map(card => {
      if (!card.wasPlayedThisDuel) return card;

      const battles = ((card as any).battlesPlayed || 0) + 1;
      const RED_EVOLUTION_CHAIN: Record<string, string> = {
        "Red Stray": "Red Hound",
        "Red Hound": "Red Behemoth",
        "Red Behemoth": "Red Colossus"
      };

      const nextForm = RED_EVOLUTION_CHAIN[card.name];
      const requiredBattles = card.name === "Red Stray" ? 2 : 3;
      if (battles >= requiredBattles && nextForm) {
        const template = ALL_CARD_LOOKUP[nextForm] || MAIN_DECK_POOL.find(p => p.name === nextForm);
        if (template) {
          const evolved = cloneCard(template);
          evolved.id = card.id;

          // Preserve campfire stat buffs
          const prevTemplate = ALL_CARD_LOOKUP[card.name] || MAIN_DECK_POOL.find(p => p.name === card.name);
          const bonusAtk = Math.max(0, (card.attack || 0) - (prevTemplate?.attack || 0));
          const bonusHp = Math.max(0, (card.health || 0) - (prevTemplate?.health || 0));
          evolved.attack = (evolved.attack || 0) + bonusAtk;
          evolved.health = (evolved.health || 0) + bonusHp;

          // Preserve transferred sigils (e.g. from Altar sacrifice)
          const prevBaseSigils = prevTemplate?.sigils || [];
          const transferredSigils = (card.sigils || []).filter((s: any) => !prevBaseSigils.includes(s));
          evolved.sigils = Array.from(new Set([...(template.sigils || []), ...transferredSigils]));

          evolved.wasPlayedThisDuel = false;
          (evolved as any).battlesPlayed = 0;
          addLog(`The carnage transformed your ${card.name} into ${nextForm}!`);
          return evolved;
        }
      }

      return {
        ...card,
        wasPlayedThisDuel: false,
        battlesPlayed: battles
      };
    }));
    const newStage = Math.floor(nextDuels / 2) + 1;
    const newLevel = (nextDuels % 2) + 1;

    // Stages strictly increment by +1 ONLY after a boss is felled
    if (isBossMatch) {
      setStage(prev => prev + 1);
      setLevel(1);
    } else {
      // Within a stage, level/depth advances with each regular encounter
      setLevel(prev => prev + 1);
    }

    // Run trackers update
    setRunStats(prev => ({
      ...prev,
      clearedStages: prev.clearedStages + 1,
      bossesDefeated: isBossMatch ? prev.bossesDefeated + 1 : prev.bossesDefeated,
      finalBossesDefeated: (isBossMatch && bossState.type === 'BoneLord') ? prev.finalBossesDefeated + 1 : prev.finalBossesDefeated,
      grizzlyWallsSurvived: grizzlyWallActiveInDuel ? prev.grizzlyWallsSurvived + 1 : prev.grizzlyWallsSurvived,
    }));

    // Anti-OTK resolution and streak tracking
    if (grizzlyWallActiveInDuel) {
      setConsecutiveOneTurnWins(0);
      setOtkCooldown(2);
      setPermanentScaleDebuff(prev => Math.min(4, prev + 1));
      setGrizzlyWallActiveInDuel(false);
      addLog("Surviving the Grizzly Wall granted a reprieve. Anti-OTK paused for 2 duels. Scale penalty increased.");
    } else if (otkCooldown > 0) {
      setOtkCooldown(prev => prev - 1);
      setConsecutiveOneTurnWins(0);
    } else if (turnNumber === 1) {
      setConsecutiveOneTurnWins(prev => prev + 1);
    } else {
      setConsecutiveOneTurnWins(0);
    }

    // Final Boss Victory triggers the Ritual Completion Screen
    if (isBossMatch && bossState.type === 'BoneLord') {
      setBossState(prev => ({ ...prev, isRitualComplete: true }));
      return;
    }

    let winMessage = "Your Creatures struck true, thy Foe lays in ruin.";
    if (isBossMatch) {
      if (bossState.type === 'Zealot') {
        winMessage = "The Zealot suddenly retreats with a shriek. A savage scampering back to his Steeple to screech Gospel.";
      } else if (bossState.type === 'The Begotten' || (bossState.type as any) === 'Goobert') {
        winMessage = "The Begotten wriggles and writhes in the dirt, crying a woeful wail as he wallows.";
      } else if (bossState.type === 'The Weaver' || (bossState.type as any) === 'Woodcarver') {
        winMessage = "The Weaver gravely grasped her poppet, violently rending it usunder before vanishing.";
      }
    }

    setModalAlert({
      title: "Enemy Felled",
      message: winMessage,
      isWin: true,
      btnText: "Press Forward",
      onAction: () => {
        setModalAlert(null);
        if (isBossMatch) {
          initCardChoice();
        } else if (nextDuels % 2 !== 0) {
          const allEvents = ['campfire', 'altar', 'carving', 'cost', 'bonelord', 'mycologist', 'goobert', 'cave', 'choice', 'totem', 'items'];
          const shuffled = [...allEvents].sort(() => Math.random() - 0.5).slice(0, 3);
          setCrossroadsOptions(shuffled);
          setScreen('EVENT_CROSSROADS');
        } else {
          startNextDuel();
        }
      }
    });
  };

  const handleLossMatch = () => {
    setModalAlert(null);
    setScreen('GAME_OVER');
  };

  // --- Duel Initialization ---
  const startNextDuel = (
    forcedBoss?: boolean | 'Zealot' | 'The Begotten' | 'BoneLord' | 'The Weaver' | 'Goobert' | 'Woodcarver',
    deckOverride?: CardDef[],
    totemOverride?: Totem | null
  ) => {
    setScale(-permanentScaleDebuff);

    // Duel-specific item state resets
    setCrucifixUsedThisDuel(false);
    setIsAcornActive(false);
    setItemTargetMode(null);
    setItemTargetSourceSlot(null);
    setDieModal(null);

    setPhase('PLAY');

    // Roll the new stage name ONLY when the first battle of a new stage begins (after Duels 6, 14, and 24)
    const isNewStageFirstDuel = (duelsCompleted === 6 || duelsCompleted === 14 || duelsCompleted === 24);
    if (isNewStageFirstDuel && !forcedBoss) {
      setCurrentStageName(getRandomStageName());
    }
    setBlood(0);
    setBones(startingBonesRef.current !== undefined ? startingBonesRef.current : startingBones);
    setHand([]);
    setSelectedHandIndex(null);
    setMarkedForSacrifice(null);
    setSacrificedUnkillableCardIds([]);
    setPlayerBoard([null, null, null, null]);
    setEnemyBoard([null, null, null, null]);
    setEnemyQueue([null, null, null, null]);
    setMorselStats({ attack: 0, health: 0 });
    setBackupState(null);
    setBossTotem(null);

    // Double check and verify player decklist for any changes from the most recent event
    let activeDeck = deckOverride || (masterDeckRef.current && masterDeckRef.current.length > 0 ? masterDeckRef.current : masterDeck);
    if (activeDeck.length === 0) {
      activeDeck = [
        cloneCard(ALL_CARD_LOOKUP["Stoat"]),
        cloneCard(ALL_CARD_LOOKUP["Bullfrog"]),
        cloneCard(ALL_CARD_LOOKUP["Wolf"]),
        cloneCard(ALL_CARD_LOOKUP["Cat"]),
        cloneCard(TOKEN_PELT),
        cloneCard(TOKEN_PELT),
      ];
    }
    setMasterDeck(activeDeck);
    masterDeckRef.current = activeDeck;

    const currentTotem = totemOverride !== undefined ? totemOverride : activeTotem;

    const shuffledDeck = activeDeck
      .map(c => currentTotem ? applyPlayerTotem(cloneCard(c, ouroborosBuffs), currentTotem) : cloneCard(c, ouroborosBuffs))
      .sort(() => Math.random() - 0.5);

    setDeck(shuffledDeck);

    // Full 36-duel campaign cadence: Bosses at 6, 14, 24, and 36
    const duelNum = (duelsCompleted % 36) + 1;
    const isBoss = typeof forcedBoss === 'string' ? true : (forcedBoss !== undefined ? forcedBoss : (duelNum === 6 || duelNum === 14 || duelNum === 24 || duelNum === 36));
    setIsBossMatch(isBoss);
    setBossPhase(1);

    let bossType: 'Zealot' | 'The Begotten' | 'BoneLord' | 'The Weaver' | null = null;
    if (typeof forcedBoss === 'string') {
      bossType = forcedBoss === 'Goobert'
        ? 'The Begotten'
        : (forcedBoss === 'Woodcarver' || forcedBoss === 'The Weaver')
          ? 'The Weaver'
          : forcedBoss as any;
    } else if (isBoss) {
      // Boss #4 (Duel 36 or 3 bosses defeated) is strictly locked to The Bone Lord
      if (duelNum === 36 || runStats.bossesDefeated >= 3) {
        bossType = 'BoneLord';
      } else {
        // Bosses 1, 2, and 3 (Duels 6, 14, 24): Shuffle the standard trio so each appears exactly once
        if (!(window as any).__standardBossOrder || duelNum === 6 || runStats.bossesDefeated === 0) {
          const pool: ('Zealot' | 'The Begotten' | 'The Weaver')[] = ['Zealot', 'The Begotten', 'The Weaver'];
          (window as any).__standardBossOrder = [...pool].sort(() => Math.random() - 0.5);
        }

        const order: ('Zealot' | 'The Begotten' | 'The Weaver')[] = (window as any).__standardBossOrder;
        const bossIdx = duelNum === 6 ? 0 : duelNum === 14 ? 1 : 2;
        bossType = order[bossIdx] || order[0];
      }
    }

    const initBoard: (CardDef | null)[] = [null, null, null, null];
    const initQueue: (CardDef | null)[] = [null, null, null, null];

    if (isBoss && bossType) {
      if (typeof ChiptuneAudio !== 'undefined' && (ChiptuneAudio as any).playFinalBoss) {
        (ChiptuneAudio as any).playFinalBoss(1.8);
      }
      setIsPhaseTransition(true);
      setTimeout(() => setIsPhaseTransition(false), 2500);

      if (bossType === 'Zealot') {
        const playerStoneCol = Math.floor(Math.random() * 4);
        for (let i = 0; i < 4; i++) {
          if (i !== playerStoneCol) {
            initBoard[i] = cloneCard(ALL_CARD_LOOKUP['Stone Wall'], 0);
          }
        }

        setPlayerBoard(prev => {
          const next = [...prev];
          next[playerStoneCol] = cloneCard(ALL_CARD_LOOKUP['Stone Wall'], 0);
          return next;
        });

        const bossAlpha = cloneCard(ALL_CARD_LOOKUP['Alpha'], 0);
        bossAlpha.sigils = ['Leader', 'Fledgling'];
        initQueue[playerStoneCol] = bossAlpha;

        setBossTotem(null);
        setBossState({
          type: 'Zealot',
          phase: 1,
          phase1CardsPlayed: 0,
          skipNextPlayerTurn: false,
          activeDialogue: null,
          bgHex: '#251c19',
          bgTransitionDuration: 3,
          isRitualComplete: false,
          ritualEndedVoluntarily: false,
        });

        addLog('=== BOSS BATTLE: The Zealot awakens in the cave! ===');
      } else if (bossType === 'The Begotten') {
        initBoard[0] = transformAmorphous(cloneCard(ALL_CARD_LOOKUP['Amoeba'], 0));

        setBossTotem(null);
        setBossState({
          type: 'The Begotten',
          phase: 1,
          phase1CardsPlayed: 0,
          skipNextPlayerTurn: false,
          activeDialogue: 'My Stamps are of the highest quality, let me show you!',
          bgHex: '#082613',
          bgTransitionDuration: 2.5,
          isRitualComplete: false,
          ritualEndedVoluntarily: false,
        });

        addLog('=== BOSS BATTLE: The Begotten prepares its canvas! ===');
      } else if (bossType === 'BoneLord') {
        initBoard[0] = cloneCard(ALL_CARD_LOOKUP['Geist'], 0);
        const validPairs = [
          ['Skeleton Canine', 'Skeleton Canine'],
          ['Demon Elk', 'Skeleton'],
          ['Anubis', 'Demon Elk'],
          ['Skeleton Canine', 'Skeleton'],
        ];
        const pair = validPairs[Math.floor(Math.random() * validPairs.length)];
        initBoard[1] = cloneCard(ALL_CARD_LOOKUP[pair[0]], 0);
        initBoard[2] = cloneCard(ALL_CARD_LOOKUP[pair[1]], 0);

        setBossTotem(null);
        setBossState({
          type: 'BoneLord',
          phase: 1,
          phase1CardsPlayed: 3,
          skipNextPlayerTurn: false,
          activeDialogue: '..the Bone Lord’s pitch black eye sockets somehow seem to shift to look at you…',
          bgHex: '#300207',
          bgTransitionDuration: 3,
          isRitualComplete: false,
          ritualEndedVoluntarily: false,
        });

        if (typeof ChiptuneAudio !== 'undefined' && ChiptuneAudio.playFinalBoss) {
          ChiptuneAudio.playFinalBoss(1.8);
        }

        addLog('=== BOSS BATTLE: The Bone Lord rises! ===');
      } else if (bossType === 'The Weaver') {
        const tribes: Tribe[] = ["Canine", "Avian", "Reptile", "Insect", "Hooved"];
        const shuffledTribes = [...tribes].sort(() => Math.random() - 0.5);
        const bossTribe = shuffledTribes[0];
        setWoodcarverClasses([bossTribe, shuffledTribes[1]]);

        const phase1SafeSigils = WOODCARVER_BOSS_TOTEM_SIGILS.filter(
          s => !['Trifurcated Strike', 'Bifurcated Strike', 'Double Strike', 'Touch of Death'].includes(s)
        );
        const chosenSigil = phase1SafeSigils.length > 0
          ? phase1SafeSigils[Math.floor(Math.random() * phase1SafeSigils.length)]
          : WOODCARVER_BOSS_TOTEM_SIGILS[0];

        setBossTotem({ class: bossTribe, sigil: chosenSigil });
        setBossState({
          type: 'The Weaver',
          phase: 1,
          phase1CardsPlayed: 0,
          skipNextPlayerTurn: false,
          activeDialogue: null,
          bgHex: '#24080e',
          bgTransitionDuration: 2,
          isRitualComplete: false,
          ritualEndedVoluntarily: false,
        });

        const tribePool = ENEMY_MAIN_DECK_POOL.filter(c => c.class === bossTribe || c.class === "ALL Classes");
        const validPool = tribePool.length > 0 ? tribePool : ENEMY_MAIN_DECK_POOL;
        const lowTierPool = validPool.filter(c => (c.attack || 0) <= 1);
        const frontPool = lowTierPool.length > 0 ? lowTierPool : validPool;

        const makeFrontlineBeast = () => {
          const beast = cloneCard(frontPool[Math.floor(Math.random() * frontPool.length)], 0);
          if (!beast.sigils.includes(chosenSigil)) {
            beast.sigils.push(chosenSigil);
          }
          return beast;
        };

        initBoard[1] = makeFrontlineBeast();
        initBoard[2] = makeFrontlineBeast();
        initQueue[Math.random() < 0.5 ? 0 : 3] = makeFrontlineBeast();
        addLog(`=== BOSS BATTLE: The Weaver appears wielding [${bossTribe}] + [${chosenSigil}]! ===`);
      }

      setEnemyWavesLeft(2);
      triggerSfx('victory');
    } else {
      if (typeof ChiptuneAudio !== 'undefined' && ChiptuneAudio.playBattle) {
        ChiptuneAudio.playBattle(1.5);
      }

      // --- Tiered Encounter Scaling (Increases once per stage, halfway through each) ---
      // Tier 1: Stage 1, Battles 1-4 (Basic encounters)
      // Tier 2: Stage 1 Battle 5 (Pre-Boss 1) & Stage 2 first half (Battles 1-2)
      // Tier 3: Stage 2 second half (Battles 3+) & Stage 3 first half (Battles 1-2)
      // Tier 4: Stage 3 second half (Battles 3+)
      // Tier 5: Stage 4 first half (Battles 1-2, directly after Boss 3)
      // Tier 6: Stage 4 second half (Battles 3+, Final Difficulty) & post-boss endless runs
      const getEnemyDifficultyTier = (): number => {
        // Runs continued past final boss lock at max difficulty
        if (stage >= 5) return 6;

        if (stage === 1) {
          // Persist Tier 1 for the first 4 battles; jump to Tier 2 on battle 5
          return (level <= 4 && duelsCompleted < 4) ? 1 : 2;
        }
        if (stage === 2) {
          // Halfway through Stage 2 bumps to Tier 3
          return level <= 2 ? 2 : 3;
        }
        if (stage === 3) {
          // Halfway through Stage 3 bumps to Tier 4
          return level <= 2 ? 3 : 4;
        }
        if (stage === 4) {
          // Tier 5 begins after 3rd boss; bumps to Tier 6 halfway through Stage 4
          return level <= 2 ? 5 : 6;
        }
        return 6;
      };

      const difficultyTier = getEnemyDifficultyTier();

      let maxRegularCards: number;
      let initialCount: number;
      let maxOpeningThreat: number;

      switch (difficultyTier) {
        case 1:
          // Tier 1: 3 cards total, 1 opening card, threat capped at 2 (no multi-strikers or heavy hitters)
          maxRegularCards = 3;
          initialCount = 1;
          maxOpeningThreat = 2;
          break;
        case 2:
          // Tier 2: 4 cards total, 1 opening card, threat capped at 2.5
          maxRegularCards = 4;
          initialCount = 1;
          maxOpeningThreat = 2.5;
          break;
        case 3:
          // Tier 3: 4 cards total, 1-2 opening cards, threat capped at 3
          maxRegularCards = 4;
          initialCount = Math.random() < 0.6 ? 1 : 2;
          maxOpeningThreat = 3;
          break;
        case 4:
          // Tier 4: 5 cards total, 2 opening cards, threat capped at 3.5
          maxRegularCards = 5;
          initialCount = 2;
          maxOpeningThreat = 3.5;
          break;
        case 5:
          // Tier 5: 5 cards total, 2 opening cards, threat capped at 4
          maxRegularCards = 5;
          initialCount = 2;
          maxOpeningThreat = 4;
          break;
        case 6:
        default:
          // Tier 6: Final Difficulty - 6 cards total, 2 opening cards, threat capped at 4.5
          maxRegularCards = 6;
          initialCount = 2;
          maxOpeningThreat = 4.5;
          break;
      }

      setEnemyMaxDuelCards(maxRegularCards);
      enemyCardsPlayedRef.current = 0;

      // Threat calculator: accounts for multi-strikers and damage-soaking walls
      const getThreat = (c: CardDef): number => {
        let strikeMultiplier = 1;
        if (c.sigils?.includes('Trifurcated Strike')) strikeMultiplier = 3;
        else if (c.sigils?.includes('Bifurcated Strike') || c.sigils?.includes('Double Strike')) strikeMultiplier = 2;

        const rawAtk = (c.attack || 0) * strikeMultiplier;
        // 0-attack cards stall lanes; tax them based on half their health
        const wallTax = (c.attack || 0) === 0 ? Math.max(1, Math.ceil((c.health || 1) / 2)) : 0;
        const touchOfDeathTax = c.sigils?.includes('Touch of Death') ? 2 : 0;

        return rawAtk + wallTax + touchOfDeathTax;
      };

      // 1. Obstacle generation runs FIRST so the AI can perceive board blockages
      const nextPlayerBoard: (CardDef | null)[] = [null, null, null, null];
      let playerObstacleTarget = 0;
      let enemyObstacleTarget = 0;

      // Obstacles are an occasional encounter condition (30% chance in regular battles), not a constant
      const rollsTerrainEncounter = !isBoss && Math.random() < 0.30;
      if (rollsTerrainEncounter) {
        // Exactly 1 obstacle spawns total across the battlefield: 65% player flank, 35% enemy frontline
        if (Math.random() < 0.65) {
          playerObstacleTarget = 1;
          const pLane = Math.floor(Math.random() * 4);
          const terrainCard = Math.random() < 0.6 ? CARD_FELLED_TREE : CARD_STONE_WALL;
          nextPlayerBoard[pLane] = {
            ...cloneCard(terrainCard),
            id: `terrain-player-${Date.now()}-${pLane}`
          };
        } else {
          enemyObstacleTarget = 1;
          const eLane = Math.floor(Math.random() * 4);
          const terrainCard = Math.random() < 0.6 ? CARD_FELLED_TREE : CARD_STONE_WALL;
          initBoard[eLane] = {
            ...cloneCard(terrainCard),
            id: `terrain-enemy-${Date.now()}-${eLane}`
          };
        }

        const summary = playerObstacleTarget > 0 ? '1 on your side' : "1 on opponent's side";
        addLog(`The wilderness encroaches: an obstacle has formed (${summary}).`);
      }

      if (!isBoss) {
        setPlayerBoard(nextPlayerBoard);
      } else if (bossType !== 'Zealot') {
        setPlayerBoard([null, null, null, null]);
      }

      // 2. Intelligent Backrow Lane Selection:
      // - NEVER queue a creature behind an enemy frontline obstacle (it can never advance)
      // - Prioritize open attack lanes over lanes directly facing a player tree/wall
      const openFrontlineLanes = [0, 1, 2, 3].filter(l => initBoard[l] === null);
      const prioritizedLanes = [...openFrontlineLanes].sort((a, b) => {
        const aBlocked = nextPlayerBoard[a] !== null ? 1 : 0;
        const bBlocked = nextPlayerBoard[b] !== null ? 1 : 0;
        if (aBlocked !== bBlocked) return aBlocked - bBlocked; // Clear player lanes come first
        return Math.random() - 0.5;
      });

      let currentBackRowThreat = 0;
      let playedCount = 0;

      for (let i = 0; i < Math.min(initialCount, prioritizedLanes.length); i++) {
        if (playedCount >= maxRegularCards) break;
        const lane = prioritizedLanes[i];
        const threatRemaining = maxOpeningThreat - currentBackRowThreat;
        if (threatRemaining <= 0) break;

        const validCandidates = ENEMY_MAIN_DECK_POOL.filter(c => getThreat(c) <= threatRemaining);
        if (validCandidates.length > 0) {
          const chosen = transformAmorphous(cloneCard(validCandidates[Math.floor(Math.random() * validCandidates.length)], 0));
          initQueue[lane] = chosen;
          currentBackRowThreat += getThreat(chosen);
          playedCount++;
        }
      }

      enemyCardsPlayedRef.current = playedCount;
      setEnemyCardsPlayed(playedCount);
      setEnemyWavesLeft(2);
      addLog(`Encounter ${encounter} started [Tier ${difficultyTier}] (Enemy card quota: ${maxRegularCards}). Prepare your defenses.`);
    }

    setEnemyBoard(initBoard);
    setEnemyQueue(initQueue);
    // Fair Hand Draw: Prioritize honest foundation cards before multi-strike sweepers
    const initialHand: CardDef[] = [currentTotem ? applyPlayerTotem(cloneCard(TOKEN_SQUIRREL, ouroborosBuffs), currentTotem) : cloneCard(TOKEN_SQUIRREL, ouroborosBuffs)];
    const nukeSigils = ['Bifurcated Strike', 'Trifurcated Strike', 'Double Strike'];
    let oneBloodIdx = shuffledDeck.findIndex(c => {
      if (c.cost !== 1) return false;
      const sigs = (c.sigils || []).map((s: any) => typeof s === 'string' ? s : s?.name || '');
      return !sigs.some(s => nukeSigils.includes(s)) && (c.attack ?? 0) < 3;
    });
    // Fallback if the deck only contains nukes or high costs
    if (oneBloodIdx === -1) {
      oneBloodIdx = shuffledDeck.findIndex(c => c.cost === 1);
    }
    if (oneBloodIdx !== -1) {
      initialHand.push(transformAmorphous(shuffledDeck.splice(oneBloodIdx, 1)[0]));
      addLog("Fair Hand dealt a 1-blood creature.");
    }
    while (initialHand.length < 4 && shuffledDeck.length > 0) {
      initialHand.push(transformAmorphous(shuffledDeck.pop()!));
    }

    setHand(initialHand);
    setDeck(shuffledDeck);
    setEnemyBoard(initBoard);
    setEnemyQueue(initQueue);
    addLog("Turn 1 begins: Your opening hand is dealt. Play creatures or make sacrifices.");
// Reset duel-specific item states
    setCrucifixUsedThisDuel(false);
    setIsAcornActive(false);
    setItemTargetMode(null);
    setItemTargetSourceSlot(null);
    setDieModal(null);

    setTurnNumber(1);
    setIsAmpouleCracked(false);
    setScreen('DUEL');
  };

  // --- Starting Lineages & Draft ---
  const startTutorialDuel = () => {
    setIsTutorialDuel(true);
    setIsBossMatch(false);
    setBossPhase(1);
    setScale(0);
    setBlood(0);
    setBones(0);
    setStage(1);
    setLevel(1);
    setDuelsCompleted(0);

    // Curated starter tutorial deck
    const tutorialCards = [
      cloneCard(ALL_CARD_LOOKUP['Stoat'] || MAIN_DECK_POOL[1], 0),
      cloneCard(ALL_CARD_LOOKUP['Bullfrog'] || MAIN_DECK_POOL[2], 0),
      cloneCard(ALL_CARD_LOOKUP['Wolf'] || MAIN_DECK_POOL[10], 0),
      cloneCard(ALL_CARD_LOOKUP['Sparrow'] || MAIN_DECK_POOL[4], 0),
    ];

    setMasterDeck(tutorialCards);
    masterDeckRef.current = tutorialCards;

    // Draw opening hand: 3 main deck cards + 1 Squirrel
    const shuffled = [...tutorialCards].sort(() => Math.random() - 0.5);
    const openingHand = [
      shuffled[0],
      shuffled[1],
      shuffled[2],
      cloneCard(ALL_CARD_LOOKUP['Squirrel'] || MAIN_DECK_POOL[0], 0)
    ];

    setHand(openingHand);
    setDeck(shuffled.slice(3));

    // Opponent starts with a single Coyote in lane 2, nothing in queue
    const initBoard: (CardDef | null)[] = [
      null,
      cloneCard(ALL_CARD_LOOKUP['Coyote'] || MAIN_DECK_POOL[29], 0),
      null,
      null
    ];
    setEnemyBoard(initBoard);
    setEnemyQueue([null, null, null, null]);
    setPlayerBoard([null, null, null, null]);

    // Route tutorial rules directly into the in-game dialogue overlay
    const tutorialScript = [
      "Squirrels are free. They exist to bleed.",
      "Sacrifice cards in play to summon greater Creatures.",
      "Opposed cards clash. Open lanes strike true.",
      "Take blood from your opponent... without losing all of yours."
    ];

    setTutorialSacrificeTriggered(false);
    setTutorialQueueTriggered(false);
    setTutorialTurn2Triggered(false);
    setDialogueTotalSteps(tutorialScript.length);

    setBossState(prev => ({
      ...prev,
      activeDialogue: tutorialScript[0],
    }));
    setDialogueQueue(tutorialScript.slice(1));

    setPhase('PLAY');
    setScreen('DUEL');
  };

  // Restrict pre-run draft to foundational creatures; sweeps and combo engines are earned later
  const isStarterDraftEligible = (card: CardDef) => {
    if (card.name === "Trade Pelt" || card.unsacrificable || card.isMassive) return false;

    // Explicit exclusions: Red series, Mycelium, Silken Moth
    const draftBannedNames = ['Red Stray', 'Red Hound', 'Red Behemoth', 'Red Colossus', 'Mycelium', 'Silken Moth'];
    if (draftBannedNames.includes(card.name)) return false;

    // Restrict cards costing 3 or more blood
    if (card.cost && card.cost >= 3) return false;

    // Power cap (attack >= 3) applies unless the card costs 2 blood
    if (card.cost !== 2 && card.attack >= 3) return false;

    const bannedSigils = [
      'Bifurcated Strike',
      'Trifurcated Strike',
      'Double Strike',
      'Unkillable',
      'Touch of Death',
    ];
    const cardSigils = (card.sigils || []).map((s: any) => typeof s === 'string' ? s : s?.name || '');
    return !cardSigils.some(s => bannedSigils.includes(s));
  };

  const handleSelectLineage = (lineageId: string) => {
    setStartingBones(0);
    startingBonesRef.current = 0;
    setBones(0);
    let starters: string[] = [];
    let isRandomizer = false;

    if (lineageId === 'vanilla') starters = ["Stoat", "Bullfrog", "Wolf"];
    else if (lineageId === 'witchcraft') starters = ["Black Goat", "Moose Buck", "Mole"];
    else if (lineageId === 'eldritch') starters = ["Mantis", "Tadpole", "Raven"];
    else if (lineageId === 'skeleton') starters = ["Warren", "Red Stray", "Dire Wolf Pup"];
    else if (lineageId === 'infestation') starters = ["Silkworm", "Ant Queen", "Flying Ant"];
    else if (lineageId === 'paleozoic') starters = ["Hyphae", "Mud Turtle", "Great White"];
    else if (lineageId === 'randomizer') {
      starters = ["Amoeba", "Trade Pelt", "Trade Pelt"];
      isRandomizer = true;
    }

    const pDeck = starters.map(name => cloneCard(ALL_CARD_LOOKUP[name] || MAIN_DECK_POOL[0]));
    pDeck.push(cloneCard(TOKEN_PELT));
    pDeck.push(cloneCard(TOKEN_PELT));

    const pool: CardDef[] = [];
    const seen = new Set<string>();
    const eligiblePool = MAIN_DECK_POOL.filter(isStarterDraftEligible);
    while (pool.length < 8) {
      const c = cloneCard(eligiblePool[Math.floor(Math.random() * eligiblePool.length)]);
      if (!seen.has(c.name)) {
        seen.add(c.name);
        pool.push(c);
      }
    }

    setDraftPlayerDeck(pDeck);
    setDraftTradePool(pool);
    setDraftTradesLeft(isRandomizer ? 4 : 2);
    setDraftSelectedDeckIdx(null);
    setDraftSelectedTradeIdx(null);
    setDraftRevealedIndices([0, 1, 2, 3, 4, 5, 6, 7]);
    setDraftFlippingDown(false);
    setDraftFlippingUp(false);
    setScreen('DRAFT');
  };

  const executeDraftTrade = () => {
    if (
      draftSelectedDeckIdx === null ||
      draftSelectedTradeIdx === null ||
      draftTradesLeft <= 0 ||
      draftFlippingDown ||
      draftFlippingUp
    )
      return;

    const pCard = draftPlayerDeck[draftSelectedDeckIdx];
    const tCard = draftTradePool[draftSelectedTradeIdx];
    if (!tCard) return;

    // A Trade Pelt cannot trade for another Trade Pelt
    if (pCard.name === "Trade Pelt" && tCard.name === "Trade Pelt") return;

    const nextP = [...draftPlayerDeck];
    const nextT = [...draftTradePool];
    const takenIdx = draftSelectedTradeIdx;

    nextP[draftSelectedDeckIdx] = tCard;
    // Strip the taken card but keep the spacing slot intact
    nextT[takenIdx] = null;

    const remainingTrades = draftTradesLeft - 1;

    setDraftPlayerDeck(nextP);
    setDraftTradePool(nextT);
    setDraftTradesLeft(remainingTrades);
    setDraftSelectedDeckIdx(null);
    setDraftSelectedTradeIdx(null);
    triggerSfx('play');

    // If another trade is queued, trigger the cascade flip-down ritual and reveal 4 random cards
    if (remainingTrades > 0) {
      setDraftFlippingDown(true);
      setDraftRevealedIndices([]);

      setTimeout(() => {
        // Collect surviving non-null slots
        const validIndices = nextT
          .map((card, i) => (card !== null ? i : -1))
          .filter(i => i !== -1);

        // Randomly roll 4 choices from the 7 survivors
        const shuffled = [...validIndices].sort(() => Math.random() - 0.5);
        const chosenFour = shuffled.slice(0, 4);

        setDraftFlippingDown(false);
        setDraftFlippingUp(true);
        setDraftRevealedIndices(chosenFour);
        triggerSfx('draw');

        setTimeout(() => {
          setDraftFlippingUp(false);
        }, 300);
      }, 350);
    }
  };

  const finalizeDraft = () => {
    const hasRemainingPelts = draftPlayerDeck.some(c => c.name === "Trade Pelt") || draftTradesLeft > 0;
    if (hasRemainingPelts) {
      addLog("You must trade all of your Pelts before entering the woods.");
      return;
    }
    setMasterDeck(draftPlayerDeck.map(c => cloneCard(c)));
    setEncounter(1);
    setDuelsCompleted(0);
    setStage(1);
    setLevel(1);
    setCurrentStageName(getRandomStageName());
    setTotemPieces([]);
    setActiveTotem({ head: null, body: null });

    // After the Draft, only for the first event choice, the player is always only given 3 options: Altar, Campfire, or Bone Lord
    const firstEvents = ['altar', 'campfire', 'bonelord'];
    setCrossroadsOptions(firstEvents);
    setScreen('EVENT_CROSSROADS');
  };

  // --- Campfire Event ---
  const initCampfire = () => {
    setIsEventBusy(false);
    setCampfireCardIdx(null);
    setCampfireBuffType(Math.random() < 0.5 ? 'attack' : 'health');
    setCampfireStage(0);
    setScreen('EVENT_CAMPFIRE');
  };

  const applyCampfireWarm = () => {
    if (isEventBusy || campfireCardIdx === null) return;
    setIsEventBusy(true);

    const nextDeck = [...masterDeck];
    const targetCard = nextDeck[campfireCardIdx];
    if (!targetCard) {
      setIsEventBusy(false);
      return;
    }

    if (campfireStage === 0) {
      if (campfireBuffType === 'attack') targetCard.attack = (targetCard.attack || 0) + 1;
      else targetCard.health = (targetCard.health || 0) + 2;
      setMasterDeck(nextDeck);
      masterDeckRef.current = nextDeck;
      setCampfireStage(1);
      triggerSfx('play');
      addLog(`Warmed ${targetCard.name} safely.`);
      setIsEventBusy(false);
    } else {
      const willDevour = !isCampfireSafe && Math.random() < 0.50;
      if (willDevour) {
        const poisonedSurvivors = Boolean(targetCard.sigils?.includes('Touch of Death'));
        if (poisonedSurvivors) {
          setIsCampfireSafe(true);
        }
        nextDeck.splice(campfireCardIdx, 1);
        setCampfireCardIdx(null);
        setMasterDeck(nextDeck);
        masterDeckRef.current = nextDeck;
        triggerSfx('defeat');
        setModalAlert({
          title: "DROWNED BY THE ZEALOT",
          message: poisonedSurvivors
            ? `The Zealot plunged the ${targetCard.name} into the boiling blood! In its demise, its Unholy Crest cursed the Zealot's flock.`
            : `The Zealot plunged the ${targetCard.name} into the boiling blood! You watch helplessly...`,
          isWin: false,
          btnText: "Flee the Chapel",
          onAction: () => {
            setModalAlert(null);
            setIsEventBusy(false);
            startNextDuel(undefined, nextDeck);
          }
        });
      } else {
        if (campfireBuffType === 'attack') targetCard.attack = (targetCard.attack || 0) + 1;
        else targetCard.health = (targetCard.health || 0) + 2;
        setMasterDeck(nextDeck);
        masterDeckRef.current = nextDeck;
        triggerSfx('victory');
        setModalAlert({
          title: "BATHED AGAIN",
          message: `${targetCard.name} absorbs the blood blessing, you shudder at its abnormal growth...`,
          isWin: true,
          btnText: "Leave the Chapel",
          onAction: () => {
            setModalAlert(null);
            setIsEventBusy(false);
            startNextDuel(undefined, nextDeck);
          }
        });
      }
    }
  };

  // --- Altar (Sigil Transfer) Event ---
  const getBaseSigilCount = (cardName: string): number => {
    const base = ALL_CARD_LOOKUP[cardName];
    return base?.sigils ? base.sigils.length : 0;
  };

  const hasMoreSigilsThanOriginal = (card: CardDef): boolean => {
    return (card.sigils?.length || 0) > getBaseSigilCount(card.name);
  };

  const initAltar = () => {
    setIsEventBusy(false);
    setAltarHostId(null);
    setAltarSacrificeId(null);

    // Detect if the deck has ANY valid (Host, Sacrifice) pair under Altar rules
    const hasValidPair = masterDeck.some(host => {
      if (hasMoreSigilsThanOriginal(host)) return false;
      const hostSigils = host.sigils || [];
      return masterDeck.some(sac => {
        if (sac.id === host.id) return false;
        if (!sac.sigils || sac.sigils.length === 0) return false;
        const merged = new Set([...hostSigils, ...sac.sigils]);
        return merged.size < 5;
      });
    });

    if (!hasValidPair) {
      setModalAlert({
        title: "ALTAR DORMANT",
        message: "The Altar remains cold and rejects your Creatures. You carry your unholy beasts beyond the wretched temple.",
        isWin: true,
        btnText: "Depart Altar",
        onAction: () => {
          setModalAlert(null);
          setIsEventBusy(false);
          startNextDuel();
        }
      });
      return;
    }

    setScreen('EVENT_ALTAR');
  };

  const applyAltarTransfer = () => {
    if (isEventBusy || !altarHostId || !altarSacrificeId || altarHostId === altarSacrificeId) return;
    setIsEventBusy(true);

    const host = masterDeck.find(c => c.id === altarHostId);
    const sacrifice = masterDeck.find(c => c.id === altarSacrificeId);
    if (!host || !sacrifice) {
      setIsEventBusy(false);
      return;
    }

    if (hasMoreSigilsThanOriginal(host)) {
      addLog(`Cannot perform ritual: ${host.name} already has more crests than it originally should.`);
      setIsEventBusy(false);
      return;
    }

    const mergedSigils = [...(host.sigils || [])];
    sacrifice.sigils.forEach(s => {
      if (!mergedSigils.includes(s)) mergedSigils.push(s);
    });

    if (mergedSigils.length >= 5) {
      addLog(`Cannot perform ritual: ${host.name} would have 5 or more crests.`);
      setIsEventBusy(false);
      return;
    }

    setAltarHostId(null);
    setAltarSacrificeId(null);

    const nextDeck = masterDeck.filter(c => c.id !== sacrifice.id).map(c => {
      if (c.id === host.id) {
        return { ...c, sigils: mergedSigils };
      }
      return c;
    });

    setMasterDeck(nextDeck);
    masterDeckRef.current = nextDeck;
    triggerSfx('sacrifice');
    setModalAlert({
      title: "RITUAL COMPLETE",
      message: `${sacrifice.name} was surrendered to the Maker. Its essence now empowers ${host.name}.`,
      isWin: true,
      btnText: "Leave Altar",
      onAction: () => {
        setModalAlert(null);
        setIsEventBusy(false);
        startNextDuel(undefined, nextDeck);
      }
    });
  };

  // --- Totem Carvings Event ---
  const initTotemCarving = () => {
    setIsEventBusy(false);
    const allTribes: Tribe[] = ["Reptile", "Insect", "Avian", "Canine", "Hooved"];
    const shuffled = [...allTribes].sort(() => Math.random() - 0.5);
    setCarvingTribes(shuffled.slice(0, 3));
    setScreen('EVENT_TOTEM_CARVING');
  };

  const claimCarvingTribe = (tribe: Tribe) => {
    if (isEventBusy) return;
    setIsEventBusy(true);

    const pool = EVENT_CARD_POOL.filter(c => c.class === tribe || c.class === "ALL Classes");
    const chosen = cloneCard(pool[Math.floor(Math.random() * pool.length)]);
    const nextDeck = [...masterDeck, chosen];
    setMasterDeck(nextDeck);
    masterDeckRef.current = nextDeck;
    triggerSfx('play');
    setModalAlert({
      title: "THREAD WOVEN",
      message: `The stitched ${tribe} crest summoned a ${chosen.name} to join you and your Creatures.`,
      isWin: true,
      btnText: "Proceed",
      onAction: () => {
        setModalAlert(null);
        setIsEventBusy(false);
        startNextDuel(undefined, nextDeck);
      }
    });
  };

  // --- Costly Bargain Event ---
  const initCostBargain = () => {
    const allCosts: Array<'1 Blood' | '2 Blood' | '3 Blood' | 'Bones'> = ['1 Blood', '2 Blood', '3 Blood', 'Bones'];
    const shuffled = [...allCosts].sort(() => Math.random() - 0.5);
    setCostChoices(shuffled.slice(0, 3));
    setScreen('EVENT_COST_BARGAIN');
  };

  const claimCostBargain = (type: '1 Blood' | '2 Blood' | '3 Blood' | 'Bones') => {
    if (isEventBusy) return;
    setIsEventBusy(true);

    let pool = EVENT_CARD_POOL;
    if (type === '1 Blood') pool = EVENT_CARD_POOL.filter(c => c.cost === 1);
    else if (type === '2 Blood') pool = EVENT_CARD_POOL.filter(c => c.cost === 2);
    else if (type === '3 Blood') pool = EVENT_CARD_POOL.filter(c => c.cost === 3);
    else if (type === 'Bones') pool = EVENT_CARD_POOL.filter(c => (c.boneCost || 0) > 0);

    const card = cloneCard(pool[Math.floor(Math.random() * pool.length)]);
    const nextDeck = [...masterDeck, card];
    setMasterDeck(nextDeck);
    masterDeckRef.current = nextDeck;
    triggerSfx('play');
    setModalAlert({
      title: "BARGAIN SEALED",
      message: `The Merchant stirs but thankfully does not wake. It seems you nabbed a ${card.name}!`,
      isWin: true,
      btnText: "Proceed",
      onAction: () => {
        setModalAlert(null);
        setIsEventBusy(false);
        startNextDuel(undefined, nextDeck);
      }
    });
  };

  // --- Bone Lord Event ---
  const initBoneLord = () => {
    setIsEventBusy(false);
    setBoneLordSelectedIdx(null);
    setScreen('EVENT_BONE_LORD');
  };

  const confirmBoneLordOffering = () => {
    if (isEventBusy || boneLordSelectedIdx === null) return;
    setIsEventBusy(true);

    const targetIdx = boneLordSelectedIdx;
    const card = masterDeck[targetIdx];
    if (!card) {
      setIsEventBusy(false);
      return;
    }
    const isGoat = card.name === "Black Goat";
    const bonus = isGoat ? 3 : 1;

    setBoneLordSelectedIdx(null);

    const nextDeck = masterDeck.filter((_, idx) => idx !== targetIdx);
    const newStartingBones = (startingBonesRef.current !== undefined ? startingBonesRef.current : startingBones) + bonus;
    setStartingBones(newStartingBones);
    startingBonesRef.current = newStartingBones;
    setMasterDeck(nextDeck);
    masterDeckRef.current = nextDeck;
    triggerSfx('sacrifice');

    setModalAlert({
      title: "THE BONE LORD REJOICES",
      message: isGoat
        ? "The Lord of Bones greedily accepts the Black Goat, bestowing a Miracle (+3 Starting Bones permanently)."
        : `The Bone Lord accepts ${card.name}, bestowing a Blessing (+1 Starting Bone permanently).`,
      isWin: true,
      btnText: "Accept Favor",
      onAction: () => {
        setModalAlert(null);
        setIsEventBusy(false);
        startNextDuel(undefined, nextDeck);
      }
    });
  };

  // --- Mycologists Event ---
  const initMycologists = () => {
    setIsEventBusy(false);
    setMycoSelectedIndices([]);

    const counts: Record<string, number> = {};
    masterDeck.forEach(c => {
      counts[c.name] = (counts[c.name] || 0) + 1;
    });

    const hasDuplicates = Object.values(counts).some(cnt => cnt >= 2);
    setMycoHasDuplicates(hasDuplicates);

    if (!hasDuplicates && masterDeck.length > 0) {
      // Find player's highest power card currently in decklist
      const highestPowerCard = masterDeck.reduce((best, c) => {
        const cPow = c.attack || 0;
        const bestPow = best.attack || 0;
        if (cPow > bestPow) return c;
        if (cPow === bestPow && (c.health || 0) > (best.health || 0)) return c;
        return best;
      }, masterDeck[0]);

      // The duplicate card given by the Mycologist always clones the original stats/sigils of the card, not current stats/sigils
      const originalTemplate = ALL_CARD_LOOKUP[highestPowerCard.name] || MAIN_DECK_POOL.find(p => p.name === highestPowerCard.name) || highestPowerCard;
      setMycoOfferedCard(cloneCard(originalTemplate));
    } else {
      setMycoOfferedCard(null);
    }

    setScreen('EVENT_MYCOLOGIST');
  };

  const startMycologistEvent = initMycologists;

  const claimMycologistDuplicate = () => {
    if (isEventBusy || !mycoOfferedCard) return;
    setIsEventBusy(true);

    const offered = mycoOfferedCard;
    const originalTemplate = ALL_CARD_LOOKUP[offered.name] || MAIN_DECK_POOL.find(p => p.name === offered.name) || offered;
    const clone = cloneCard(originalTemplate);
    const nextDeck = [...masterDeck, clone];
    setMasterDeck(nextDeck);
    masterDeckRef.current = nextDeck;
    triggerSfx('play');

    setModalAlert({
      title: "TWIN CREATURE ADDED",
      message: `The Weaver stuffed a twin of ${offered.name} into your deck!`,
      isWin: true,
      btnText: "Venture Onwards",
      onAction: () => {
        setModalAlert(null);
        setIsEventBusy(false);
        setMycoOfferedCard(null);
        startNextDuel(undefined, nextDeck);
      }
    });
  };

  const confirmMycologistCombine = () => {
    if (isEventBusy || mycoSelectedIndices.length !== 2) return;
    setIsEventBusy(true);

    const card1 = masterDeck[mycoSelectedIndices[0]];
    const card2 = masterDeck[mycoSelectedIndices[1]];
    if (!card1 || !card2 || card1.name !== card2.name) {
      setIsEventBusy(false);
      return;
    }

    const targets = [...mycoSelectedIndices];
    setMycoSelectedIndices([]);

    const fused = cloneCard(card1);
    fused.attack = (card1.attack || 0) + (card2.attack || 0);
    fused.health = card1.health + card2.health;
    const sigils = [...card1.sigils];
    card2.sigils.forEach(s => { if (!sigils.includes(s)) sigils.push(s); });
    fused.sigils = sigils;
    fused.isMycologistCombined = true;

    const nextDeck = masterDeck.filter((_, idx) => !targets.includes(idx));
    nextDeck.push(fused);
    setMasterDeck(nextDeck);
    masterDeckRef.current = nextDeck;
    triggerSfx('sacrifice');

    setModalAlert({
      title: "FUSED IN SANGUINE WEB",
      message: `The Weaver bound ${card1.name} and ${card2.name} into an abomination of exceptional might!`,
      isWin: true,
      btnText: "Leave Weaver",
      onAction: () => {
        setModalAlert(null);
        setIsEventBusy(false);
        startNextDuel(undefined, nextDeck);
      }
    });
  };

  const initGoobert = () => {
    setIsEventBusy(false);
    setGoobertSelectedIdx(null);
    setScreen('EVENT_GOOBERT');
  };

  const confirmGoobertClone = () => {
    if (isEventBusy || goobertSelectedIdx === null) return;
    setIsEventBusy(true);

    const original = masterDeck[goobertSelectedIdx];
    if (!original) {
      setIsEventBusy(false);
      return;
    }
    setGoobertSelectedIdx(null);

    const clone = cloneCard(original);

    // Flag as Goobert creation
    clone.isGoobertClone = true;
    clone.id = `goobert-${Date.now()}`;

    const mutated = Math.random() < 0.5;
    let desc = `The Press did indeed Stamp a pristine ${original.name}!`;

    if (mutated) {
      if (Math.random() < 0.5) {
        const delta = Math.random() < 0.5 ? 1 : -1;
        clone.attack = Math.max(0, (clone.attack || 0) + delta);
        desc = `The Begotten slammed the Press shut. The Stamped ${original.name}'s attack shifted by ${delta > 0 ? '+1' : '-1'}.`;
      } else {
        const pool = Object.keys(SIGIL_MAPPING).filter(s => s !== 'Amorphous');
        clone.sigils = [pool[Math.floor(Math.random() * pool.length)]];
        desc = `The Begotten's carelessness cut ${original.name}'s crest in the Press, he Stamped it with ${clone.sigils[0]} to "compensate!"`;
      }
    }

    const nextDeck = [...masterDeck, clone];
    setMasterDeck(nextDeck);
    masterDeckRef.current = nextDeck;
    triggerSfx('play');
    setModalAlert({
      title: "THE BEGOTTEN SNEERS",
      message: desc,
      isWin: true,
      btnText: "VENTURE ONWARD",
      onAction: () => {
        setModalAlert(null);
        startNextDuel(undefined, nextDeck);
      }
    });
  };

  // --- Cave Trials Event ---
    const initCaveTrial = () => {
      setIsEventBusy(false);
      const trialTypes = ['Trial of Bones', 'Trial of Blood', 'Trial of Power', 'Trial of Health', 'Trial of Wisdom', 'Trial of Kin'];
      const chosen = [...trialTypes].sort(() => Math.random() - 0.5).slice(0, 3);
      setCaveTrials(chosen);
      setCaveSelectedTrial(null);
      setCaveDrawnCards([]);
      setCavePassed(false);
      setCaveRewardCards([]);
      setCaveSelectedRewardIdx(null);
      setScreen('EVENT_CAVE_TRIAL');
    };

  const evaluateCaveTrial = (trialName: string) => {
      if (isEventBusy || caveSelectedTrial) return;
      setIsEventBusy(true);
      setCaveSelectedTrial(trialName);
      const shuffled = [...masterDeck].sort(() => Math.random() - 0.5);
    const drawn = shuffled.slice(0, 3);
    setCaveDrawnCards(drawn);

    let passed = false;
    if (trialName === 'Trial of Bones') {
      passed = drawn.reduce((acc, c) => acc + (c.boneCost || 0), 0) >= 5;
    } else if (trialName === 'Trial of Blood') {
      passed = drawn.reduce((acc, c) => acc + (c.cost || 0), 0) >= 4;
    } else if (trialName === 'Trial of Power') {
      passed = drawn.reduce((acc, c) => acc + (c.attack || 0), 0) >= 4;
    } else if (trialName === 'Trial of Health') {
      passed = drawn.reduce((acc, c) => acc + (c.health || 0), 0) >= 6;
    } else if (trialName === 'Trial of Wisdom') {
      passed = drawn.reduce((acc, c) => acc + (c.sigils?.length || 0), 0) >= 3;
    } else if (trialName === 'Trial of Kin') {
      const tribes = drawn.map(c => c.class).filter(cl => cl !== 'No Class' && cl !== 'ALL Classes');
      passed = new Set(tribes).size < tribes.length && tribes.length >= 2;
    }

    setCavePassed(passed);
    if (passed) {
      triggerSfx('victory');
      const sigilPool = Object.keys(SIGIL_MAPPING).filter(s => s !== 'Amorphous');
      const rewards: CardDef[] = [];
      while (rewards.length < 3) {
        const base = cloneCard(EVENT_CARD_POOL[Math.floor(Math.random() * EVENT_CARD_POOL.length)]);
        const extraSigil = sigilPool[Math.floor(Math.random() * sigilPool.length)];
        if (!base.sigils.includes(extraSigil)) base.sigils.push(extraSigil);
        rewards.push(base);
      }
      setCaveRewardCards(rewards);
    } else {
      triggerSfx('defeat');
    }
  };

  // --- Card Choice Event ---
  const initCardChoice = () => {
    const picks: CardDef[] = [];
    const used = new Set<string>();
    while (picks.length < 3) {
      const c = cloneCard(EVENT_CARD_POOL[Math.floor(Math.random() * EVENT_CARD_POOL.length)]);
      if (!used.has(c.name)) {
        used.add(c.name);
        picks.push(c);
      }
    }
    setChoiceCards(picks);
    setChoiceSelectedIdx(null);
    setChoiceRerollsLeft(1);
    setScreen('EVENT_CARD_CHOICE');
  };

  const rerollCardChoice = () => {
    if (choiceRerollsLeft <= 0) return;
    setChoiceRerollsLeft(prev => prev - 1);
    const picks: CardDef[] = [];
    const used = new Set<string>();
    while (picks.length < 3) {
      const c = cloneCard(EVENT_CARD_POOL[Math.floor(Math.random() * EVENT_CARD_POOL.length)]);
      if (!used.has(c.name)) {
        used.add(c.name);
        picks.push(c);
      }
    }
    setChoiceCards(picks);
    setChoiceSelectedIdx(null);
    triggerSfx('play');
  };

  // --- Woodcarver Totem Event ---
  const initBuildTotem = () => {
    setIsEventBusy(false);
    setIsTotemFadingOut(false);
    setTotemChoicesHidden(false);
    setTotemStage('REWARD');
    setSelectedTotemRewardIdx(null);
    setAssemblyHeadIdx(null);
    setAssemblyBodyIdx(null);

    const tribes: Tribe[] = ["Reptile", "Insect", "Avian", "Canine", "Hooved"];
    const BANNED_TOTEM_SIGILS = new Set([
      'Amorphous',
      'Omnistrike',
      'Shadow',
      'Tidal Lock',
      'Made of Stone',
      'Blood Moon'
    ]);
    const sigils = Object.keys(SIGIL_MAPPING).filter(s => !BANNED_TOTEM_SIGILS.has(s));

    const choices: Array<{ type: 'head' | 'body'; value: string }> = [];
    while (choices.length < 3) {
      const isHead = Math.random() < 0.5;
      const val = isHead ? tribes[Math.floor(Math.random() * tribes.length)] : sigils[Math.floor(Math.random() * sigils.length)];
      if (!choices.some(c => c.type === (isHead ? 'head' : 'body') && c.value === val)) {
        choices.push({ type: isHead ? 'head' : 'body', value: val });
      }
    }
    setTotemRewardChoices(choices);
    setScreen('EVENT_BUILD_TOTEM');
  };

  // --- Dev Console Actions ---
  const handleDevForce = (type: string) => {
    setScreen('DUEL');
    addLog(`[DEV] Overriding sequence -> ${type.toUpperCase()}`);
    if (type === 'combat') startNextDuel(false);
    else if (type === 'boss' || type === 'boss-zealot') {
      setDuelsCompleted(5);
      startNextDuel('Zealot');
    } else if (type === 'boss-goobert') {
      setDuelsCompleted(11);
      startNextDuel('The Begotten');
    } else if (type === 'boss-bonelord') {
      setDuelsCompleted(17);
      startNextDuel('BoneLord');
    } else if (type === 'boss-woodcarver') {
      startNextDuel('The Weaver');
    }
    else if (type === 'items') startItemEvent();
    else if (type === 'campfire') initCampfire();
    else if (type === 'altar') initAltar();
    else if (type === 'carving') initTotemCarving();
    else if (type === 'cost') initCostBargain();
    else if (type === 'choice') initCardChoice();
    else if (type === 'bonelord') initBoneLord();
    else if (type === 'mycologist') initMycologists();
    else if (type === 'goobert') initGoobert();
    else if (type === 'cave') initCaveTrial();
    else if (type === 'totem') initBuildTotem();
  };

  const handleDevNewHand = () => {
    let sourcePool = masterDeck;
    if (sourcePool.length === 0) {
      sourcePool = [
        cloneCard(ALL_CARD_LOOKUP["Stoat"]),
        cloneCard(ALL_CARD_LOOKUP["Bullfrog"]),
        cloneCard(ALL_CARD_LOOKUP["Wolf"]),
        cloneCard(ALL_CARD_LOOKUP["Cat"]),
        cloneCard(ALL_CARD_LOOKUP["Warren"]),
      ];
      setMasterDeck(sourcePool);
    }

    const shuffled = sourcePool
      .map(c => applyPlayerTotem(cloneCard(c, ouroborosBuffs), activeTotem))
      .sort(() => Math.random() - 0.5);

    const newHand: CardDef[] = [applyPlayerTotem(cloneCard(TOKEN_SQUIRREL, ouroborosBuffs), activeTotem)];
    const oneBloodIdx = shuffled.findIndex(c => c.cost === 1);
    if (oneBloodIdx !== -1) {
      newHand.push(transformAmorphous(shuffled.splice(oneBloodIdx, 1)[0]));
    }
    while (newHand.length < 4 && shuffled.length > 0) {
      newHand.push(transformAmorphous(shuffled.pop()!));
    }

    setHand(newHand);
    setDeck(shuffled);
    setSelectedHandIndex(null);
    setBackupState(null);
    setPhase('PLAY');
    triggerSfx('draw');
    addLog("[DEV] Hand flushed: fresh full 4-card hand dealt from Master Deck.");
  };

  // --- Card Renderer with Full Animations ---
  const renderCard = (
    card: CardDef | null,
    options?: {
      isSelected?: boolean;
      isMarkedSacrifice?: boolean;
      isOpponent?: boolean;
      laneIndex?: number;
      isClickable?: boolean;
      onClick?: () => void;
      customScale?: string;
      showCost?: boolean;
      isAttacking?: boolean;
      attackDirection?: 'left' | 'right' | 'straight';
      isAirborneAttack?: boolean;
      isDirectAttack?: boolean;
      isDamaged?: boolean;
      isDestroyed?: boolean;
	  isSacrificing?: boolean;
      isSigilJittering?: boolean;
      isHpFlashing?: boolean;
      isDroppingQueue?: boolean;
      isDefending?: boolean;
      isZeroPowerShaking?: boolean;
      isQueue?: boolean;
      disableHoverScale?: boolean;
    }
  ) => {
    if (!card) return null;

    const isPlayer = !options?.isOpponent;
    const laneIndex = options?.laneIndex;

    // 1. Waterborne states
    const isWaterborne = card.sigils?.includes('Waterborne') || false;
    // Submerges strictly during the opponent's attack phase
    const isSubmergedActive =
      isWaterborne &&
      laneIndex !== undefined &&
      (options?.isOpponent ? phase !== 'ENEMY' : phase === 'ENEMY');

    // 2. Totem logic (active battle screen: player totem & boss totem)
    const isPlayerTotemAffected = screen === 'DUEL' && isPlayer && !!(activeTotem?.head && activeTotem?.body && (card.class === activeTotem.head || card.class === "ALL Classes"));
    const isBossTotemAffected = screen === 'DUEL' && !isPlayer && !!(bossTotem?.class && (card.class === bossTotem.class || card.class === "ALL Classes"));
    const isTotemAffected = isPlayerTotemAffected || isBossTotemAffected;

    if (isPlayerTotemAffected && activeTotem.body && !card.sigils.includes(activeTotem.body)) {
      card.sigils = [...card.sigils, activeTotem.body];
    }
    if (isBossTotemAffected && bossTotem?.sigil && !card.sigils.includes(bossTotem.sigil)) {
      card.sigils = [...card.sigils, bossTotem.sigil];
    }

    // 3. Attack numbers
    const hasShadow = card.sigils?.includes('Shadow');
    const displayAttack = !options?.isQueue && laneIndex !== undefined 
      ? getCardAttack(card, laneIndex, isPlayer) 
      : getCardAttack(card);
    const baseStatCompare = card.attack || 0;
    const isBuffed = baseStatCompare < displayAttack;
    const isDebuffed = baseStatCompare > displayAttack;

    let isStinkyDebuffed = false;
    if (!options?.isQueue && laneIndex !== undefined) {
      const oppBoard = isPlayer ? enemyBoard : playerBoard;
      const oppCard = oppBoard[laneIndex] || oppBoard.find(c => c?.isMassive);
      if (oppCard?.sigils.includes('Stinky') && !card.sigils.includes('Made of Stone')) {
        isStinkyDebuffed = true;
      }
    }

    // 4. Alpha-hugging drop-shadow styling (submerged & goobert cards carry natural paper drops, no neon aura)
    let borderStyle = isTotemAffected
      ? '[filter:drop-shadow(0_0_2px_#93c5fd)_drop-shadow(0_0_5px_#3b82f6)_drop-shadow(0_0_10px_rgba(29,78,216,0.85))]'
      : options?.isOpponent
          ? '[filter:drop-shadow(0_4px_8px_rgba(0,0,0,0.85))] hover:[filter:drop-shadow(0_6px_12px_rgba(185,28,28,0.5))]'
          : '[filter:drop-shadow(0_4px_8px_rgba(0,0,0,0.85))] hover:[filter:drop-shadow(0_6px_14px_rgba(217,119,6,0.4))]';

    if (options?.isSelected) {
      borderStyle = options?.disableHoverScale
        ? '[filter:drop-shadow(0_0_3px_#fef08a)_drop-shadow(0_0_8px_#eab308)_drop-shadow(0_0_16px_rgba(217,119,6,0.85))] z-40 brightness-105'
        : '[filter:drop-shadow(0_0_3px_#fef08a)_drop-shadow(0_0_8px_#eab308)_drop-shadow(0_0_16px_rgba(217,119,6,0.85))] -translate-y-3.5 z-40 scale-[1.03] brightness-105';
    }
    if (options?.isMarkedSacrifice) {
      borderStyle = '[filter:drop-shadow(0_0_3px_#fca5a5)_drop-shadow(0_0_8px_#ef4444)_drop-shadow(0_0_16px_rgba(220,38,38,0.9))] animate-sacrifice-shake z-40';
    }

    const isSummoning = card.id ? summonedCardIds.has(card.id) : false;
    const lateralDelta = card.id ? lateralMovements[card.id] : undefined;

    let animClass = '';
    if (options?.isAttacking) {
      const dir = options.attackDirection || 'straight';
      if (options.isOpponent) {
        if (dir === 'left') {
          animClass = 'animate-lunge-e-left z-50';
        } else if (dir === 'right') {
          animClass = 'animate-lunge-e-right z-50';
        } else if (options.isAirborneAttack) {
          animClass = 'animate-lunge-e-airborne z-50';
        } else if (options.isDirectAttack) {
          animClass = 'animate-lunge-e-direct z-50';
        } else {
          animClass = 'animate-lunge-e-straight z-50';
        }
      } else {
        if (dir === 'left') {
          animClass = 'animate-lunge-p-left z-50';
        } else if (dir === 'right') {
          animClass = 'animate-lunge-p-right z-50';
        } else if (options.isAirborneAttack) {
          animClass = 'animate-lunge-p-airborne z-50';
        } else if (options.isDirectAttack) {
          animClass = 'animate-lunge-p-direct z-50';
        } else {
          animClass = 'animate-lunge-p-straight z-50';
        }
      }
    } else if (options?.isZeroPowerShaking) {
      animClass = 'animate-zero-power-shake z-45';
	} else if (options?.isSacrificing) {
      animClass = 'animate-sacrifice-collapse z-40';
    } else if (options?.isDestroyed) {
      animClass = 'animate-destroy-dissolve z-40';
    } else if (options?.isDamaged) {
      animClass = 'animate-damage-shake z-45';
    } else if (options?.isSigilJittering) {
      animClass = 'animate-sigil-jitter z-45';
    } else if (isSummoning) {
      animClass = 'animate-summon-wipe';
   } else if (options?.isDroppingQueue) {
      animClass = 'card-dropping-queue';
    }

    // Check if card is flipping through an evolution sequence
    const isPlayerCard = !options?.isOpponent;
    const activeEvolve = laneIndex !== undefined && !options?.isQueue
      ? evolvingCards.find(e => e.isPlayer === isPlayerCard && e.lane === laneIndex)
      : null;
    if (activeEvolve && activeEvolve.phase === 'up') {
      animClass = 'animate-flip-up z-40';
    }

    if (options?.isDefending && !options?.isDamaged) {
      borderStyle += ' ring-2 ring-red-600/70 shadow-[0_0_15px_rgba(239,68,68,0.7)]';
    }

    const cardStyle: React.CSSProperties = lateralDelta !== undefined ? {
        transform: `translateX(calc((100% + 0.5rem) * ${lateralDelta}))`,
        transition: 'transform 0.25s cubic-bezier(0.2, 0.8, 0.2, 1)',
        zIndex: 35,
      } : {};

    // Resurface animation plays strictly when entering owner's turn phase, never during combat
    const waterborneClass =
      isWaterborne &&
      !isSubmergedActive &&
      laneIndex !== undefined &&
      !options?.isOpponent &&
      phase === 'DRAW'
        ? 'animate-flip-up'
        : '';

    // Decoupled hover transform: hand cards can inspect/zoom, but board cards remain planted on the table
      const shouldHover = options?.isClickable !== false && !options?.disableHoverScale && !options?.isOpponent && !options?.isSelected && laneIndex === undefined;
	  
    // Aged cardboard pulp texture with radial grain and inner rim burn
    let parchmentGradient = 'radial-gradient(circle at 50% 30%, #d8b88a 0%, #c29e6b 70%, #9e7b4c 100%)';
    let parchmentShadow = 'inset 0 0 10px rgba(45, 25, 10, 0.5), inset 0 0 2px rgba(0,0,0,0.8), 0 4px 12px rgba(0,0,0,0.75)';

    // Cards flip face-down showing strictly the raw card back asset (Waterborne or evolving Phase 1)
    const isMassiveEvolvingFaceDown = laneIndex !== undefined && !options?.isQueue
      ? evolvingCards.some(e => e.isPlayer === !options?.isOpponent && e.lane === laneIndex && e.phase === 'down')
      : false;

    if (isSubmergedActive || isMassiveEvolvingFaceDown) {
      parchmentGradient = 'radial-gradient(circle at 50% 30%, #87a7ab 0%, #5d878e 70%, #3f656b 100%)';
      parchmentShadow = 'inset 0 0 10px rgba(25, 55, 60, 0.6), inset 0 0 2px rgba(0,0,0,0.8), 0 4px 12px rgba(0,0,0,0.75)';
    } else if (card.isSacrifice && card.name !== 'Squirrel') {
      parchmentGradient = 'radial-gradient(circle at 50% 30%, #caa885 0%, #b08a5f 70%, #856138 100%)';
      parchmentShadow = 'inset 0 0 10px rgba(45, 25, 10, 0.6), inset 0 0 2px rgba(0,0,0,0.8), 0 4px 12px rgba(0,0,0,0.75)';
    } else if (card.isGoobertClone) {
      parchmentGradient = 'radial-gradient(circle at 50% 30%, #b8caa0 0%, #90aa6e 70%, #6e884d 100%)';
      parchmentShadow = 'inset 0 0 10px rgba(56, 79, 34, 0.5), inset 0 0 2px rgba(0,0,0,0.8), 0 4px 12px rgba(0,0,0,0.75)';
    } else if (card.isMycologistCombined) {
      parchmentGradient = 'radial-gradient(circle at 50% 30%, #ceb6d2 0%, #aa81b2 70%, #83568c 100%)';
      parchmentShadow = 'inset 0 0 10px rgba(75, 40, 82, 0.5), inset 0 0 2px rgba(0,0,0,0.8), 0 4px 12px rgba(0,0,0,0.75)';
    } else if (options?.isOpponent) {
      parchmentGradient = 'radial-gradient(circle at 50% 30%, #c5a786 0%, #ad8861 70%, #8a643d 100%)';
      parchmentShadow = 'inset 0 0 10px rgba(45, 25, 10, 0.5), inset 0 0 2px rgba(0,0,0,0.8), 0 4px 12px rgba(0,0,0,0.75)';
    }

    const cardCombinedStyle: React.CSSProperties = {
      background: parchmentGradient,
      boxShadow: parchmentShadow,
    };

    // Display all active sigils (dynamically scaled up to 8 medallions)
    const allSigils = card.sigils || [];
    const displaySigils = allSigils.slice(0, 8);

    // Full pre-rendered massive card bypass (Blood Moon)
    const isBloodMoon =
      card.name?.toLowerCase().includes('moon') ||
      card.id?.toLowerCase().includes('moon');

    if (isBloodMoon) {
      return (
        <div
          key={card.id || `${card.name}-${options?.laneIndex ?? 0}`}
          onClick={options?.onClick}
          style={cardStyle}
          className={`relative inline-block w-[112px] h-[160px] shrink-0 select-none ${
            options?.onClick || options?.isClickable ? 'cursor-pointer' : ''
          } ${options?.customScale || ''}`}
        >
          <div
            className={`relative w-full h-full box-border rounded-sm select-none overflow-visible bg-cover bg-center transform-gpu origin-bottom ${
              shouldHover
                ? 'transition-transform duration-200 ease-out will-change-transform hover:scale-105 hover:-translate-y-2 hover:z-30 cursor-pointer'
                : 'transition-transform duration-200 ease-out'
            } ${borderStyle} ${animClass}`}
            style={{
              backgroundImage: `url(${bloodMoonImg})`,
              backgroundSize: '100% 100%',
            }}
          >
            {/* Blood Moon Sigil Array with Hover Zoom (No Modal Tooltip) */}
            <div className="absolute bottom-[22%] left-0 right-0 flex items-center justify-center gap-1 px-1 z-30 pointer-events-auto">
              {(card.sigils || []).map((sigil: any, idx: number) => {
                const sigilName = typeof sigil === 'string' ? sigil : sigil?.name || '';
                const cleanKey = sigilName.toLowerCase().replace(/[\s_]+/g, '');
                const iconSrc = typeof sigil === 'object' && sigil?.icon 
                  ? sigil.icon 
                  : (typeof (window as any).SIGIL_ICONS !== 'undefined' && (window as any).SIGIL_ICONS[sigilName])
                    ? (window as any).SIGIL_ICONS[sigilName]
                    : `${BASE}/assets/sigils/${sigilName.toLowerCase().replace(/\s+/g, '_')}.png`;

                return (
                  <div
                    key={`${sigilName}-${idx}`}
                    title={`${sigilName}: ${SIGIL_DESCRIPTIONS[sigilName] || 'A dark, inscrutable power.'}`}
                    className="relative z-10 transition-transform duration-150 ease-out hover:scale-135 hover:z-40 origin-center cursor-help drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]"
                  >
                    <img
                      src={iconSrc}
                      alt={sigilName}
                      className="w-[22px] h-[22px] object-contain select-none pointer-events-none"
                      onError={(e) => {
                        // Fallback to text icon if PNG asset path differs
                        const target = e.currentTarget;
                        target.style.display = 'none';
                        if (target.nextElementSibling) {
                          (target.nextElementSibling as HTMLElement).style.display = 'block';
                        }
                      }}
                    />
                    <span className="hidden text-xs filter sepia-[0.8] select-none pointer-events-none">
                      {(typeof (window as any).SIGIL_MAPPING !== 'undefined' && (window as any).SIGIL_MAPPING[sigilName]) || '⭐'}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Dynamic Health Socket for Blood Moon */}
            <div className="absolute bottom-[4.2%] right-[5%] w-[23%] h-[16%] flex items-center justify-center pointer-events-none z-20">
              <span className="font-['Cinzel',_serif] font-black text-sm text-red-500 drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]">
                {card.health}
              </span>
            </div>
          </div>
        </div>
      );
    }

    // Cards flip face-down showing strictly the raw card back asset (Waterborne or evolving Phase 1)
    const isEvolvingFaceDown = laneIndex !== undefined && !options?.isQueue
      ? evolvingCards.some(e => e.isPlayer === !options?.isOpponent && e.lane === laneIndex && e.phase === 'down')
      : false;

    if (isSubmergedActive || isEvolvingFaceDown) {
      return (
        <div
          key={`${card.id || card.name}-submerged-${options?.laneIndex ?? laneIndex ?? 0}`}
          onClick={options?.onClick}
          style={cardStyle}
          className={`relative inline-block w-[112px] h-[160px] shrink-0 select-none ${
            options?.onClick || options?.isClickable ? 'cursor-pointer' : ''
          } ${options?.customScale || ''}`}
        >
          <div
            className={`relative w-full h-full box-border rounded-sm select-none bg-contain bg-no-repeat bg-center overflow-hidden transform-gpu origin-bottom animate-flip-down ${
              shouldHover
                ? 'transition-transform duration-200 ease-out will-change-transform hover:scale-105 hover:-translate-y-2 hover:z-30 cursor-pointer'
                : 'transition-transform duration-200 ease-out'
            } ${borderStyle} ${animClass}`}
            style={{
              backgroundImage: `url(${BASE}/assets/cardbases/cardbacks.png)`,
              backgroundSize: '100% 100%',
            }}
          />
        </div>
      );
    }

    // Determine the appropriate card base texture
    const activeCardBase = card.isMycologistCombined
      ? `${BASE}/assets/cardbases/combined-card-base.png`
      : card.isGoobertClone
        ? `${BASE}/assets/cardbases/duplicate-card-base.png`
        : hasMoreSigilsThanOriginal(card)
          ? `${BASE}/assets/cardbases/bestowed-card-base.png`
          : `${BASE}/assets/cardbases/card_base.png`;

    return (
      <div
        key={card.id || `${card.name}-${options?.laneIndex ?? 0}`}
        onClick={options?.onClick}
        style={cardStyle}
        className={`relative inline-block w-[112px] h-[160px] shrink-0 select-none ${
          options?.onClick || options?.isClickable ? 'cursor-pointer' : ''
        } ${options?.customScale || ''}`}
      >
        <div
            className={`relative w-full h-full box-border select-none bg-contain bg-no-repeat bg-center ${
              animClass
                ? 'transition-none'
                : shouldHover
                  ? 'transition-transform duration-200 ease-out will-change-transform hover:scale-105 hover:-translate-y-2 hover:z-30 cursor-pointer'
                  : 'transition-transform duration-200 ease-out'
            } ${borderStyle} ${animClass} ${waterborneClass}`}
            style={{
              backgroundImage: `url(${activeCardBase})`,
              backgroundSize: '100% 100%',
            }}
          >
          {/* --- TOP HEADER (8% - 18%) --- */}
          {/* Bone Cost: Top Left (Shifted down to clear header text into the arch shoulder) */}
            {options?.showCost !== false && card.boneCost !== undefined && card.boneCost > 0 && (
              <div className="absolute top-[14.5%] left-[6.5%] flex flex-col items-center justify-center pointer-events-none z-10 leading-none">
                <span className="text-[10px] leading-none filter brightness-75 select-none">🦴</span>
                <span
                  className="text-[10px] font-black font-mono tracking-tighter leading-none mt-0.5 select-none"
                  style={{
                    color: '#0f0e0c',
                    WebkitTextFillColor: '#0f0e0c',
                    textShadow: 'none',
                  }}
                >
                  {card.boneCost}
                </span>
              </div>
            )}

            {/* Card Name: Center Header (Rich charcoal grey, retaining heavy stroke & depth) */}
            <div className="absolute top-[7%] left-[7%] right-[11%] h-[17px] flex items-center justify-center overflow-hidden pointer-events-none z-10">
              <span
                style={{
                  color: '#262422',
                  WebkitTextFillColor: '#262422',
                  WebkitTextStroke: '0.35px #262422',
                  textShadow: '0 1px 1px rgba(0, 0, 0, 0.3)',
                  fontWeight: 900,
                }}
                className={`font-['Cinzel',_serif] font-black uppercase text-center whitespace-nowrap leading-none pointer-events-none select-none ${
                  card.name.length >= 15
                    ? 'text-[7px] tracking-tighter'
                    : card.name.length >= 13
                    ? 'text-[8px] tracking-tight'
                    : card.name.length >= 11
                    ? 'text-[8.5px] tracking-tight'
                    : card.name.length >= 9
                    ? 'text-[9.5px] tracking-normal'
                    : card.name.length >= 7
                    ? 'text-[11px] tracking-normal'
                    : 'text-[12px] tracking-[0.02em]'
                }`}
              >
                {card.name}
              </span>
            </div>

          {/* Blood Cost: Vertical Stack Top Right (extra clearance between 2nd & 3rd drops) */}
          {options?.showCost !== false && card.cost !== undefined && card.cost > 0 && (
            <div className="absolute top-[8%] right-[7%] flex flex-col items-center pointer-events-none z-10">
              {Array.from({ length: card.cost }).map((_, i) => (
                <span
                  key={i}
                  className={`text-red-700 text-[10px] leading-[9px] filter drop-shadow-[0_1px_1px_rgba(0,0,0,0.6)] select-none ${
                    i === 2 ? 'mt-[2px]' : ''
                  }`}
                >
                  🩸
                </span>
              ))}
            </div>
          )}

         {/* --- ARCH WINDOW (Lowered to 24.5% to center in the stone frame) --- */}
          <div className="absolute top-[24.5%] left-[19.5%] w-[61%] h-[40.5%] flex items-center justify-center overflow-hidden pointer-events-none z-10">
            <img
              src={getCardArtUrl(card)}
              alt={card.name}
              className={`max-w-[88%] max-h-[88%] w-auto h-auto object-contain pointer-events-none select-none transition-transform ${
                CARD_ART_OFFSETS[card.name] || ''
              } ${(() => {
                const isDirectionalBeast = ['Elk', 'Elk Fawn', 'Pronghorn', 'Moose Buck', 'Demon Elk'].some(n => card.name?.includes(n));
                
                // Never flip in hand, deck inspection, or outside the combat lanes
                if (!isDirectionalBeast || options?.laneIndex === undefined) {
                  return card.isMycologistCombined ? 'scale-110' : '';
                }

                // If sprintDir is unset (freshly played), default to right (+1) unless dropped into lane 3
                const currentDir = card.sprintDir ?? (options.laneIndex === 3 ? -1 : 1);

                // Base sprite faces RIGHT: only mirror horizontally when travelling LEFT (-1)
                const shouldFlip = currentDir === -1;

                if (shouldFlip) {
                  return card.isMycologistCombined ? '-scale-x-110 scale-y-110' : '-scale-x-100';
                }
                return card.isMycologistCombined ? 'scale-110' : '';
              })()}`}
              style={{
                imageRendering: 'pixelated',
                filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.5))',
              }}
              draggable={false}
              onError={(e) => {
                const img = e.target as HTMLImageElement;
                const literalSlug = toAssetSlug(card.name);
                const literalUrl = `${BASE}/assets/cardart/${literalSlug}.png`;

                // If the alias lookup failed, try the raw name before giving up
                if (!img.dataset.triedLiteral && img.src !== literalUrl) {
                  img.dataset.triedLiteral = 'true';
                  img.src = literalUrl;
                  return;
                }

                img.style.display = 'none';
                if (img.parentElement) {
                  const fallback = document.createElement('span');
                  fallback.className = 'text-3xl select-none flex items-center justify-center';
                  fallback.innerText = card.emoji;
                  img.parentElement.appendChild(fallback);
                }
              }}
            />
          </div>
          {/* --- ACTIVE SIGIL MEDALLIONS (Single row for 1–5, staggered 2-tier for 6–8) --- */}
            <div
              className={`absolute left-0 right-0 z-20 pointer-events-none flex justify-center items-center -translate-y-[2px] ${
                displaySigils.length >= 6
                  ? 'top-[65%] max-w-[88%] mx-auto flex-wrap gap-x-1 gap-y-0.5'
                  : `top-[71%] ${displaySigils.length >= 4 ? 'gap-0.5' : displaySigils.length >= 2 ? 'gap-1' : ''}`
              }`}
            >
            {displaySigils.map((s, idx) => {
              const medallionSizeClass =
                displaySigils.length >= 6
                  ? 'w-[15px] h-[15px]'
                  : displaySigils.length === 5
                  ? 'w-[15px] h-[15px]'
                  : displaySigils.length === 4
                  ? 'w-[17px] h-[17px]'
                  : displaySigils.length === 3
                  ? 'w-[20px] h-[20px]'
                  : displaySigils.length === 2
                  ? 'w-[24px] h-[24px]'
                  : 'w-[26px] h-[26px]';

              const isOnField = options?.laneIndex !== undefined && !options?.isQueue;
                const isArmorSigil = s === 'Armored';
                const isArmorBroken = isArmorSigil && Boolean(card.shieldBroken) && isOnField;
                const isArmorActive = isArmorSigil && !card.shieldBroken && isOnField;

                const armorTitle = isArmorActive
                  ? "Armored (Active): Negates the next instance of damage taken."
                  : isArmorBroken
                  ? "Armored (Broken): Armor was shattered; absorbs no further damage."
                  : `${s}: ${SIGIL_DESCRIPTIONS[s] || ''}`;

                const medallionBorderClass = isArmorActive
                  ? 'border-amber-400/90 bg-[#2b1d11] shadow-[0_0_8px_rgba(251,191,36,0.65),inset_0_1px_2px_rgba(255,255,255,0.25)]'
                  : isArmorBroken
                  ? 'border-stone-800 bg-[#120e0c] opacity-35 grayscale shadow-none'
                  : 'bg-[#1c1815] border-[#3d271d] shadow-[inset_0_1px_2px_rgba(0,0,0,0.8)]';

                return (
                  <div
                    key={`sigil-${s}-${idx}`}
                    title={armorTitle}
                    className={`${medallionSizeClass} relative shrink-0 rounded-full border flex items-center justify-center overflow-hidden pointer-events-auto cursor-help transition-all duration-150 ease-out hover:scale-135 hover:z-40 origin-center drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)] ${medallionBorderClass}`}
                  >
                    <img
                      src={getSigilArtUrl(s)}
                      alt={s}
                      className="w-full h-full object-contain"
                      style={{ imageRendering: 'pixelated' }}
                      onError={(e) => {
                        const target = e.target as HTMLElement;
                        target.style.display = 'none';
                        if (target.parentElement) {
                          const fallback = document.createElement('span');
                          fallback.className = `${displaySigils.length >= 4 ? 'text-[8px]' : displaySigils.length >= 3 ? 'text-[9px]' : 'text-[11px]'} leading-none`;
                          fallback.innerText = SIGIL_MAPPING[s] || '•';
                          target.parentElement.appendChild(fallback);
                        }
                      }}
                    />
                    {isArmorBroken && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none">
                        <span className="text-[12px] font-black text-red-600/90 leading-none drop-shadow-[0_1px_1px_#000]">
                          ✕
                        </span>
                      </div>
                    )}
                  </div>
                );
            })}
          </div>

          {/* --- BOTTOM STAT SOCKETS (Centered inside stone wells at 87%) --- */}
          {/* Attack (Left Medallion) */}
          <div className="absolute bottom-[3.5%] left-[4.5%] w-[23%] h-[16%] flex items-center justify-center pointer-events-none z-20">
            <span
              className={`font-['Cinzel',_serif] font-black text-sm leading-none pointer-events-none ${
                hasShadow
                  ? 'text-purple-950 drop-shadow-[0_0_6px_rgba(168,85,247,0.7)]'
                  : !hasShadow && (isStinkyDebuffed || isDebuffed)
                  ? 'text-red-700 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]'
                  : isBuffed
                  ? 'text-emerald-400 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]'
                  : 'text-stone-100 drop-shadow-[0_1px_2px_rgba(0,0,0,0.95)]'
              }`}
            >
              {displayAttack}
            </span>
          </div>

          {/* Health (Right Medallion) - wrapped in a protective gold ring only while Armor is active on the field */}
            <div
              className={`absolute bottom-[3.5%] right-[4.5%] w-[23%] h-[16%] rounded-full flex items-center justify-center pointer-events-none z-20 transition-all duration-200 ${
                options?.laneIndex !== undefined && !options?.isQueue && card.sigils?.includes('Armored') && !card.shieldBroken
                  ? 'ring-2 ring-amber-400/80 shadow-[0_0_8px_rgba(251,191,36,0.55)]'
                  : ''
              }`}
            >
            <span
              className={`font-['Cinzel',_serif] font-black text-sm leading-none pointer-events-none ${
                hasShadow
                  ? 'text-purple-950 drop-shadow-[0_0_6px_rgba(168,85,247,0.7)]'
                  : options?.isHpFlashing
                  ? 'hp-flash text-red-600 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]'
                  : card.health < (ALL_CARD_LOOKUP[card.name]?.health ?? card.health)
                  ? 'text-red-600 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]'
                  : 'text-stone-100 drop-shadow-[0_1px_2px_rgba(0,0,0,0.95)]'
              }`}
            >
              {card.health}
            </span>
          </div>
        </div>
      </div>
    );
  };

    return (
      <div
        id="game-viewport"
        style={{
        position: 'fixed',
        inset: 0,
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
        backgroundColor: '#000',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
        <style>{`* { scrollbar-width: none !important; -ms-overflow-style: none !important; } *::-webkit-scrollbar { display: none !important; }`}</style>
        {/* Secret 5-Tap Trigger */}
        <div
          onClick={handleSecretDevTap}
          className="fixed top-0 left-0 w-14 h-14 z-[9999] cursor-default select-none pointer-events-auto"
        />
        <div
          id="game-container"
          ref={gameContainerRef}
        style={{
          width: 1280,
          height: 720,
          transform: `scale(${canvasScale})`,
          transformOrigin: 'center center',
          flexShrink: 0,
          overflow: 'hidden',
          position: 'relative',
          backgroundColor: '#140e0a',
        }}
      >
        <style>{`
            /* Occult Billowing Smoke: Multi-Tiered Organic Cloud Motion */
            @keyframes smokeBankRollInLeft {
              0% { transform: translateX(-100%) scale(0.92); opacity: 0; }
              35% { opacity: 0.95; }
              100% { transform: translateX(0%) scale(1); opacity: 1; }
            }
            @keyframes smokeBankRollInRight {
              0% { transform: translateX(100%) scale(0.92); opacity: 0; }
              35% { opacity: 0.95; }
              100% { transform: translateX(0%) scale(1); opacity: 1; }
            }
            @keyframes smokePuffSwirlIn {
              0% { transform: scale(0.4) rotate(-30deg); opacity: 0; }
              60% { opacity: 0.9; }
              100% { transform: scale(1) rotate(0deg); opacity: 1; }
            }

            @keyframes smokeBankDisperseLeft {
              0% { transform: translateX(0%) scale(1) translateY(0); opacity: 1; }
              50% { opacity: 0.85; }
              100% { transform: translateX(-90%) scale(1.15) translateY(-30px); opacity: 0; }
            }
            @keyframes smokeBankDisperseRight {
              0% { transform: translateX(0%) scale(1) translateY(0); opacity: 1; }
              50% { opacity: 0.85; }
              100% { transform: translateX(90%) scale(1.15) translateY(-30px); opacity: 0; }
            }
            @keyframes smokePuffSwirlOut {
              0% { transform: scale(1) rotate(0deg); opacity: 1; }
              100% { transform: scale(1.4) rotate(45deg) translateY(-40px); opacity: 0; }
            }

            @keyframes smokeSootVeilIn {
              0% { opacity: 0; }
              60% { opacity: 0.6; }
              100% { opacity: 0.98; }
            }
            @keyframes smokeSootVeilOut {
              0% { opacity: 0.98; }
              40% { opacity: 0.6; }
              100% { opacity: 0; }
            }

            @keyframes smokeEmberDrift {
              0% { transform: translateY(20px) scale(0.8); opacity: 0; }
              30% { opacity: 1; }
              100% { transform: translateY(-40px) scale(1.2); opacity: 0; }
            }
          @keyframes deckDrawBreathing {
            0%, 100% {
              filter: drop-shadow(0 0 6px rgba(245, 158, 11, 0.7)) drop-shadow(0 0 16px rgba(217, 119, 6, 0.5));
              box-shadow: 0 0 18px rgba(245, 158, 11, 0.55), inset 0 0 8px rgba(245, 158, 11, 0.3);
              border-color: #fbbf24;
            }
            50% {
              filter: drop-shadow(0 0 12px rgba(251, 191, 36, 0.95)) drop-shadow(0 0 28px rgba(245, 158, 11, 0.85));
              box-shadow: 0 0 32px rgba(245, 158, 11, 0.85), inset 0 0 14px rgba(251, 191, 36, 0.5);
              border-color: #fef08a;
            }
          }
          .animate-deck-glow {
            animation: deckDrawBreathing 3.6s ease-in-out infinite;
          }
          @keyframes menuFadeIn {
            0% { opacity: 0; }
            100% { opacity: 1; }
          }
          @keyframes menuFadeOut {
              0% { opacity: 1; }
              100% { opacity: 0; }
            }
            .animate-menu-fade-in {
              animation: menuFadeIn 0.2s ease-out forwards;
            }
            .animate-menu-fade-out {
              animation: menuFadeOut 0.2s ease-in forwards;
              pointer-events: none;
            }
          @keyframes splashOccultPulse {
          0%, 100% {
            filter: drop-shadow(0 0 12px rgba(239, 68, 68, 0.6)) drop-shadow(0 0 32px rgba(153, 27, 27, 0.45));
            opacity: 0.95;
          }
          50% {
            filter: drop-shadow(0 0 24px rgba(248, 113, 113, 0.9)) drop-shadow(0 0 54px rgba(220, 38, 38, 0.65));
            opacity: 1;
          }
        }
        @keyframes splashPentagramRotate {
          0%, 100% { transform: rotate(0deg) scale(1); opacity: 0.28; }
          50% { transform: rotate(5deg) scale(1.03); opacity: 0.42; }
        }
        @keyframes splashCandleBreath {
          0%, 100% { transform: scale(1); opacity: 0.4; }
          50% { transform: scale(1.06); opacity: 0.65; }
        }
        .animate-occult-pulse {
          animation: splashOccultPulse 4.5s ease-in-out infinite;
        }
        .animate-candle-breath {
          animation: splashCandleBreath 6s ease-in-out infinite;
        }
        .animate-pentagram-rotate {
          animation: splashPentagramRotate 16s ease-in-out infinite;
        }
      }
        `}</style>

        {/* Volumetric Occult Smoke Cloud Transition Overlay */}
        <SmokeTransitionOverlay phase={smokePhase} />

        {/* Active Stage Screen Container */}
        <div
          ref={screenStageRef}
          style={{
            position: 'relative',
            width: '100%',
            height: '100%',
            zIndex: 20,
            transform: 'translateZ(0)',
            backfaceVisibility: 'hidden',
          }}
          className={`flex flex-col text-slate-200 overflow-hidden font-sans select-none image-rendering-pixelated ${getStageBgClass(stage, isBossMatch)} ${isTutorialGlitching ? 'animate-tutorial-glitch' : ''}`}
        >
        {/* =========================================================================
            SPLASH SCREEN
           ========================================================================= */}
        {screen === 'SPLASH' && (
        <div 
          className="absolute inset-0 z-50 flex flex-col items-center justify-center p-4 overflow-hidden select-none animate-fade-up"
          style={getScreenBgStyle('splash.png')}
        >
          {/* Blood-Red Tabletop Vignette & Subtle CRT Scanlines */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_15%,rgba(14,4,4,0.85)_70%,rgba(0,0,0,0.98)_100%)] pointer-events-none z-10" />
          <div
            className="absolute inset-0 pointer-events-none z-10 opacity-20"
            style={{
              backgroundImage: 'repeating-linear-gradient(0deg, rgba(0,0,0,0.6) 0px, rgba(0,0,0,0.6) 1px, transparent 1px, transparent 3px)',
            }}
          />
          {/* Eerie Candle/Ritual Backlight Glow */}
          <div className="absolute w-[520px] h-[320px] rounded-full bg-red-900/20 blur-[100px] pointer-events-none z-10 animate-candle-breath" />
          
          {/* Centered Glowing Stylized SVG Pentagram with Esoteric Runes */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
            <div className="w-[420px] h-[420px] sm:w-[500px] sm:h-[500px] md:w-[560px] md:h-[560px] animate-pentagram-rotate">
              <svg viewBox="0 0 200 200" className="w-full h-full text-red-900/45 filter drop-shadow-[0_0_18px_rgba(185,28,28,0.45)]">
              {/* Main Outer Runes Border Ring */}
              <circle cx="100" cy="100" r="94" fill="none" stroke="currentColor" strokeWidth="1.2" />
              <circle cx="100" cy="100" r="90" fill="none" stroke="currentColor" strokeWidth="0.8" strokeDasharray="3, 4" />
              
              {/* Inner Pentagram Star Lines */}
              <circle cx="100" cy="100" r="76" fill="none" stroke="currentColor" strokeWidth="1.0" />
              <path 
                d="M 100 24 L 144.7 161.4 L 27.6 76.4 L 172.4 76.4 L 55.3 161.4 Z" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="1.2" 
                strokeLinejoin="round" 
              />
              <circle cx="100" cy="100" r="32" fill="none" stroke="currentColor" strokeWidth="0.6" strokeDasharray="4, 6" />
            </svg>
            </div>
          </div>

          <div className="relative z-20 flex flex-col items-center justify-center text-center max-w-4xl w-full mx-auto my-auto">
  
  {/* Direct, Frame-less High-Fidelity ASCII Title Display */}
  <div className="flex flex-col items-center justify-center w-full px-2">
  {/* THREAD */}
  <pre className="text-red-500 font-bold animate-occult-pulse text-[5px] sm:text-[7.5px] md:text-[9.5px] lg:text-[11px] whitespace-pre font-mono leading-none inline-block text-left mx-auto select-none tracking-normal">
{`    ███        ▄█    █▄       ▄████████    ▄████████    ▄████████ ████████▄  
▀█████████▄   ███    ███     ███    ███   ███    ███   ███    ███ ███   ▀███ 
   ▀███▀▀██   ███    ███     ███    ███   ███    █▀    ███    ███ ███    ███ 
    ███   ▀  ▄███▄▄▄▄███▄▄  ▄███▄▄▄▄██▀  ▄███▄▄▄       ███    ███ ███    ███ 
    ███     ▀▀███▀▀▀▀███▀  ▀▀███▀▀▀▀▀   ▀▀███▀▀▀     ▀███████████ ███    ███ 
    ███       ███    ███   ▀███████████   ███    █▄    ███    ███ ███    ███ 
    ███       ███    ███     ███    ███   ███    ███   ███    ███ ███   ▄███ 
   ▄████▀     ███    █▀      ███    ███   ██████████   ███    █▀  ████████▀  
    ██                       ███    ███                                      `}
  </pre>

  {/* & (Centered) */}
  <pre className="text-red-500 font-bold animate-occult-pulse text-[5px] sm:text-[7.5px] md:text-[9.5px] lg:text-[11px] whitespace-pre font-mono leading-none inline-block text-left mx-auto select-none tracking-normal my-2">
{`    ▄▄▄▄     
   ██  ██    
   ▀██▄█▀    
   ▄████▄▄█▀ 
   ██▀  ██▄   
   ▀█▄▄██▀▀█▄ `}
  </pre>

  {/* BONES (Centered) */}
  <pre className="text-red-600 font-bold animate-occult-pulse text-[5px] sm:text-[7.5px] md:text-[9.5px] lg:text-[11px] whitespace-pre font-mono leading-none inline-block text-left mx-auto select-none tracking-normal">
{`  ▀█████████▄   ▄██████▄  ███▄▄▄▄      ▄████████    ▄████████ 
    ███    ███ ███    ███ ███▀▀▀██▄   ███    ███   ███    ███ 
    ███    ███ ███    ███ ███   ███   ███    █▀    ███    █▀  
   ▄███▄▄▄██▀  ███    ███ ███   ███  ▄███▄▄▄       ███        
  ▀▀███▀▀▀██▄  ███    ███ ███   ███ ▀▀███▀▀▀     ▀███████████ 
    ███    ██▄ ███    ███ ███   ███   ███    █▄           ███ 
    ███    ███ ███    ███ ███   ███   ███    ███    ▄█    ███ 
  ▄█████████▀   ▀██████▀   ▀█   █▀    ██████████  ▄████████▀  `}
  </pre>
</div>

  {/* Persistent Discord Link (Cryptographically Gated) */}
   <a
     href={unlockedDiscordUrl || "#"}
     target={unlockedDiscordUrl ? "_blank" : undefined}
     rel={unlockedDiscordUrl ? "noopener noreferrer" : undefined}
     onClick={handleDiscordClick}
     className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 transition-transform duration-150 hover:scale-110 active:scale-95 drop-shadow-[0_0_10px_rgba(239,68,68,0.6)] cursor-pointer"
     title={unlockedDiscordUrl ? "[SIDE HUSTLE]" : "[SEALED RITUAL]"}
   >
     <img
       src={discordGif}
       alt="Discord Community"
       className={`w-11 h-11 sm:w-14 sm:h-14 object-contain [image-rendering:pixelated] ${
         !unlockedDiscordUrl ? 'brightness-75 contrast-125 sepia-[0.3]' : ''
       }`}
     />
   </a>

   {/* Occult Passcode Challenge Modal */}
   {showDiscordPrompt && (
     <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/80 backdrop-blur-xs select-none">
       <div className="relative w-80 p-6 bg-[#140e0a] border-2 border-[#523927] rounded-xs shadow-[0_0_30px_rgba(0,0,0,0.95)] text-center font-mono">
         <h3 className="text-amber-500 text-sm font-bold tracking-widest uppercase mb-1">
           Forbidden Communion
         </h3>
         <p className="text-[11px] text-stone-400 mb-4 tracking-normal">
           Speak the cipher to break the seal.
         </p>

         <form onSubmit={handleAttemptUnlock} className="flex flex-col gap-3">
           <input
             type="password"
             autoFocus
             value={discordInput}
             onChange={(e) => {
               setDiscordInput(e.target.value);
               setDiscordError(false);
             }}
             placeholder="PASSCODE"
             className={`w-full px-3 py-2 bg-[#090605] border ${
               discordError ? 'border-red-600 animate-shake' : 'border-[#3a281c] focus:border-amber-600'
             } text-amber-200 text-center tracking-widest text-xs outline-none rounded-xs transition-colors`}
           />

           {discordError && (
             <span className="text-[10px] text-red-500 font-bold uppercase tracking-wider">
               The seal remains unbroken
             </span>
           )}

           <div className="flex gap-2 justify-center mt-2">
             <button
               type="submit"
               className="px-4 py-1.5 bg-[#2d1b13] hover:bg-[#42281c] text-amber-300 text-xs uppercase tracking-wider border border-[#523927] active:scale-95 transition-transform"
             >
               Unbind
             </button>
             <button
               type="button"
               onClick={() => {
                 setShowDiscordPrompt(false);
                 setDiscordError(false);
                 setDiscordInput('');
               }}
               className="px-4 py-1.5 bg-black/40 hover:bg-black/60 text-stone-500 hover:text-stone-300 text-xs uppercase tracking-wider border border-transparent transition-colors"
             >
               Flee
             </button>
           </div>
         </form>
       </div>
     </div>
   )}

            {/* Ritual Action Button */}
            <button
              onClick={() => {
                try {
                  const audio = getAudioEngine();
                  if (audio?.init) audio.init();
                } catch (_) {}

                if (!hasCompletedTutorial) {
                  startTutorialDuel();
                } else {
                  setScreen('DECK_SELECT');
                }
              }}
              className="group mt-8 cursor-pointer bg-transparent border-0 p-0 focus:outline-none transition-transform duration-150 hover:scale-105 active:scale-95 flex justify-center"
            >
              <pre 
                style={{ 
                  fontFamily: '"Courier New", Courier, monospace',
                  letterSpacing: '0px'
                }} 
                className="text-red-600 group-hover:text-red-400 font-normal animate-occult-pulse text-[7.5px] whitespace-pre leading-none select-none drop-shadow-[0_0_12px_rgba(239,68,68,0.7)]"
              >
{`          ▀█████████▄   ▄████████    ▄██████▄   ▄█  ███▄▄▄▄           ▄████████  ▄█     ███     ███    █▄     ▄████████  ▄█       
           ███    ███  ███    ███   ███    ███ ███  ███▀▀▀██▄        ███    ███ ███ ▀█████████▄ ███    ███   ███    ███ ███       
           ███    ███  ███    █▀    ███    █▀  ███▌ ███   ███        ███    ███ ███▌   ▀███▀▀██ ███    ███   ███    ███ ███       
          ▄███▄▄▄██▀  ▄███▄▄▄      ▄███        ███▌ ███   ███       ▄███▄▄▄▄██▀ ███▌    ███   ▀ ███    ███   ███    ███ ███       
         ▀▀███▀▀▀██▄ ▀▀███▀▀▀     ▀▀███ ████▄  ███▌ ███   ███      ▀▀███▀▀▀▀▀   ███▌    ███     ███    ███ ▀███████████ ███       
           ███    ██▄  ███    █▄    ███    ███ ███  ███   ███      ▀███████████ ███     ███     ███    ███   ███    ███ ███       
           ███    ███  ███    ███   ███    ███ ███  ███   ███        ███    ███ ███     ███     ███    ███   ███    ███ ███▌    ▄ 
         ▄█████████▀   ██████████   ████████▀  █▀    ▀█   █▀         ███    ███ █▀     ▄████▀   ████████▀    ███    █▀  █████▄▄██ 
                                                                     ███    ███                                             ▀     `}
    </pre>
  </button>
          </div>
        </div>
      )}

      {/* =========================================================================
          STARTER DECK SELECTION SCREEN
         ========================================================================= */}
      {screen === 'DECK_SELECT' && (
        <div 
          className="absolute inset-0 z-50 flex flex-col items-center justify-between p-3 sm:p-4 overflow-hidden animate-fade-up font-mono select-none"
          style={getScreenBgStyle('deck-selection.png')}
        >
          {/* Ambient Candlelight Flickering Overlays */}
          <div className="absolute -top-16 -left-16 w-80 h-80 rounded-full bg-[radial-gradient(circle,rgba(245,158,11,0.22)_0%,rgba(180,83,9,0.08)_45%,transparent_70%)] pointer-events-none animate-[pulse_5s_infinite_ease-in-out] blur-2xl z-0" />
          <div
            className="absolute -top-16 -right-16 w-80 h-80 rounded-full bg-[radial-gradient(circle,rgba(251,191,36,0.2)_0%,rgba(217,119,6,0.07)_45%,transparent_70%)] pointer-events-none animate-[pulse_5s_infinite_ease-in-out] blur-2xl z-0"
            style={{ animationDelay: '2.5s' }}
          />

            <div className="grid grid-cols-3 gap-x-8 gap-y-2 w-full pb-1 max-w-5xl scale-[1.20] origin-center my-auto">
              {[
                { id: 'randomizer', name: 'Unformed', desc: 'Masochistic', cards: ["Trade Pelt", "Trade Pelt", "Amoeba"] },
                { id: 'witchcraft', name: 'Taiga', desc: 'Reliable', cards: ["Mole", "Moose Buck", "Black Goat"] },
                { id: 'infestation', name: 'Colony', desc: 'Wretched', cards: ["Silkworm", "Flying Ant", "Ant Queen"] },
                { id: 'skeleton', name: 'Scavengers', desc: 'Ravenous', cards: ["Warren", "Red Stray", "Dire Wolf Pup"] },
                { id: 'eldritch', name: 'Eldritch', desc: 'Ordained', cards: ["Tadpole", "Mantis", "Raven"] },
                { id: 'paleozoic', name: 'Paleozoic', desc: 'Deceitful', cards: ["Hyphae", "Mud Turtle", "Great White"] }
              ].map(d => (
                <div
                  key={d.id}
                  onClick={() => handleSelectLineage(d.id)}
                  className="flex flex-col items-center justify-between group p-1 select-none cursor-pointer"
                >
                  {/* Natural Handheld 3-card spread directly on the timber plank surface */}
                  <div
                    className="relative flex items-center justify-center w-full h-[138px] my-0.5 pb-[25px]"
                    style={{ paddingBottom: '25px' }}
                  >
                    {d.cards.map((cName, cIdx) => {
                      const fanTransforms = [
                        'rotate-[-7deg] -translate-x-[36px] group-hover:-translate-x-[78px] z-0',
                        'rotate-[0deg] -translate-y-2 group-hover:-translate-y-3.5 z-10',
                        'rotate-[7deg] translate-x-[36px] group-hover:translate-x-[78px] z-20'
                      ];
                      return (
                        <div
                          key={`${cName}-${cIdx}`}
                          className={`absolute transform scale-[0.68] origin-bottom transition-all duration-300 ease-out group-hover:scale-[0.72] ${fanTransforms[cIdx] || ''}`}
                        >
                          {renderCard(ALL_CARD_LOOKUP[cName] || MAIN_DECK_POOL[0], { showCost: true })}
                        </div>
                      );
                    })}
                  </div>

                  {/* Lineage title rendered simply as plain, centered monospace text below the cards */}
                  <div className="flex flex-col items-center text-center mt-1.5 w-full">
                    <h2 className="text-sm font-mono font-bold text-amber-200 uppercase tracking-widest group-hover:text-stone-100 transition-colors">
                      {d.name}
                    </h2>
                    <p className="text-[10px] font-mono text-amber-400/60 mt-0.5 tracking-wider uppercase">
                      {d.desc}
                    </p>
                    <span className="mt-1 font-['Cinzel',_serif] text-xs font-bold uppercase tracking-widest text-amber-200/80 group-hover:text-stone-50 transition-all">
                      START
                    </span>
                  </div>
                </div>
              ))}
            </div>
        </div>
      )}

      {/* =========================================================================
          GENERIC GAME OVER SCREEN
         ========================================================================= */}
      {screen === 'GAME_OVER' && (
        <div
          className="absolute inset-0 bg-[#080204] z-50 flex flex-col items-center justify-center p-6 text-center select-none animate-fade-up font-mono"
          style={getScreenBgStyle('gameover.jpg')}
        >
          <div className="max-w-xl w-full flex flex-col items-center bg-[#0d0806]/92 border border-[#3e2316] rounded-sm p-8 shadow-[0_22px_55px_rgba(0,0,0,0.95)] backdrop-blur-[2px]">
            <div className="text-4xl mb-2 filter sepia-[0.4]">{bossState.ritualEndedVoluntarily ? '🕯️' : '💀'}</div>

            <div className="text-[11px] text-amber-600/90 font-bold uppercase tracking-widest mb-1">
              {bossState.ritualEndedVoluntarily ? '+-- RITUAL CONCLUDED --+' : '+-- CATASTROPHIC FAILURE --+'}
            </div>

            <h1 className="text-2xl sm:text-3xl font-['Cinzel',_serif] font-bold uppercase tracking-widest text-red-500 mb-1 drop-shadow-[0_2px_12px_rgba(239,68,68,0.4)]">
              {bossState.ritualEndedVoluntarily ? 'Ritual Finished' : 'The Old One Awaits You'}
            </h1>

            <div className="text-xs font-mono uppercase tracking-widest text-[#cfb794]/80 mb-6">
              {bossState.ritualEndedVoluntarily ? 'The Ritual is finally completed' : 'Your Blood Runs Cold'}
            </div>

            {/* Stats mounted in a backlit dark cardplate */}
            <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-6 border border-[#3e2316] py-5 mb-6 text-left items-center bg-[#150d09]/80 px-6 rounded-sm">
              {/* Left Column: Tracked Stats */}
              <div className="space-y-3 font-mono text-xs border-b sm:border-b-0 sm:border-r border-[#3e2316] pb-4 sm:pb-0 sm:pr-6">
                <div className="flex justify-between items-center">
                  <span className="text-[#a8957f] uppercase tracking-wider text-[11px]">Cleared Stages</span>
                  <span className="text-amber-200 font-bold text-sm">{runStats.clearedStages}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[#a8957f] uppercase tracking-wider text-[11px]">Cards Sacrificed</span>
                  <span className="text-red-300 font-bold text-sm">{runStats.cardsSacrificed}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[#a8957f] uppercase tracking-wider text-[11px]">Damage Dealt / Taken</span>
                  <span className="text-stone-100 font-bold text-sm">
                    {runStats.scaleDamageDealt} <span className="text-stone-500 font-normal">/</span> {runStats.scaleDamageTaken}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[#a8957f] uppercase tracking-wider text-[11px]">Bosses Slain</span>
                  <span className="text-purple-300 font-bold text-sm">{runStats.bossesDefeated}</span>
                </div>
              </div>

              {/* Right Flank: Clear high-contrast assessment badge */}
              <div className="flex flex-col items-center justify-between z-20 scale-110 sm:scale-115 origin-center">
                <div className="text-[11px] font-mono uppercase tracking-widest text-[#a8957f] mb-1 font-semibold">
                  Rank Assessment
                </div>
                <div className={`text-6xl font-mono font-bold drop-shadow-[0_2px_14px_rgba(0,0,0,0.9)] ${calculateGrade(runStats).color}`}>
                  {calculateGrade(runStats).letter}
                </div>
              </div>
            </div>

            <button
              onClick={handleRestartRun}
              className="bg-[#1e1510] hover:bg-[#2c1e16] active:bg-[#140e0b] border border-[#482c1d] rounded-sm shadow-[0_2px_0_#0a0807,inset_0_1px_0_rgba(255,255,255,0.08)] active:translate-y-[1px] active:shadow-none transition-all duration-75 font-['Cinzel',_serif] font-bold text-xs uppercase tracking-widest text-[#e8d7be] hover:text-[#fff] px-8 py-3 select-none cursor-pointer"
            >
              COMMENCE ANOTHER RITUAL
            </button>
          </div>
        </div>
      )}

      {/* =========================================================================
          GENERIC PAUSE / SETTINGS MENU MODAL
         ========================================================================= */}
      {showPauseMenu && (
        <div className="fixed inset-0 bg-black/85 z-[120] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-up font-mono select-none">
          <div className="max-w-sm w-full text-center relative border border-amber-950/60 p-6 bg-[#0c0805]">
            <div className="text-[10px] text-amber-700/80 tracking-widest uppercase mb-1">+-- RITUAL PAUSED --+</div>
            <h2 className="text-xl font-mono font-bold uppercase tracking-widest text-amber-200 mb-1">
              The Sanctuary
            </h2>
            <p className="text-[11px] text-amber-400/60 mb-6 uppercase tracking-wider">Audio & Ritual Controls</p>

            <div className="flex flex-col gap-4 w-full">
              {/* Volume Sliders inside Pause Menu */}
              <div className="w-full py-3 px-4 flex flex-col gap-3 font-mono text-xs text-left border border-amber-950/40">
                <div className="flex flex-col gap-1.5">
                  <div className="flex justify-between text-[11px] text-stone-300">
                    <span>Music Volume</span>
                    <span className="font-bold text-amber-300 font-mono">{Math.round(musicVol * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={musicVol}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      setMusicVol(val);
                      if (!audioEnabled && val > 0) setAudioEnabled(true);
                      ChiptuneAudio.setMusicVolume(val);
                    }}
                    className="w-full accent-amber-500 h-1 bg-stone-900 rounded cursor-pointer touch-manipulation"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <div className="flex justify-between text-[11px] text-stone-300">
                    <span>Sound FX Volume</span>
                    <span className="font-bold text-amber-300 font-mono">{Math.round(sfxVol * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={sfxVol}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      setSfxVol(val);
                      if (!audioEnabled && val > 0) setAudioEnabled(true);
                      ChiptuneAudio.setSfxVolume(val);
                    }}
                    onPointerUp={() => ChiptuneAudio.playSfxPreview()}
                    className="w-full accent-amber-500 h-1 bg-stone-900 rounded cursor-pointer touch-manipulation"
                  />
                </div>
              </div>

              {/* Diegetic Timber Action Buttons */}
              <button
                onClick={() => setShowPauseMenu(false)}
                className="w-full py-2 bg-[#181310] hover:bg-[#231b16] active:bg-[#120e0b] border border-[#2f241c] rounded-sm shadow-[0_2px_0_#0a0807,inset_0_1px_0_rgba(255,255,255,0.06)] active:translate-y-[1px] active:shadow-none transition-all duration-75 font-['Cinzel',_serif] font-bold text-[11px] uppercase tracking-widest text-[#cfb794] hover:text-[#f3ede2] cursor-pointer text-center"
              >
                RESUME RITUAL
              </button>

              <button
                onClick={() => {
                  setShowPauseMenu(false);
                  triggerSfx('defeat');
                  setScreen('GAME_OVER');
                }}
                className="w-full py-2 bg-[#181310] hover:bg-[#231b16] active:bg-[#120e0b] border border-[#3b1814] rounded-sm shadow-[0_2px_0_#0a0807,inset_0_1px_0_rgba(255,255,255,0.06)] active:translate-y-[1px] active:shadow-none transition-all duration-75 font-['Cinzel',_serif] font-bold text-[11px] uppercase tracking-widest text-red-400/80 hover:text-red-300 cursor-pointer text-center"
              >
                END RITUAL
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          DRAFT SCREEN (PELT TRADING)
         ========================================================================= */}
      {screen === 'DRAFT' && (
        <div
          className="absolute inset-0 bg-[#0d0906] z-50 flex flex-col items-center justify-center p-6 overflow-hidden font-mono select-none"
          style={getScreenBgStyle('draft.png')}
        >
          <h1 className="text-2xl md:text-3xl font-serif text-[#d4af37] tracking-widest text-center italic drop-shadow-[0_2px_6px_rgba(0,0,0,0.9)] mb-8">
            ...Take Two more Creatures along with you...
          </h1>

          <div className="grid grid-cols-2 gap-12 lg:gap-16 max-w-[1380px] w-full mb-8">
            {/* Player's Starter Deck directly on the surface */}
            <div className="flex flex-col items-center">
              <h2 className="text-sm font-mono font-bold text-amber-300/80 uppercase tracking-widest mb-4">
                Your Creatures
              </h2>
              <div className="flex flex-col items-center justify-center gap-4 w-full min-h-[160px]">
                {/* Row 1: 3 Starter Creatures */}
                <div className="flex justify-center items-center gap-4 w-full">
                  {draftPlayerDeck.slice(0, 3).map((c, sliceIdx) => {
                    const idx = sliceIdx;
                    const isSelected = draftSelectedDeckIdx === idx;
                    return (
                      <div
                        key={c.id || `draft-p-${c.name}-${idx}`}
                        onClick={() => {
                          if (c.name === "Trade Pelt") {
                            setDraftSelectedDeckIdx(draftSelectedDeckIdx === idx ? null : idx);
                          }
                        }}
                        className={`transform origin-center shrink-0 transition-all duration-200 ${
                          c.name !== "Trade Pelt" ? "opacity-50" : "cursor-pointer"
                        } ${
                          isSelected
                            ? "scale-[1.20] -translate-y-4 z-30"
                            : "scale-[1.10] hover:scale-[1.15]"
                        }`}
                      >
                        {renderCard(c, { isSelected })}
                      </div>
                    );
                  })}
                </div>

                {/* Row 2: 2 Trade Pelts */}
                <div className="flex justify-center items-center gap-4 w-full mt-2">
                  {draftPlayerDeck.slice(3).map((c, sliceIdx) => {
                    const idx = sliceIdx + 3;
                    const isSelected = draftSelectedDeckIdx === idx;
                    return (
                      <div
                        key={c.id || `draft-p-${c.name}-${idx}`}
                        onClick={() => {
                          if (c.name === "Trade Pelt") {
                            setDraftSelectedDeckIdx(draftSelectedDeckIdx === idx ? null : idx);
                          }
                        }}
                        className={`transform origin-center shrink-0 transition-all duration-200 ${
                          c.name !== "Trade Pelt" ? "opacity-50" : "cursor-pointer"
                        } ${
                          isSelected
                            ? "scale-[1.20] -translate-y-4 z-30"
                            : "scale-[1.10] hover:scale-[1.15]"
                        }`}
                      >
                        {renderCard(c, { isSelected })}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Scavenge Trade Pool directly on the surface */}
            <div className="flex flex-col items-center">
              <h2 className="text-sm font-mono font-bold text-red-300/80 uppercase tracking-widest mb-4">
                Merchant's Shop
              </h2>
              <div className="flex flex-col items-center justify-center gap-4 w-full min-h-[160px]">
                {/* Row 1: Top 4 Cards */}
                <div className="flex justify-center items-center gap-4 w-full">
                  {draftTradePool.slice(0, 4).map((c, idx) => {
                    if (c === null) {
                      return (
                        <div
                          key={`draft-slot-empty-${idx}`}
                          className="w-[112px] h-[160px] shrink-0 select-none scale-[1.10] origin-center rounded-[3px] border border-[#2b221b]/40 bg-[#0a0807]/30 shadow-inner pointer-events-none"
                        />
                      );
                    }

                    const isRevealed = draftRevealedIndices.includes(idx);
                    const isSelected = draftSelectedTradeIdx === idx;

                    if (!isRevealed) {
                      return (
                        <div
                          key={`draft-back-${idx}`}
                          className={`w-[112px] h-[160px] shrink-0 select-none scale-[1.10] origin-center rounded-[3px] pointer-events-none transition-all duration-200 ${
                            draftFlippingDown ? 'animate-flip-down' : 'opacity-60 filter brightness-60'
                          }`}
                        >
                          <div
                            className="w-full h-full rounded-[3px] shadow-[0_4px_8px_rgba(0,0,0,0.85)] border border-[#1a120b]"
                            style={{
                              backgroundImage: `url(${BASE}/assets/cardbases/cardbacks.png)`,
                              backgroundSize: '100% 100%',
                            }}
                          />
                        </div>
                      );
                    }

                    return (
                      <div
                        key={c.id || `draft-t-${c.name}-${idx}`}
                        onClick={() => {
                          if (draftFlippingDown || draftFlippingUp) return;
                          setDraftSelectedTradeIdx(draftSelectedTradeIdx === idx ? null : idx);
                        }}
                        className={`cursor-pointer transform origin-center shrink-0 transition-all duration-200 ${
                          draftFlippingUp ? 'animate-flip-up' : ''
                        } ${
                          isSelected
                            ? "scale-[1.20] -translate-y-4 z-30"
                            : "scale-[1.10] hover:scale-[1.15]"
                        }`}
                      >
                        {renderCard(c, { isSelected })}
                      </div>
                    );
                  })}
                </div>

                {/* Row 2: Bottom 4 Cards */}
                <div className="flex justify-center items-center gap-4 w-full mt-2">
                  {draftTradePool.slice(4, 8).map((c, sliceIdx) => {
                    const idx = sliceIdx + 4;

                    if (c === null) {
                      return (
                        <div
                          key={`draft-slot-empty-${idx}`}
                          className="w-[112px] h-[160px] shrink-0 select-none scale-[1.10] origin-center rounded-[3px] border border-[#2b221b]/40 bg-[#0a0807]/30 shadow-inner pointer-events-none"
                        />
                      );
                    }

                    const isRevealed = draftRevealedIndices.includes(idx);
                    const isSelected = draftSelectedTradeIdx === idx;

                    if (!isRevealed) {
                      return (
                        <div
                          key={`draft-back-${idx}`}
                          className={`w-[112px] h-[160px] shrink-0 select-none scale-[1.10] origin-center rounded-[3px] pointer-events-none transition-all duration-200 ${
                            draftFlippingDown ? 'animate-flip-down' : 'opacity-60 filter brightness-60'
                          }`}
                        >
                          <div
                            className="w-full h-full rounded-[3px] shadow-[0_4px_8px_rgba(0,0,0,0.85)] border border-[#1a120b]"
                            style={{
                              backgroundImage: `url(${BASE}/assets/cardbases/cardbacks.png)`,
                              backgroundSize: '100% 100%',
                            }}
                          />
                        </div>
                      );
                    }

                    return (
                      <div
                        key={c.id || `draft-t-${c.name}-${idx}`}
                        onClick={() => {
                          if (draftFlippingDown || draftFlippingUp) return;
                          setDraftSelectedTradeIdx(draftSelectedTradeIdx === idx ? null : idx);
                        }}
                        className={`cursor-pointer transform origin-center shrink-0 transition-all duration-200 ${
                          draftFlippingUp ? 'animate-flip-up' : ''
                        } ${
                          isSelected
                            ? "scale-[1.20] -translate-y-4 z-30"
                            : "scale-[1.10] hover:scale-[1.15]"
                        }`}
                      >
                        {renderCard(c, { isSelected })}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Minimal Tactile Action Buttons */}
          <div className="flex items-center gap-5 mt-2">
            <button
              onClick={executeDraftTrade}
              disabled={
                draftSelectedDeckIdx === null ||
                draftSelectedTradeIdx === null ||
                draftTradesLeft <= 0 ||
                draftFlippingDown ||
                draftFlippingUp
              }
              className="bg-[#181310] hover:bg-[#231b16] active:bg-[#120e0b] border border-[#2f241c] rounded-sm shadow-[0_2px_0_#0a0807,inset_0_1px_0_rgba(255,255,255,0.06)] active:translate-y-[1px] active:shadow-none transition-all duration-75 font-['Cinzel',_serif] font-bold text-xs uppercase tracking-widest text-[#cfb794] hover:text-[#f3ede2] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed px-5 py-2.5 select-none"
            >
              CONFIRM TRADE
            </button>

            <button
              onClick={finalizeDraft}
              disabled={draftPlayerDeck.some(c => c.name === "Trade Pelt") || draftTradesLeft > 0}
              className="bg-[#181310] hover:bg-[#231b16] active:bg-[#120e0b] border border-[#2f241c] rounded-sm shadow-[0_2px_0_#0a0807,inset_0_1px_0_rgba(255,255,255,0.06)] active:translate-y-[1px] active:shadow-none transition-all duration-75 font-['Cinzel',_serif] font-bold text-xs uppercase tracking-widest text-[#cfb794] hover:text-[#f3ede2] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed px-5 py-2.5 select-none"
              title={
                draftPlayerDeck.some(c => c.name === "Trade Pelt") || draftTradesLeft > 0
                  ? "You must trade all of your Pelts before venturing further"
                  : "Venture Onward"
              }
            >
              VENTURE ONWARD
            </button>
          </div>
        </div>
      )}
      {/* Floating persistent Dev Tools & Deck access during all events */}
      {screen.startsWith('EVENT_') && (
        <div className="fixed top-3 right-4 z-[60] flex items-center gap-3 select-none">
          <button
            onClick={openViewDeck}
            className="bg-[#181310] hover:bg-[#231b16] active:bg-[#120e0b] border border-[#2f241c] rounded-sm shadow-[0_2px_0_#0a0807,inset_0_1px_0_rgba(255,255,255,0.06)] active:translate-y-[1px] active:shadow-none transition-all duration-75 font-['Cinzel',_serif] font-bold text-[11px] uppercase tracking-widest text-[#cfb794] hover:text-[#f3ede2] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed px-3 py-1.5"
          >
            DECK ({masterDeck.length})
          </button>
          {showDevTools && (
              <button
                onClick={openDevMenu}
                className="w-38 sm:w-40 bg-[#181310] hover:bg-[#231b16] active:bg-[#120e0b] border border-[#2f241c] rounded-sm shadow-[0_2px_0_#0a0807,inset_0_1px_0_rgba(255,255,255,0.06)] active:translate-y-[1px] active:shadow-none transition-all duration-75 font-['Cinzel',_serif] font-bold text-[10px] sm:text-[10.5px] uppercase tracking-widest text-[#cfb794] hover:text-[#f3ede2] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed px-3 py-1.5 flex items-center justify-center gap-2"
                title="Development Tools"
              >
                <span>DEV TOOLS</span>
              </button>
            )}
        </div>
      )}

      {/* =========================================================================
          CROSSROADS EVENT ROUTER SCREEN
         ========================================================================= */}
      {screen === 'EVENT_CROSSROADS' && (
        <div 
          className="absolute inset-0 bg-[#0d0906] z-50 flex flex-col items-center justify-center p-6 overflow-y-auto animate-fade-up font-mono select-none"
          style={getScreenBgStyle('crossroads-select.jpg')}
        >
          <div className="flex flex-col items-center justify-center max-w-3xl w-full my-auto text-center">
            <div className="text-[10px] text-amber-700/80 tracking-widest uppercase mb-1">+-- YOUR PATH DIVERGES --+</div>
            <h1 className="text-2xl sm:text-3xl font-mono font-bold uppercase tracking-widest text-amber-200 mb-1">Crossroads</h1>
            <p className="text-amber-400/60 text-xs mb-8 text-center max-w-md uppercase tracking-wider">The path diverges in the gloom. Your options are grim.</p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 w-full mb-8">
              {crossroadsOptions.map(eId => {
                const details: Record<string, { title: string; desc: string; icon: React.ReactNode }> = {
                  'campfire': { title: 'Divine Blessing', desc: 'Allow the Zealot to Baptize a Creature, empowering it', icon: <Flame className="w-5 h-5 text-amber-400 filter sepia-[0.4]" /> },
                  'altar': { title: 'Mystical Altar', desc: 'Surrender a Creature to the Maker to transfer its Crests', icon: <Sparkles className="w-5 h-5 text-amber-300 filter sepia-[0.4]" /> },
                  'carving': { title: 'Woven Patches', desc: 'A Creature from the chosen Tribal Crest heeds your call', icon: <Award className="w-5 h-5 text-amber-400 filter sepia-[0.4]" /> },
                  'cost': { title: 'Five Finger Discount', desc: 'You catch the Merchant dozing off', icon: <Zap className="w-5 h-5 text-amber-300 filter sepia-[0.4]" /> },
                  'bonelord': { title: 'Bloodrites', desc: 'The Old One demands a sacrifice, granting you a Blessing', icon: <Skull className="w-5 h-5 text-stone-300 filter sepia-[0.4]" /> },
                  'mycologist': { title: 'Stitched Anew', desc: 'Allow the Weaver to sew duplicate cards together', icon: <Layers className="w-5 h-5 text-amber-400 filter sepia-[0.4]" /> },
                  'goobert': { title: 'Printing Press', desc: 'The Begotten offers to Stamp a card', icon: <Sparkles className="w-5 h-5 text-teal-400 filter sepia-[0.4]" /> },
                  'cave': { title: 'The Steeple', desc: 'The Zealot tests if your Creatures are worthy', icon: <Eye className="w-5 h-5 text-stone-300 filter sepia-[0.4]" /> },
                  'choice': { title: 'Wild Creatures', desc: 'A group of Creatures approach from the darkness', icon: <HelpCircle className="w-5 h-5 text-amber-300 filter sepia-[0.4]" /> },
                  'totem': { title: 'The Weaver', desc: 'Assemble an Effigy from a Tribe Patch and Crest', icon: <Wrench className="w-5 h-5 text-amber-400 filter sepia-[0.4]" /> },
                  'items': { title: 'Surplus Cache', desc: 'Barter your overkill blood harvest for arcane relics', icon: <span className="text-base select-none">🎒</span> },
                };
                const d = details[eId] || { title: 'Unknown', desc: 'The path ahead lies in darkness.', icon: <Sparkles className="w-5 h-5" /> };

                return (
                  <div
                    key={eId}
                    onClick={() => {
                      if (eId === 'items') startItemEvent();
                      else if (eId === 'campfire') initCampfire();
                      else if (eId === 'altar') initAltar();
                      else if (eId === 'carving') initTotemCarving();
                      else if (eId === 'cost') initCostBargain();
                      else if (eId === 'bonelord') initBoneLord();
                      else if (eId === 'mycologist') initMycologists();
                      else if (eId === 'goobert') initGoobert();
                      else if (eId === 'cave') initCaveTrial();
                      else if (eId === 'choice') initCardChoice();
                      else if (eId === 'totem') initBuildTotem();
                    }}
                    className="p-4 text-left transition-all cursor-pointer group flex flex-col justify-between border border-amber-950/40 hover:border-amber-700/60"
                  >
                    <div className="mb-2">{d.icon}</div>
                    <div>
                      <div className="font-mono font-bold text-sm text-amber-200 group-hover:text-amber-100 uppercase tracking-widest">{d.title}</div>
                      <div className="text-[11px] text-stone-400/70 mt-1 font-mono leading-relaxed">{d.desc}</div>
                    </div>
                    <div className="mt-3 font-mono text-[10px] uppercase tracking-widest text-amber-200/50 group-hover:text-amber-100 group-hover:tracking-[0.2em] transition-all">
                      PROCEED
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
      {/* =========================================================================
          ITEM RESTOCK EVENT SCREEN (SURPLUS CACHE)
         ========================================================================= */}
      {screen === 'EVENT_ITEMS' && (
        <div className="fixed inset-0 bg-[#070504] z-50 flex flex-col items-center justify-center p-6 select-none font-mono">
          <div className="text-amber-200 text-lg uppercase tracking-widest font-bold mb-1">
            Surplus Cache
          </div>
          <p className="text-xs text-neutral-400 mb-3">
            Exchange your overkill blood harvest for field relics:
          </p>

          {/* Blood Bank Balance Indicator */}
          <div className="flex items-center gap-2 mb-8 px-4 py-1.5 bg-[#140e0b] border border-[#3a2215] rounded-sm shadow-inner">
            <span className="text-[11px] uppercase tracking-wider text-neutral-400 font-bold">Blood Bank:</span>
            <span className="font-['Cinzel',_serif] text-sm font-black text-red-400 tracking-wider">
              {totalOverkillDamage}
            </span>
            <span className="text-[10px] uppercase font-bold text-amber-800">OZ</span>
          </div>

          <div className="flex gap-6 items-center justify-center max-w-xl">
            {itemChoices.length === 0 ? (
              <div className="text-xs text-neutral-500 italic py-8">
                The cache shelves have been emptied.
              </div>
            ) : (
              itemChoices.map(itemId => {
                const def = ALL_ITEMS[itemId];
                const cost = ITEM_COSTS[itemId] ?? 3;
                const satchelFull = items.findIndex(s => s === null) === -1;
                const canAfford = totalOverkillDamage >= cost && !satchelFull;

                return (
                  <button
                    key={itemId}
                    disabled={!canAfford}
                    onClick={() => handleSelectItem(itemId)}
                    className={`w-44 p-4 border rounded-sm flex flex-col items-center text-center transition-all duration-150 relative ${
                      canAfford
                        ? 'bg-[#140d09] border-[#3e2316] hover:border-amber-400 hover:scale-105 group cursor-pointer'
                        : 'bg-[#0d0907] border-[#20150f] opacity-45 cursor-not-allowed'
                    }`}
                  >
                    <div className="text-4xl mb-3 group-hover:scale-110 transition-transform">
                      {def.emoji}
                    </div>
                    <div className="text-xs font-bold text-amber-100 uppercase mb-2">
                      {def.name}
                    </div>
                    <div className="text-[10px] text-neutral-400 leading-relaxed mb-4">
                      {def.description}
                    </div>

                    <div className={`mt-auto px-2.5 py-1 rounded-xs border text-[11px] font-bold tracking-wider ${
                      totalOverkillDamage >= cost
                        ? 'border-red-900/80 bg-red-950/40 text-red-300'
                        : 'border-neutral-800 bg-neutral-900/60 text-neutral-600'
                    }`}>
                      🩸 {cost} OZ
                    </div>
                  </button>
                );
              })
            )}
          </div>

          <button
            onClick={() => setScreen('EVENT_CROSSROADS')}
            className="mt-10 px-5 py-2 border border-[#3e2316] text-[#8c7662] hover:text-neutral-200 text-xs uppercase tracking-wider cursor-pointer transition-colors"
          >
            Leave Cache
          </button>
        </div>
      )}
      {/* =========================================================================
          CAMPFIRE EVENT SCREEN
         ========================================================================= */}
      {screen === 'EVENT_CAMPFIRE' && (
        <div 
          className="absolute inset-0 bg-[#0d0906] z-50 flex flex-col items-center justify-center p-6 overflow-y-auto animate-fade-up font-mono select-none"
          style={getScreenBgStyle('campfireevent.jpg')}
        >
          <div className="max-w-4xl w-full flex flex-col items-center justify-center text-center my-auto">
            <div className="text-[10px] text-amber-700/80 tracking-widest uppercase mb-1">+-- DIVINE BLESSING --+</div>
            <h1 className="text-2xl sm:text-3xl font-mono font-bold uppercase tracking-widest text-amber-200 mb-1">BABTISM OF BOILIING BLOOD</h1>
            <p className="text-amber-400/70 text-xs mb-14 text-center max-w-lg leading-relaxed">
              {campfireStage === 0
                ? "The Zealot's wicked smile sickens you. Select a creature to babtize in the boiling blood."
                : isCampfireSafe
                ? "The chapel is deserted. You may bathe your Creatures in blood an additional time."
                : "The Zealot murmurs about the hunger growing in his Flock..."}
            </p>

            <div className="flex flex-wrap gap-4 justify-center max-w-4xl mb-8">
              {masterDeck.map((c, idx) => {
                const isSelected = campfireCardIdx === idx;
                return (
                  <div
                    key={c.id || `camp-${c.name}-${idx}`}
                    onClick={() => campfireStage === 0 && setCampfireCardIdx(idx)}
                    className={`cursor-pointer transform transition-all duration-200 ${
                      isSelected ? "scale-105 -translate-y-3.5 z-30" : "hover:scale-105"
                    }`}
                  >
                    {renderCard(c, { isSelected })}
                  </div>
                );
              })}
            </div>

            <div className="flex items-center gap-4">
              <button
                onClick={applyCampfireWarm}
                disabled={campfireCardIdx === null || isEventBusy}
                className="bg-[#181310] hover:bg-[#231b16] active:bg-[#120e0b] border border-[#2f241c] rounded-sm shadow-[0_2px_0_#0a0807,inset_0_1px_0_rgba(255,255,255,0.06)] active:translate-y-[1px] active:shadow-none transition-all duration-75 font-['Cinzel',_serif] font-bold text-[11px] uppercase tracking-widest text-[#cfb794] hover:text-[#f3ede2] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed px-4 py-2 select-none"
              >
                {campfireStage === 0
                  ? `BABPTIZE CREATURE (${campfireBuffType === 'attack' ? '+1 POWER' : '+2 HEALTH'})`
                  : `BATHE IN THE BLOOD (${campfireBuffType === 'attack' ? '+1 POWER' : '+2 HEALTH'})`}
              </button>
              {campfireStage > 0 && (
                <button
                  onClick={() => startNextDuel()}
                  className="bg-[#181310] hover:bg-[#231b16] active:bg-[#120e0b] border border-[#2f241c] rounded-sm shadow-[0_2px_0_#0a0807,inset_0_1px_0_rgba(255,255,255,0.06)] active:translate-y-[1px] active:shadow-none transition-all duration-75 font-['Cinzel',_serif] font-bold text-[11px] uppercase tracking-widest text-[#cfb794] hover:text-[#f3ede2] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed px-4 py-2 select-none"
                >
                  FLEE
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          ALTAR EVENT SCREEN
         ========================================================================= */}
      {screen === 'EVENT_ALTAR' && (
        <div 
          className="absolute inset-0 bg-[#0d0906] z-50 flex flex-col items-center justify-center p-6 overflow-y-auto animate-fade-up font-mono select-none"
          style={getScreenBgStyle('altarevent.jpg')}
        >
          <div className="max-w-4xl w-full flex flex-col items-center justify-center text-center my-auto">
            <div className="text-[10px] text-amber-700/80 tracking-widest uppercase mb-1">+-- CRESTFALLEN ALTAR --+</div>
            <h1 className="text-2xl sm:text-3xl font-mono font-bold uppercase tracking-widest text-amber-200 mb-1">Sigil Transfer</h1>
            <p className="text-amber-400/70 text-xs mb-8 text-center max-w-lg leading-relaxed">
              Select a Host to receive the Crests of a chosen Sacrifice. Greed begets you.
            </p>

            <div className="flex flex-wrap gap-4 justify-center max-w-4xl mb-8">
              {masterDeck.map(c => {
                const isHost = altarHostId === c.id;
                const isSac = altarSacrificeId === c.id;
                const hostCard = masterDeck.find(m => m.id === altarHostId);
                const cannotBeHost = hasMoreSigilsThanOriginal(c);
                
                let wouldExceedFive = false;
                if (hostCard && !isHost && c.sigils && c.sigils.length > 0) {
                  const merged = new Set(hostCard.sigils || []);
                  c.sigils.forEach(s => merged.add(s));
                  if (merged.size >= 5) wouldExceedFive = true;
                }

                const isDisabled = (!altarHostId && cannotBeHost) || (altarHostId && !isHost && (wouldExceedFive || !c.sigils || c.sigils.length === 0));

                return (
                  <div
                    key={c.id}
                    onClick={() => {
                      if (!altarHostId) {
                        if (cannotBeHost) {
                          addLog(`${c.name} cannot receive more crests: it already bears more than its original nature allows.`);
                          return;
                        }
                        setAltarHostId(c.id || null);
                      } else if (altarHostId === c.id) {
                        setAltarHostId(null);
                        setAltarSacrificeId(null);
                      } else if (!altarSacrificeId) {
                        if (wouldExceedFive) {
                          addLog(`Cannot sacrifice ${c.name}: ${hostCard?.name} would have 5 or more crests (max 4 allowed).`);
                          return;
                        }
                        if (c.sigils && c.sigils.length > 0) {
                          setAltarSacrificeId(c.id || null);
                        }
                      } else if (altarSacrificeId === c.id) {
                        setAltarSacrificeId(null);
                      }
                    }}
                    className={`cursor-pointer flex flex-col items-center transition ${isDisabled ? 'opacity-40 grayscale-[50%]' : 'hover:scale-105'}`}
                  >
                    {renderCard(c, {
                      isSelected: isHost,
                      isMarkedSacrifice: isSac
                    })}
                    {!altarHostId && cannotBeHost && (
                      <span className="text-[9px] font-mono text-amber-500 font-bold mt-1 uppercase">Cannot Host</span>
                    )}
                    {altarHostId && !isHost && wouldExceedFive && (
                      <span className="text-[9px] font-mono text-red-400 font-bold mt-1 uppercase">Exceeds 5</span>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="flex items-center gap-4">
              <button
                onClick={applyAltarTransfer}
                disabled={!altarHostId || !altarSacrificeId || isEventBusy}
                className="bg-[#181310] hover:bg-[#231b16] active:bg-[#120e0b] border border-[#2f241c] rounded-sm shadow-[0_2px_0_#0a0807,inset_0_1px_0_rgba(255,255,255,0.06)] active:translate-y-[1px] active:shadow-none transition-all duration-75 font-['Cinzel',_serif] font-bold text-[11px] uppercase tracking-widest text-[#cfb794] hover:text-[#f3ede2] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed px-4 py-2 select-none"
              >
                SACRIFICE TO THE MAKER
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TOTEM CARVINGS (TRIBE PICK) SCREEN
         ========================================================================= */}
      {screen === 'EVENT_TOTEM_CARVING' && (
        <div
          className="absolute inset-0 bg-[#0d0906] z-50 flex flex-col items-center justify-center p-6 overflow-y-auto animate-fade-up font-mono select-none"
          style={getScreenBgStyle('tribeeventbg.jpg')}
        >
          <div className="max-w-2xl w-full flex flex-col items-center justify-center text-center my-auto">
            <div className="text-[10px] text-amber-700/80 tracking-widest uppercase mb-1">+-- THE WEAVER'S WEFT --+</div>
            <h1 className="text-2xl sm:text-3xl font-mono font-bold uppercase tracking-widest text-amber-200 mb-1">Embroidered Crests</h1>
            <p className="text-amber-400/70 text-xs mb-8 text-center max-w-md uppercase tracking-wider">
              Threadbare swatches rest upon a lone loom. Claiming an embroidered Patch will summon a creature of its Tribe.
            </p>

            <div className="flex flex-wrap gap-6 justify-center max-w-2xl mb-8">
              {(carvingTribes.length > 0 ? carvingTribes : (["Reptile", "Canine", "Avian"] as Tribe[])).map(tribe => (
                <div
                  key={tribe}
                  onClick={() => !isEventBusy && claimCarvingTribe(tribe)}
                  className={`p-4 text-center transition-all flex flex-col items-center border border-dashed border-[#8c6747]/70 bg-[#150f0a] shadow-[0_4px_14px_rgba(0,0,0,0.85)] rounded-[3px] w-36 select-none ${
                    isEventBusy
                      ? 'opacity-40 cursor-not-allowed pointer-events-none'
                      : 'cursor-pointer group hover:border-amber-400/90 hover:shadow-[0_0_18px_rgba(245,158,11,0.25)] hover:-translate-y-1'
                  }`}
                >
                  <div className="text-[8px] font-mono uppercase tracking-[0.2em] text-[#ab8a68] mb-1.5">
                    Patch
                  </div>
                  <div className="p-2 mb-2 bg-[#221811] border border-[#4a3422] rounded-[2px] group-hover:border-amber-700/70 transition-colors">
                    {TRIBE_EMBROIDERY[tribe] || <span className="text-xl">🧵</span>}
                  </div>
                  <div className="font-mono font-bold text-amber-200 group-hover:text-amber-100 text-sm uppercase tracking-widest">
                    {tribe}
                  </div>
                  <div className="mt-3 font-mono text-[9px] uppercase tracking-widest text-amber-200/50 group-hover:text-amber-100 group-hover:tracking-[0.2em] transition-all">
                    CLAIM PATCH
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          COSTLY BARGAIN SCREEN
         ========================================================================= */}
      {screen === 'EVENT_COST_BARGAIN' && (
        <div 
          className="absolute inset-0 bg-[#0d0906] z-50 flex flex-col items-center justify-center p-6 overflow-y-auto animate-fade-up font-mono select-none"
          style={getScreenBgStyle('costeventbg.jpg')}
        >
          <div className="max-w-xl w-full flex flex-col items-center justify-center text-center my-auto">
            <div className="text-[10px] text-amber-700/80 tracking-widest uppercase mb-1">+-- FREE OF COST --+</div>
            <h1 className="text-2xl sm:text-3xl font-mono font-bold uppercase tracking-widest text-amber-200 mb-1">Blood & Bone Pact</h1>
            <p className="text-amber-400/70 text-xs mb-8 text-center max-w-md uppercase tracking-wider">
              The Merchant's dozed off. Try helping yourself to an unlabeled freebie.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 w-full mb-8">
                {(costChoices.length > 0 ? costChoices : (['1 Blood', '2 Blood', 'Bones'] as const)).map(costType => (
                  <div
                    key={costType}
                    onClick={() => {
                      if (isEventBusy) return;
                      claimCostBargain(costType);
                    }}
                    className={`p-5 text-center transition-all flex flex-col items-center justify-center gap-2 border border-amber-950/40 hover:border-amber-600/70 select-none ${
                      isEventBusy
                        ? 'opacity-30 cursor-not-allowed pointer-events-none'
                        : 'cursor-pointer group'
                    }`}
                  >
                    <span className="text-3xl filter sepia-[0.4] group-hover:scale-110 transition-transform">
                      {costType === 'Bones' ? '🦴' : '🩸'}
                    </span>
                    <span className="font-mono font-bold text-amber-200 group-hover:text-amber-100 uppercase tracking-widest text-xs">
                      {costType}
                    </span>
                    <span className="font-mono text-[10px] uppercase tracking-widest text-amber-200/50 group-hover:text-amber-100 group-hover:tracking-[0.2em] transition-all">
                      ACCEPT
                    </span>
                  </div>
                ))}
              </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          BONE LORD SCREEN
         ========================================================================= */}
      {screen === 'EVENT_BONE_LORD' && (
        <div 
          className="absolute inset-0 bg-[#0d0906] z-50 flex flex-col items-center justify-center p-6 overflow-y-auto animate-fade-up font-mono select-none"
          style={getScreenBgStyle('bonelordevent.png')}
        >
          <div className="max-w-4xl w-full flex flex-col items-center justify-center text-center my-auto">
            <div className="text-[10px] text-amber-700/80 tracking-widest uppercase mb-1">+-- THE BONE LORD --+</div>
            <h1 className="text-2xl sm:text-3xl font-mono font-bold uppercase tracking-widest text-stone-200 mb-1">Ancient Altar of Bones</h1>
            <p className="text-amber-400/70 text-xs mb-8 text-center max-w-lg leading-relaxed">
              A sudden flooding darkness envelopes the world around you. You must offer a Sacrifice from your deck to receive his eternal favor.
            </p>

            <div className="flex flex-wrap gap-4 justify-center max-w-4xl mb-8">
              {masterDeck.map((c, idx) => (
                <div key={c.id || `bl-${c.name}-${idx}`} onClick={() => setBoneLordSelectedIdx(idx)} className="cursor-pointer">
                  {renderCard(c, { isSelected: boneLordSelectedIdx === idx })}
                </div>
              ))}
            </div>

            <div className="flex items-center gap-4">
              <button
                onClick={confirmBoneLordOffering}
                disabled={boneLordSelectedIdx === null || isEventBusy}
                className="bg-[#181310] hover:bg-[#231b16] active:bg-[#120e0b] border border-[#2f241c] rounded-sm shadow-[0_2px_0_#0a0807,inset_0_1px_0_rgba(255,255,255,0.06)] active:translate-y-[1px] active:shadow-none transition-all duration-75 font-['Cinzel',_serif] font-bold text-[11px] uppercase tracking-widest text-[#cfb794] hover:text-[#f3ede2] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed px-4 py-2 select-none"
              >
                OFFER SACRIFICE
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MYCOLOGISTS EVENT SCREEN
         ========================================================================= */}
      {screen === 'EVENT_MYCOLOGIST' && (
        <div
          style={getScreenBgStyle('weaverevent.png')}
          className="absolute inset-0 z-50 flex flex-col items-center justify-center p-6 overflow-y-auto animate-fade-up font-mono select-none"
        >
          <div className="max-w-4xl w-full flex flex-col items-center justify-center text-center my-auto">
            <div className="text-[10px] text-amber-700/80 tracking-widest uppercase mb-1">+-- THE WEAVER SCOFFS --+</div>
            <h1 className="text-2xl sm:text-3xl font-mono font-bold uppercase tracking-widest text-amber-200 mb-1">SLEIGHT OF HAND</h1>

            {!mycoHasDuplicates ? (
              <div className="flex flex-col items-center text-center max-w-lg my-auto">
                <p className="text-amber-400/70 text-xs mb-8 leading-relaxed">
                  The Weaver rummages through your satchel... <span className="text-amber-300 font-bold uppercase">No twin creatures with you?</span><br />
                  Yet the threads whisper to her... a flick of the wrist and a twin card appears in her hand, before being stuffed back into your satchel:
                </p>
                {mycoOfferedCard && (
                  <div className="mb-8 scale-110">
                    {renderCard(mycoOfferedCard)}
                  </div>
                )}
                <button
                  onClick={claimMycologistDuplicate}
                  disabled={!mycoOfferedCard}
                  className="bg-[#181310] hover:bg-[#231b16] active:bg-[#120e0b] border border-[#2f241c] rounded-sm shadow-[0_2px_0_#0a0807,inset_0_1px_0_rgba(255,255,255,0.06)] active:translate-y-[1px] active:shadow-none transition-all duration-75 font-['Cinzel',_serif] font-bold text-[11px] uppercase tracking-widest text-[#cfb794] hover:text-[#f3ede2] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed px-4 py-2 select-none"
                >
                  COMMIT TO YOUR ACTIONS
                </button>
              </div>
            ) : (
              <>
                  <p className="text-amber-400/70 text-xs mb-14 text-center max-w-lg leading-relaxed shrink-0">
                    The wretched Weaver glances over her shoulder without halting her spinning loom. She beckons you closer, hand outstretched and palm open.
                  </p>

                  <div className="flex flex-wrap gap-4 justify-center max-w-4xl mb-8 pt-4">
                  {masterDeck.map((c, idx) => {
                    const isSelected = mycoSelectedIndices.includes(idx);
                    const isDuplicateCard = masterDeck.filter(card => card.name === c.name).length >= 2;
                    return (
                      <div
                        key={c.id || `myco-${c.name}-${idx}`}
                        onClick={() => {
                          if (!isDuplicateCard) return;
                          if (mycoSelectedIndices.includes(idx)) {
                            setMycoSelectedIndices(prev => prev.filter(i => i !== idx));
                          } else if (mycoSelectedIndices.length < 2) {
                            setMycoSelectedIndices(prev => [...prev, idx]);
                          }
                        }}
                        className={`transition-all duration-200 transform ${
                          !isDuplicateCard
                            ? "opacity-30 cursor-not-allowed"
                            : "cursor-pointer"
                        } ${
                          isSelected ? "scale-105 -translate-y-3.5 z-30" : "hover:scale-105"
                        }`}
                      >
                        {renderCard(c, { isSelected })}
                      </div>
                    );
                  })}
                </div>

                <div className="flex items-center gap-4">
                  <button
                    onClick={confirmMycologistCombine}
                    disabled={
                      mycoSelectedIndices.length !== 2 ||
                      masterDeck[mycoSelectedIndices[0]]?.name !== masterDeck[mycoSelectedIndices[1]]?.name
                    }
                    className="bg-[#181310] hover:bg-[#231b16] active:bg-[#120e0b] border border-[#2f241c] rounded-sm shadow-[0_2px_0_#0a0807,inset_0_1px_0_rgba(255,255,255,0.06)] active:translate-y-[1px] active:shadow-none transition-all duration-75 font-['Cinzel',_serif] font-bold text-[11px] uppercase tracking-widest text-[#cfb794] hover:text-[#f3ede2] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed px-4 py-2 select-none"
                  >
                    SEW CREATURES
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* =========================================================================
          GOO MAGE GOOBERT EVENT SCREEN
         ========================================================================= */}
      {screen === 'EVENT_GOOBERT' && (
        <div className="absolute inset-0 bg-[#0d0906] bg-[radial-gradient(circle_at_50%_45%,#1c130c_0%,#0f0b07_55%,#050403_100%)] z-50 flex flex-col items-center justify-center p-6 overflow-y-auto animate-fade-up font-mono select-none">
          <div className="max-w-4xl w-full flex flex-col items-center justify-center text-center my-auto">
            <div className="text-[10px] text-amber-700/80 tracking-widest uppercase mb-1">+-- PRINTING PRESS --+</div>
            <h1 className="text-2xl sm:text-3xl font-mono font-bold uppercase tracking-widest text-teal-300 mb-1">STAMP-a-TWIN</h1>
            <p className="text-amber-400/70 text-xs mb-8 text-center max-w-lg leading-relaxed">
              The Begotten jeers and scoffs at any who question his Stamps and the quality of his Press. Allow him to demonstrate.
            </p>

            <div className="flex flex-wrap gap-4 justify-center max-w-4xl mb-8">
              {masterDeck.map((c, idx) => {
                const isSelected = goobertSelectedIdx === idx;
                return (
                  <div
                    key={c.id || `goo-${c.name}-${idx}`}
                    onClick={() => setGoobertSelectedIdx(idx)}
                    className={`cursor-pointer transform transition-all duration-200 ${
                      isSelected ? "scale-105 -translate-y-3.5 z-30" : "hover:scale-105"
                    }`}
                  >
                    {renderCard(c, { isSelected })}
                  </div>
                );
              })}
            </div>

            <div className="flex items-center gap-4">
              <button
                onClick={confirmGoobertClone}
                disabled={goobertSelectedIdx === null || isEventBusy}
                className="bg-[#181310] hover:bg-[#231b16] active:bg-[#120e0b] border border-[#2f241c] rounded-sm shadow-[0_2px_0_#0a0807,inset_0_1px_0_rgba(255,255,255,0.06)] active:translate-y-[1px] active:shadow-none transition-all duration-75 font-['Cinzel',_serif] font-bold text-[11px] uppercase tracking-widest text-[#cfb794] hover:text-[#f3ede2] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed px-4 py-2 select-none"
              >
                STAMP YOUR CARD
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          CAVE TRIAL SCREEN
         ========================================================================= */}
      {screen === 'EVENT_CAVE_TRIAL' && (
        <div 
          className="absolute inset-0 bg-[#0d0906] z-50 flex flex-col items-center justify-center p-6 overflow-y-auto animate-fade-up font-mono select-none"
          style={getScreenBgStyle('trialevent.jpg')}
        >
          <div className="max-w-2xl w-full flex flex-col items-center justify-center text-center my-auto">
            <div className="text-[10px] text-amber-700/80 tracking-widest uppercase mb-1">+-- THE CAVE TRIAL --+</div>
            <h1 className="text-2xl sm:text-3xl font-mono font-bold uppercase tracking-widest text-stone-200 mb-1">The Cavern Trials</h1>
            <p className="text-amber-400/70 text-xs mb-8 text-center max-w-md uppercase tracking-wider">
              The Zealot lays out the Trials of the Flock. 3 Creatures will be tested for their devotion, and Blessing imparted if they succeed.
            </p>

            {!caveSelectedTrial ? (
              <div className="flex flex-col gap-3 max-w-md w-full mb-8">
                {caveTrials.map(t => {
                    const isDisabled = isEventBusy || Boolean(caveSelectedTrial);
                    return (
                      <div
                        key={t}
                        onClick={() => !isDisabled && evaluateCaveTrial(t)}
                        className={`p-4 text-center transition-all border border-dashed rounded-[3px] select-none ${
                          isDisabled
                            ? 'opacity-40 cursor-not-allowed pointer-events-none border-[#8c6747]/30 bg-[#150f0a]'
                            : 'cursor-pointer group border-amber-950/40 hover:border-amber-600/70 bg-[#150f0a]/60 hover:bg-[#150f0a]'
                        }`}
                      >
                        <div className={`font-mono font-bold text-sm uppercase tracking-widest ${
                          isDisabled ? 'text-stone-500' : 'text-amber-200 group-hover:text-amber-100'
                        }`}>
                          {t}
                        </div>
                        <div className={`font-mono text-[10px] uppercase tracking-widest mt-1 transition-all ${
                          isDisabled ? 'text-stone-600' : 'text-amber-200/50 group-hover:text-amber-100 group-hover:tracking-[0.2em]'
                        }`}>
                          TRIAL OF THE FLOCK
                        </div>
                      </div>
                    );
                  })}
              </div>
            ) : (
              <div className="flex flex-col items-center max-w-2xl w-full">
                <h2 className={`text-xl font-mono font-bold uppercase tracking-widest mb-4 ${cavePassed ? 'text-amber-300' : 'text-red-400'}`}>
                  {cavePassed ? 'TRIAL PASSED' : 'TRIAL FAILED'}
                </h2>
                <div className="flex gap-4 justify-center mb-6">
                  {caveDrawnCards.map((c, i) => (
                    <div key={c.id || `cave-drawn-${i}`}>{renderCard(c)}</div>
                  ))}
                </div>

                {cavePassed && (
                  <div className="w-full flex flex-col items-center mb-6">
                    <p className="text-xs font-mono text-amber-400/70 mb-4 uppercase tracking-wider">The Zealot offers a Blessed Creature:</p>
                    <div className="flex gap-4 justify-center">
                      {caveRewardCards.map((c, idx) => (
                        <div
                          key={c.id || `cave-rew-${idx}`}
                          onClick={() => setCaveSelectedRewardIdx(idx)}
                          className="cursor-pointer"
                        >
                          {renderCard(c, { isSelected: caveSelectedRewardIdx === idx })}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <button
                    onClick={() => {
                      setIsEventBusy(false);
                      let updatedDeck = masterDeckRef.current && masterDeckRef.current.length > 0 ? [...masterDeckRef.current] : [...masterDeck];
                      if (cavePassed && caveSelectedRewardIdx !== null) {
                        updatedDeck = [...updatedDeck, cloneCard(caveRewardCards[caveSelectedRewardIdx])];
                        setMasterDeck(updatedDeck);
                        masterDeckRef.current = updatedDeck;
                      }
                      startNextDuel(undefined, updatedDeck);
                    }}
                    disabled={cavePassed && caveSelectedRewardIdx === null}
                  className="bg-[#181310] hover:bg-[#231b16] active:bg-[#120e0b] border border-[#2f241c] rounded-sm shadow-[0_2px_0_#0a0807,inset_0_1px_0_rgba(255,255,255,0.06)] active:translate-y-[1px] active:shadow-none transition-all duration-75 font-['Cinzel',_serif] font-bold text-[11px] uppercase tracking-widest text-[#cfb794] hover:text-[#f3ede2] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed px-4 py-2 select-none"
                >
                  PROCEED
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* =========================================================================
          WOODCARVER TOTEM SCREEN
         ========================================================================= */}
      {screen === 'EVENT_BUILD_TOTEM' && (
        <div 
          className="absolute inset-0 bg-[#0d0906] z-50 flex flex-col items-center justify-center p-6 overflow-y-auto animate-fade-up font-mono select-none"
          style={getScreenBgStyle('weaverevent.png')}
        >
          <div className="max-w-2xl w-full flex flex-col items-center justify-center text-center my-auto">
            <div className="text-[10px] text-amber-700/80 tracking-widest uppercase mb-1">+-- THE WEAVER'S LOOM --+</div>
            <h1 className="text-2xl sm:text-3xl font-mono font-bold uppercase tracking-widest text-amber-200 mb-1">Needle & Threadcraft</h1>

            {totemStage === 'REWARD' ? (
              <>
                <p className={`text-amber-400/70 text-xs mb-8 text-center max-w-md uppercase tracking-wider transition-opacity duration-300 ${isTotemFadingOut ? 'opacity-0' : ''}`}>
                  Claim an Tribal Patch or Threadbound Crest to bind to your Effigy.
                </p>

                {!totemChoicesHidden && (
                  <div className="flex gap-6 justify-center max-w-2xl mb-8">
                    {totemRewardChoices.map((tc, idx) => {
                      const isSelected = selectedTotemRewardIdx === idx;
                      const fadeAnim = isTotemFadingOut
                        ? isSelected
                          ? 'animate-swipe-up-fade pointer-events-none'
                          : 'opacity-0 transition-opacity duration-300 pointer-events-none'
                        : '';

                      return (
                        <div
                          key={`totem-rew-${idx}`}
                          onClick={() => !isEventBusy && !isTotemFadingOut && setSelectedTotemRewardIdx(idx)}
                          className={`p-4 border border-dashed rounded-[3px] transition text-center select-none w-40 flex flex-col items-center justify-between ${fadeAnim} ${
                            isSelected
                              ? 'border-amber-400 bg-[#1f150e] text-amber-100 shadow-[0_0_18px_rgba(245,158,11,0.3)] -translate-y-1'
                              : 'border-[#8c6747]/70 hover:border-amber-500/80 bg-[#140d08] text-stone-300'
                          } ${isEventBusy ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                        >
                          <div className="text-[9px] text-[#ab8a68] uppercase font-mono tracking-widest mb-1.5">
                            {tc.type === 'head' ? 'Tribal Patch' : 'Threaded Crest'}
                          </div>

                          <div className="w-14 h-14 bg-[#20150d] border border-[#4a3422] rounded-[2px] flex items-center justify-center p-1.5 mb-2">
                            {tc.type === 'head' ? (
                              TRIBE_EMBROIDERY[tc.value] || <span className="text-2xl">🧵</span>
                            ) : (
                              <img
                                src={getSigilArtUrl(tc.value)}
                                alt={tc.value}
                                className="w-10 h-10 object-contain filter drop-shadow brightness-90 contrast-125 pointer-events-none"
                                onError={(e) => {
                                  (e.currentTarget as HTMLElement).style.display = 'none';
                                }}
                              />
                            )}
                          </div>

                          <div className="text-sm font-mono font-bold text-amber-200 truncate w-full">
                            {tc.value}
                          </div>

                          <div className="mt-3 font-mono text-[9px] uppercase tracking-widest text-amber-200/50">
                            {selectedTotemRewardIdx === idx ? 'SELECTED' : 'SELECT'}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {!totemChoicesHidden && (
                  <button
                    onClick={async () => {
                      if (isEventBusy || selectedTotemRewardIdx === null) return;
                      setIsEventBusy(true);

                      const choice = totemRewardChoices[selectedTotemRewardIdx];
                      const nextPieces = [...totemPieces, choice];
                      setTotemPieces(nextPieces);
                      triggerSfx('play');

                      if (nextPieces.length >= 2) {
                        setTotemStage('ASSEMBLE');
                        const hIdx = nextPieces.findIndex(p => p.type === 'head');
                        const bIdx = nextPieces.findIndex(p => p.type === 'body');
                        setAssemblyHeadIdx(hIdx !== -1 ? hIdx : null);
                        setAssemblyBodyIdx(bIdx !== -1 ? bIdx : null);
                        setIsEventBusy(false);
                      } else {
                        if (choice.type === 'head') setActiveTotem(prev => ({ ...prev, head: choice.value as Tribe }));
                        else setActiveTotem(prev => ({ ...prev, body: choice.value }));
                        addLog(`Totem piece acquired: ${choice.value}`);

                        // 1. Chosen piece floats upward and fades out
                        setIsTotemFadingOut(true);
                        await new Promise(res => setTimeout(res, 500));

                        // 2. Unmount choices and button from the DOM completely
                        setTotemChoicesHidden(true);

                        // 3. Pause for an exact second on the empty loom
                        await new Promise(res => setTimeout(res, 1000));

                        startNextDuel();
                      }
                    }}
                    disabled={selectedTotemRewardIdx === null || isEventBusy}
                    className={`bg-[#181310] hover:bg-[#231b16] active:bg-[#120e0b] border border-[#2f241c] rounded-sm shadow-[0_2px_0_#0a0807,inset_0_1px_0_rgba(255,255,255,0.06)] active:translate-y-[1px] active:shadow-none transition-all duration-300 font-['Cinzel',_serif] font-bold text-[11px] uppercase tracking-widest text-[#cfb794] hover:text-[#f3ede2] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed px-4 py-2 select-none ${
                      isTotemFadingOut ? 'opacity-0 pointer-events-none' : ''
                    }`}
                  >
                    BIND TO EFFIGY
                  </button>
                )}
              </>
            ) : (
              <div className="flex flex-col items-center max-w-2xl w-full my-auto text-center">
                <p className="text-amber-400/70 text-xs mb-8 max-w-md uppercase tracking-wider">
                  Multiple remnants rest within your kit. Bind your active Effigy by choosing one Tribal Patch and one Threadbound Crest:
                </p>

                <div className="w-full border-t border-b border-amber-950/40 py-6 mb-8 flex flex-col gap-6">
                  {/* Available Head Patches */}
                  <div>
                    <div className="text-xs uppercase font-mono font-bold text-amber-400/80 tracking-widest mb-3">Available Head Patches:</div>
                    <div className="flex flex-wrap gap-3 justify-center">
                      {totemPieces.filter(p => p.type === 'head').length > 0 ? (
                        totemPieces.map((p, pIdx) => {
                          if (p.type !== 'head') return null;
                          const isChosen = assemblyHeadIdx === pIdx;
                          return (
                            <button
                              key={`asm-h-${pIdx}`}
                              onClick={() => setAssemblyHeadIdx(pIdx)}
                              className={`font-mono text-xs uppercase tracking-widest px-3 py-1.5 border border-dashed rounded-[3px] transition cursor-pointer flex items-center gap-2 ${
                                isChosen
                                  ? 'border-amber-400 text-amber-100 bg-[#241810] shadow-[0_0_12px_rgba(245,158,11,0.25)]'
                                  : 'border-[#8c6747]/60 text-stone-400 bg-[#140d08] hover:text-stone-200 hover:border-amber-600/70'
                              }`}
                            >
                              <div className="w-4 h-4 flex items-center justify-center">
                                {TRIBE_EMBROIDERY[p.value] || <span>🧵</span>}
                              </div>
                              <span>{p.value}</span>
                            </button>
                          );
                        })
                      ) : (
                        <span className="text-xs font-mono text-stone-600 italic">No Tribal Patches collected yet.</span>
                      )}
                    </div>
                  </div>

                  {/* Available Torso Sigils */}
                  <div>
                    <div className="text-xs uppercase font-mono font-bold text-amber-400/80 tracking-widest mb-3">Available Threadbound Crests:</div>
                    <div className="flex flex-wrap gap-3 justify-center">
                      {totemPieces.filter(p => p.type === 'body').length > 0 ? (
                        totemPieces.map((p, pIdx) => {
                          if (p.type !== 'body') return null;
                          const isChosen = assemblyBodyIdx === pIdx;
                          return (
                            <button
                              key={`asm-b-${pIdx}`}
                              onClick={() => setAssemblyBodyIdx(pIdx)}
                              className={`font-mono text-xs uppercase tracking-widest px-3 py-1.5 border border-dashed rounded-[3px] transition cursor-pointer flex items-center gap-2 ${
                                isChosen
                                  ? 'border-amber-400 text-amber-100 bg-[#241810] shadow-[0_0_12px_rgba(245,158,11,0.25)]'
                                  : 'border-[#8c6747]/60 text-stone-400 bg-[#140d08] hover:text-stone-200 hover:border-amber-600/70'
                              }`}
                            >
                              <img
                                src={getSigilArtUrl(p.value)}
                                alt={p.value}
                                className="w-4 h-4 object-contain filter drop-shadow brightness-90 contrast-125 pointer-events-none"
                                onError={(e) => {
                                  (e.currentTarget as HTMLElement).style.display = 'none';
                                }}
                              />
                              <span>{p.value}</span>
                            </button>
                          );
                        })
                      ) : (
                        <span className="text-xs font-mono text-stone-600 italic">No Threadbound Crests collected yet.</span>
                      )}
                    </div>
                  </div>

                  {/* Constructed Effigy Preview */}
                  <div className="flex items-center justify-center gap-4 text-xs font-mono bg-[#160f0a] border border-dashed border-[#8c6747]/60 rounded-[3px] px-4 py-2.5 max-w-md mx-auto">
                    <span className="text-[#ab8a68] uppercase tracking-wider text-[10px]">Stitched Effigy:</span>
                    <div className="flex items-center gap-1.5 text-amber-200 font-bold uppercase">
                      {assemblyHeadIdx !== null ? (
                        <>
                          <span className="w-4 h-4 flex items-center justify-center">{TRIBE_EMBROIDERY[totemPieces[assemblyHeadIdx]?.value]}</span>
                          <span>{totemPieces[assemblyHeadIdx]?.value}</span>
                        </>
                      ) : (
                        <span className="text-stone-600">—</span>
                      )}
                    </div>
                    <span className="text-[#8c6747] font-mono">✕</span>
                    <div className="flex items-center gap-1.5 text-emerald-400 font-bold uppercase">
                      {assemblyBodyIdx !== null ? (
                        <>
                          <img
                            src={getSigilArtUrl(totemPieces[assemblyBodyIdx]?.value || '')}
                            alt=""
                            className="w-4 h-4 object-contain pointer-events-none"
                            onError={(e) => { (e.currentTarget as HTMLElement).style.display = 'none'; }}
                          />
                          <span>{totemPieces[assemblyBodyIdx]?.value}</span>
                        </>
                      ) : (
                        <span className="text-stone-600">—</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  {assemblyHeadIdx !== null && assemblyBodyIdx !== null ? (
                    <button
                      onClick={() => {
                        const hVal = totemPieces[assemblyHeadIdx].value as Tribe;
                        const bVal = totemPieces[assemblyBodyIdx].value;
                        const newTotem = { head: hVal, body: bVal };
                        setActiveTotem(newTotem);
                        addLog(`Effigy stitched: ${hVal} + ${bVal}`);
                        startNextDuel();
                      }}
                      className="bg-[#181310] hover:bg-[#231b16] active:bg-[#120e0b] border border-[#2f241c] rounded-sm shadow-[0_2px_0_#0a0807,inset_0_1px_0_rgba(255,255,255,0.06)] active:translate-y-[1px] active:shadow-none transition-all duration-75 font-['Cinzel',_serif] font-bold text-[11px] uppercase tracking-widest text-[#cfb794] hover:text-[#f3ede2] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed px-4 py-2 select-none"
                    >
                      STITCH EFFIGY
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        let nextHead = activeTotem.head;
                        let nextBody = activeTotem.body;
                        if (assemblyHeadIdx !== null) nextHead = totemPieces[assemblyHeadIdx!].value as Tribe;
                        if (assemblyBodyIdx !== null) nextBody = totemPieces[assemblyBodyIdx!].value;
                        const newTotem = { head: nextHead, body: nextBody };
                        setActiveTotem(newTotem);
                        startNextDuel(undefined, undefined, newTotem);
                      }}
                      className="bg-[#181310] hover:bg-[#231b16] active:bg-[#120e0b] border border-[#2f241c] rounded-sm shadow-[0_2px_0_#0a0807,inset_0_1px_0_rgba(255,255,255,0.06)] active:translate-y-[1px] active:shadow-none transition-all duration-75 font-['Cinzel',_serif] font-bold text-[11px] uppercase tracking-widest text-[#cfb794] hover:text-[#f3ede2] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed px-4 py-2 select-none"
                    >
                      STORE PIECES & PROCEED
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* =========================================================================
          CARD CHOICE (WILD BEASTS) SCREEN
         ========================================================================= */}
      {screen === 'EVENT_CARD_CHOICE' && (
        <div 
          className="absolute inset-0 bg-[#0d0906] z-50 flex flex-col items-center justify-center p-6 overflow-y-auto animate-fade-up font-mono select-none"
          style={getScreenBgStyle('choiceevent.png')}
        >
          <div className="max-w-2xl w-full flex flex-col items-center justify-center text-center my-auto">
            <div className="text-[10px] text-amber-700/80 tracking-widest uppercase mb-1">+-- DECK REINFORCEMENT --+</div>
            <h1 className="text-2xl sm:text-3xl font-mono font-bold uppercase tracking-widest text-amber-200 mb-1">Wild Beasts</h1>
            <p className="text-amber-400/70 text-xs mb-8 text-center max-w-md uppercase tracking-wider">A trio of feral denizens emerge. Select one Creature to accompany you.</p>

            {/* Handheld 3-card fanning spread directly on the dark surface */}
            <div className="relative flex items-center justify-center w-full h-[220px] mb-8 select-none group">
              {choiceCards.map((c, idx) => {
                const isSelected = choiceSelectedIdx === idx;
                const fanTransforms = [
                  'rotate-[-9deg] -translate-x-[85px] group-hover:-translate-x-[115px] group-hover:rotate-[-12deg] z-0',
                  'rotate-0 -translate-y-2 group-hover:-translate-y-4 z-10',
                  'rotate-[9deg] translate-x-[85px] group-hover:translate-x-[115px] group-hover:rotate-[12deg] z-20'
                ];
                return (
                  <div
                    key={c.id || `choice-${idx}`}
                    onClick={() => setChoiceSelectedIdx(idx)}
                    className={`absolute cursor-pointer transform origin-bottom transition-all duration-300 ease-out ${fanTransforms[idx] || ''} ${
                      isSelected
                        ? '!z-30 -translate-y-8 scale-110 rotate-0 shadow-[0_20px_35px_rgba(0,0,0,0.95)]'
                        : 'hover:-translate-y-3 hover:scale-105 hover:!z-25'
                    }`}
                  >
                    {renderCard(c, { isSelected })}
                  </div>
                );
              })}
            </div>

            <div className="flex items-center gap-4">
              <button
                onClick={() => {
                  let updatedDeck = masterDeckRef.current && masterDeckRef.current.length > 0 ? [...masterDeckRef.current] : [...masterDeck];
                  if (choiceSelectedIdx !== null) {
                    updatedDeck = [...updatedDeck, cloneCard(choiceCards[choiceSelectedIdx])];
                    setMasterDeck(updatedDeck);
                    masterDeckRef.current = updatedDeck;
                  }
                  startNextDuel(undefined, updatedDeck);
                }}
                disabled={choiceSelectedIdx === null}
                className="bg-[#181310] hover:bg-[#231b16] active:bg-[#120e0b] border border-[#2f241c] rounded-sm shadow-[0_2px_0_#0a0807,inset_0_1px_0_rgba(255,255,255,0.06)] active:translate-y-[1px] active:shadow-none transition-all duration-75 font-['Cinzel',_serif] font-bold text-[11px] uppercase tracking-widest text-[#cfb794] hover:text-[#f3ede2] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed px-4 py-2 select-none"
              >
                TAKE CREATURE
              </button>
              {choiceRerollsLeft > 0 && (
                <button
                  onClick={rerollCardChoice}
                  className="bg-[#181310] hover:bg-[#231b16] active:bg-[#120e0b] border border-[#2f241c] rounded-sm shadow-[0_2px_0_#0a0807,inset_0_1px_0_rgba(255,255,255,0.06)] active:translate-y-[1px] active:shadow-none transition-all duration-75 font-['Cinzel',_serif] font-bold text-[11px] uppercase tracking-widest text-[#cfb794] hover:text-[#f3ede2] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed px-4 py-2 select-none"
                >
                  RUB YOUR EYES ({choiceRerollsLeft} LEFT)
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          HOARDER SEARCH SCREEN
         ========================================================================= */}
      {screen === 'EVENT_HOARDER_SEARCH' && (
        <div className={`absolute inset-0 bg-[#0d0906] bg-[radial-gradient(circle_at_50%_45%,#1c130c_0%,#0f0b07_55%,#050403_100%)] z-50 flex flex-col items-center justify-center p-6 overflow-y-auto font-mono select-none ${menuFadingOut ? 'animate-menu-fade-out' : 'animate-menu-fade-in'}`}>
          <div className="max-w-4xl w-full flex flex-col items-center justify-center text-center my-auto">
            <div className="text-[10px] text-amber-700/80 tracking-widest uppercase mb-1">+-- SLEIGHT OF HAND --+</div>
            <h1 className="text-2xl sm:text-3xl font-mono font-bold uppercase tracking-widest text-amber-200 mb-1">Hoarder Search</h1>
            <p className="text-amber-400/70 text-xs mb-8 text-center max-w-md uppercase tracking-wider">The Weaver taught you well. Select any creature from your deck to add to your hand.</p>

            <div className="flex flex-wrap gap-4 justify-center max-w-4xl mb-6">
              {deck.map((c, idx) => {
                const isSelected = hoarderSelectedIdx === idx;
                return (
                  <div
                    key={c.id || `hoarder-${idx}`}
                    onClick={() => setHoarderSelectedIdx(idx)}
                    className={`cursor-pointer transform transition-all duration-200 ${
                      isSelected ? "scale-105 -translate-y-3.5 z-30" : "hover:scale-105"
                    }`}
                  >
                    {renderCard(c, { isSelected })}
                  </div>
                );
              })}
            </div>

            <div className="flex items-center gap-4">
              <button
                onClick={() => {
                  if (hoarderSelectedIdx === null) return;
                  const card = deck[hoarderSelectedIdx];
                  setDeck(prev => prev.filter((_, i) => i !== hoarderSelectedIdx));
                  setHand(prev => [...prev, applyPlayerTotem(transformAmorphous(card), activeTotem)]);
                  addLog(`Hoarder retrieved ${card.name}!`);
                  setHoarderSelectedIdx(null);
                  setScreen('DUEL');
                }}
                disabled={hoarderSelectedIdx === null}
                className="bg-[#181310] hover:bg-[#231b16] active:bg-[#120e0b] border border-[#2f241c] rounded-sm shadow-[0_2px_0_#0a0807,inset_0_1px_0_rgba(255,255,255,0.06)] active:translate-y-[1px] active:shadow-none transition-all duration-75 font-['Cinzel',_serif] font-bold text-[11px] uppercase tracking-widest text-[#cfb794] hover:text-[#f3ede2] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed px-4 py-2 select-none"
              >
                RETRIEVE CREATURE
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          VIEW DECK SCREEN MODAL (BORDERLESS SIDE-BY-SIDE SPLIT)
         ========================================================================= */}
      {screen === 'VIEW_DECK' && (() => {
        const activeDetailCard = selectedDeckCardDetail || masterDeck[0] || null;
        return (
          <div className={`absolute inset-0 bg-[#0a0705]/95 z-50 flex flex-col items-center p-6 overflow-y-auto font-mono select-none ${menuFadingOut ? 'animate-menu-fade-out' : 'animate-menu-fade-in'}`}>
            {/* Header with Return Action */}
            <div className="relative flex flex-col items-center justify-center w-full max-w-5xl mb-6 border-b border-amber-950/40 pb-4">
              <div className="text-[10px] text-amber-700/80 uppercase tracking-widest mb-1">+-- DECK INSPECTION --+</div>
              <h1 className="text-xl sm:text-2xl font-mono uppercase tracking-widest text-amber-200 text-center font-bold">
                Your Creatures Huddle Closely Together…
              </h1>
              <p className="text-xs text-amber-400/60 uppercase tracking-wider mt-1">
                {masterDeck.length} Creatures in your Deck
              </p>
              <button
                onClick={() => setScreen(previousScreen || 'DUEL')}
                className="absolute right-0 top-1 bg-[#181310] hover:bg-[#231b16] active:bg-[#120e0b] border border-[#2f241c] rounded-sm shadow-[0_2px_0_#0a0807,inset_0_1px_0_rgba(255,255,255,0.06)] active:translate-y-[1px] active:shadow-none transition-all duration-75 font-['Cinzel',_serif] font-bold text-[11px] uppercase tracking-widest text-[#cfb794] hover:text-[#f3ede2] cursor-pointer px-3 py-1.5"
              >
                RETURN
              </button>
            </div>

            {/* Quick Strip of All Cards in Master Deck directly on table */}
            <div className="flex flex-wrap gap-3 justify-center max-w-5xl mb-8">
              {masterDeck.map((c, idx) => {
                const isSelected = activeDetailCard?.id === c.id || (!selectedDeckCardDetail && idx === 0);
                return (
                  <div
                    key={c.id || `view-${c.name}-${idx}`}
                    onClick={() => setSelectedDeckCardDetail(c)}
                    className={`cursor-pointer transform transition-all duration-200 ${isSelected ? 'scale-105 -translate-y-2 z-30' : 'opacity-70 hover:opacity-100 hover:scale-105'}`}
                  >
                    {renderCard(c, { isSelected })}
                  </div>
                );
              })}
            </div>

            {/* Borderless Two-Column Split: Card on Left, Plain Text Sigils & Stats on Right */}
            {activeDetailCard && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-2xl w-full items-center my-auto py-4">
                {/* Left Column: Enlarged Card */}
                <div className="flex justify-center items-center">
                  <div className="scale-125 transform transition-transform">
                    {renderCard(activeDetailCard, { showCost: true })}
                  </div>
                </div>

                {/* Right Column: Plain Text List of Stats, Tribe, Sigils & Descriptions (No Containers) */}
                <div className="flex flex-col text-left font-mono space-y-3">
                  <div>
                    <h2 className="text-xl font-bold uppercase tracking-widest text-amber-200">
                      {activeDetailCard.name}
                    </h2>
                    <div className="text-xs text-amber-400/70 uppercase tracking-wider mt-1">
                      [ Tribe: {activeDetailCard.class} ]
                      {activeDetailCard.cost !== undefined && activeDetailCard.cost > 0 && ` • [ Cost: ${activeDetailCard.cost} Blood ]`}
                      {activeDetailCard.boneCost !== undefined && activeDetailCard.boneCost > 0 && ` • [ Cost: ${activeDetailCard.boneCost} Bones ]`}
                    </div>
                    <div className="text-xs text-stone-400 uppercase tracking-wider mt-0.5">
                      [ Power: {activeDetailCard.attack} ] • [ Health: {activeDetailCard.health} ]
                    </div>
                  </div>

                  <div className="border-t border-amber-950/50 pt-3">
                    <div className="text-[10px] uppercase tracking-widest text-amber-600/90 mb-2 font-bold">
                      --- SIGILS & INTRINSICS ---
                    </div>
                    {activeDetailCard.sigils && activeDetailCard.sigils.length > 0 ? (
                      <div className="space-y-2.5">
                        {activeDetailCard.sigils.map(s => (
                          <div key={s} className="space-y-0.5">
                            <div className="text-xs font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                              <span>[ {s} ]</span>
                              <span className="text-sm filter sepia-[0.35]">{SIGIL_MAPPING[s] || ''}</span>
                            </div>
                            <div className="text-[11px] text-stone-300/80 leading-relaxed font-mono pl-3">
                              {SIGIL_DESCRIPTIONS[s] || 'Ancient sigil.'}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-xs text-stone-600 italic">No Crests imprinted upon this creature.</div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {/* =========================================================================
          DEV TOOLS SCREEN MODAL (FULL ORIGINAL FEATURES RESTORED)
         ========================================================================= */}
      {screen === 'DEV_MENU' && (
        <div className={`absolute inset-0 bg-[#0a0705]/95 z-50 flex flex-col items-center p-4 sm:p-6 overflow-y-auto backdrop-blur-md font-mono select-none ${menuFadingOut ? 'animate-menu-fade-out' : 'animate-menu-fade-in'}`}>
          <div className="w-full max-w-3xl border border-amber-950/60 p-6 sm:p-8 bg-[#0c0805] mb-10">
            <div className="flex justify-between items-center mb-4 border-b border-amber-950/50 pb-3">
              <div>
                <div className="text-[10px] text-amber-700/80 uppercase tracking-widest mb-0.5">+-- OCCULT PROTOCOLS --+</div>
                <h2 className="text-lg sm:text-xl font-mono font-bold text-amber-200 uppercase tracking-widest">Development Console</h2>
              </div>
              <button
                onClick={() => setScreen(previousScreen || 'DUEL')}
                className="bg-[#181310] hover:bg-[#231b16] active:bg-[#120e0b] border border-[#2f241c] rounded-sm shadow-[0_2px_0_#0a0807,inset_0_1px_0_rgba(255,255,255,0.06)] active:translate-y-[1px] active:shadow-none transition-all duration-75 font-['Cinzel',_serif] font-bold text-[11px] uppercase tracking-widest text-[#cfb794] hover:text-[#f3ede2] cursor-pointer px-3 py-1.5"
              >
                CLOSE
              </button>
            </div>

            {/* Duel / Enemy Restrictions Status */}
            <div className="text-[11px] text-stone-400 font-mono mb-4 flex flex-wrap items-center justify-between border-y border-amber-950/40 py-2.5 gap-2">
              <span>Encounter #{encounter} | Stage {displayStage} | Turn {turnNumber}</span>
              <span className="text-amber-300 font-bold">
                {isBossMatch ? 'Boss Battle (Rules Exempt)' : `Enemy Cards: ${enemyCardsPlayed} / ${enemyMaxDuelCards} max | Board: ${enemyBoard.filter(c => c !== null).length + enemyQueue.filter(c => c !== null).length}/6`}
              </span>
            </div>

            {/* Force Actions Toggle Button */}
            <button
              onClick={() => setDevForceSubmenuOpen(!devForceSubmenuOpen)}
              className="w-full py-2 px-3 border border-amber-950/50 hover:border-amber-700/60 font-mono text-xs uppercase tracking-widest text-amber-200/80 hover:text-amber-100 hover:tracking-[0.18em] transition-all flex items-center justify-between mb-4 cursor-pointer"
            >
              <span>FORCE ENCOUNTERS & BOSSES</span>
              <span className="text-amber-500/70">{devForceSubmenuOpen ? '−' : '+'}</span>
            </button>

            {/* Force Actions Submenu Grid */}
            {devForceSubmenuOpen && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-6 p-3 border border-amber-950/40 bg-black/30">
                <button onClick={() => handleDevForce('combat')} className="py-1.5 px-2 text-[11px] font-mono uppercase tracking-wider text-red-400 hover:text-red-200 border border-red-950/60 hover:border-red-800 transition cursor-pointer">COMBAT</button>
                <button onClick={() => handleDevForce('boss-woodcarver')} className="py-1.5 px-2 text-[11px] font-mono uppercase tracking-wider text-amber-300 hover:text-amber-100 border border-amber-950/60 hover:border-amber-800 transition cursor-pointer">THE WEAVER</button>
                <button onClick={() => handleDevForce('boss-zealot')} className="py-1.5 px-2 text-[11px] font-mono uppercase tracking-wider text-red-400 hover:text-red-200 border border-red-950/60 hover:border-red-800 transition cursor-pointer">THE ZEALOT</button>
                <button onClick={() => handleDevForce('boss-goobert')} className="py-1.5 px-2 text-[11px] font-mono uppercase tracking-wider text-emerald-400 hover:text-emerald-200 border border-emerald-950/60 hover:border-emerald-800 transition cursor-pointer">THE BEGOTTEN</button>
                <button onClick={() => handleDevForce('boss-bonelord')} className="py-1.5 px-2 text-[11px] font-mono uppercase tracking-wider text-stone-300 hover:text-white border border-stone-800 hover:border-stone-600 transition cursor-pointer">BONE LORD</button>
                <button onClick={() => handleDevForce('campfire')} className="py-1.5 px-2 text-[11px] font-mono uppercase tracking-wider text-amber-400 hover:text-amber-200 border border-amber-950/60 hover:border-amber-800 transition cursor-pointer">CAMPFIRE</button>
                <button onClick={() => handleDevForce('altar')} className="py-1.5 px-2 text-[11px] font-mono uppercase tracking-wider text-purple-400 hover:text-purple-200 border border-purple-950/60 hover:border-purple-800 transition cursor-pointer">ALTAR</button>
                <button onClick={() => handleDevForce('carving')} className="py-1.5 px-2 text-[11px] font-mono uppercase tracking-wider text-emerald-400 hover:text-emerald-200 border border-emerald-950/60 hover:border-emerald-800 transition cursor-pointer">CARVING</button>
                <button onClick={() => handleDevForce('cost')} className="py-1.5 px-2 text-[11px] font-mono uppercase tracking-wider text-amber-300 hover:text-amber-100 border border-amber-950/60 hover:border-amber-800 transition cursor-pointer">COST BARGAIN</button>
                <button onClick={() => handleDevForce('choice')} className="py-1.5 px-2 text-[11px] font-mono uppercase tracking-wider text-amber-300 hover:text-amber-100 border border-amber-950/60 hover:border-amber-800 transition cursor-pointer">CARD CHOICE</button>
                <button onClick={() => handleDevForce('bonelord')} className="py-1.5 px-2 text-[11px] font-mono uppercase tracking-wider text-stone-300 hover:text-stone-100 border border-stone-800 hover:border-stone-600 transition cursor-pointer">BONE ALTAR</button>
                <button onClick={() => handleDevForce('mycologist')} className="py-1.5 px-2 text-[11px] font-mono uppercase tracking-wider text-amber-300 hover:text-amber-100 border border-amber-950/60 hover:border-amber-800 transition cursor-pointer">MYCOLOGIST</button>
                <button onClick={() => handleDevForce('goobert')} className="py-1.5 px-2 text-[11px] font-mono uppercase tracking-wider text-emerald-400 hover:text-emerald-200 border border-emerald-950/60 hover:border-emerald-800 transition cursor-pointer">BEGOTTEN EVENT</button>
                <button onClick={() => handleDevForce('cave')} className="py-1.5 px-2 text-[11px] font-mono uppercase tracking-wider text-stone-300 hover:text-stone-100 border border-stone-800 hover:border-stone-600 transition cursor-pointer">CAVE TRIAL</button>
                <button onClick={() => handleDevForce('totem')} className="py-1.5 px-2 text-[11px] font-mono uppercase tracking-wider text-amber-400 hover:text-amber-200 border border-amber-950/60 hover:border-amber-800 transition cursor-pointer">WOODCARVER</button>
              </div>
            )}

            {/* Quick Actions (Tip Scales, Alter Deck, New Hand) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6 border-b border-amber-950/40 pb-5">
              <button
                onClick={() => {
                  const targetWin = getRequiredScaleWinDamage();
                  const isBoneLordP2 = isBossMatch && bossState.type === 'BoneLord' && bossPhase === 2;

                  if (isBossMatch && (bossPhase === 1 || isBoneLordP2)) {
                    const nextPhase = bossPhase + 1;
                    setScale(0);
                    setBossPhase(nextPhase);
                    setIsPhaseTransition(true);
                    triggerSfx('victory');
                    setTimeout(() => setIsPhaseTransition(false), 2500);

                    // Wipe enemy battlefield clean entering Phase 2
                    setEnemyBoard([null, null, null, null]);
                    setEnemyQueue([null, null, null, null]);

                    if (bossState.type === 'Zealot') {
                      setPlayerBoard(prev => prev.map(slot => (slot === null ? cloneCard(ALL_CARD_LOOKUP['Stone Wall'], 0) : slot)));
                      let targetCol = 0;
                      let highestPower = -1;
                      for (let c = 0; c < 4; c++) {
                        const card = playerBoard[c];
                        if (card) {
                          const power = getCardAttack(card, c, true);
                          if (power > highestPower) {
                            highestPower = power;
                            targetCol = c;
                          }
                        }
                      }
                      const cleanQueue: (CardInstance | null)[] = [null, null, null, null];
                      cleanQueue[targetCol] = cloneCard(ALL_CARD_LOOKUP['Adder'], 0);
                      setEnemyQueue(cleanQueue);

                      setBossState(prev => ({
                        ...prev,
                        phase: 2,
                        skipNextPlayerTurn: true,
                      }));
                      addLog("=== THE ZEALOT: PHASE 2 INITIALIZED ===");
                    } else if (bossState.type === 'The Begotten') {
                      let targetCol = 0;
                      let highestPower = -1;
                      for (let c = 0; c < 4; c++) {
                        const card = playerBoard[c];
                        if (card) {
                          const power = getCardAttack(card, c, true);
                          if (power > highestPower) {
                            highestPower = power;
                            targetCol = c;
                          }
                        }
                      }
                      setEnemyBoard(prev => {
                        const next = [...prev];
                        next[targetCol] = transformAmorphous(cloneCard(ALL_CARD_LOOKUP['Amoeba'], 0));
                        return next;
                      });
                      setBossState(prev => ({ ...prev, phase: 2 }));
                      addLog("=== GOOBERT: PHASE 2 INITIALIZED ===");
                    } else if (bossState.type === 'BoneLord') {
                      if (bossPhase === 1) {
                        let targetCol = playerBoard.findIndex(c => c === null);
                        if (targetCol === -1) {
                          let maxAttack = -1;
                          for (let c = 0; c < 4; c++) {
                            const pCard = playerBoard[c];
                            if (pCard && pCard.attack > maxAttack) {
                              maxAttack = pCard.attack;
                              targetCol = c;
                            }
                          }
                        }
                        if (targetCol === -1) targetCol = 0;
                        setEnemyBoard(prev => {
                          const next = [...prev];
                          next[targetCol] = cloneCard(ALL_CARD_LOOKUP['Reaper'], 0);
                          return next;
                        });
                        setEnemyQueue(prev => {
                          const next = [...prev];
                          next[0] = cloneCard(ALL_CARD_LOOKUP['Felled Tree'] || ALL_CARD_LOOKUP['Stone Wall'], 0);
                          next[1] = cloneCard(ALL_CARD_LOOKUP['Skeleton'], 0);
                          return next;
                        });
                        setPlayerBoard(prev =>
                          prev.map((c, idx) => {
                            if (!c) return null;
                            const currentEffectiveAttack = getCardAttack(c, idx, true);
                            return {
                              ...c,
                              attack: Math.max(0, c.health || 0),
                              health: Math.max(1, currentEffectiveAttack),
                              sigils: Array.from(new Set([...c.sigils, 'Shadow'])),
                            };
                          })
                        );
                        setBossState(prev => ({ ...prev, phase: 2, activeDialogue: '......' }));
                        addLog("=== THE BONE LORD: PHASE 2 INITIALIZED ===");
                      } else if (bossPhase === 2) {
                        setEnemyBoard([cloneCard(ALL_CARD_LOOKUP['BLOOD MOON'], 0), null, null, null]);
                        setEnemyQueue([null, null, null, null]);
                        setBossState(prev => ({
                          ...prev,
                          phase: 3,
                          activeDialogue: '....the Bone Lord’s gaze feels like it could rip the soul from your body….',
                        }));
                        addLog("=== THE BONE LORD: PHASE 3 INITIALIZED ===");
                      }
                    }

                    setTurnNumber(prev => prev + 1);
                    setPhase('DRAW');
                    setScreen('DUEL');
                  } else {
                    setScale(targetWin);
                    setScreen('DUEL');
                    handleWinMatch();
                  }
                }}
                className="py-2 px-3 border border-amber-950/60 hover:border-amber-700/70 font-mono text-xs uppercase tracking-widest text-amber-200/80 hover:text-amber-100 hover:tracking-[0.15em] transition-all cursor-pointer text-center"
              >
                TIP SCALES
              </button>
              <button
                onClick={() => setDevTab(devTab === 'ALTER_DECK' ? 'ACTIONS' : 'ALTER_DECK')}
                className="py-2 px-3 border border-amber-950/60 hover:border-amber-700/70 font-mono text-xs uppercase tracking-widest text-amber-200/80 hover:text-amber-100 hover:tracking-[0.15em] transition-all cursor-pointer text-center"
              >
                ALTER DECK
              </button>
              <button
                onClick={() => {
                  handleDevNewHand();
                  setScreen('DUEL');
                }}
                className="py-2 px-3 border border-amber-950/60 hover:border-amber-700/70 font-mono text-xs uppercase tracking-widest text-amber-200/80 hover:text-amber-100 hover:tracking-[0.15em] transition-all cursor-pointer text-center"
              >
                NEW HAND
              </button>
            </div>

            {/* Alter Deck View */}
            {devTab === 'ALTER_DECK' && (
              <div className="border border-amber-950/40 p-4 mb-6">
                <div className="text-[10px] uppercase tracking-widest text-amber-600 mb-1">--- ALTER MASTER DECK ---</div>
                <input
                  type="text"
                  placeholder="Search cards to add or swap..."
                  value={devCardSearch}
                  onChange={e => setDevCardSearch(e.target.value)}
                  className="w-full bg-transparent border-b border-amber-950/60 pb-1.5 text-xs text-amber-200 placeholder-stone-600 font-mono focus:outline-none focus:border-amber-600 mb-3"
                />
                <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto mb-3">
                  {MAIN_DECK_POOL.filter(c => c.name.toLowerCase().includes(devCardSearch.toLowerCase())).map(c => (
                    <button
                      key={c.name}
                      onClick={() => setDevAlterCard(c)}
                      className={`px-2 py-1 text-xs border font-mono transition cursor-pointer ${
                        devAlterCard?.name === c.name ? 'border-amber-500 text-amber-100 bg-amber-950/40' : 'border-amber-950/50 text-stone-400 hover:text-amber-200'
                      }`}
                    >
                      {c.name} {c.emoji}
                    </button>
                  ))}
                </div>

                {devAlterCard && (
                  <div className="p-3 border border-amber-950/50 mb-3 flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-amber-200 font-mono">Selected: {devAlterCard.name} ({devAlterCard.emoji})</span>
                      <button
                        onClick={() => {
                          setMasterDeck(prev => [...prev, cloneCard(devAlterCard, ouroborosBuffs)]);
                          addLog(`[DEV] Added ${devAlterCard.name} to Master Deck.`);
                          setDevAlterCard(null);
                        }}
                        className="text-xs uppercase font-mono tracking-widest text-emerald-400 hover:text-emerald-200 hover:tracking-[0.15em] transition cursor-pointer"
                      >
                        ADD TO DECK
                      </button>
                    </div>

                    {masterDeck.length > 0 && (
                      <div className="border-t border-amber-950/40 pt-2">
                        <span className="text-[10px] text-amber-600 font-mono uppercase tracking-wider block mb-1.5">
                          Or Swap With Card in Current Decklist:
                        </span>
                        <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
                          {masterDeck.map((dCard, dIdx) => (
                            <button
                              key={`swap-${dCard.name}-${dIdx}`}
                              onClick={() => {
                                const nextDeck = [...masterDeck];
                                nextDeck[dIdx] = cloneCard(devAlterCard, ouroborosBuffs);
                                setMasterDeck(nextDeck);
                                addLog(`[DEV] Swapped ${dCard.name} with ${devAlterCard.name} in Master Deck.`);
                                setDevAlterCard(null);
                              }}
                              className="px-2 py-1 border border-amber-950/40 hover:border-amber-700 text-[11px] text-stone-400 hover:text-amber-200 font-mono transition flex items-center gap-1 cursor-pointer"
                              title={`Click to replace ${dCard.name} with ${devAlterCard.name}`}
                            >
                              <span>{dCard.name}</span>
                              <span className="text-stone-600 text-[10px]">({dCard.attack}/{dCard.health})</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Game Directories (List All Cards & List All Sigils) */}
            <div className="text-[10px] font-mono uppercase tracking-widest text-amber-600 mb-2">--- COMPENDIUM DIRECTORIES ---</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
              <button
                onClick={() => setDevTab(devTab === 'CARDS' ? 'ACTIONS' : 'CARDS')}
                className="py-2 px-3 border border-amber-950/60 hover:border-amber-700/70 font-mono text-xs uppercase tracking-widest text-amber-200/80 hover:text-amber-100 hover:tracking-[0.15em] transition-all cursor-pointer text-center"
              >
                [ LIST ALL CARDS ({MAIN_DECK_POOL.length + 8}) ]
              </button>
              <button
                onClick={() => setDevTab(devTab === 'SIGILS' ? 'ACTIONS' : 'SIGILS')}
                className="py-2 px-3 border border-amber-950/60 hover:border-amber-700/70 font-mono text-xs uppercase tracking-widest text-amber-200/80 hover:text-amber-100 hover:tracking-[0.15em] transition-all cursor-pointer text-center"
              >
                [ LIST ALL SIGILS ({Object.keys(SIGIL_MAPPING).length}) ]
              </button>
            </div>

            {/* List All Cards Table with Search */}
            {devTab === 'CARDS' && (
              <div className="border border-amber-950/40 p-3 mb-6">
                <div className="relative mb-2">
                  <input
                    type="text"
                    placeholder="Search cards by name, tribe, cost, or sigil..."
                    value={devCardsFilter}
                    onChange={e => setDevCardsFilter(e.target.value)}
                    className="w-full bg-transparent border-b border-amber-950/60 pb-1.5 pr-8 text-xs text-amber-200 placeholder-stone-600 font-mono focus:outline-none focus:border-amber-600"
                  />
                  {devCardsFilter && (
                    <button
                      onClick={() => setDevCardsFilter('')}
                      className="absolute right-2 top-0.5 text-xs text-stone-500 hover:text-amber-200 font-mono cursor-pointer"
                      title="Clear search"
                    >
                      ✕
                    </button>
                  )}
                </div>
                <div className="text-[10px] text-stone-500 font-mono mb-2 flex justify-between">
                  <span>Showing {
                    Object.values(ALL_CARD_LOOKUP).filter(c => {
                      const term = devCardsFilter.trim().toLowerCase();
                      if (!term) return true;
                      const nameMatches = c.name?.toLowerCase().includes(term);
                      const classMatches = c.class?.toLowerCase().includes(term);
                      const sigilMatches = (c.sigils || []).some(s => s?.toLowerCase().includes(term));
                      const costMatches = (c.cost !== undefined && String(c.cost) === term) || (c.boneCost !== undefined && String(c.boneCost) === term);
                      return nameMatches || classMatches || sigilMatches || costMatches;
                    }).length
                  } cards</span>
                  {devCardsFilter && <span className="text-amber-400">Filter active</span>}
                </div>
                <div className="max-h-56 overflow-y-auto text-xs font-mono space-y-1">
                  {Object.values(ALL_CARD_LOOKUP)
                    .filter(c => {
                      const term = devCardsFilter.trim().toLowerCase();
                      if (!term) return true;
                      const nameMatches = c.name?.toLowerCase().includes(term);
                      const classMatches = c.class?.toLowerCase().includes(term);
                      const sigilMatches = (c.sigils || []).some(s => s?.toLowerCase().includes(term));
                      const costMatches = (c.cost !== undefined && String(c.cost) === term) || (c.boneCost !== undefined && String(c.boneCost) === term);
                      return nameMatches || classMatches || sigilMatches || costMatches;
                    })
                    .map(c => (
                      <div key={c.name} className="py-1 border-b border-amber-950/30 flex justify-between items-center hover:bg-amber-950/20 px-1">
                        <span>
                          <strong className="text-amber-300">{c.name}</strong> {c.emoji} | <span className="text-stone-400">{c.class}</span>
                        </span>
                        <span className="text-stone-400 text-[11px]">
                          ATK: {c.attack} HP: {c.health} | Cost: {c.cost !== undefined ? `${c.cost} Blood` : c.boneCost ? `${c.boneCost} Bones` : '0'}
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* List All Sigils Grid */}
            {devTab === 'SIGILS' && (
              <div className="border border-amber-950/40 p-3 max-h-56 overflow-y-auto mb-6 text-xs font-mono">
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(SIGIL_MAPPING).map(([s, icon]) => (
                    <div
                      key={s}
                      onClick={() => setSigilDetailModal({ name: s, desc: SIGIL_DESCRIPTIONS[s] || 'Ancient sigil.' })}
                      className="p-2 border border-amber-950/50 hover:border-amber-700/60 cursor-pointer hover:bg-amber-950/20 flex items-center justify-between"
                    >
                      <span className="font-bold text-amber-300">{s} {icon}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Bottom Actions */}
            <div className="flex gap-4 mt-4 pt-4 border-t border-amber-950/40 font-mono">
              <button
                onClick={() => {
                  setStartingBones(0);
                  startingBonesRef.current = 0;
                  setBones(0);
                  setScreen('SPLASH');
                  addLog("[DEV] Run restarted.");
                }}
                className="flex-1 py-2 bg-[#181310] hover:bg-[#231b16] active:bg-[#120e0b] border border-[#2f241c] rounded-sm shadow-[0_2px_0_#0a0807,inset_0_1px_0_rgba(255,255,255,0.06)] active:translate-y-[1px] active:shadow-none transition-all duration-75 font-['Cinzel',_serif] font-bold text-[11px] uppercase tracking-widest text-amber-300/80 hover:text-amber-100 cursor-pointer text-center"
              >
                RESTART RUN
              </button>
              <button
                onClick={() => setScreen(previousScreen || 'DUEL')}
                className="flex-1 py-2 bg-[#181310] hover:bg-[#231b16] active:bg-[#120e0b] border border-[#2f241c] rounded-sm shadow-[0_2px_0_#0a0807,inset_0_1px_0_rgba(255,255,255,0.06)] active:translate-y-[1px] active:shadow-none transition-all duration-75 font-['Cinzel',_serif] font-bold text-[11px] uppercase tracking-widest text-[#cfb794] hover:text-[#f3ede2] cursor-pointer text-center"
              >
                CLOSE CONSOLE
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          DUEL BATTLEFIELD SCREEN (WITH AUTHENTIC LAYOUT & BOTTOM CONTROLS)
         ========================================================================= */}
      {screen === 'DUEL' && (
        <div
          ref={duelFieldRef}
          style={{
            backgroundColor: bossState.bgHex !== '#0b0f19' && bossState.bgHex !== '#18181b' ? bossState.bgHex : '#100c0a',
            backgroundImage: `radial-gradient(ellipse at center, rgba(0,0,0,0.1) 0%, rgba(10,7,5,0.55) 90%), url('${getArenaBackground(
              stage,
              isBossMatch,
              bossState.type ?? undefined
            )}')`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundBlendMode: bossState.bgHex !== '#0b0f19' && bossState.bgHex !== '#18181b' ? 'soft-light' : 'normal',
            transition: bossState.bgTransitionDuration > 0 ? `background-color ${bossState.bgTransitionDuration}s ease-in-out` : 'background-color 1.5s ease-in-out',
          }}
          className={`flex-1 flex flex-col justify-between p-2 sm:p-4 relative overflow-hidden transition-colors duration-700 ${
            isGrizzlyShaking ? 'animate-grizzly-shake' : ''
          }`}
        >

          {/* Heavy Vignette Overlay */}
          <div
            className="absolute inset-0 pointer-events-none z-0"
            style={{
              background: 'radial-gradient(ellipse at center, rgba(35,24,18,0.4) 0%, rgba(10,7,5,0.95) 85%)',
            }}
          />

          {/* Ambient Candlelight Flickering Overlays (Upper-Left & Upper-Right Corners) */}
          <div className="absolute -top-16 -left-16 w-84 h-84 rounded-full bg-[radial-gradient(circle,rgba(245,158,11,0.22)_0%,rgba(180,83,9,0.08)_45%,transparent_70%)] pointer-events-none animate-[pulse_5s_infinite_ease-in-out] blur-2xl z-0" />
          <div
            className="absolute -top-16 -right-16 w-84 h-84 rounded-full bg-[radial-gradient(circle,rgba(251,191,36,0.2)_0%,rgba(217,119,6,0.07)_45%,transparent_70%)] pointer-events-none animate-[pulse_5s_infinite_ease-in-out] blur-2xl z-0"
            style={{ animationDelay: '2.5s' }}
          />

          {/* Sparse Slow-Rising Ambient Fire Embers */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
            {[
              { left: '12%', bottom: '6%', delay: '0s', duration: '7s', size: 'w-1.5 h-1.5' },
              { left: '26%', bottom: '3%', delay: '2.4s', duration: '8.5s', size: 'w-1 h-1' },
              { left: '48%', bottom: '10%', delay: '4.8s', duration: '6.5s', size: 'w-1.5 h-1.5' },
              { left: '68%', bottom: '5%', delay: '1.2s', duration: '9s', size: 'w-1 h-1' },
              { left: '84%', bottom: '8%', delay: '3.6s', duration: '7.8s', size: 'w-1.5 h-1.5' },
              { left: '92%', bottom: '4%', delay: '5.2s', duration: '8s', size: 'w-1 h-1' },
            ].map((ember, i) => (
              <div
                key={`ember-${i}`}
                className={`absolute rounded-full bg-amber-400/65 shadow-[0_0_6px_rgba(245,158,11,0.85)] animate-ember pointer-events-none ${ember.size}`}
                style={{
                  left: ember.left,
                  bottom: ember.bottom,
                  animationDelay: ember.delay,
                  animationDuration: ember.duration,
                }}
              />
            ))}
          </div>

          {/* Animated Abyssal Backdrop for The Bone Lord */}
          {isBossMatch && bossState.type === 'BoneLord' && (
            <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
              {/* Outer Counter-Rotating Miasma */}
              <div
                className="absolute -inset-[100%] bg-[radial-gradient(ellipse_at_center,rgba(185,28,28,0.18)_0%,rgba(69,10,10,0.28)_35%,transparent_65%)] animate-spin opacity-75"
                style={{ animationDuration: '65s', animationDirection: 'reverse' }}
              />
              {/* Core Spinning Vortex */}
              <div
                className="absolute -inset-[60%] bg-[radial-gradient(circle_at_center,rgba(239,68,68,0.24)_0%,rgba(127,29,29,0.18)_40%,transparent_70%)] animate-spin opacity-90"
                style={{ animationDuration: '32s' }}
              />

              {/* Vignette Pulse */}
              <div
                className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_30%,rgba(0,0,0,0.85)_95%)] animate-pulse"
                style={{ animationDuration: '6s' }}
              />
              {/* Phase 3: Blood Moon Surge */}
              {bossPhase === 3 && (
                <div
                  className="absolute inset-0 bg-[radial-gradient(circle_at_50%_25%,rgba(220,38,38,0.32)_0%,transparent_75%)] animate-pulse"
                  style={{ animationDuration: '2.5s' }}
                />
              )}
            </div>
          )}
          {/* Dialogue Popup Overlay (Modal backdrop shields table from input during speech) */}
          {bossState.activeDialogue && (
        <div
          className={`fixed inset-0 z-50 ${
            isTutorialDuel
              ? 'pointer-events-none bg-transparent'
              : 'bg-black/60 flex items-center justify-center pointer-events-auto'
          }`}
        >
          <div
            className={`pointer-events-auto select-none transition-all duration-300 ${
              isTutorialDuel
                ? getTutorialDialoguePosition(bossState.activeDialogue)
                : 'w-[92%] max-w-md'
            }`}
          >
              <div className="p-4 sm:p-5 rounded border border-[#8c6747]/80 bg-[#120c08]/95 shadow-[0_8px_25px_rgba(0,0,0,0.95)] flex flex-col items-center text-center font-mono w-full">
                <div className="text-[10px] text-amber-700/80 tracking-widest uppercase mb-2">
                  {isTutorialDuel ? `+-- THEMS THE RULES (${dialogueTotalSteps - dialogueQueue.length}/${dialogueTotalSteps}) --+` : '+-- OCCULT WHISPERS --+'}
                </div>
                <p className="text-sm sm:text-base italic font-mono text-amber-100 mb-3 leading-snug">
                  "{bossState.activeDialogue}"
                </p>
                <button
                  onClick={() => {
                    if (dialogueQueue.length > 0) {
                      const nextMessage = dialogueQueue[0];
                      setDialogueQueue(prev => prev.slice(1));
                      setBossState(prev => ({ ...prev, activeDialogue: nextMessage }));
                      return;
                    }

                    if (bossState.type === 'Zealot' && bossState.phase === 2 && bossState.skipNextPlayerTurn) {
                      setBossState(prev => ({
                        ...prev,
                        activeDialogue: null,
                      }));
                      handleEndTurn(true);
                      return;
                    }

                    if (bossState.type === 'The Begotten' || (bossState.type as any) === 'Goobert') {
                      setBossState(prev => ({
                        ...prev,
                        activeDialogue: null,
                        bgHex: '#2AA331',
                        bgTransitionDuration: 6,
                      }));
                    } else if (bossState.type === 'BoneLord') {
                      setBossState(prev => ({
                        ...prev,
                        activeDialogue: null,
                        bgHex: '#300202',
                        bgTransitionDuration: 8,
                      }));
                    } else {
                      setBossState(prev => ({ ...prev, activeDialogue: null }));
                    }
                  }}
                  className={
                    isTutorialDuel
                      ? "bg-[#1e1510] hover:bg-[#2b1e17] active:bg-[#140e0a] border border-[#593d25] rounded-sm shadow-[0_2px_0_#0a0807] transition-all font-['Cinzel',_serif] font-bold text-[11px] uppercase tracking-widest text-[#ebd9bf] hover:text-white px-5 py-1 cursor-pointer"
                      : "bg-[#181310] hover:bg-[#231b16] active:bg-[#120e0b] border border-[#2f241c] rounded-sm shadow-[0_2px_0_#0a0807,inset_0_1px_0_rgba(255,255,255,0.06)] active:translate-y-[1px] active:shadow-none transition-all duration-75 font-['Cinzel',_serif] font-bold text-xs uppercase tracking-widest text-[#cfb794] hover:text-[#f3ede2] px-6 py-2 cursor-pointer select-none"
                  }
                >
                  {dialogueQueue.length > 0 ? (isTutorialDuel ? 'NEXT RULE →' : 'CONTINUE') : (isTutorialDuel ? 'BEGIN DUEL' : 'CONTINUE')}
                </button>
              </div>
            </div>
          </div>
        )}

          {/* Ritual Completed Screen Overlay */}
          {bossState.isRitualComplete && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 font-mono select-none">
              <div className="border border-amber-950/60 p-8 max-w-md w-full text-center bg-[#0c0805]">
                <div className="text-[10px] text-amber-700/80 tracking-widest uppercase mb-2">+-- SANCTUARY SEAL --+</div>
                <h2 className="text-xl font-mono font-bold text-amber-400 mb-2 tracking-wider uppercase">Ritual Completed</h2>
                <p className="text-xs font-mono text-stone-400 mb-8 leading-relaxed">
                  The cycle awaits your command. Will you delve deeper into the sacrificial bond or seal the archives?
                </p>
                <div className="flex flex-col gap-3">
                  <button
                    onClick={handleContinueRitual}
                    className="bg-[#181310] hover:bg-[#231b16] active:bg-[#120e0b] border border-[#2f241c] rounded-sm shadow-[0_2px_0_#0a0807,inset_0_1px_0_rgba(255,255,255,0.06)] active:translate-y-[1px] active:shadow-none transition-all duration-75 font-['Cinzel',_serif] font-bold text-xs uppercase tracking-widest text-amber-300 hover:text-amber-100 px-6 py-2.5 cursor-pointer select-none"
                  >
                    CONTINUE THE RITUAL
                  </button>
                  <button
                    onClick={handleEndRitual}
                    className="bg-[#181310] hover:bg-[#231b16] active:bg-[#120e0b] border border-[#2f241c] rounded-sm shadow-[0_2px_0_#0a0807,inset_0_1px_0_rgba(255,255,255,0.06)] active:translate-y-[1px] active:shadow-none transition-all duration-75 font-['Cinzel',_serif] font-bold text-xs uppercase tracking-widest text-stone-400 hover:text-stone-200 px-6 py-2.5 cursor-pointer select-none"
                  >
                    SEAL THE ARCHIVES
                  </button>
                </div>
              </div>
            </div>
          )}

          {isBossMatch && (
            <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,rgba(220,38,38,0.12)_0%,transparent_75%)] animate-pulse" />
          )}


  {/* Battlefield Stage: Proportional Positioning Canvas */}
          <div className="relative w-full flex-1 min-h-0 flex items-center justify-center z-10">
            <div className="relative w-[860px] sm:w-[920px] h-[550px] shrink-0">

              {/* FIXED LEFT FLANK: Wraps BOTH Upper Tier AND Lower Tier in a single column */}
              <div className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 flex flex-col items-center justify-between h-[510px] w-44 select-none pointer-events-auto py-1 z-20 scale-105 origin-left">
                
                {/* Upper Tier: Stage Text & Active Totems */}
                <div className="flex flex-col items-center justify-center text-center gap-2.5 w-full relative translate-y-1 -translate-x-6 sm:-translate-x-8">
                  {/* Stage Text on Individual Lines */}
                  <div className="flex flex-col items-center justify-center select-none text-center">
                    <h2 className="font-['Cinzel',_serif] font-black text-base sm:text-lg tracking-[0.25em] uppercase text-[#d6ba94] drop-shadow-[0_2px_4px_rgba(0,0,0,0.95)]">
                      {isBossMatch
                        ? (bossState.type === 'Zealot'
                            ? "The Zealot"
                            : bossState.type === 'The Begotten' || (bossState.type as any) === 'Goobert'
                              ? "The Begotten"
                              : bossState.type === 'BoneLord'
                                ? "The Bone Lord"
                                : "The Weaver")
                        : currentStageName}
                    </h2>
                    <span className="font-['Cinzel',_serif] font-semibold text-[11px] tracking-[0.22em] uppercase text-[#9e8368] mt-0.5 drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
                      {isBossMatch ? `Stage ${stage} • Phase ${bossPhase}` : `Stage ${stage} • Depth ${level}`}
                    </span>
                    <div className="w-20 h-[1px] bg-gradient-to-r from-transparent via-[#3a2f26] to-transparent mt-1.5" />
                  </div>

                  {/* Stitched Effigy Display (Weaver's Needlework) */}
                  {(Boolean(isBossMatch && bossTotem) || Boolean(activeTotem?.head && activeTotem?.body)) && (
                    <div className="flex flex-row items-center justify-center gap-2 w-full mt-1.5 px-1">
                      {/* Boss Effigy (The Weaver's Poppet) */}
                      {isBossMatch && bossState.type === 'The Weaver' && bossTotem && (() => {
                        const tribeName = (bossTotem as any).class || (bossTotem as any).tribe || (bossTotem as any).head || 'Canine';
                        const sigilName = (bossTotem as any).sigil || (bossTotem as any).body || '';
                        const patchIcon = TRIBE_EMBROIDERY[tribeName] || (
                          <div className="w-5 h-5 flex items-center justify-center font-mono text-xs text-purple-300">🧵</div>
                        );

                        return (
                          <div
                            className={`relative border border-dashed border-purple-700/70 bg-[#160c1c] shadow-[0_4px_14px_rgba(30,10,40,0.7)] p-2 flex flex-col items-center justify-between text-center select-none rounded-[3px] shrink-0 ${
                              Boolean(activeTotem?.head && activeTotem?.body) ? 'flex-1 min-w-0 h-[134px]' : 'w-24 sm:w-28 h-[134px]'
                            }`}
                            title={`Weaver's Poppet: ${tribeName} kin bear the ${sigilName || 'unmarked'} stitch`}
                          >
                            <span className="text-[7px] font-mono uppercase tracking-[0.18em] text-purple-400/90 leading-none shrink-0">
                              Poppet
                            </span>

                            {/* Head Patch */}
                            <div className="w-full shrink-0 bg-[#201026] border border-purple-900/60 rounded-[2px] py-1 px-0.5 flex flex-col items-center">
                              {patchIcon}
                              <span className="text-[9px] font-mono font-bold text-purple-200 uppercase tracking-wider truncate w-full mt-0.5 leading-tight">
                                {tribeName}
                              </span>
                            </div>

                            {/* Cross-Stitch Seam */}
                            <div className="w-full shrink-0 border-t border-dashed border-purple-800/60 my-0.5 flex items-center justify-center">
                              <span className="text-[7px] text-purple-500/70 leading-none -mt-1 font-mono">✕ ✕ ✕</span>
                            </div>

                            {/* Torso Sigil Scrap */}
                            <div className="w-full shrink-0 bg-[#201026] border border-purple-900/60 rounded-[2px] py-1.5 px-0.5 flex flex-col items-center justify-center min-h-[46px]">
                              {sigilName ? (
                                <img
                                  src={getSigilArtUrl(sigilName)}
                                  alt={sigilName}
                                  className="w-5 h-5 object-contain filter drop-shadow brightness-90 contrast-125 select-none pointer-events-none shrink-0"
                                  onError={(e) => {
                                    (e.currentTarget as HTMLElement).style.display = 'none';
                                  }}
                                />
                              ) : (
                                <span className="text-xs text-purple-400 font-mono">—</span>
                              )}
                              <span className="text-[9px] font-mono font-semibold text-purple-300 uppercase tracking-tight truncate w-full mt-1 leading-normal block">
                                {sigilName}
                              </span>
                            </div>
                          </div>
                        );
                      })()}

                      {/* Player Effigy (Straw & Burlap Poppet) */}
                      {Boolean(activeTotem?.head && activeTotem?.body) && (() => {
                        const tribeName = activeTotem.head || 'Canine';
                        const sigilName = activeTotem.body || '';
                        const patchIcon = TRIBE_EMBROIDERY[tribeName] || (
                          <div className="w-5 h-5 flex items-center justify-center font-mono text-xs text-amber-300">🪡</div>
                        );

                        return (
                          <div
                            className={`relative border border-dashed border-[#8c6747]/80 bg-[#150f0a] shadow-[0_4px_14px_rgba(20,10,0,0.7)] p-2 flex flex-col items-center justify-between text-center select-none rounded-[3px] shrink-0 ${
                              isBossMatch && bossTotem ? 'flex-1 min-w-0 h-[134px]' : 'w-24 sm:w-28 h-[134px]'
                            }`}
                            title={`Stitched Effigy: ${tribeName} kin sewn with ${sigilName}`}
                          >
                            <span className="text-[7px] font-mono uppercase tracking-[0.18em] text-[#ab8a68] leading-none shrink-0">
                              Effigy
                            </span>

                            {/* Head Patch */}
                            <div className="w-full shrink-0 bg-[#221811] border border-[#4a3422] rounded-[2px] py-1 px-0.5 flex flex-col items-center">
                              {patchIcon}
                              <span className="text-[9px] font-mono font-bold text-amber-200 uppercase tracking-wider truncate w-full mt-0.5 leading-tight">
                                {tribeName}
                              </span>
                            </div>

                            {/* Cross-Stitch Seam */}
                            <div className="w-full shrink-0 border-t border-dashed border-[#8c6747]/50 my-0.5 flex items-center justify-center">
                              <span className="text-[7px] text-[#8c6747]/70 leading-none -mt-1 font-mono">✕ ✕ ✕</span>
                            </div>

                            {/* Torso Sigil Scrap */}
                            <div className="w-full shrink-0 bg-[#221811] border border-[#4a3422] rounded-[2px] py-1.5 px-0.5 flex flex-col items-center justify-center min-h-[46px]">
                              {sigilName ? (
                                <img
                                  src={getSigilArtUrl(sigilName)}
                                  alt={sigilName}
                                  className="w-5 h-5 object-contain filter drop-shadow brightness-90 contrast-125 select-none pointer-events-none shrink-0"
                                  onError={(e) => {
                                    (e.currentTarget as HTMLElement).style.display = 'none';
                                  }}
                                />
                              ) : (
                                <span className="text-xs text-[#ab8a68] font-mono">—</span>
                              )}
                              <span className="text-[9px] font-mono font-semibold text-emerald-400 uppercase tracking-tight truncate w-full mt-1 leading-normal block">
                                {sigilName}
                              </span>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </div>

                {/* Lower Tier: End Turn Button & Utility Plaques */}
                <div className="flex flex-col items-center gap-0 w-full mt-auto mb-1 pt-1 relative scale-105 origin-bottom translate-y-7 sm:translate-y-9">
                  {/* Diegetic Blood-Prick Talisman (Enlarged Plinth) */}
                  <div className="flex flex-col items-center mt-1 -translate-x-6 sm:-translate-x-8 group select-none">
                      <button
                          onClick={handleTalismanPrick}
                          disabled={phase !== 'PLAY' || isTalismanPricked}
                          title={phase === 'PLAY' ? "Prick your finger upon the iron dish to seal your assault" : "Awaiting your turn..."}
                          className={`relative w-[125px] h-[125px] sm:w-[140px] sm:h-[140px] rounded-full bg-gradient-to-b from-[#1b1512] to-[#0d0a09] border-2 flex items-center justify-center select-none outline-none transition-all duration-200 ${
                            isTalismanPricked
                              ? 'translate-y-1 scale-[0.98] border-[#ef4444] shadow-[0_1px_0_#070504,inset_0_5px_14px_rgba(0,0,0,0.98),0_0_28px_rgba(239,68,68,0.85)] cursor-default'
                              : phase === 'PLAY'
                                ? 'border-[#3d3128] shadow-[0_4px_0_#080605,0_10px_20px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(255,255,255,0.08)] hover:border-[#ef4444] hover:shadow-[0_0_24px_rgba(239,68,68,0.55),0_0_44px_rgba(185,28,28,0.3),inset_0_0_16px_rgba(185,28,28,0.35)] cursor-pointer active:translate-y-1 active:scale-[0.98]'
                                : 'border-[#221a15] opacity-60 shadow-[0_3px_0_#080605,0_6px_12px_rgba(0,0,0,0.7)] cursor-not-allowed'
                          }`}
                        >
                          {/* Inner Radial Bloodlight Atmosphere (Hover & Pricked) */}
                          <div
                            className={`absolute inset-0 rounded-full transition-opacity duration-300 pointer-events-none ${
                              isTalismanPricked
                                ? 'opacity-100 bg-[radial-gradient(circle,rgba(220,38,38,0.35)_0%,rgba(153,27,27,0.15)_55%,transparent_75%)]'
                                : 'opacity-0 group-hover:opacity-100 bg-[radial-gradient(circle,rgba(220,38,38,0.25)_0%,rgba(153,27,27,0.1)_50%,transparent_75%)]'
                            }`}
                          />

                          {/* Outer Inset Groove */}
                          <div className="absolute inset-2 sm:inset-2.5 rounded-full border border-black/80 shadow-[inset_0_1px_3px_rgba(0,0,0,0.9)] pointer-events-none" />

                          {/* Outermost Band: Full-Bleed Perimeter Zalgo Inscription Loop */}
                          <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full pointer-events-none overflow-visible">
                            <defs>
                              <path
                                id="talismanOuterZalgoPath"
                                d="M 50, 4.5 a 45.5,45.5 0 1,1 0,91 a 45.5,45.5 0 1,1 0,-91"
                              />
                            </defs>
                            <text
                              className={`font-mono text-[3.8px] font-bold select-none tracking-[0.03em] transition-all duration-200 ${
                                isTalismanPricked
                                  ? 'fill-[#ef4444] drop-shadow-[0_0_3px_rgba(239,68,68,0.7)]'
                                  : 'fill-[#362217] group-hover:fill-[#ef4444] group-hover:drop-shadow-[0_0_3px_rgba(239,68,68,0.6)]'
                              }`}
                            >
                              <textPath
                                href="#talismanOuterZalgoPath"
                                startOffset="0%"
                                textLength="285.9"
                                lengthAdjust="spacing"
                              >
                                S̴̵̷A̸̷N̴̵̷G̸̷U̴̵̷I̸̷S̴̵̷ • E̸̷X̴̵̷C̴̵̷I̸̷D̴̵̷I̸̷U̴̵̷M̸̷ • ᚛ᚨ̴̵̷ᛚ̴̵̷ᛏ̴̵̷ᚨ̴̵̷ᚱ̴̵̷᚜ • O̸̷B̸̷L̴̵̷A̴̵̷T̸̷I̸̷O̴̵̷ • M̸̷O̴̵̷R̸̷T̴̵̷A̸̷L̸̷I̸̷S̴̵̷ • S̴̵̷A̸̷N̴̵̷G̸̷U̴̵̷I̸̷S̴̵̷ • E̸̷X̴̵̷C̴̵̷I̸̷D̴̵̷I̸̷U̴̵̷M̸̷ • ᚛ᚨ̴̵̷ᛚ̴̵̷ᛏ̴̵̷ᚨ̴̵̷ᚱ̴̵̷᚜ • O̸̷B̸̷L̴̵̷A̴̵̷T̸̷I̸̷O̴̵̷ • M̸̷O̴̵̷R̸̷T̴̵̷A̸̷L̸̷I̸̷S̴̵̷ •
                              </textPath>
                            </text>
                          </svg>

                          {/* Mid Dashed Ring */}
                          <div className={`absolute inset-3 sm:inset-3.5 rounded-full border border-dashed transition-all duration-200 pointer-events-none ${
                            isTalismanPricked
                              ? 'border-red-900/60 shadow-[0_0_8px_rgba(185,28,28,0.25)]'
                              : 'border-[#2e231c] group-hover:border-[#b91c1c]/90 group-hover:shadow-[0_0_6px_rgba(185,28,28,0.4)]'
                          }`} />

                          {/* Inner Core SVG */}
                          <svg viewBox="0 0 100 100" className="w-[84px] h-[84px] sm:w-[104px] sm:h-[104px] overflow-visible pointer-events-none transition-transform duration-150">
                            <defs>
                              <path
                                id="talismanInnerZalgoPath"
                                d="M 50, 12.5 a 37.5,37.5 0 1,1 0,75 a 37.5,37.5 0 1,1 0,-75"
                              />
                            </defs>

                            {/* Plinth Inner Bevel */}
                            <circle
                              cx="50"
                              cy="50"
                              r="44"
                              fill="none"
                              stroke={isTalismanPricked ? "#7f1d1d" : "#241b16"}
                              strokeWidth="2.5"
                              className="transition-colors duration-200 group-hover:stroke-[#7f1d1d]"
                            />

                            {/* Inner Ring: 360-Degree Zalgo Inscription Loop */}
                            <text
                              className={`font-mono text-[4.1px] font-bold select-none tracking-[0.04em] transition-all duration-200 ${
                                isTalismanPricked
                                  ? 'fill-[#ef4444] drop-shadow-[0_0_3px_rgba(239,68,68,0.75)]'
                                  : 'fill-[#422e23] group-hover:fill-[#ef4444] group-hover:drop-shadow-[0_0_3px_rgba(239,68,68,0.6)]'
                              }`}
                            >
                              <textPath
                                href="#talismanInnerZalgoPath"
                                startOffset="0%"
                                textLength="235.6"
                                lengthAdjust="spacing"
                              >
                                S̴̵̷A̸̷C̴̵̷R̴̵̷I̸̷F̴̵̷I̸̷C̴̵̷I̸̷U̴̵̷M̸̷ • M̴̵̷O̸̷R̴̵̷T̸̷I̸̷S̴̵̷ • S̴̵̷A̸̷N̴̵̷G̸̷U̴̵̷I̸̷S̴̵̷ • ᚛ᛟ̴̵̷ᛋ̴̵̷ᚱ̴̵̷ᛏ̴̵̷ᚦ̴̵̷᚜ • V̴̵̷O̸̷I̴̵̷D̸̷ • S̴̵̷A̸̷C̴̵̷R̴̵̷I̸̷F̴̵̷I̸̷C̴̵̷I̸̷U̴̵̷M̸̷ • M̴̵̷O̸̷R̴̵̷T̸̷I̸̷S̴̵̷ • S̴̵̷A̸̷N̴̵̷G̸̷U̴̵̷I̸̷S̴̵̷ • ᚛ᛟ̴̵̷ᛋ̴̵̷ᚱ̴̵̷ᛏ̴̵̷ᚦ̴̵̷᚜ • V̴̵̷O̸̷I̴̵̷D̸̷ •
                              </textPath>
                            </text>

                            {/* Pentagram Star */}
                            <path
                              d="M 50 12 L 72.3 80.7 L 13.9 38.3 L 86.1 38.3 L 27.7 80.7 Z"
                              fill={isTalismanPricked ? "#991b1b" : "transparent"}
                              stroke={isTalismanPricked ? "#ef4444" : phase === 'PLAY' ? "#d6c2a5" : "#44362b"}
                              className={`transition-all duration-200 group-hover:stroke-[#ef4444] ${
                                isTalismanPricked
                                  ? 'drop-shadow-[0_0_12px_rgba(239,68,68,0.95)]'
                                  : 'group-hover:drop-shadow-[0_0_8px_rgba(239,68,68,0.85)]'
                              }`}
                              strokeWidth={isTalismanPricked ? "4.5" : "3.5"}
                              strokeLinejoin="round"
                              strokeLinecap="round"
                            />

                            {/* Centermost Pupil & Living Eyeball (Tracks Mouse) */}
                            <TalismanEye isTalismanPricked={isTalismanPricked} />
                          </svg>
                        </button>

                      <pre
                        className={`font-mono text-[5px] leading-[4.5px] whitespace-pre select-none pointer-events-none origin-top mt-2 transition-all duration-200 text-center ${
                          isTalismanPricked
                            ? 'scale-[0.45] text-red-400 font-bold drop-shadow-[0_0_8px_rgba(239,68,68,0.95)]'
                            : phase === 'PLAY'
                              ? 'scale-[0.55] text-[#a3907c] group-hover:text-red-400 group-hover:drop-shadow-[0_0_6px_rgba(239,68,68,0.7)]'
                              : 'scale-[0.55] text-stone-700'
                        }`}
                      >
                        {isTalismanPricked ? (
` ▄████████  ▄██████▄    ▄▄▄▄███▄▄▄▄     ▄▄▄▄███▄▄▄▄    ▄█     ███         ███        ▄████████ ████████▄  
███    ███ ███    ███ ▄██▀▀▀███▀▀▀██▄ ▄██▀▀▀███▀▀▀██▄ ███  ▀█████████▄ ▀█████████▄  ███    ███ ███   ▀███ 
███    █▀  ███    ███ ███   ███   ███ ███   ███   ███ ███▌   ▀███▀▀██    ▀███▀▀██   ███    █▀  ███    ███ 
███        ███    ███ ███   ███   ███ ███   ███   ███ ███▌    ███   ▀     ███   ▀  ▄███▄▄▄     ███    ███ 
███        ███    ███ ███   ███   ███ ███   ███   ███ ███▌    ███         ███     ▀▀███▀▀▀     ███    ███ 
███    █▄  ███    ███ ███   ███   ███ ███   ███   ███ ███     ███         ███       ███    █▄  ███    ███ 
███    ███ ███    ███ ███   ███   ███ ███   ███   ███ ███     ███         ███       ███    ███ ███   ▄███ 
████████▀   ▀██████▀   ▀█   ███   █▀   ▀█   ███   █▀  █▀    ▄████▀      ▄████▀      ██████████ ████████▀  `
                        ) : (
` ▄████████  ▄██████▄    ▄▄▄▄███▄▄▄▄     ▄▄▄▄███▄▄▄▄    ▄█     ███     
 ███    ███ ███    ███ ▄██▀▀▀███▀▀▀██▄ ▄██▀▀▀███▀▀▀██▄ ███  ▀█████████▄ 
███    █▀  ███    ███ ███   ███   ███ ███   ███   ███ ███▌   ▀███▀▀██ 
███        ███    ███ ███   ███   ███ ███   ███   ███ ███▌    ███   ▀ 
███        ███    ███ ███   ███   ███ ███   ███   ███ ███▌    ███     
███    █▄  ███    ███ ███   ███   ███ ███   ███   ███ ███     ███     
███    ███ ███    ███ ███   ███   ███ ███   ███   ███ ███     ███     
████████▀   ▀██████▀   ▀█   ███   █▀   ▀█   ███   █▀  █▀    ▄████▀    `
                        )}
                      </pre>
                    </div>

                  {/* Diegetic Timber Utility Plaques (Lowered & Offset Left) */}
                  <div className="flex flex-col items-center gap-1.5 w-full mt-6 sm:mt-7 -translate-x-6 sm:-translate-x-8">
                    <button
                      onClick={openViewDeck}
                      className="w-38 sm:w-40 bg-[#181310] hover:bg-[#231b16] active:bg-[#120e0b] border border-[#2f241c] rounded-sm shadow-[0_2px_0_#0a0807,inset_0_1px_0_rgba(255,255,255,0.06)] active:translate-y-[1px] active:shadow-none transition-all duration-75 font-['Cinzel',_serif] font-bold text-[10px] sm:text-[10.5px] uppercase tracking-widest text-[#cfb794] hover:text-[#f3ede2] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed px-3 py-1.5 flex items-center justify-center gap-2"
                    >
                      <Layers className="w-3.5 h-3.5 text-amber-500/80" />
                      <span>VIEW DECK</span>
                    </button>

                    <button
                      onClick={() => setShowPauseMenu(true)}
                      className="w-38 sm:w-40 bg-[#181310] hover:bg-[#231b16] active:bg-[#120e0b] border border-[#2f241c] rounded-sm shadow-[0_2px_0_#0a0807,inset_0_1px_0_rgba(255,255,255,0.06)] active:translate-y-[1px] active:shadow-none transition-all duration-75 font-['Cinzel',_serif] font-bold text-[10px] sm:text-[10.5px] uppercase tracking-widest text-[#cfb794] hover:text-[#f3ede2] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed px-3 py-1.5 flex items-center justify-center gap-2"
                    >
                      <Menu className="w-3.5 h-3.5 text-amber-500/80" />
                      <span>SANCTUARY</span>
                    </button>

                    {showDevTools && (
                        <button
                          onClick={openDevMenu}
                          className="w-38 sm:w-40 bg-[#181310] hover:bg-[#231b16] active:bg-[#120e0b] border border-[#2f241c] rounded-sm shadow-[0_2px_0_#0a0807,inset_0_1px_0_rgba(255,255,255,0.06)] active:translate-y-[1px] active:shadow-none transition-all duration-75 font-['Cinzel',_serif] font-bold text-[10px] sm:text-[10.5px] uppercase tracking-widest text-[#cfb794] hover:text-[#f3ede2] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed px-3 py-1.5 flex items-center justify-center gap-2"
                          title="Development Tools"
                        >
                          <span>DEV TOOLS</span>
                        </button>
                      )}
                  </div>
                </div>

              </div> {/* Closes FIXED LEFT FLANK */}

              {/* FIXED-WIDTH CENTER BATTLEFIELD: Absolute dead-center in the arena */}
                    <div className={`absolute left-1/2 -translate-x-1/2 -top-10 flex flex-col items-center justify-start w-[500px] sm:w-[512px] max-w-full z-10 origin-top scale-[0.96] ${isBoardRumbling ? 'animate-board-rumble' : ''}`}>
                      {/* Opponent Field: Massive Boss 8-Zone Monolith OR Standard Rows 1 & 2 */}
                    {(() => {
                      const massiveBoss = enemyBoard.find(c => c?.isMassive);
                      if (massiveBoss) {
                        const isAttacking = activeAttacker?.isPlayer === false;
                        const isDamaged = damagedCard?.isPlayer === false;
                        const isHpFlashing = hpFlashingCard?.isPlayer === false;
                        const isDefending = activeDefendingLane?.isPlayer === false;
                        const isDestroyed = destroyedCard?.isPlayer === false;
                        const isSigilJitter = jitteringCard?.isPlayer === false;
                        const isZeroPower = zeroPowerShakingCard?.isPlayer === false;

                        let bossAnimClass = '';
                        if (isAttacking) {
                          // Massive monolith always slams straight forward, ignoring lane strike angles
                          bossAnimClass = 'animate-lunge-e-straight z-50';
                        } else if (isZeroPower) {
                          bossAnimClass = 'animate-zero-power-shake z-45';
                        } else if (isDestroyed) {
                          bossAnimClass = 'animate-destroy-dissolve z-40';
                        } else if (isDamaged) {
                          bossAnimClass = 'animate-damage-shake z-45';
                        } else if (isSigilJitter) {
                          bossAnimClass = 'animate-sigil-jitter z-45';
                        }

                        const defBorder = isDefending && !isDamaged ? 'ring-2 ring-red-600/70 shadow-[0_0_20px_rgba(239,68,68,0.7)]' : '';

                        return (
                          <div className="relative w-full max-w-[420px] sm:max-w-[500px] h-[300px] sm:h-[332px] my-1 flex items-center justify-center overflow-visible select-none z-20">
                            <div
                              className={`relative w-full h-full rounded-sm overflow-hidden bg-cover bg-center shadow-[0_0_35px_rgba(185,28,28,0.35)] ${
                                isEnemyRetracting
                                  ? 'transition-all duration-700 ease-in-out -translate-y-28 opacity-0 pointer-events-none'
                                  : `${bossAnimClass}${defBorder}`
                              }`}
                              style={{
                                backgroundImage: `url(${bloodMoonImg})`,
                                backgroundSize: '100% 100%',
                              }}
                            >
                              {/* Pulsing Crimson Atmospheric Aura */}
                              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(220,38,38,0.18)_0%,transparent_75%)] animate-pulse pointer-events-none" />

                              {/* 5 Sigil Icons Centered Between Sockets Under Card Art */}
                              <div
                                className="absolute flex items-center justify-between z-20 pointer-events-auto"
                                style={{
                                  left: '25%',
                                  width: '50%',
                                  top: '81.0%',
                                  transform: 'translateY(-50%)',
                                }}
                              >
                                {massiveBoss.sigils?.map((sigilName, sIdx) => {
                                  const artUrl = typeof getSigilArtUrl === 'function' ? getSigilArtUrl(sigilName) : undefined;
                                  return (
                                    <div
                                      key={`moon-sigil-${sIdx}`}
                                      onClick={() => {
                                        if (typeof setSigilDetailModal === 'function') {
                                          const desc = (SIGIL_DESCRIPTIONS as Record<string, string>)[sigilName] || '';
                                          setSigilDetailModal({ name: sigilName, desc });
                                        }
                                      }}
                                      title={sigilName}
                                      className="w-1/5 flex items-center justify-center cursor-pointer transition-transform hover:scale-125 active:scale-95 select-none"
                                    >
                                      {artUrl ? (
                                        <img
                                          src={artUrl}
                                          alt={sigilName}
                                          className="w-7 h-7 sm:w-8 sm:h-8 object-contain filter contrast-125 drop-shadow-[0_2px_4px_rgba(0,0,0,0.95)] drop-shadow-[0_0_8px_rgba(0,0,0,0.85)]"
                                          onError={(e) => {
                                            (e.currentTarget as HTMLElement).style.display = 'none';
                                          }}
                                        />
                                      ) : (
                                        <span className="text-sm">👁️</span>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>

                              {/* Attack Number Centered in Left Stone Socket */}
                              <div
                                className="absolute pointer-events-none z-20 flex items-center justify-center select-none w-16 h-16"
                                style={{
                                  left: '17.6%',
                                  top: '81.6%',
                                  transform: 'translate(-50%, -50%)',
                                }}
                              >
                                <span className="font-['Cinzel',_serif] font-black text-2xl sm:text-3xl text-[#ebd9bf] leading-none drop-shadow-[0_2px_4px_rgba(0,0,0,0.95)]">
                                  {massiveBoss.attack}
                                </span>
                              </div>

                              {/* Health Number Centered in Right Stone Socket */}
                              <div
                                className="absolute pointer-events-none z-20 flex items-center justify-center select-none w-16 h-16"
                                style={{
                                  left: '82.2%',
                                  top: '81.6%',
                                  transform: 'translate(-50%, -50%)',
                                }}
                              >
                                <span
                                  className={`font-['Cinzel',_serif] font-black text-2xl sm:text-3xl leading-none transition-colors duration-150 ${
                                    isHpFlashing
                                      ? 'text-white drop-shadow-[0_0_12px_rgba(255,255,255,1)]'
                                      : 'text-red-500 drop-shadow-[0_2px_6px_rgba(220,38,38,0.95)]'
                                  }`}
                                >
                                  {massiveBoss.health}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      }

                      return (
                        <>
                          {/* Row 1: Opponent Queue Row */}
                           <div className="flex justify-center items-center gap-2 sm:gap-4 my-1 opacity-90 w-full overflow-visible">
                             {enemyQueue.map((card, idx) => {
                               const isDropping = droppingQueueLane === idx;
                               return (
                                 <div
                                   key={`e-queue-slot-${idx}`}
                                    className={`w-24 sm:w-28 h-36 sm:h-40 shrink-0 rounded-[3px] flex items-center justify-center relative box-border border border-dashed border-[#8c6747]/25 bg-transparent overflow-visible ${
                                      card || isDropping ? 'z-20' : 'z-0'
                                    } ${isDropping ? 'z-30' : 'z-10'}`}
                                  >
                                    {(!card || isDropping) && (
                                      <svg
                                        className="w-5 h-5 sm:w-6 sm:h-6 text-[#c4a47c]/75 drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] pointer-events-none select-none"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="3.5"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                      >
                                        <line x1="12" y1="4" x2="12" y2="20" />
                                        <polyline points="18 14 12 20 6 14" />
                                      </svg>
                                    )}

                                   {card && (
                                     <div
                                       className={`w-full h-full flex items-center justify-center transition-all duration-300 ease-out ${
                                         card.isDying
                                           ? 'opacity-0 scale-75 pointer-events-none'
                                           : isEnemyRetracting
                                           ? 'transition-all duration-700 ease-in-out -translate-y-28 opacity-0 pointer-events-none'
                                           : isDropping
                                             ? 'transition-transform duration-300 ease-in-out translate-y-[calc(100%+8px)] z-30 pointer-events-none'
                                             : 'animate-queue-slide-in'
                                       }`}
                                     >
                                       {renderCard(card, {
                                         isOpponent: true,
                                         isQueue: true,
                                         laneIndex: idx,
                                         disableHoverScale: true,
                                       })}
                                     </div>
                                   )}
                                 </div>
                               );
                             })}
                           </div>

                           {/* Row 2: Opponent Active Board Slots */}
                           <div className="flex justify-center items-center gap-2 sm:gap-4 my-1 w-full overflow-visible">
                             {enemyBoard.map((card, idx) => {
                               const isAttackingThisLane = activeAttacker?.isPlayer === false && activeAttacker?.lane === idx;
                               const isDamagedThisLane = damagedCard?.isPlayer === false && damagedCard?.lane === idx;
                               const isDestroyedThisLane = destroyedCard?.isPlayer === false && destroyedCard?.lane === idx;
                               const isHpFlashingThisLane = hpFlashingCard?.isPlayer === false && hpFlashingCard?.lane === idx;
                               const isSigilJitterThisLane = jitteringCard?.isPlayer === false && jitteringCard?.lane === idx;
                               const isDefendingThisLane = activeDefendingLane?.isPlayer === false && activeDefendingLane?.lane === idx;
                               const isZeroPowerThisLane = zeroPowerShakingCard?.isPlayer === false && zeroPowerShakingCard?.lane === idx;
                               return (
                                 <div
                                  key={`e-slot-${idx}`}
                                  onClick={() => {
                                    if (itemTargetMode) {
                                      handleItemTargetLane(idx);
                                    }
                                  }}
                                  className={`w-24 sm:w-28 h-36 sm:h-40 shrink-0 rounded-[3px] flex items-center justify-center relative box-border border border-dashed border-[#8c6747]/25 bg-transparent overflow-visible ${
                                    isAttackingThisLane ? 'z-50' : card ? 'z-20' : 'z-0'
                                  } ${
                                    itemTargetMode && card
                                      ? 'ring-2 ring-red-500/80 animate-pulse cursor-crosshair scale-[1.02]'
                                      : ''
                                  }`}
                                >
                                    {(!card || isAttackingThisLane) && (
                                      <span className="absolute text-[10px] font-mono text-amber-900/30 select-none pointer-events-none">
                                        •
                                      </span>
                                    )}
                                   {card ? (
                                     <div
                                       className={`w-full h-full flex items-center justify-center transition-all duration-300 ease-out ${
                                         card.isDying || isDestroyedThisLane
                                           ? 'opacity-0 scale-75 pointer-events-none'
                                           : isEnemyRetracting
                                           ? 'transition-all duration-700 ease-in-out -translate-y-28 opacity-0 pointer-events-none'
                                           : ''
                                       }`}
                                     >
                                       {renderCard(card, {
                                         isOpponent: true,
                                         laneIndex: idx,
                                         disableHoverScale: true,
                                         isAttacking: isAttackingThisLane,
                                         attackDirection: isAttackingThisLane ? activeAttacker?.direction : undefined,
                                         isAirborneAttack: isAttackingThisLane ? activeAttacker?.isAirborne : undefined,
                                         isDirectAttack: isAttackingThisLane ? activeAttacker?.isDirect : undefined,
                                         isDamaged: isDamagedThisLane,
                                         isDestroyed: isDestroyedThisLane,
                                         isHpFlashing: isHpFlashingThisLane,
                                         isSigilJittering: isSigilJitterThisLane,
                                         isDefending: isDefendingThisLane,
                                         isZeroPowerShaking: isZeroPowerThisLane,
                                       })}
                                     </div>
                                   ) : null}
                                 </div>
                               );
                             })}
                           </div>
                         </>
                       );
                     })()}

                 {/* Row 3: Player Active Board Slots */}
                     <div className="flex justify-center items-center gap-2 sm:gap-4 my-1 w-full overflow-visible">
                       {playerBoard.map((card, idx) => {
                     const isMarked = markedForSacrifice === idx;
                     const isAttackingThisLane = activeAttacker?.isPlayer === true && activeAttacker?.lane === idx;
                     const isDamagedThisLane = damagedCard?.isPlayer === true && damagedCard?.lane === idx;
                     const isDestroyedThisLane = destroyedCard?.isPlayer === true && destroyedCard?.lane === idx;
                     const isHpFlashingThisLane = hpFlashingCard?.isPlayer === true && hpFlashingCard?.lane === idx;
                     const isSigilJitterThisLane = jitteringCard?.isPlayer === true && jitteringCard?.lane === idx;
                     const isDefendingThisLane = activeDefendingLane?.isPlayer === true && activeDefendingLane?.lane === idx;
                     const isZeroPowerThisLane = zeroPowerShakingCard?.isPlayer === true && zeroPowerShakingCard?.lane === idx;
                     return (
                       <div
                         key={`p-slot-${idx}`}
                                  onClick={() => handlePlayerSlotClick(idx)}
                                  className={`w-24 sm:w-28 h-36 sm:h-40 shrink-0 rounded-[3px] flex items-center justify-center relative box-border border border-dashed border-[#8c6747]/25 hover:border-[#cfb794]/50 bg-transparent hover:bg-white/[0.02] cursor-pointer overflow-visible ${
                                    isAttackingThisLane ? 'z-50' : card ? 'z-20' : 'z-0'
                                  }`}
                                >
                                  {(!card || isAttackingThisLane) && (
                                    <span className="absolute text-[11px] font-mono text-amber-900/40 select-none pointer-events-none tracking-widest">
                                      +
                                    </span>
                                  )}
                         {card ? (
                           renderCard(card, {
                             laneIndex: idx,
                             isMarkedSacrifice: isMarked,
							 isSacrificing: sacrificingLane === idx,
                             isClickable: true,
                             disableHoverScale: true,
                             isAttacking: isAttackingThisLane,
                             attackDirection: isAttackingThisLane ? activeAttacker?.direction : undefined,
                             isAirborneAttack: isAttackingThisLane ? activeAttacker?.isAirborne : undefined,
                             isDirectAttack: isAttackingThisLane ? activeAttacker?.isDirect : undefined,
                             isDamaged: isDamagedThisLane,
                             isDestroyed: isDestroyedThisLane,
                             isHpFlashing: isHpFlashingThisLane,
                             isSigilJittering: isSigilJitterThisLane,
                             isDefending: isDefendingThisLane,
                             isZeroPowerShaking: isZeroPowerThisLane,
                           })
                         ) : null}
                       </div>
                     );
                   })}
                 </div>

                      {/* Row 4: Player Hand */}
                <div
                  className="w-full flex items-center justify-center min-h-[140px] sm:min-h-[150px] mt-1 sm:mt-2 mb-0 px-1 overflow-visible z-30"
                  style={{
                    transform: 'none',
                  }}
                >
                  {hand.map((card, idx) => {
                          // Loosened overlap ladder so cards fan out legibly without choking the art
                          let overlapStyle: React.CSSProperties = {};
                          if (idx > 0) {
                            if (hand.length <= 2) {
                              overlapStyle = { marginLeft: '-10px' };
                            } else if (hand.length === 3) {
                              overlapStyle = { marginLeft: '-16px' };
                            } else if (hand.length === 4) {
                              overlapStyle = { marginLeft: '-24px' };
                            } else if (hand.length === 5) {
                              overlapStyle = { marginLeft: '-32px' };
                            } else if (hand.length === 6) {
                              overlapStyle = { marginLeft: '-42px' };
                            } else if (hand.length === 7) {
                              overlapStyle = { marginLeft: '-52px' };
                            } else {
                              overlapStyle = { marginLeft: '-60px' };
                            }
                          }
                          const isSelected = selectedHandIndex === idx;

                          // Physical hand arc: outer cards dip and tilt outward from the palm
                          const mid = (hand.length - 1) / 2;
                          const offsetFromCenter = hand.length > 1 ? idx - mid : 0;
                          const fanAngle = Math.max(-11, Math.min(11, offsetFromCenter * 2.8));
                          const fanDipY = Math.min(18, Math.pow(Math.abs(offsetFromCenter), 1.65) * 2.4);

                          return (
                            /* Stationary Slot Container: captures mouse events & maintains layout geometry */
                            <div
                              key={card.id || `hand-${card.name}-${idx}`}
                              onClick={() => selectHandCard(idx)}
                              style={{
                                ...overlapStyle,
                                transform: `translateY(${fanDipY}px) rotate(${fanAngle}deg)`,
                                transformOrigin: '50% 120%',
                                transition: 'transform 240ms cubic-bezier(0.22, 1, 0.36, 1)',
                                ...(isCinematic
                                  ? { transformStyle: 'preserve-3d' }
                                  : { backfaceVisibility: 'hidden' }),
                              }}
                              className={`group/handcard relative shrink-0 cursor-pointer select-none hover:!rotate-0 hover:!translate-y-0 before:absolute before:-inset-x-3 before:-inset-y-6 before:z-0 before:content-[''] ${
                                 isSelected ? 'z-40 !rotate-0 !translate-y-0' : 'hover:z-30 z-10'
                               }`}
                             >
                               {/* Animated Card Surface: Decoupled from hit target with dampened spring physics */}
                               <div
                                 style={{
                                   transition: 'transform 220ms cubic-bezier(0.22, 1, 0.36, 1), filter 220ms cubic-bezier(0.22, 1, 0.36, 1), z-index 0ms',
                                   transitionDelay: '30ms',
                                   animationDelay: `${idx * 40}ms`,
                                   ...(isCinematic
                                     ? { transformStyle: 'preserve-3d' }
                                     : { backfaceVisibility: 'hidden', transform: 'translateZ(0)' }),
                                 }}
                                 className={`relative animate-card-draw group-hover/handcard:transition-delay-[0ms] ${
                                   isSelected
                                     ? 'z-40 -translate-y-4 scale-[1.06]'
                                     : 'group-hover/handcard:z-30 group-hover/handcard:-translate-y-4 group-hover/handcard:scale-[1.06]'
                                 }`}
                               >
                          {renderCard(card, {
                            isSelected,
                            isClickable: phase === 'PLAY',
                            disableHoverScale: true,
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* FIXED FLANK: Bleeding Stone Runnel & Blood Ampoule Rack + S & C Draw Decks directly beneath */}
<div className="absolute right-3 sm:right-5 top-1/2 -translate-y-1/2 flex flex-col items-center justify-center gap-3 w-44 select-none pointer-events-auto z-20">
    {/* Floating OVERKILL text anchored above runnel without displacing layout */}
    {isOverkill && (
      <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-sm font-mono font-black text-red-500 uppercase tracking-widest animate-bounce drop-shadow-[0_0_12px_rgba(239,68,68,1)] text-center leading-none whitespace-nowrap pointer-events-none z-30">
        OVERKILL
      </div>
    )}

    {/* 1. THE BLEEDING STONE RUNNEL (Replaces Brass Balance Scale) */}
    <div
    className={`w-12 h-80 bg-[#120f0d] border border-[#2b221b] rounded-sm relative flex flex-col items-center justify-between py-2.5 shadow-[inset_0_3px_10px_rgba(0,0,0,0.95),0_2px_5px_rgba(0,0,0,0.8)] select-none transition-all ${
      scaleRumble ? 'animate-scale-rumble shadow-[0_0_20px_rgba(220,38,38,0.55)]' : ''
    }`}
    title={`Runnel Balance: ${scale === 0 ? '0 (Balanced)' : scale > 0 ? `+${scale}` : `${scale}`}`}
  >
    {/* Top Endpoint: Rusted Iron Drain Grate (+5 Opponent Defeat / Overkill Basin) */}
    <div
      className={`w-7 h-2.5 rounded-[1px] flex items-center justify-evenly px-0.5 shadow-inner transition-all duration-500 relative overflow-hidden ${
        isOverkill || scale >= 5
          ? 'bg-red-950 border border-red-500 shadow-[0_0_20px_rgba(239,68,68,1)]'
          : 'bg-[#1c140e] border border-[#3d2a1c]'
      }`}
      title="Opponent Defeat (+5)"
    >
      {(isOverkill || scale >= 5) && (
        <div className="absolute inset-0 bg-gradient-to-t from-red-600 via-red-800 to-red-950 opacity-95 animate-pulse shadow-[inset_0_0_6px_rgba(254,202,202,0.9)]" />
      )}
      <div className={`w-[1px] h-full z-10 transition-colors duration-300 ${isOverkill || scale >= 5 ? 'bg-black/90' : 'bg-[#0a0807]'}`} />
      <div className={`w-[1px] h-full z-10 transition-colors duration-300 ${isOverkill || scale >= 5 ? 'bg-black/90' : 'bg-[#0a0807]'}`} />
      <div className={`w-[1px] h-full z-10 transition-colors duration-300 ${isOverkill || scale >= 5 ? 'bg-black/90' : 'bg-[#0a0807]'}`} />
      <div className={`w-[1px] h-full z-10 transition-colors duration-300 ${isOverkill || scale >= 5 ? 'bg-black/90' : 'bg-[#0a0807]'}`} />
    </div>

    {/* Central Conduit Chamber: Slate Notches + Diegetic Glass Ampoule Column */}
    <div className="relative flex-1 w-full flex items-center justify-center my-1">
      {/* 11 Chiseled Tally Notches (-5 to +5) in the Slate Slab Behind the Glass */}
      <div className="absolute inset-y-0 w-full flex flex-col justify-between items-center pointer-events-none py-0.5 z-0">
        {[5, 4, 3, 2, 1, 0, -1, -2, -3, -4, -5].map((val) => {
          const isMidpoint = val === 0;
          const isCurrent = scale === val;

          return (
            <div
              key={`runnel-notch-${val}`}
              className="w-full relative flex items-center justify-center"
            >
              <div
                className={`transition-all duration-300 ${
                  isMidpoint
                    ? 'w-8 h-[2px] bg-[#4a3b30] shadow-[0_1px_1px_rgba(0,0,0,0.8)]'
                    : isCurrent
                      ? 'w-5 h-[1.5px] bg-[#78350f] shadow-[0_0_4px_rgba(245,158,11,0.5)]'
                      : 'w-4 h-[1px] bg-[#2a211a]'
                }`}
              />
            </div>
          );
        })}
      </div>

      {/* Overkill Ambient Flood Channel (Fills Upper Headspace When Damaged Beyond +5) */}
      {(isOverkill || scale >= 5) && (
        <div className="absolute top-0 inset-x-2 h-14 bg-gradient-to-b from-red-600/30 via-red-950/20 to-transparent pointer-events-none animate-pulse z-0" />
      )}

      {/* THE GLASS AMPOULE (Integrated Cylindrical Specimen Tube) */}
      <div className="relative w-4 h-full flex flex-col items-center justify-between z-10">
        {/* Top Brass Ferrule Collar */}
        <div className="w-5 h-1.5 bg-gradient-to-b from-[#3a281c] to-[#1d140e] border border-[#523927] rounded-t-xs shadow-sm z-20" />

        {/* Glass Cylinder Body */}
          <div className="relative w-full flex-1 rounded-full bg-[#0a0505] border border-white/20 shadow-[inset_0_2px_8px_rgba(0,0,0,0.95),0_0_8px_rgba(0,0,0,0.7)] overflow-hidden flex flex-col justify-end">
            {/* Inline Fluid Mechanics Keyframes */}
            <style>{`
              @keyframes bloodWaveScroll {
                0% { transform: translateX(0); }
                100% { transform: translateX(-50%); }
              }
              @keyframes bloodBubbleAscendA {
                0% { bottom: 2%; transform: translateX(0) scale(0.6); opacity: 0; }
                15% { opacity: 0.85; }
                50% { transform: translateX(1px) scale(0.9); }
                85% { opacity: 0.7; transform: translateX(-0.5px) scale(1.05); }
                100% { bottom: 92%; transform: translateX(0) scale(1.2); opacity: 0; }
              }
              @keyframes bloodBubbleAscendB {
                0% { bottom: 4%; transform: translateX(0) scale(0.5); opacity: 0; }
                20% { opacity: 0.75; }
                60% { transform: translateX(-1px) scale(0.85); }
                85% { opacity: 0.65; transform: translateX(0.5px) scale(1); }
                100% { bottom: 94%; transform: translateX(0) scale(1.1); opacity: 0; }
              }
              @keyframes bloodBubbleAscendC {
                0% { bottom: 1%; transform: translateX(0) scale(0.7); opacity: 0; }
                25% { opacity: 0.9; }
                45% { transform: translateX(-0.5px) scale(0.95); }
                75% { opacity: 0.8; transform: translateX(1px) scale(1.1); }
                100% { bottom: 90%; transform: translateX(0) scale(1.25); opacity: 0; }
              }
            `}</style>

            {/* Glass Specular Glint (Continuous Curved Longitudinal Reflection) */}
            <div className="absolute top-0 bottom-0 left-[2px] w-[1.5px] bg-gradient-to-b from-white/40 via-white/10 to-white/20 rounded-full z-20 pointer-events-none" />
            <div className="absolute top-0 bottom-0 right-[2px] w-[1px] bg-white/10 rounded-full z-20 pointer-events-none" />

            {/* Organic Viscous Blood Column */}
      {(() => {
        const fillPercent = isOverkill || scale >= 5
          ? 100
          : Math.min(100, Math.max(0, ((scale + 5) / 10) * 100));

        return (
          <div
            className={`absolute bottom-0 inset-x-0 transition-all duration-700 ease-[cubic-bezier(0.2,0.8,0.2,1)] ${
              scaleRumble || isOverkill
                ? 'animate-pulse filter brightness-110'
                : ''
            }`}
            style={{
              height: `${fillPercent}%`,
              background: 'linear-gradient(to top, #0f0102 0%, #290206 20%, #4d050a 45%, #7a0c14 70%, #991320 90%, #b91c1c 100%)',
              boxShadow: isOverkill || scale >= 5
                ? '0 0 24px rgba(220, 38, 38, 0.95), inset 0 0 8px rgba(254, 202, 202, 0.5)'
                : '0 0 12px rgba(153, 19, 32, 0.8), inset 0 0 4px rgba(254, 202, 202, 0.3)',
            }}
          >
            {/* Rising Arterial Micro-Bubbles */}
            {fillPercent > 8 && (
              <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div
                  className="absolute left-[20%] w-[3px] h-[3px] rounded-full bg-rose-200/40 border border-white/60 shadow-[0_0_2px_rgba(255,255,255,0.7)]"
                  style={{ animation: 'bloodBubbleAscendA 3.2s ease-in infinite' }}
                />
                <div
                  className="absolute left-[62%] w-[2px] h-[2px] rounded-full bg-rose-200/40 border border-white/50 shadow-[0_0_2px_rgba(255,255,255,0.5)]"
                  style={{ animation: 'bloodBubbleAscendB 4.1s ease-in infinite 1.2s' }}
                />
                <div
                  className="absolute left-[38%] w-[2.5px] h-[2.5px] rounded-full bg-rose-200/40 border border-white/60 shadow-[0_0_2px_rgba(255,255,255,0.6)]"
                  style={{ animation: 'bloodBubbleAscendC 2.7s ease-in infinite 0.6s' }}
                />
              </div>
            )}

            {/* Flowing Wavy Surface Meniscus */}
            {fillPercent > 0 && (
              <div className="absolute -top-[3.5px] left-0 right-0 h-[7px] overflow-hidden pointer-events-none z-10">
                <svg
                  viewBox="0 0 64 8"
                  className="w-[200%] h-full"
                  style={{ animation: 'bloodWaveScroll 2.2s linear infinite' }}
                  preserveAspectRatio="none"
                >
                  <path
                    d="M 0 4 Q 8 0.5, 16 4 T 32 4 T 48 4 T 64 4 L 64 8 L 0 8 Z"
                    fill="#991b1b"
                  />
                  <path
                    d="M 0 4 Q 8 0.5, 16 4 T 32 4 T 48 4 T 64 4"
                    fill="none"
                    stroke="#fecdd3"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    className="filter drop-shadow-[0_0_4px_rgba(254,202,202,0.95)]"
                  />
                </svg>
                </div>
              )}

              {/* Overkill Arterial Surge */}
              {(isOverkill || scale >= 5) && (
                <div className="absolute top-0 inset-x-0 h-5 bg-gradient-to-b from-red-400/80 via-red-600/40 to-transparent animate-ping opacity-90 pointer-events-none" />
              )}
            </div>
          );
        })()}

          {/* Arterial Limit Ampoule State: Pre-scored until breached, then fractured for the rest of the battle */}
            {isAmpouleCracked ? (
              /* Broken Ampoule Glass at +4 Pressure (Persists until duel ends) */
              <div
                className="absolute top-[10%] -translate-y-1/2 -left-1 -right-1 h-8 pointer-events-none z-30 select-none overflow-visible"
                title="Arterial Limit Breached: Ampoule shattered at +4 to vent lethal pressure"
              >
                <svg viewBox="0 0 24 32" className="w-full h-full overflow-visible drop-shadow-[0_0_6px_rgba(239,68,68,0.95)]">
                  {/* Jagged glass fracture line */}
                  <path d="M 1 16 L 7 12 L 12 18 L 18 11 L 23 15" fill="none" stroke="#fecaca" strokeWidth="1.2" strokeLinecap="round" />
                  {/* Radiating hairline cracks */}
                  <path d="M 7 12 L 6 6 L 10 2" fill="none" stroke="#fca5a5" strokeWidth="0.8" opacity="0.85" />
                  <path d="M 12 18 L 11 26 L 16 30" fill="none" stroke="#fca5a5" strokeWidth="0.8" opacity="0.85" />
                  <path d="M 7 12 L 13 10 L 17 5" fill="none" stroke="#ef4444" strokeWidth="0.8" />
                  {/* Flaked glass chip */}
                  <polygon points="13,14 16,11 15,16" fill="#ffffff" opacity="0.9" />
                </svg>

                {/* Bleeding exterior drip running down the ampoule face */}
                <div className="absolute top-4 left-1/2 -translate-x-1/2 w-1 h-14 bg-gradient-to-b from-red-500 via-red-800 to-transparent rounded-full shadow-[0_0_8px_rgba(239,68,68,0.9)] animate-pulse" />

                {/* Arterial vent spark */}
                <div className="absolute top-3.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-red-400 animate-ping shadow-[0_0_8px_rgba(239,68,68,1)]" />
              </div>
            ) : (
              /* Pre-Scored Fragile Diamond Score Line on Intact Glass at +4 */
              <div
                className="absolute top-[10%] -translate-y-1/2 inset-x-0 h-[1.5px] z-25 pointer-events-none"
                title="Hydraulic Limit (+4): Glass pre-scored to fracture under lethal first-turn pressure"
              >
                <div className="w-full h-full border-t border-dashed border-red-400/40 shadow-[0_0_3px_rgba(239,68,68,0.3)]" />
                </div>
              )}
          </div>

        {/* Bottom Brass Ferrule Collar */}
        <div className="w-5 h-1.5 bg-gradient-to-b from-[#1d140e] to-[#3a281c] border border-[#523927] rounded-b-xs shadow-sm z-20" />
      </div>
    </div>

    {/* Bottom Endpoint: Rusted Iron Drain Grate (-5 Player Defeat) */}
    <div
      className="w-7 h-2.5 bg-[#1c140e] border border-[#3d2a1c] rounded-[1px] flex items-center justify-evenly px-0.5 shadow-inner"
      title="Player Defeat (-5)"
    >
      <div className="w-[1px] h-full bg-[#0a0807]" />
      <div className="w-[1px] h-full bg-[#0a0807]" />
      <div className="w-[1px] h-full bg-[#0a0807]" />
      <div className="w-[1px] h-full bg-[#0a0807]" />
    </div>
  </div>

  {/* 2. BLOOD BANK OUNCES (Replaces Teeth Counter) */}
  {(() => {
    const winThreshold = typeof getRequiredScaleWinDamage === 'function' ? getRequiredScaleWinDamage() : 5;
    const liveBattleOverkill = Math.max(0, scale - winThreshold);
    const displayBloodOz = (totalOverkillDamage || 0) + (isOverkill ? 0 : liveBattleOverkill);

    return (
      <div
        className={`flex items-center justify-center gap-1.5 px-3 py-1 bg-[#16120f] border rounded-sm shadow-[0_2px_4px_rgba(0,0,0,0.8),inset_0_1px_0_rgba(255,255,255,0.05)] select-none transition-all duration-300 ${
          turnNumber === 1 && scale >= 4
            ? 'border-red-900/80 shadow-[0_0_10px_rgba(220,38,38,0.4)]'
            : 'border-[#2f241c]'
        }`}
        title={`Blood Bank: ${displayBloodOz} Ounces`}
      >
        <span className="font-['Cinzel',_serif] font-black text-sm tracking-widest text-[#d8b88a] drop-shadow-[0_1px_1px_rgba(0,0,0,0.9)]">
          {displayBloodOz}
        </span>
        <span className="font-mono text-[10px] font-bold text-[#8c6747] tracking-wider uppercase">
          OZ
        </span>
      </div>
    );
  })()}
                {/* Bone Reservoir Tray (Relocated beneath Ampoule Rack) */}
                <div className="flex flex-col items-center gap-2 w-full mt-2.5 select-none">
                  <div className="font-['Cinzel',_serif] font-bold text-xs sm:text-sm tracking-[0.22em] uppercase text-[#9e8368] drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
                    Turn {turnNumber}
                  </div>

                  <div className="flex items-center justify-center gap-2 px-3.5 py-1.5 bg-[#140f0c] border border-[#2b221a] rounded-sm shadow-[inset_0_2px_5px_rgba(0,0,0,0.9),0_1px_3px_rgba(0,0,0,0.8)]">
                    <span className={`text-sm filter contrast-125 brightness-90 select-none ${boneShaking ? 'animate-bone-shake' : ''}`}>
                      🦴
                    </span>
                    <span className="font-['Cinzel',_serif] font-black text-sm text-[#ebd9bf] tracking-widest drop-shadow-[0_1px_1px_rgba(0,0,0,0.9)]">
                      {bones}
                    </span>
                  </div>
                </div>

                {/* S & C Draw Decks directly beneath Turn & Bones */}
                <style>{`
                  .deck-glyph-red {
                    filter: invert(77%) sepia(81%) saturate(4003%) hue-rotate(345deg) brightness(123%) contrast(88%) drop-shadow(0 3px 5px rgba(0, 0, 0, 0.95)) drop-shadow(0 1px 2px rgba(0, 0, 0, 1));
                    transition: filter 0.15s ease-out, transform 0.15s ease-out;
                  }
                  .group:hover .deck-glyph-red {
                    filter: invert(77%) sepia(81%) saturate(4003%) hue-rotate(345deg) brightness(132%) contrast(92%) drop-shadow(0 3px 5px rgba(0, 0, 0, 0.95)) drop-shadow(0 0 8px rgba(240, 55, 64, 0.55));
                    transform: scale(1.08);
                  }
                  .deck-count-red {
                    color: #f03740;
                    text-shadow: 0 2px 4px rgba(0, 0, 0, 1), 0 0 2px rgba(0, 0, 0, 0.8);
                    transition: color 0.15s ease-out, text-shadow 0.15s ease-out;
                  }
                  .group:hover .deck-count-red {
                    color: #ff525c;
                    text-shadow: 0 2px 4px rgba(0, 0, 0, 1), 0 0 6px rgba(240, 55, 64, 0.5);
                  }
                `}</style>
                <div className="flex items-center justify-center gap-3.5 w-full relative mt-4 sm:mt-5 translate-y-1 font-mono">
                  {/* Squirrel Deck */}
                  <div className="group flex flex-col items-center gap-1.5">
                    <button
                      disabled={phase !== 'DRAW'}
                      onClick={() => handleDraw('sacrifice')}
                      className={`w-[76px] h-[108px] sm:w-[80px] sm:h-[114px] rounded flex items-center justify-center border-2 transition-all select-none relative overflow-hidden bg-[#140e0a] ${
                        phase === 'DRAW'
                          ? 'cursor-pointer hover:scale-105 active:scale-95 animate-deck-glow z-20'
                          : 'border-[#3d2719] opacity-75 cursor-not-allowed shadow-[2px_2px_0_#1c140e,4px_4px_0_#140e0a,6px_6px_8px_rgba(0,0,0,0.8)]'
                      }`}
                      title="Draw Squirrel"
                    >
                      {/* Card Back Graphic */}
                      <img
                        src={`${BASE}/assets/cardbases/cardbacks.png`}
                        alt="Squirrel Deck"
                        className="absolute inset-0 w-full h-full object-fill pointer-events-none select-none z-0"
                        style={{ imageRendering: 'pixelated' }}
                      />

                      {/* Dead-Center Large Red Glyphed S */}
                      <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
                        <img
                          src={`${BASE}/assets/cardbases/S.png`}
                          alt="S"
                          className="deck-glyph-red h-12 sm:h-14 w-auto object-contain pointer-events-none select-none"
                          style={{ imageRendering: 'pixelated' }}
                        />
                      </div>
                    </button>

                    {/* Stack Count Below Deck */}
                    <span className="deck-count-red text-[11px] sm:text-xs font-mono font-bold tracking-wider select-none pointer-events-none">
                      (∞)
                    </span>
                  </div>

                  {/* Creature Deck */}
                  <div className="group flex flex-col items-center gap-1.5">
                    <button
                      disabled={phase !== 'DRAW'}
                      onClick={() => handleDraw('main')}
                      className={`w-[76px] h-[108px] sm:w-[80px] sm:h-[114px] rounded flex items-center justify-center border-2 transition-all select-none relative overflow-hidden bg-[#140e0a] ${
                        phase === 'DRAW'
                          ? 'cursor-pointer hover:scale-105 active:scale-95 animate-deck-glow z-20'
                          : 'border-[#3d2719] opacity-75 cursor-not-allowed shadow-[2px_2px_0_#1c140e,4px_4px_0_#140e0a,6px_6px_8px_rgba(0,0,0,0.8)]'
                      }`}
                      title="Draw Creature from Deck"
                    >
                      {/* Card Back Graphic */}
                      <img
                        src={`${BASE}/assets/cardbases/cardbacks.png`}
                        alt="Creature Deck"
                        className="absolute inset-0 w-full h-full object-fill pointer-events-none select-none z-0"
                        style={{ imageRendering: 'pixelated' }}
                      />

                      {/* Dead-Center Large Red Glyphed C */}
                      <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
                        <img
                          src={`${BASE}/assets/cardbases/C.png`}
                          alt="C"
                          className="deck-glyph-red h-12 sm:h-14 w-auto object-contain pointer-events-none select-none"
                          style={{ imageRendering: 'pixelated' }}
                        />
                      </div>
                    </button>

                    {/* Stack Count Below Deck */}
                    <span className="deck-count-red text-[11px] sm:text-xs font-mono font-bold tracking-wider select-none pointer-events-none">
                      ({deck.length})
                    </span>
                  </div>
                </div>

  {/* Vertical 3-Slot Item Rack (Pinned to the upper right quadrant alongside the runnel) */}
  <div className="absolute left-[calc(50%+30px)] top-3 flex flex-col items-center justify-center gap-2 p-1.5 bg-[#100b08]/95 border border-[#3e2316] rounded-sm shadow-[inset_0_2px_8px_rgba(0,0,0,0.9),0_4px_12px_rgba(0,0,0,0.7)] z-30">
    <div className="text-[8px] font-mono uppercase tracking-widest text-[#8c7662]/70 border-b border-[#2e1a10] pb-0.5 w-full text-center">
      ITEMS
    </div>

    {items.map((itemId, idx) => {
      const item = itemId ? ALL_ITEMS[itemId] : null;
      const isTargetingThis = itemTargetSourceSlot === idx;

      return (
        <button
          key={idx}
          onClick={() => handleUseItem(idx)}
          disabled={phase !== 'PLAY' || !item}
          title={item ? `${item.name}: ${item.description}` : 'Empty Slot'}
          className={`relative w-10 h-10 sm:w-11 sm:h-11 rounded-sm border flex items-center justify-center text-lg outline-none transition-all duration-150 ${
            item
              ? isTargetingThis
                ? 'border-red-500 bg-red-950/50 shadow-[0_0_12px_rgba(239,68,68,0.8)] scale-105 animate-pulse cursor-pointer'
                : 'border-[#5a3822] bg-gradient-to-b from-[#241710] to-[#140d09] hover:border-amber-400 hover:scale-105 active:scale-95 shadow-[0_2px_5px_rgba(0,0,0,0.8)] cursor-pointer'
              : 'border-[#261810]/40 bg-[#090604]/60 cursor-not-allowed opacity-30 shadow-inner'
          }`}
        >
          {item ? (
            <span>{item.emoji}</span>
          ) : (
            <span className="text-[#3a261a] text-xs font-mono">•</span>
          )}
        </button>
      );
    })}
  </div>

</div> {/* End FIXED FLANK wrapper */}
            </div>
          </div>    
        </div>
      )}
      </div>

      {/* Loaded Die Deck Choice Modal */}
      {dieModal && (
        <div className="fixed inset-0 bg-black/85 z-[120] flex items-center justify-center p-4 backdrop-blur-xs font-mono select-none">
          <div className="max-w-xs w-full bg-[#120c09] border border-[#5a3822] p-5 text-center shadow-2xl rounded-sm">
            <div className="text-4xl mb-2">🎲 {dieModal.roll}</div>
            <div className="text-amber-200 font-bold text-sm tracking-widest uppercase mb-1">Loaded Die Cast</div>
            <p className="text-xs text-neutral-400 mb-4">
              Choose which deck yields {dieModal.count} {dieModal.count === 1 ? 'card' : 'cards'}:
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => {
                  for (let i = 0; i < dieModal.count; i++) {
                    handleDraw('sacrifice');
                  }
                  setDieModal(null);
                }}
                className="px-3.5 py-2 bg-[#221610] hover:bg-[#342218] border border-[#5a3822] text-amber-200 text-xs font-bold uppercase rounded-sm cursor-pointer transition-colors"
              >
                Squirrels ({dieModal.count})
              </button>
              <button
                onClick={() => {
                  for (let i = 0; i < dieModal.count; i++) {
                    handleDraw('main');
                  }
                  setDieModal(null);
                }}
                className="px-3.5 py-2 bg-[#221610] hover:bg-[#342218] border border-[#5a3822] text-amber-200 text-xs font-bold uppercase rounded-sm cursor-pointer transition-colors"
              >
                Creatures ({dieModal.count})
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Loaded Die Deck Choice Modal */}
      {dieModal && (
        <div className="fixed inset-0 bg-black/85 z-[120] flex items-center justify-center p-4 backdrop-blur-xs font-mono select-none">
          <div className="max-w-xs w-full bg-[#120c09] border border-[#5a3822] p-5 text-center shadow-2xl rounded-sm">
            <div className="text-4xl mb-2">🎲 {dieModal.roll}</div>
            <div className="text-amber-200 font-bold text-sm tracking-widest uppercase mb-1">Loaded Die Cast</div>
            <p className="text-xs text-neutral-400 mb-4">
              Choose which deck yields {dieModal.count} {dieModal.count === 1 ? 'card' : 'cards'}:
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => {
                  for (let i = 0; i < dieModal.count; i++) {
                    (handleDraw as any)('sacrifice');
                  }
                  setDieModal(null);
                }}
                className="px-3.5 py-2 bg-[#221610] hover:bg-[#342218] border border-[#5a3822] text-amber-200 text-xs font-bold uppercase rounded-sm cursor-pointer transition-colors"
              >
                Squirrels ({dieModal.count})
              </button>
              <button
                onClick={() => {
                  for (let i = 0; i < dieModal.count; i++) {
                    (handleDraw as any)('deck');
                  }
                  setDieModal(null);
                }}
                className="px-3.5 py-2 bg-[#221610] hover:bg-[#342218] border border-[#5a3822] text-amber-200 text-xs font-bold uppercase rounded-sm cursor-pointer transition-colors"
              >
                Creatures ({dieModal.count})
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          SIGIL DETAIL MODAL
         ========================================================================= */}
      {sigilDetailModal && (
        <div className="fixed inset-0 bg-black/85 z-[110] flex items-center justify-center p-4 backdrop-blur-sm font-mono select-none">
          <div className="border border-amber-950/60 p-6 bg-[#0c0805] max-w-sm w-full text-center">
            <div className="text-4xl mb-3 filter sepia-[0.8]">{SIGIL_MAPPING[sigilDetailModal.name] || '⭐'}</div>
            <div className="text-[10px] text-amber-700/80 tracking-widest uppercase mb-1">+-- SIGIL INSPECTION --+</div>
            <h3 className="text-base font-mono font-bold text-amber-200 uppercase tracking-widest mb-2">{sigilDetailModal.name}</h3>
            <p className="text-xs text-stone-300/80 leading-relaxed mb-6 font-mono border-t border-amber-950/40 pt-3">{sigilDetailModal.desc}</p>
            <button
              onClick={() => setSigilDetailModal(null)}
              className="mt-4 px-6 py-2 bg-[#181310] hover:bg-[#231b16] active:bg-[#120e0b] border border-[#2f241c] rounded-sm shadow-[0_2px_0_#0a0807,inset_0_1px_0_rgba(255,255,255,0.06)] active:translate-y-[1px] active:shadow-none transition-all duration-75 font-['Cinzel',_serif] font-bold text-[11px] uppercase tracking-widest text-[#cfb794] hover:text-[#f3ede2] cursor-pointer"
            >
              CLOSE
            </button>
          </div>
        </div>
      )}

      {/* =========================================================================
          GLOBAL MODAL ALERT
         ========================================================================= */}
      {modalAlert && (
        <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[100] w-[92%] max-w-md pointer-events-auto select-none">
          <div className="p-4 sm:p-5 rounded border border-[#8c6747]/80 bg-[#120c08]/95 shadow-[0_8px_25px_rgba(0,0,0,0.95)] flex flex-col items-center text-center font-mono w-full">
            <div className="text-[10px] text-amber-700/80 uppercase tracking-widest mb-1.5">
              {modalAlert.isWin ? '+-- THY CUP RUNNETH OVER --+' : '+-- I HOPE THIS HURTS --+'}
            </div>
            <h2 className={`text-lg sm:text-xl font-mono font-bold uppercase tracking-widest mb-2 ${
              modalAlert.isWin ? 'text-amber-200' : 'text-red-400'
            }`}>
              {modalAlert.title}
            </h2>
            <p className="text-xs sm:text-sm font-mono text-amber-100/90 mb-4 leading-relaxed border-t border-[#8c6747]/40 pt-2.5 w-full">
              {modalAlert.message}
            </p>
            <button
              onClick={modalAlert.onAction}
              className={`font-mono text-xs uppercase tracking-widest transition-all cursor-pointer ${
                modalAlert.isWin
                  ? 'text-amber-300 hover:text-amber-100 hover:tracking-[0.2em]'
                  : 'text-red-400 hover:text-red-300 hover:tracking-[0.2em]'
              }`}
            >
              [ {modalAlert.btnText.toUpperCase()} ]
            </button>
          </div>
        </div>
      )}

        {/* Global Glitch / VHS Screen-Tear Overlay */}
        {isTutorialGlitching && (
          <div className="absolute inset-0 z-[100] pointer-events-none overflow-hidden select-none">
            <style>{`
              @keyframes vhsJitter {
                0% { transform: translate(0, 0) skewX(0deg); filter: contrast(110%) brightness(100%); }
                10% { transform: translate(-10px, 4px) skewX(-3deg); filter: contrast(260%) brightness(150%) invert(30%); }
                20% { transform: translate(12px, -4px) skewX(4deg); filter: hue-rotate(90deg) contrast(300%); }
                30% { transform: translate(-16px, 2px) skewX(-5deg); filter: invert(90%); }
                40% { transform: translate(14px, -6px) skewX(2deg); filter: contrast(200%) saturate(300%); }
                50% { transform: translate(-8px, 9px) skewX(4deg); filter: invert(100%) brightness(220%); }
                60% { transform: translate(18px, -2px) skewX(-3deg); filter: hue-rotate(240deg) contrast(220%); }
                70% { transform: translate(-12px, -6px) skewX(5deg); filter: contrast(300%) invert(40%); }
                80% { transform: translate(9px, 7px) skewX(-2deg); filter: contrast(160%) brightness(70%); }
                90% { transform: translate(-5px, -3px) skewX(3deg); filter: invert(85%); }
                100% { transform: translate(0, 0) skewX(0deg); filter: contrast(110%) brightness(100%); }
              }
              @keyframes sliceTear1 {
                0%, 100% { clip-path: inset(0 0 0 0); transform: translateX(0); }
                15% { clip-path: inset(14% 0 62% 0); transform: translateX(-45px); }
                35% { clip-path: inset(48% 0 32% 0); transform: translateX(55px); }
                55% { clip-path: inset(72% 0 8% 0); transform: translateX(-60px); }
                75% { clip-path: inset(22% 0 52% 0); transform: translateX(40px); }
                90% { clip-path: inset(86% 0 2% 0); transform: translateX(-25px); }
              }
              @keyframes sliceTear2 {
                0%, 100% { clip-path: inset(0 0 0 0); transform: translateX(0); }
                10% { clip-path: inset(28% 0 46% 0); transform: translateX(50px); }
                30% { clip-path: inset(6% 0 78% 0); transform: translateX(-48px); }
                60% { clip-path: inset(58% 0 18% 0); transform: translateX(65px); }
                80% { clip-path: inset(82% 0 4% 0); transform: translateX(-38px); }
              }
              @keyframes scanlineDrift {
                0% { background-position: 0 0; }
                100% { background-position: 0 100%; }
              }
              @keyframes noisePulse {
                0%, 100% { opacity: 0.3; }
                25% { opacity: 0.9; }
                50% { opacity: 0.15; }
                75% { opacity: 0.95; }
              }
            `}</style>

            {/* Violent screen warp & high-contrast negative flicker */}
            <div
              className="absolute inset-0 backdrop-invert backdrop-contrast-200"
              style={{ animation: 'vhsJitter 0.14s infinite steps(2)' }}
            />

            {/* CRT Horizontal Scanlines */}
            <div
              className="absolute inset-0 mix-blend-hard-light pointer-events-none opacity-50"
              style={{
                backgroundImage: 'repeating-linear-gradient(0deg, rgba(0,0,0,0.85) 0px, rgba(0,0,0,0.85) 2px, transparent 2px, transparent 4px)',
                backgroundSize: '100% 4px',
                animation: 'scanlineDrift 0.18s linear infinite',
              }}
            />

            {/* Cyan Channel Displaced Slice */}
            <div
              className="absolute inset-0 bg-cyan-400/25 mix-blend-color-dodge backdrop-blur-[1px]"
              style={{ animation: 'sliceTear1 0.16s infinite steps(1)' }}
            />

            {/* Crimson Negative Displaced Slice */}
            <div
              className="absolute inset-0 bg-red-600/35 mix-blend-difference"
              style={{ animation: 'sliceTear2 0.13s infinite steps(1)' }}
            />

            {/* Vertical CRT Phosphor Bar Jitter */}
            <div
              className="absolute inset-0 mix-blend-overlay pointer-events-none"
              style={{
                backgroundImage: 'repeating-linear-gradient(90deg, rgba(255,255,255,0.14) 0px, transparent 3px, rgba(0,0,0,0.35) 6px)',
                animation: 'noisePulse 0.07s infinite',
              }}
            />
          </div>
        )}
      </div>
    {/* Mobile Orientation Blocker */}
      <div className="fixed inset-0 z-[9999] bg-[#04060a] flex flex-col items-center justify-center text-amber-100 p-6 text-center portrait:flex landscape:hidden select-none pointer-events-auto">
        <div className="text-4xl mb-4 font-mono animate-pulse">⤹ 📱</div>
        <p className="font-serif text-sm tracking-[0.2em] uppercase text-stone-300 mb-2">
          Ritual Requires Landscape
        </p>
        <p className="font-mono text-[10px] tracking-widest uppercase text-stone-500">
          Rotate your device to enter the board
        </p>
      </div>

    </div>
  );
}

