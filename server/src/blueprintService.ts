import fs from 'fs';
import path from 'path';
import { 
  Blueprint, 
  LayoutPlacement 
} from '../../shared/types.js';
import { 
  generateRandomCode, 
  createClassicBalancedLayout, 
  createAssaultLayout, 
  createDefensiveLayout,
  createThunderLayout, 
  createBombEngineerLayout,
  EASTER_EGG_THUNDER,
  EASTER_EGG_BOMB_ENGINEER 
} from '../../shared/blueprintCodec.js';

const DATA_DIR = path.resolve(process.cwd(), 'server/data');
const DATA_FILE = path.join(DATA_DIR, 'blueprints.json');

class BlueprintService {
  private blueprints: Map<string, Blueprint> = new Map();

  constructor() {
    this.initStorage();
    this.initDefaultBlueprints();
  }

  private initStorage() {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(DATA_FILE)) {
      try {
        const raw = fs.readFileSync(DATA_FILE, 'utf-8');
        const list: Blueprint[] = JSON.parse(raw);
        for (const bp of list) {
          this.blueprints.set(bp.code.toUpperCase(), bp);
        }
      } catch (err) {
        console.error('Failed to read blueprints storage, starting fresh:', err);
      }
    }
  }

  private saveToDisk() {
    try {
      const list = Array.from(this.blueprints.values());
      fs.writeFileSync(DATA_FILE, JSON.stringify(list, null, 2), 'utf-8');
    } catch (err) {
      console.error('Failed to persist blueprints to disk:', err);
    }
  }

  private initDefaultBlueprints() {
    // 1. Easter Eggs
    this.blueprints.set(EASTER_EGG_THUNDER, {
      code: EASTER_EGG_THUNDER,
      name: '⚡ 雷霆模式 (全司令)',
      placements: createThunderLayout(),
      createdAt: Date.now(),
      easterEgg: 'thunder',
    });

    this.blueprints.set(EASTER_EGG_BOMB_ENGINEER, {
      code: EASTER_EGG_BOMB_ENGINEER,
      name: '💣 炸弹兵模式 (全排雷爆破流)',
      placements: createBombEngineerLayout(),
      createdAt: Date.now(),
      easterEgg: 'bomb_engineer',
    });

    // 2. Preset Blueprints
    if (!this.blueprints.has('CLASS1')) {
      this.blueprints.set('CLASS1', {
        code: 'CLASS1',
        name: '经典平衡防御阵',
        placements: createClassicBalancedLayout(),
        createdAt: Date.now(),
      });
    }

    if (!this.blueprints.has('RUSH01')) {
      this.blueprints.set('RUSH01', {
        code: 'RUSH01',
        name: '突击强攻阵',
        placements: createAssaultLayout(),
        createdAt: Date.now(),
      });
    }

    if (!this.blueprints.has('DEF001')) {
      this.blueprints.set('DEF001', {
        code: 'DEF001',
        name: '铁壁固守阵',
        placements: createDefensiveLayout(),
        createdAt: Date.now(),
      });
    }
  }

  public getBlueprint(code: string): Blueprint | null {
    if (!code) return null;
    const cleanCode = code.trim().toUpperCase();
    return this.blueprints.get(cleanCode) || null;
  }

  public saveBlueprint(name: string, placements: LayoutPlacement[], author?: string): Blueprint {
    let code = generateRandomCode(6);
    while (this.blueprints.has(code)) {
      code = generateRandomCode(6);
    }

    const blueprint: Blueprint = {
      code,
      name: name || `我的阵型 ${code}`,
      author,
      placements,
      createdAt: Date.now(),
    };

    this.blueprints.set(code, blueprint);
    this.saveToDisk();
    return blueprint;
  }

  public getAllBlueprints(): Blueprint[] {
    return Array.from(this.blueprints.values());
  }
}

export const blueprintService = new BlueprintService();
