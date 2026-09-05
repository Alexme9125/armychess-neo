import test from 'node:test';
import assert from 'node:assert';
import { 
  DEFAULT_RULES, 
  Piece, 
  PIECE_CONFIG 
} from '../../shared/types.js';
import { 
  createClassicBalancedLayout, 
  createAssaultLayout,
  createDefensiveLayout,
  validateLayout,
  createThunderLayout,
  createBombEngineerLayout,
  EASTER_EGG_THUNDER,
  EASTER_EGG_BOMB_ENGINEER 
} from '../../shared/blueprintCodec.js';
import { 
  getLegalMoves, 
  resolveClash, 
  checkCommanderDeath 
} from '../../shared/ruleEngine.js';
import { 
  GameSession 
} from '../src/gameSession.js';

test('Blueprint Validation & Easter Eggs', () => {
  // Classic layout has exactly 25 pieces and is valid
  const classic = createClassicBalancedLayout();
  assert.strictEqual(classic.length, 25);
  const v1 = validateLayout(classic);
  assert.strictEqual(v1.valid, true, `Classic should be valid: ${v1.message}`);

  // Assault layout (RUSH01) is valid
  const assault = createAssaultLayout();
  assert.strictEqual(assault.length, 25);
  const vAssault = validateLayout(assault);
  assert.strictEqual(vAssault.valid, true, `Assault should be valid: ${vAssault.message}`);

  // Defensive layout (DEF001) is valid
  const defensive = createDefensiveLayout();
  assert.strictEqual(defensive.length, 25);
  const vDefensive = validateLayout(defensive);
  assert.strictEqual(vDefensive.valid, true, `Defensive should be valid: ${vDefensive.message}`);

  // Front row bomb is invalid by Rule 4A
  const invalidBomb = classic.map(p => p.pieceType === 'bomb' ? { ...p, index: 0 } : p);
  const v2 = validateLayout(invalidBomb);
  assert.strictEqual(v2.valid, false);

  // Easter egg 325799: Thunder Mode
  const thunder = createThunderLayout();
  assert.strictEqual(thunder.length, 25);
  const vThunder = validateLayout(thunder, true, EASTER_EGG_THUNDER);
  assert.strictEqual(vThunder.valid, true);
  const marshals = thunder.filter(p => p.pieceType === 'field_marshal');
  assert.strictEqual(marshals.length, 24);
  const flag = thunder.find(p => p.pieceType === 'flag');
  assert.ok(flag);

  // Easter egg 350234: Bomb-Engineer Mode
  const bombEng = createBombEngineerLayout();
  assert.strictEqual(bombEng.length, 25);
  const vBombEng = validateLayout(bombEng, true, EASTER_EGG_BOMB_ENGINEER);
  assert.strictEqual(vBombEng.valid, true);
  const bombs = bombEng.filter(p => p.pieceType === 'bomb');
  assert.strictEqual(bombs.length, 20); // 25 slots minus 5 camps = 20 bombs
});

test('Rule 1A: Engineer unlimited railroad turns', () => {
  const classicBlack = createClassicBalancedLayout();
  const classicWhite = createClassicBalancedLayout();
  const session = new GameSession(classicBlack, classicWhite, { ...DEFAULT_RULES, engineerTurns: 'free' });

  // Place an engineer at (5, 0) - index 25 (Black front-left railroad station)
  const board = session.state.board;
  const engineerPiece: Piece = {
    id: 'test-eng',
    type: 'engineer',
    color: 'black',
    position: 25,
    isRevealed: true,
  };
  board[25] = engineerPiece;

  const moves = getLegalMoves(board, 25, session.state.rules);
  // Railroad connects 25 to 30 (White front left), 26 (Black front row 2nd station), etc.
  assert.ok(moves.length > 0);
  assert.ok(moves.includes(30), 'Engineer should be able to cross bridge onto 30');
});

test('Rule 2B: Landmine beats normal piece and survives on board', () => {
  const marshal: Piece = { id: 'p1', type: 'field_marshal', color: 'black', position: 10 };
  const mine: Piece = { id: 'm1', type: 'landmine', color: 'white', position: 11 };

  const clash = resolveClash(marshal, mine, { ...DEFAULT_RULES, landmineOutcome: 'survive' });
  assert.strictEqual(clash.outcome, 'defender_wins', 'Landmine should defeat attacking Field Marshal');
  assert.strictEqual(clash.winnerPiece?.id, 'm1', 'Landmine is the winner');

  // But engineer disarms mine safely
  const engineer: Piece = { id: 'eng1', type: 'engineer', color: 'black', position: 10 };
  const clashEng = resolveClash(engineer, mine, DEFAULT_RULES);
  assert.strictEqual(clashEng.outcome, 'attacker_wins', 'Engineer safely disarms mine');
  assert.strictEqual(clashEng.winnerPiece?.id, 'eng1');
});

test('Rule 3A: Commander death reveals Flag', () => {
  const blackPlacements = createClassicBalancedLayout();
  const whitePlacements = createClassicBalancedLayout();
  const session = new GameSession(blackPlacements, whitePlacements, { ...DEFAULT_RULES, commanderDeathReveal: true });

  assert.strictEqual(session.state.blackFlagRevealed, false);

  // Find black field marshal and eliminate it
  for (let i = 0; i < session.state.board.length; i++) {
    const p = session.state.board[i];
    if (p && p.color === 'black' && p.type === 'field_marshal') {
      session.state.board[i] = null; // Killed
      break;
    }
  }

  assert.strictEqual(checkCommanderDeath(session.state.board, 'black'), true);
});

test('Rule 5A: Pieces in Base Camp cannot move', () => {
  const blackPlacements = createClassicBalancedLayout();
  const whitePlacements = createClassicBalancedLayout();
  const session = new GameSession(blackPlacements, whitePlacements, { ...DEFAULT_RULES, baseCampMovable: false });

  // Index 1 and 3 are Black Base Camps (大本营)
  const pieceInHq = session.state.board[1] || session.state.board[3];
  assert.ok(pieceInHq);
  const moves = getLegalMoves(session.state.board, pieceInHq.position, session.state.rules);
  assert.strictEqual(moves.length, 0, 'Pieces in Base Camp should have 0 legal moves');
});
