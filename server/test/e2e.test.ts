import test from 'node:test';
import assert from 'node:assert';
import { io as Client } from 'socket.io-client';
import { blueprintService } from '../src/blueprintService.js';
import { roomManager } from '../src/roomManager.js';
import { EASTER_EGG_THUNDER, EASTER_EGG_BOMB_ENGINEER } from '../../shared/blueprintCodec.js';

test('Blueprint Service & Easter Eggs', () => {
  const thunder = blueprintService.getBlueprint(EASTER_EGG_THUNDER);
  assert.ok(thunder, 'Thunder Easter Egg should exist');
  assert.strictEqual(thunder.easterEgg, 'thunder');
  assert.strictEqual(thunder.placements.length, 25);

  const bombEng = blueprintService.getBlueprint(EASTER_EGG_BOMB_ENGINEER);
  assert.ok(bombEng, 'Bomb-Engineer Easter Egg should exist');
  assert.strictEqual(bombEng.easterEgg, 'bomb_engineer');
  assert.strictEqual(bombEng.placements.length, 25);

  // Save custom blueprint
  const saved = blueprintService.saveBlueprint('测试自定义阵型', thunder.placements);
  assert.ok(saved.code.length === 6, 'Should generate 6-character code');
  const retrieved = blueprintService.getBlueprint(saved.code);
  assert.ok(retrieved);
  assert.strictEqual(retrieved.name, '测试自定义阵型');
});

test('Room Manager: Seating, Standing Up, and Spectator Flow', () => {
  // 1. Host creates room
  const hostPlayer = {
    id: 'user-1',
    name: '玩家1',
    color: 'black' as const,
    isHost: true,
    isReady: false,
    connected: true,
  };
  const room = roomManager.createRoom(hostPlayer);
  assert.ok(room.code.length === 6);
  assert.strictEqual(room.blackPlayer?.id, 'user-1');
  assert.strictEqual(room.whitePlayer, null);

  // 2. Player 2 joins and takes White seat
  const p2 = {
    id: 'user-2',
    name: '玩家2',
    color: 'white' as const,
    isHost: false,
    isReady: false,
    connected: true,
  };
  room.whitePlayer = p2;

  // 3. Player 3 joins when full -> becomes spectator (Requirement 8)
  const p3 = {
    id: 'user-3',
    name: '观众小明',
    color: null,
    isHost: false,
    isReady: false,
    connected: true,
  };
  room.addSpectator(p3);
  assert.strictEqual(room.spectators.size, 1);
  assert.ok(room.spectators.has('user-3'));

  // 4. Seated player stands up (Requirement 8)
  const standRes = room.standUp('user-2');
  assert.strictEqual(standRes.success, true);
  assert.strictEqual(room.whitePlayer, null);
  assert.strictEqual(room.spectators.size, 2);

  // 5. Spectator sits down on empty White seat (Requirement 8)
  const sitRes = room.sitDown('user-3', 'white');
  assert.strictEqual(sitRes.success, true);
  assert.strictEqual(room.whitePlayer?.id, 'user-3');
  assert.strictEqual(room.spectators.size, 1);

  // 6. Ready and Start
  room.blackPlayer!.isReady = true;
  room.whitePlayer!.isReady = true;
  const started = room.tryStartGame();
  assert.strictEqual(started, true);
  assert.ok(room.gameSession);
  assert.strictEqual(room.gameSession.state.status, 'playing');

  // 7. Player disconnects during game -> Game ends, opponent wins (Requirement 8)
  const exitRes = room.removePlayer('user-3');
  assert.strictEqual(exitRes.gameEnded, true);
  assert.strictEqual(exitRes.winner, 'black');
  assert.strictEqual(room.gameSession.state.status, 'ended');
});
