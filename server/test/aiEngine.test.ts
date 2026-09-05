import test from 'node:test';
import assert from 'node:assert';
import { AI_FORMATIONS, getAIRandomFormation } from '../../shared/aiFormations.js';
import { validateLayout } from '../../shared/blueprintCodec.js';
import { AIPersonality, DEFAULT_RULES, Piece } from '../../shared/types.js';
import { selectAIMove } from '../../shared/aiEngine.js';

test('AI Formations: All 12 formations are strictly valid by Junqi rules', () => {
  const personalities: AIPersonality[] = ['aggressive', 'balanced', 'cautious'];

  for (const p of personalities) {
    const formations = AI_FORMATIONS[p];
    assert.strictEqual(formations.length, 4, `${p} should have exactly 4 formations`);

    for (const f of formations) {
      const res = validateLayout(f.placements, true);
      assert.strictEqual(
        res.valid, 
        true, 
        `Formation ${p} - "${f.name}" must be valid, got: ${res.message}`
      );
    }
  }
});

test('getAIRandomFormation: Returns a valid formation matching personality', () => {
  const personalities: AIPersonality[] = ['aggressive', 'balanced', 'cautious'];

  for (const p of personalities) {
    for (let i = 0; i < 10; i++) {
      const f = getAIRandomFormation(p);
      assert.strictEqual(f.personality, p);
      assert.ok(f.name.length > 0);
      assert.strictEqual(f.placements.length, 25);
    }
  }
});

test('selectAIMove: Produces legal moves across easy, normal, and hard difficulties', () => {
  // Simple board with an AI piece and an opponent piece
  const board: (Piece | null)[] = Array(60).fill(null);
  // Place Black (AI) engineer at 25 (front line left)
  board[25] = { id: 'ai-eng-1', type: 'engineer', color: 'black', position: 25 };
  // Place White (opponent) company commander at 30 (front line left)
  board[30] = { id: 'opp-comp-1', type: 'company_commander', color: 'white', position: 30 };

  const difficulties = ['easy', 'normal', 'hard'] as const;
  for (const diff of difficulties) {
    const move = selectAIMove(board, 'black', 'balanced', DEFAULT_RULES, diff);
    assert.ok(move, `Expected a move for difficulty ${diff}`);
    assert.strictEqual(move.from, 25);
  }
});

test('selectAIMove (Hard): Flag hunting when enemy Flag is revealed', () => {
  const board: (Piece | null)[] = Array(60).fill(null);
  // AI White Division Commander at position 2 (Row 0 Col 2)
  board[2] = { id: 'ai-div-1', type: 'division_commander', color: 'white', position: 2 };
  // Enemy Black Flag revealed at position 1 (Row 0 Col 1, Left HQ directly adjacent!)
  board[1] = { id: 'opp-flag', type: 'flag', color: 'black', position: 1, isRevealed: true };

  const move = selectAIMove(board, 'white', 'aggressive', DEFAULT_RULES, 'hard');
  assert.ok(move);
  // AI must capture the Flag directly!
  assert.strictEqual(move.from, 2);
  assert.strictEqual(move.to, 1, 'Hard AI should directly capture adjacent revealed Flag in HQ');
});

test('selectAIMove (Hard): Evading danger into Camp', () => {
  const board: (Piece | null)[] = Array(60).fill(null);
  // AI Black Commander at position 11 (Row 2 Col 1)
  // Position 12 is a Camp (Row 2 Col 2) - adjacent and diagonal safe spot!
  board[11] = { id: 'ai-fm-1', type: 'field_marshal', color: 'black', position: 11 };
  // Opponent White Bomb is at position 10 (Row 2 Col 0) threatening position 11 directly!
  board[10] = { id: 'opp-bomb', type: 'bomb', color: 'white', position: 10, isRevealed: true };

  const move = selectAIMove(board, 'black', 'cautious', DEFAULT_RULES, 'hard');
  assert.ok(move);
  assert.strictEqual(move.from, 11);
  // AI Commander should take shelter in Camp 12 or escape away from Bomb!
  assert.notStrictEqual(move.to, 10, 'Commander should not suicide into Bomb');
});

test('selectAIMove (Hard): Non-engineer avoids charging into back-row unrevealed pieces in Anqi', () => {
  const board: (Piece | null)[] = Array(60).fill(null);
  // AI Black Commander at 51 (Row 10 Col 1)
  board[51] = { id: 'ai-fm', type: 'field_marshal', color: 'black', position: 51 };
  // Opponent White unrevealed piece in back row (56, White Left HQ or 50, back line corner)
  board[50] = { id: 'opp-unrevealed-mine', type: 'landmine', color: 'white', position: 50, isRevealed: false };
  // Also an open safe square at 46 (retreating or side moving)
  // Let's see if AI prefers safe move over charging unknown piece at 50 in back row:
  const move = selectAIMove(board, 'black', 'cautious', DEFAULT_RULES, 'hard');
  assert.ok(move);
  assert.notStrictEqual(move.to, 50, 'Hard AI Commander should not blind-charge back row unrevealed piece');
});
