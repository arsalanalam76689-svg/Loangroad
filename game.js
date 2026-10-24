/**
 * THE LONG ROAD: WARRIOR OF THE FIVE BANNERS
 * Complete 2D Action-Survival RPG
 * Engine: HTML5 Canvas 2D API + Web Audio Synthesizer
 * Assets: Tiny Swords (Free Pack)
 */

(function() {
  'use strict';

  // --- CONFIGURATION & CONSTANTS ---
  const TILE_SIZE = 64;
  const MAP_COLS = 150;
  const MAP_ROWS = 90;
  const WORLD_WIDTH = MAP_COLS * TILE_SIZE;
  const WORLD_HEIGHT = MAP_ROWS * TILE_SIZE;

  // Asset base path (relative for offline file:// and web server)
  const ASSET_BASE = (typeof window !== 'undefined' && window.GAME_ASSET_BASE) ? window.GAME_ASSET_BASE : 'assets/';

  // --- AUDIO SYNTHESIZER (WEB AUDIO API - 100% OFFLINE, ZERO NETWORK REQUESTS) ---
  class SoundManager {
    constructor() {
      this.ctx = null;
      this.sfxVol = 0.8;
      this.musicVol = 0.4;
      this.muted = false;
      this.bgInterval = null;
      this.initAudio();
    }

    initAudio() {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        this.ctx = new AudioContext();
      }
    }

    resume() {
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
    }

    playTone(freq, type, duration, startVol = 0.3, endVol = 0.001) {
      if (this.muted || !this.ctx) return;
      try {
        this.resume();
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
        gain.gain.setValueAtTime(startVol * this.sfxVol, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(endVol, this.ctx.currentTime + duration);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + duration);
      } catch (e) {
        // Audio error suppression
      }
    }

    playNoise(duration, startVol = 0.25) {
      if (this.muted || !this.ctx) return;
      try {
        this.resume();
        const bufferSize = this.ctx.sampleRate * duration;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = Math.random() * 2 - 1;
        }
        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = 800;
        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(startVol * this.sfxVol, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);
        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);
        noise.start();
      } catch (e) {}
    }

    playSwish() {
      this.playNoise(0.12, 0.3);
      this.playTone(320, 'triangle', 0.1, 0.2, 0.02);
    }

    playHit() {
      this.playNoise(0.15, 0.4);
      this.playTone(140, 'sawtooth', 0.15, 0.35, 0.01);
    }

    playBlock() {
      this.playTone(880, 'sine', 0.08, 0.3, 0.01);
      this.playTone(1200, 'triangle', 0.12, 0.2, 0.01);
    }

    playDodge() {
      this.playNoise(0.18, 0.2);
    }

    playSheepBleat() {
      this.playTone(280, 'sawtooth', 0.25, 0.2, 0.05);
      setTimeout(() => this.playTone(320, 'sawtooth', 0.3, 0.18, 0.01), 70);
    }

    playCoin() {
      this.playTone(987, 'sine', 0.08, 0.25, 0.01);
      setTimeout(() => this.playTone(1318, 'sine', 0.16, 0.25, 0.01), 60);
    }

    playEat() {
      this.playTone(220, 'triangle', 0.1, 0.25, 0.02);
      setTimeout(() => this.playTone(300, 'triangle', 0.12, 0.3, 0.01), 80);
    }

    playPotion() {
      this.playTone(440, 'sine', 0.08, 0.2);
      setTimeout(() => this.playTone(587, 'sine', 0.1, 0.25), 80);
      setTimeout(() => this.playTone(880, 'sine', 0.16, 0.3), 160);
    }

    playFanfare() {
      const notes = [523.25, 659.25, 783.99, 1046.50];
      notes.forEach((f, idx) => {
        setTimeout(() => this.playTone(f, 'triangle', 0.25, 0.35, 0.01), idx * 90);
      });
    }

    playBossRoar() {
      this.playTone(65, 'sawtooth', 0.6, 0.5, 0.02);
      this.playNoise(0.4, 0.4);
    }

    startAmbientMusic() {
      if (this.bgInterval) clearInterval(this.bgInterval);
      const chordProgression = [
        [220, 261.63, 329.63], // Am
        [174.61, 220, 261.63], // F
        [261.63, 329.63, 392], // C
        [196, 246.94, 293.66]  // G
      ];
      let step = 0;
      this.bgInterval = setInterval(() => {
        if (this.muted || !this.ctx || this.musicVol <= 0) return;
        try {
          const chord = chordProgression[step % chordProgression.length];
          step++;
          chord.forEach(freq => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
            gain.gain.setValueAtTime(0.001, this.ctx.currentTime);
            gain.gain.linearRampToValueAtTime(0.04 * this.musicVol, this.ctx.currentTime + 0.8);
            gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 3.2);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start();
            osc.stop(this.ctx.currentTime + 3.4);
          });
        } catch (e) {}
      }, 3400);
    }
  }

  // --- ASSET LOADER ---
  class AssetLoader {
    constructor() {
      this.images = {};
      this.toLoad = 0;
      this.loaded = 0;
    }

    load(key, path) {
      this.toLoad++;
      const img = new Image();
      img.onload = () => {
        this.loaded++;
      };
      img.onerror = () => {
        console.warn('Failed loading asset:', path);
        this.loaded++;
      };
      img.src = ASSET_BASE + path;
      this.images[key] = img;
      return img;
    }

    get(key) {
      return this.images[key];
    }

    get progress() {
      return this.toLoad === 0 ? 1 : (this.loaded / this.toLoad);
    }
  }

  // --- 24 QUESTS CAMPAIGN DATA ---
  const QUEST_DATABASE = [
    // Chapter 1: A Hungry Beginning (Greenmeadow)
    {
      id: 1,
      chapter: 1,
      title: "1. The First Road",
      desc: "Speak with Village Elder Oakhaven in Greenmeadow.",
      type: "talk",
      targetNpc: "elder",
      current: 0,
      total: 1,
      rewardGold: 30,
      rewardXp: 40,
      completed: false
    },
    {
      id: 2,
      chapter: 1,
      title: "2. An Empty Pantry",
      desc: "Investigate the village's food shortage with Clothier Sylas.",
      type: "talk",
      targetNpc: "sylas",
      current: 0,
      total: 1,
      rewardGold: 40,
      rewardXp: 50,
      completed: false
    },
    {
      id: 3,
      chapter: 1,
      title: "3. The First Hunt",
      desc: "Hunt wandering sheep in Greenmeadow and gather 3 meats.",
      type: "collect_meat",
      current: 0,
      total: 3,
      rewardGold: 60,
      rewardXp: 80,
      completed: false
    },
    {
      id: 4,
      chapter: 1,
      title: "4. Wood for the Gate",
      desc: "Collect 4 wood resources to fortify the village entrance.",
      type: "collect_wood",
      current: 0,
      total: 4,
      rewardGold: 70,
      rewardXp: 100,
      completed: false
    },
    {
      id: 5,
      chapter: 1,
      title: "5. Raiders on the Road",
      desc: "Defeat 3 enemy Bandits patrolling near the northeastern road.",
      type: "kill_warrior",
      current: 0,
      total: 3,
      rewardGold: 100,
      rewardXp: 150,
      completed: false
    },

    // Chapter 2: The Whispering Wilds
    {
      id: 6,
      chapter: 2,
      title: "6. The Missing Scout",
      desc: "Find Scout Cheryl at the northern outpost in Whispering Wilds.",
      type: "talk",
      targetNpc: "scout",
      current: 0,
      total: 1,
      rewardGold: 80,
      rewardXp: 120,
      completed: false
    },
    {
      id: 7,
      chapter: 2,
      title: "7. Gold for Passage",
      desc: "Gather 50 gold coins from exploration and bounty enemies.",
      type: "collect_gold",
      current: 0,
      total: 50,
      rewardGold: 50,
      rewardXp: 100,
      completed: false
    },
    {
      id: 8,
      chapter: 2,
      title: "8. The Broken Trail",
      desc: "Explore eastward through the dense rocky wilderness towards Riverlands.",
      type: "reach_region",
      targetRegion: "Riverlands",
      current: 0,
      total: 1,
      rewardGold: 100,
      rewardXp: 140,
      completed: false
    },
    {
      id: 9,
      chapter: 2,
      title: "9. Archers at the Crossing",
      desc: "Defeat 3 River Archers defending the riverbank bridges.",
      type: "kill_archer",
      current: 0,
      total: 3,
      rewardGold: 120,
      rewardXp: 180,
      completed: false
    },
    {
      id: 10,
      chapter: 2,
      title: "10. Supplies for the Journey",
      desc: "Stock up: have at least 5 meats in your inventory for rations.",
      type: "have_meat",
      current: 0,
      total: 5,
      rewardGold: 90,
      rewardXp: 130,
      completed: false
    },

    // Chapter 3: The Old Monastery
    {
      id: 11,
      chapter: 3,
      title: "11. The Silent Monastery",
      desc: "Reach the sacred Monastery and speak with Guardian Tomas.",
      type: "talk",
      targetNpc: "guardian",
      current: 0,
      total: 1,
      rewardGold: 100,
      rewardXp: 160,
      completed: false
    },
    {
      id: 12,
      chapter: 3,
      title: "12. The Trial of Spears",
      desc: "Defeat 3 hostile enemy Lancers guarding the trial ruins.",
      type: "kill_lancer",
      current: 0,
      total: 3,
      rewardGold: 150,
      rewardXp: 220,
      completed: false
    },
    {
      id: 13,
      chapter: 3,
      title: "13. Treasure in the Wilds",
      desc: "Locate and unlock the ancient treasure chest in the Riverlands.",
      type: "open_chest",
      current: 0,
      total: 1,
      rewardGold: 150,
      rewardXp: 200,
      completed: false
    },
    {
      id: 14,
      chapter: 3,
      title: "14. A Merchant in Trouble",
      desc: "Clear 4 bandits surrounding Traveling Merchant Zephyr.",
      type: "kill_warrior",
      current: 0,
      total: 4,
      rewardGold: 140,
      rewardXp: 210,
      completed: false
    },
    {
      id: 15,
      chapter: 3,
      title: "15. The Watchtower",
      desc: "Defeat defenders guarding the Riverlands stone tower.",
      type: "kill_any",
      current: 0,
      total: 5,
      rewardGold: 160,
      rewardXp: 250,
      completed: false
    },

    // Chapter 4: War at the Frontier
    {
      id: 16,
      chapter: 4,
      title: "16. Into the Red Frontier",
      desc: "Cross into the hostile Red Frontier territory.",
      type: "reach_region",
      targetRegion: "Red Frontier",
      current: 0,
      total: 1,
      rewardGold: 120,
      rewardXp: 180,
      completed: false
    },
    {
      id: 17,
      chapter: 4,
      title: "17. Three Enemy Camps",
      desc: "Clear 6 Red military units stationed at the camps.",
      type: "kill_any",
      current: 0,
      total: 6,
      rewardGold: 200,
      rewardXp: 300,
      completed: false
    },
    {
      id: 18,
      chapter: 4,
      title: "18. The Lost Supply Cache",
      desc: "Find and recover the Frontier supply chest.",
      type: "open_chest",
      current: 0,
      total: 1,
      rewardGold: 180,
      rewardXp: 250,
      completed: false
    },
    {
      id: 19,
      chapter: 4,
      title: "19. The Purple Vanguard",
      desc: "Defeat 4 elite purple vanguard troops guarding the mountain pass.",
      type: "kill_purple",
      current: 0,
      total: 4,
      rewardGold: 220,
      rewardXp: 350,
      completed: false
    },
    {
      id: 20,
      chapter: 4,
      title: "20. The Black Knight",
      desc: "Defeat the heavily armored Black Champion before the fortress gates.",
      type: "kill_champion",
      current: 0,
      total: 1,
      rewardGold: 300,
      rewardXp: 450,
      completed: false
    },

    // Chapter 5: The Five Banners
    {
      id: 21,
      chapter: 5,
      title: "21. Prepare for the Fortress",
      desc: "Equip upgraded weapons and reach at least Level 4.",
      type: "reach_level",
      targetLevel: 4,
      current: 1,
      total: 4,
      rewardGold: 200,
      rewardXp: 300,
      completed: false
    },
    {
      id: 22,
      chapter: 5,
      title: "22. Through the Outer Walls",
      desc: "Breach the Blackstone Fortress gate and defeat 5 fortress guards.",
      type: "kill_black",
      current: 0,
      total: 5,
      rewardGold: 250,
      rewardXp: 400,
      completed: false
    },
    {
      id: 23,
      chapter: 5,
      title: "23. Break the Command",
      desc: "Defeat 4 elite fortress royal champions.",
      type: "kill_black",
      current: 0,
      total: 4,
      rewardGold: 300,
      rewardXp: 500,
      completed: false
    },
    {
      id: 24,
      chapter: 5,
      title: "24. The Final Battle",
      desc: "Defeat Lord Malakor, Sovereign of the Five Banners!",
      type: "kill_boss",
      current: 0,
      total: 1,
      rewardGold: 1000,
      rewardXp: 1500,
      completed: false
    }
  ];

  // --- WARRIOR SKINS DATA ---
  const SKINS_DATA = [
    { id: 'blue', name: 'Blue Warrior', price: 0, folder: 'Blue Units', desc: 'The resolute starter champion of Greenmeadow.' },
    { id: 'red', name: 'Red Warrior', price: 150, folder: 'Red Units', desc: 'Fierce warrior cloaked in crimson flame.' },
    { id: 'yellow', name: 'Yellow Warrior', price: 250, folder: 'Yellow Units', desc: 'Golden legionnaire of dawn and valor.' },
    { id: 'purple', name: 'Purple Warrior', price: 400, folder: 'Purple Units', desc: 'Mystic veteran from the veiled peaks.' },
    { id: 'black', name: 'Black Warrior', price: 800, folder: 'Black Units', desc: 'Elite shadow champion of the Obsidian banner.' }
  ];

  // --- EQUIPMENT UPGRADES DATA ---
  const EQUIPMENT_DATA = [
    { id: 'sword_basic', type: 'weapon', name: 'Rusty Blade', atk: 25, price: 0 },
    { id: 'sword_iron', type: 'weapon', name: 'Iron Longsword', atk: 40, price: 100, desc: '+15 ATK' },
    { id: 'sword_broad', type: 'weapon', name: 'Knight Broadsword', atk: 60, price: 250, desc: '+35 ATK' },
    { id: 'sword_great', type: 'weapon', name: 'Banner Greatsword', atk: 90, price: 500, desc: '+65 ATK' },
    { id: 'armor_leather', type: 'armor', name: 'Leather Tunic', hpBonus: 0, def: 0, price: 0 },
    { id: 'armor_chain', type: 'armor', name: 'Chainmail Hauberk', hpBonus: 40, def: 6, price: 150, desc: '+40 HP, +6 DEF' },
    { id: 'armor_plate', type: 'armor', name: 'Five Banners Plate', hpBonus: 100, def: 15, price: 400, desc: '+100 HP, +15 DEF' }
  ];

  // --- MAIN GAME CLASS ---
  class Game {
    constructor() {
      this.canvas = document.getElementById('game-canvas');
      this.ctx = this.canvas.getContext('2d');
      this.sound = new SoundManager();
      this.assets = new AssetLoader();

      this.running = false;
      this.paused = false;
      this.lastTime = 0;

      // Camera
      this.camera = { x: 0, y: 0, width: 800, height: 600, shake: 0 };

      // Input
      this.keys = {};
      this.mouse = { x: 0, y: 0, down: false };

      // World state
      this.tileMap = [];
      this.regionMap = [];
      this.collisionMap = [];
      this.entities = [];
      this.particles = [];
      this.floatingTexts = [];
      this.clouds = [];
      this.chests = [];
      this.projectiles = [];

      // Player State
      this.player = {
        x: 18 * TILE_SIZE,
        y: 60 * TILE_SIZE,
        width: 48,
        height: 48,
        vx: 0,
        vy: 0,
        speed: 210,
        facing: 1, // 1 = right, -1 = left
        state: 'idle', // idle, run, attack1, attack2, guard, dodge
        animFrame: 0,
        animTimer: 0,
        attackCooldown: 0,
        comboStep: 0,
        comboTimer: 0,
        dodgeCooldown: 0,
        dodgeTimer: 0,
        guarding: false,
        iFrames: 0,

        // RPG Stats
        health: 100,
        maxHealth: 100,
        hunger: 100,
        maxHunger: 100,
        hungerTimer: 0,
        level: 1,
        xp: 0,
        xpToNext: 100,
        gold: 40,
        wood: 0,
        meat: 2,
        potions: 1,
        elixirs: 0,
        teleports: 1,

        equippedSkin: 'blue',
        ownedSkins: ['blue'],
        equippedWeapon: 'sword_basic',
        equippedArmor: 'armor_leather',
        ownedEquipment: ['sword_basic', 'armor_leather'],

        stats: {
          enemiesSlain: 0,
          sheepHunted: 0,
          questsCompleted: 0,
          goldEarned: 40
        }
      };

      // Quests State
      this.quests = JSON.parse(JSON.stringify(QUEST_DATABASE));
      this.activeQuestId = 1;

      // Boss encounter
      this.bossEntity = null;
      this.bossActive = false;

      // UI Bindings
      this.bindInputs();
      this.bindUI();
      this.queueAssets();
    }

    queueAssets() {
      // Tilesets
      for (let i = 1; i <= 5; i++) {
        this.assets.load('tilemap_' + i, `Terrain/Tileset/Tilemap_color${i}.png`);
      }
      this.assets.load('water_bg', 'Terrain/Tileset/Water Background color.png');
      this.assets.load('water_foam', 'Terrain/Tileset/Water Foam.png');

      // Units for all 5 colors
      const colors = ['Blue', 'Red', 'Yellow', 'Purple', 'Black'];
      colors.forEach(col => {
        const cLower = col.toLowerCase();
        this.assets.load(`${cLower}_warrior_idle`, `Units/${col} Units/Warrior/Warrior_Idle.png`);
        this.assets.load(`${cLower}_warrior_run`, `Units/${col} Units/Warrior/Warrior_Run.png`);
        this.assets.load(`${cLower}_warrior_attack1`, `Units/${col} Units/Warrior/Warrior_Attack1.png`);
        this.assets.load(`${cLower}_warrior_attack2`, `Units/${col} Units/Warrior/Warrior_Attack2.png`);
        this.assets.load(`${cLower}_warrior_guard`, `Units/${col} Units/Warrior/Warrior_Guard.png`);

        this.assets.load(`${cLower}_archer_idle`, `Units/${col} Units/Archer/Archer_Idle.png`);
        this.assets.load(`${cLower}_archer_run`, `Units/${col} Units/Archer/Archer_Run.png`);
        this.assets.load(`${cLower}_archer_shoot`, `Units/${col} Units/Archer/Archer_Shoot.png`);

        this.assets.load(`${cLower}_lancer_idle`, `Units/${col} Units/Lancer/Lancer_Idle.png`);
        this.assets.load(`${cLower}_lancer_run`, `Units/${col} Units/Lancer/Lancer_Run.png`);
        this.assets.load(`${cLower}_lancer_attack`, `Units/${col} Units/Lancer/Lancer_Right_Attack.png`);

        this.assets.load(`${cLower}_monk_idle`, `Units/${col} Units/Monk/Idle.png`);
        this.assets.load(`${cLower}_pawn_idle`, `Units/${col} Units/Pawn/Pawn_Idle.png`);
      });

      // Projectiles
      this.assets.load('arrow', 'Units/Blue Units/Archer/Arrow.png');

      // Sheep & Meat
      this.assets.load('sheep_idle', 'Terrain/Resources/Meat/Sheep/Sheep_Idle.png');
      this.assets.load('sheep_move', 'Terrain/Resources/Meat/Sheep/Sheep_Move.png');
      this.assets.load('sheep_grass', 'Terrain/Resources/Meat/Sheep/Sheep_Grass.png');
      this.assets.load('meat_resource', 'Terrain/Resources/Meat/Meat Resource/Meat Resource.png');

      // Resources
      this.assets.load('wood_resource', 'Terrain/Resources/Wood/Wood Resource/Wood Resource.png');
      this.assets.load('gold_resource', 'Terrain/Resources/Gold/Gold Resource/Gold_Resource.png');

      // Trees & Decors
      this.assets.load('tree1', 'Terrain/Resources/Wood/Trees/Tree1.png');
      this.assets.load('tree2', 'Terrain/Resources/Wood/Trees/Tree2.png');
      this.assets.load('tree3', 'Terrain/Resources/Wood/Trees/Tree3.png');
      this.assets.load('tree4', 'Terrain/Resources/Wood/Trees/Tree4.png');
      this.assets.load('bush1', 'Terrain/Decorations/Bushes/Bushe1.png');
      this.assets.load('bush2', 'Terrain/Decorations/Bushes/Bushe2.png');
      this.assets.load('rock1', 'Terrain/Decorations/Rocks/Rock1.png');
      this.assets.load('rock2', 'Terrain/Decorations/Rocks/Rock2.png');
      this.assets.load('water_rock', 'Terrain/Decorations/Rocks in the Water/Water Rocks_01.png');

      // Buildings
      this.assets.load('blue_castle', 'Buildings/Blue Buildings/Castle.png');
      this.assets.load('blue_house1', 'Buildings/Blue Buildings/House1.png');
      this.assets.load('blue_house2', 'Buildings/Blue Buildings/House2.png');
      this.assets.load('blue_tower', 'Buildings/Blue Buildings/Tower.png');
      this.assets.load('blue_monastery', 'Buildings/Blue Buildings/Monastery.png');
      this.assets.load('red_castle', 'Buildings/Red Buildings/Castle.png');
      this.assets.load('red_barracks', 'Buildings/Red Buildings/Barracks.png');
      this.assets.load('red_tower', 'Buildings/Red Buildings/Tower.png');
      this.assets.load('black_castle', 'Buildings/Black Buildings/Castle.png');
      this.assets.load('black_tower', 'Buildings/Black Buildings/Tower.png');

      // Particles & UI
      this.assets.load('dust', 'Particle FX/Dust_01.png');
      this.assets.load('explosion', 'Particle FX/Explosion_01.png');
      this.assets.load('banner', 'UI Elements/UI Elements/Banners/Banner.png');
      this.assets.load('wood_table', 'UI Elements/UI Elements/Wood Table/WoodTable.png');

      // Clouds
      for (let i = 1; i <= 6; i++) {
        this.assets.load('cloud_' + i, `Terrain/Decorations/Clouds/Clouds_0${i}.png`);
      }
    }

    // --- INITIALIZE WORLD MAP ---
    generateWorld() {
      this.tileMap = [];
      this.collisionMap = [];
      this.regionMap = [];

      for (let r = 0; r < MAP_ROWS; r++) {
        this.tileMap[r] = [];
        this.collisionMap[r] = [];
        this.regionMap[r] = [];
        for (let c = 0; c < MAP_COLS; c++) {
          // Determine region
          let reg = 0; // 0: Greenmeadow
          if (c < 55 && r < 45) {
            reg = 1; // Whispering Wilds
          } else if (c >= 55 && c < 95) {
            reg = 2; // Riverlands
          } else if (c >= 95 && r >= 42) {
            reg = 3; // Red Frontier
          } else if (c >= 95 && r < 42) {
            reg = 4; // Blackstone Fortress
          }
          this.regionMap[r][c] = reg;

          // Default: walk ground (tile index 1,1 in 9-slice = center solid grass)
          let tileType = 'ground';
          let solid = 0;

          // River boundary in Riverlands (columns 68 to 82)
          if (reg === 2) {
            if (c >= 70 && c <= 80) {
              // Great River channel!
              // Create stone crossings at r: 52..56 and r: 24..28
              const isBridge = (r >= 52 && r <= 56) || (r >= 22 && r <= 26);
              if (!isBridge) {
                tileType = 'water';
                solid = 1;
              } else {
                tileType = 'bridge';
                solid = 0;
              }
            }
          }

          // Border of the entire world is impassable water/mountains
          if (r < 2 || r >= MAP_ROWS - 2 || c < 2 || c >= MAP_COLS - 2) {
            tileType = 'water';
            solid = 1;
          }

          this.tileMap[r][c] = tileType;
          this.collisionMap[r][c] = solid;
        }
      }

      // Initialize Entities (NPCs, Sheep, Enemies, Chests, Buildings)
      this.spawnScenery();
      this.spawnNPCs();
      this.spawnSheep();
      this.spawnEnemies();
      this.spawnChests();
      this.spawnClouds();
    }

    spawnScenery() {
      this.scenery = [];
      // Greenmeadow Buildings
      this.scenery.push({ type: 'building', asset: 'blue_castle', x: 18 * TILE_SIZE, y: 52 * TILE_SIZE, w: 320, h: 256 });
      this.scenery.push({ type: 'building', asset: 'blue_house1', x: 10 * TILE_SIZE, y: 58 * TILE_SIZE, w: 128, h: 192 });
      this.scenery.push({ type: 'building', asset: 'blue_house2', x: 26 * TILE_SIZE, y: 58 * TILE_SIZE, w: 128, h: 192 });
      this.scenery.push({ type: 'building', asset: 'blue_tower', x: 38 * TILE_SIZE, y: 54 * TILE_SIZE, w: 128, h: 256 });

      // Whispering Wilds Old Monastery
      this.scenery.push({ type: 'building', asset: 'blue_monastery', x: 42 * TILE_SIZE, y: 16 * TILE_SIZE, w: 192, h: 320 });

      // Red Frontier Outposts
      this.scenery.push({ type: 'building', asset: 'red_castle', x: 118 * TILE_SIZE, y: 64 * TILE_SIZE, w: 320, h: 256 });
      this.scenery.push({ type: 'building', asset: 'red_barracks', x: 105 * TILE_SIZE, y: 70 * TILE_SIZE, w: 192, h: 256 });
      this.scenery.push({ type: 'building', asset: 'red_tower', x: 98 * TILE_SIZE, y: 56 * TILE_SIZE, w: 128, h: 256 });

      // Blackstone Fortress Citadel
      this.scenery.push({ type: 'building', asset: 'black_castle', x: 126 * TILE_SIZE, y: 12 * TILE_SIZE, w: 320, h: 256 });
      this.scenery.push({ type: 'building', asset: 'black_tower', x: 114 * TILE_SIZE, y: 18 * TILE_SIZE, w: 128, h: 256 });
      this.scenery.push({ type: 'building', asset: 'black_tower', x: 140 * TILE_SIZE, y: 18 * TILE_SIZE, w: 128, h: 256 });

      // Trees and Bushes
      for (let i = 0; i < 90; i++) {
        const tx = Math.floor(Math.random() * (MAP_COLS - 8)) + 4;
        const ty = Math.floor(Math.random() * (MAP_ROWS - 8)) + 4;
        if (this.collisionMap[ty][tx] === 0) {
          const tType = 'tree' + (Math.floor(Math.random() * 4) + 1);
          this.scenery.push({
            type: 'tree',
            asset: tType,
            x: tx * TILE_SIZE,
            y: ty * TILE_SIZE,
            w: 160,
            h: 192,
            frame: Math.floor(Math.random() * 4)
          });
        }
      }

      // Rocks and Bushes
      for (let i = 0; i < 60; i++) {
        const rx = Math.floor(Math.random() * (MAP_COLS - 6)) + 3;
        const ry = Math.floor(Math.random() * (MAP_ROWS - 6)) + 3;
        if (this.collisionMap[ry][rx] === 0) {
          const isRock = Math.random() > 0.5;
          this.scenery.push({
            type: isRock ? 'rock' : 'bush',
            asset: isRock ? 'rock1' : 'bush1',
            x: rx * TILE_SIZE + 16,
            y: ry * TILE_SIZE + 16,
            w: 64,
            h: 64,
            frame: 0
          });
        }
      }

      // Water Rocks in the River
      for (let r = 10; r < MAP_ROWS - 10; r += 7) {
        this.scenery.push({
          type: 'water_rock',
          asset: 'water_rock',
          x: 74 * TILE_SIZE + (r % 2 === 0 ? 30 : -30),
          y: r * TILE_SIZE,
          w: 64,
          h: 64
        });
      }
    }

    spawnNPCs() {
      this.npcs = [
        {
          id: 'elder',
          name: 'Elder Oakhaven',
          role: 'Village Elder',
          x: 20 * TILE_SIZE,
          y: 59 * TILE_SIZE,
          asset: 'blue_monk_idle',
          dialogue: "Welcome, Warrior! Dark shadows gather along the Eastern Frontier. Our food is depleted, and bandits threaten our roads. Hunt sheep for meat, gather wood, and help restore the Five Banners!"
        },
        {
          id: 'sylas',
          name: 'Clothier Sylas',
          role: 'Warrior Skin Vendor',
          x: 12 * TILE_SIZE,
          y: 61 * TILE_SIZE,
          asset: 'yellow_pawn_idle',
          isSkinShop: true,
          dialogue: "Need new armor hues? I tailor warrior cloaks of the Red, Yellow, Purple, and Obsidian Banners. Each color inspires distinct courage in combat!"
        },
        {
          id: 'eldrin',
          name: 'Eldrin the Smith',
          role: 'Armorer & Equipment',
          x: 28 * TILE_SIZE,
          y: 61 * TILE_SIZE,
          asset: 'blue_pawn_idle',
          isEquipShop: true,
          dialogue: "A true warrior needs steel that does not bend. Upgrade your blade and forged armor before venturing into hostile territory!"
        },
        {
          id: 'scout',
          name: 'Scout Cheryl',
          role: 'Wilderness Scout',
          x: 48 * TILE_SIZE,
          y: 30 * TILE_SIZE,
          asset: 'blue_archer_idle',
          dialogue: "Beware! The river crossings are locked down by rival archers. If you are crossing east, keep your shield ready!"
        },
        {
          id: 'guardian',
          name: 'Brother Tomas',
          role: 'Monastery Guardian',
          x: 43 * TILE_SIZE,
          y: 22 * TILE_SIZE,
          asset: 'purple_monk_idle',
          dialogue: "Peace be with you. The Trial of Spears awaits those who seek entry into the Red Frontier. Guard against their extended reach!"
        },
        {
          id: 'merchant',
          name: 'Zephyr the Trader',
          role: 'Traveling Merchant',
          x: 88 * TILE_SIZE,
          y: 54 * TILE_SIZE,
          asset: 'yellow_monk_idle',
          dialogue: "Thank goodness you arrived! Those bandits nearly made off with my spice crates. Rest here before marching on the Red Frontier!"
        },
        {
          id: 'bounty',
          name: 'Dennis the Bounty Master',
          role: 'Bounties & Contracts',
          x: 15 * TILE_SIZE,
          y: 57 * TILE_SIZE,
          asset: 'blue_warrior_idle',
          isBountyBoard: true,
          dialogue: "Looking for extra coin? We have standing bounties on patrolling bandits, rogue archers, and wild game meat."
        }
      ];
    }

    spawnSheep() {
      this.sheep = [];
      const sheepSpawns = [
        // Greenmeadow pastures
        { x: 12 * TILE_SIZE, y: 68 * TILE_SIZE },
        { x: 16 * TILE_SIZE, y: 72 * TILE_SIZE },
        { x: 22 * TILE_SIZE, y: 70 * TILE_SIZE },
        { x: 28 * TILE_SIZE, y: 66 * TILE_SIZE },
        { x: 32 * TILE_SIZE, y: 74 * TILE_SIZE },
        // Whispering Wilds clearings
        { x: 35 * TILE_SIZE, y: 35 * TILE_SIZE },
        { x: 44 * TILE_SIZE, y: 40 * TILE_SIZE },
        { x: 50 * TILE_SIZE, y: 20 * TILE_SIZE },
        // Riverlands banks
        { x: 64 * TILE_SIZE, y: 62 * TILE_SIZE },
        { x: 66 * TILE_SIZE, y: 42 * TILE_SIZE },
        { x: 86 * TILE_SIZE, y: 68 * TILE_SIZE }
      ];

      sheepSpawns.forEach((pos, idx) => {
        this.sheep.push({
          id: 'sheep_' + idx,
          x: pos.x,
          y: pos.y,
          homeX: pos.x,
          homeY: pos.y,
          vx: 0,
          vy: 0,
          health: 30,
          maxHealth: 30,
          state: 'idle', // idle, move, grass, flee
          stateTimer: Math.random() * 3,
          facing: 1,
          animFrame: 0,
          animTimer: 0,
          dead: false,
          respawnTimer: 0
        });
      });
    }

    spawnEnemies() {
      this.enemies = [];

      // Chapter 1 / Greenmeadow Raiders (Red Warriors)
      const raiderPositions = [
        { x: 42 * TILE_SIZE, y: 60 * TILE_SIZE, type: 'warrior', color: 'red', hp: 60, dmg: 10 },
        { x: 46 * TILE_SIZE, y: 63 * TILE_SIZE, type: 'warrior', color: 'red', hp: 60, dmg: 10 },
        { x: 48 * TILE_SIZE, y: 57 * TILE_SIZE, type: 'warrior', color: 'red', hp: 65, dmg: 12 }
      ];

      // Chapter 2 / Whispering Wilds & Riverlands Archers
      const wildPositions = [
        { x: 62 * TILE_SIZE, y: 50 * TILE_SIZE, type: 'archer', color: 'red', hp: 50, dmg: 12 },
        { x: 65 * TILE_SIZE, y: 56 * TILE_SIZE, type: 'archer', color: 'red', hp: 50, dmg: 12 },
        { x: 64 * TILE_SIZE, y: 26 * TILE_SIZE, type: 'archer', color: 'red', hp: 50, dmg: 12 },
        { x: 78 * TILE_SIZE, y: 50 * TILE_SIZE, type: 'warrior', color: 'red', hp: 80, dmg: 14 }
      ];

      // Chapter 3 / Monastery & Trial Lancers
      const lancerPositions = [
        { x: 50 * TILE_SIZE, y: 14 * TILE_SIZE, type: 'lancer', color: 'purple', hp: 90, dmg: 16 },
        { x: 54 * TILE_SIZE, y: 18 * TILE_SIZE, type: 'lancer', color: 'purple', hp: 90, dmg: 16 },
        { x: 48 * TILE_SIZE, y: 24 * TILE_SIZE, type: 'lancer', color: 'purple', hp: 95, dmg: 18 }
      ];

      // Chapter 4 / Red Frontier Garrisons
      const frontierPositions = [
        { x: 102 * TILE_SIZE, y: 66 * TILE_SIZE, type: 'warrior', color: 'red', hp: 110, dmg: 18 },
        { x: 108 * TILE_SIZE, y: 62 * TILE_SIZE, type: 'archer', color: 'red', hp: 80, dmg: 16 },
        { x: 112 * TILE_SIZE, y: 72 * TILE_SIZE, type: 'lancer', color: 'red', hp: 120, dmg: 20 },
        { x: 124 * TILE_SIZE, y: 68 * TILE_SIZE, type: 'warrior', color: 'purple', hp: 140, dmg: 22 },
        { x: 128 * TILE_SIZE, y: 60 * TILE_SIZE, type: 'warrior', color: 'purple', hp: 140, dmg: 22 },
        // The Black Champion before gates
        { x: 112 * TILE_SIZE, y: 40 * TILE_SIZE, type: 'champion', color: 'black', hp: 280, dmg: 26, isChampion: true }
      ];

      // Chapter 5 / Blackstone Fortress Royal Guards
      const fortressPositions = [
        { x: 118 * TILE_SIZE, y: 26 * TILE_SIZE, type: 'warrior', color: 'black', hp: 160, dmg: 24 },
        { x: 124 * TILE_SIZE, y: 28 * TILE_SIZE, type: 'lancer', color: 'black', hp: 170, dmg: 25 },
        { x: 134 * TILE_SIZE, y: 26 * TILE_SIZE, type: 'archer', color: 'black', hp: 120, dmg: 20 },
        { x: 138 * TILE_SIZE, y: 24 * TILE_SIZE, type: 'warrior', color: 'black', hp: 160, dmg: 24 }
      ];

      const all = [...raiderPositions, ...wildPositions, ...lancerPositions, ...frontierPositions, ...fortressPositions];

      all.forEach((cfg, idx) => {
        this.enemies.push({
          id: 'enemy_' + idx,
          x: cfg.x,
          y: cfg.y,
          homeX: cfg.x,
          homeY: cfg.y,
          type: cfg.type,
          color: cfg.color,
          health: cfg.hp,
          maxHealth: cfg.hp,
          dmg: cfg.dmg,
          isChampion: !!cfg.isChampion,
          facing: -1,
          state: 'idle', // idle, run, attack, shoot, hit
          stateTimer: 0,
          attackCooldown: 0,
          animFrame: 0,
          animTimer: 0,
          dead: false,
          respawnTimer: 0
        });
      });

      // Boss: Lord Malakor
      this.bossEntity = {
        id: 'boss_malakor',
        name: 'Lord Malakor, Sovereign of the Five Banners',
        x: 130 * TILE_SIZE,
        y: 18 * TILE_SIZE,
        homeX: 130 * TILE_SIZE,
        homeY: 18 * TILE_SIZE,
        type: 'boss',
        color: 'black',
        health: 2000,
        maxHealth: 2000,
        dmg: 32,
        phase: 1,
        facing: -1,
        state: 'idle',
        stateTimer: 0,
        attackCooldown: 0,
        specialTimer: 0,
        animFrame: 0,
        animTimer: 0,
        dead: false
      };
      this.enemies.push(this.bossEntity);
    }

    spawnChests() {
      this.chests = [
        { id: 'c1', x: 52 * TILE_SIZE, y: 12 * TILE_SIZE, opened: false, gold: 80, item: 'potion' },
        { id: 'c2', x: 88 * TILE_SIZE, y: 76 * TILE_SIZE, opened: false, gold: 120, item: 'elixir' },
        { id: 'c3', x: 104 * TILE_SIZE, y: 52 * TILE_SIZE, opened: false, gold: 160, item: 'potion' },
        { id: 'c4', x: 142 * TILE_SIZE, y: 14 * TILE_SIZE, opened: false, gold: 300, item: 'elixir' }
      ];

      // Ground pickups (Logs & Gold)
      this.pickups = [
        { type: 'wood', x: 14 * TILE_SIZE, y: 64 * TILE_SIZE },
        { type: 'wood', x: 24 * TILE_SIZE, y: 68 * TILE_SIZE },
        { type: 'wood', x: 30 * TILE_SIZE, y: 62 * TILE_SIZE },
        { type: 'wood', x: 36 * TILE_SIZE, y: 66 * TILE_SIZE },
        { type: 'gold', x: 45 * TILE_SIZE, y: 32 * TILE_SIZE, amount: 25 },
        { type: 'gold', x: 60 * TILE_SIZE, y: 46 * TILE_SIZE, amount: 35 }
      ];
    }

    spawnClouds() {
      this.clouds = [];
      for (let i = 0; i < 14; i++) {
        this.clouds.push({
          asset: 'cloud_' + (Math.floor(Math.random() * 6) + 1),
          x: Math.random() * WORLD_WIDTH,
          y: Math.random() * WORLD_HEIGHT * 0.7,
          speed: 8 + Math.random() * 14,
          opacity: 0.45 + Math.random() * 0.4
        });
      }
    }

    // --- INPUT BINDINGS ---
    bindInputs() {
      window.addEventListener('keydown', (e) => {
        this.keys[e.key.toLowerCase()] = true;
        this.keys[e.code] = true;

        if (e.key === 'Escape') {
          this.togglePause();
        } else if (e.key === 'i' || e.key === 'I') {
          this.toggleModal('inventory-modal');
        } else if (e.key === 'q' || e.key === 'Q') {
          this.toggleModal('quests-modal');
        } else if (e.key === 'm' || e.key === 'M') {
          this.toggleModal('map-modal');
        } else if (e.key === 'e' || e.key === 'E') {
          this.handleInteraction();
        } else if (e.key === '1') {
          this.useHotbar(1);
        } else if (e.key === '2') {
          this.useHotbar(2);
        } else if (e.key === '3') {
          this.useHotbar(3);
        } else if (e.key === '4') {
          this.useHotbar(4);
        } else if (e.key === ' ' || e.code === 'Space') {
          this.triggerDodge();
        } else if (e.key === 'j' || e.key === 'J') {
          this.triggerAttack();
        }
      });

      window.addEventListener('keyup', (e) => {
        this.keys[e.key.toLowerCase()] = false;
        this.keys[e.code] = false;
      });

      window.addEventListener('blur', () => {
        this.keys = {};
      });

      this.canvas.addEventListener('mousedown', (e) => {
        if (e.button === 0 && this.running && !this.paused) {
          this.triggerAttack();
        }
      });

      window.addEventListener('resize', () => {
        this.resize();
      });
    }

    bindUI() {
      // Title Buttons
      document.getElementById('btn-new-game').onclick = () => this.startNewGame();
      const continueBtn = document.getElementById('btn-continue-game');
      if (localStorage.getItem('the_long_road_save')) {
        continueBtn.style.display = 'block';
        continueBtn.onclick = () => this.loadGame();
      }
      document.getElementById('btn-title-settings').onclick = () => this.toggleModal('settings-modal');
      document.getElementById('btn-title-credits').onclick = () => {
        alert("THE LONG ROAD: WARRIOR OF THE FIVE BANNERS\nBuilt with Pixel Frog Tiny Swords Assets\nEngineered in Vanilla HTML5 Canvas 2D & Web Audio Synth\nOffline Ready for Desktop & Web!");
      };

      // Top Right Buttons
      document.getElementById('btn-inventory-open').onclick = () => this.toggleModal('inventory-modal');
      document.getElementById('btn-quests-open').onclick = () => this.toggleModal('quests-modal');
      document.getElementById('btn-map-open').onclick = () => this.toggleModal('map-modal');
      document.getElementById('btn-pause-open').onclick = () => this.togglePause();

      // Modal Close Buttons
      document.getElementById('btn-inventory-close').onclick = () => this.closeModals();
      document.getElementById('btn-quests-close').onclick = () => this.closeModals();
      document.getElementById('btn-map-close').onclick = () => this.closeModals();
      document.getElementById('btn-dialogue-close').onclick = () => this.closeModals();
      document.getElementById('btn-skin-shop-close').onclick = () => this.closeModals();
      document.getElementById('btn-equip-shop-close').onclick = () => this.closeModals();
      document.getElementById('btn-settings-close').onclick = () => this.closeModals();
      document.getElementById('btn-settings-done').onclick = () => this.closeModals();

      // Pause Menu Buttons
      document.getElementById('btn-pause-resume').onclick = () => this.togglePause();
      document.getElementById('btn-pause-save').onclick = () => {
        this.saveGame();
        this.showToast('Game saved to browser storage!');
      };
      document.getElementById('btn-pause-settings').onclick = () => this.toggleModal('settings-modal');
      document.getElementById('btn-pause-title').onclick = () => {
        this.closeModals();
        this.running = false;
        document.getElementById('title-screen').style.display = 'flex';
      };

      // Hotbar Slots
      document.getElementById('hotbar-1').onclick = () => this.useHotbar(1);
      document.getElementById('hotbar-2').onclick = () => this.useHotbar(2);
      document.getElementById('hotbar-3').onclick = () => this.useHotbar(3);
      document.getElementById('hotbar-4').onclick = () => this.useHotbar(4);

      // Respawn & Victory
      document.getElementById('btn-respawn').onclick = () => this.respawnPlayer();
      document.getElementById('btn-victory-continue').onclick = () => {
        this.closeModals();
        this.showToast('Continue exploring the Five Realms!');
      };
      document.getElementById('btn-victory-title').onclick = () => {
        this.closeModals();
        this.running = false;
        document.getElementById('title-screen').style.display = 'flex';
      };

      // Quest Tabs
      document.getElementById('tab-active-quests').onclick = () => this.renderQuestsList('active');
      document.getElementById('tab-completed-quests').onclick = () => this.renderQuestsList('completed');
      document.getElementById('tab-bounties').onclick = () => this.renderQuestsList('bounties');

      // Audio Sliders
      const sfxSlider = document.getElementById('slider-sfx');
      const musicSlider = document.getElementById('slider-music');
      const muteChk = document.getElementById('chk-mute');
      sfxSlider.oninput = (e) => { this.sound.sfxVol = parseFloat(e.target.value); };
      musicSlider.oninput = (e) => { this.sound.musicVol = parseFloat(e.target.value); };
      muteChk.onchange = (e) => { this.sound.muted = e.target.checked; };
    }

    resize() {
      const dpr = window.devicePixelRatio || 1;
      this.canvas.width = window.innerWidth * dpr;
      this.canvas.height = window.innerHeight * dpr;
      this.canvas.style.width = window.innerWidth + 'px';
      this.canvas.style.height = window.innerHeight + 'px';
      this.camera.width = window.innerWidth;
      this.camera.height = window.innerHeight;
      this.ctx.imageSmoothingEnabled = false;
    }

    startNewGame() {
      document.getElementById('title-screen').style.display = 'none';
      this.generateWorld();
      this.resize();
      this.running = true;
      this.paused = false;
      this.sound.resume();
      this.sound.startAmbientMusic();
      this.lastTime = performance.now();
      this.showToast('Welcome to The Long Road! Speak with Elder Oakhaven.');
      this.updateHUD();
      requestAnimationFrame((t) => this.gameLoop(t));
    }

    // --- GAME LOOP ---
    gameLoop(timestamp) {
      if (!this.running) return;

      const rawDt = (timestamp - this.lastTime) / 1000;
      this.lastTime = timestamp;
      const dt = Math.min(rawDt, 0.05); // Frame delta clamping

      if (!this.paused) {
        this.update(dt);
      }
      this.render();

      requestAnimationFrame((t) => this.gameLoop(t));
    }

    // --- UPDATE STATE ---
    update(dt) {
      this.updatePlayer(dt);
      this.updateEntities(dt);
      this.updateProjectiles(dt);
      this.updateParticles(dt);
      this.updateClouds(dt);
      this.updateCamera(dt);
      this.updateQuestsProgress();
      this.checkNearbyInteractions();
      this.updateHUD();
    }

    updatePlayer(dt) {
      const p = this.player;

      // Invulnerability timer
      if (p.iFrames > 0) p.iFrames -= dt;

      // Dodge Timer & Cooldown
      if (p.dodgeCooldown > 0) p.dodgeCooldown -= dt;
      if (p.dodgeTimer > 0) {
        p.dodgeTimer -= dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        if (p.dodgeTimer <= 0) {
          p.state = 'idle';
        }
        return;
      }

      // Attack cooldowns & combo
      if (p.attackCooldown > 0) {
        p.attackCooldown -= dt;
        if (p.attackCooldown <= 0) {
          p.state = 'idle';
        }
      }
      if (p.comboTimer > 0) {
        p.comboTimer -= dt;
        if (p.comboTimer <= 0) p.comboStep = 0;
      }

      // Guarding input
      p.guarding = !!(this.keys['k'] || this.keys['keyk']);
      if (p.guarding && p.state !== 'attack1' && p.state !== 'attack2') {
        p.state = 'guard';
        p.vx = 0;
        p.vy = 0;
        return;
      }

      // Normal Movement
      let dx = 0;
      let dy = 0;
      if (this.keys['w'] || this.keys['arrowup']) dy -= 1;
      if (this.keys['s'] || this.keys['arrowdown']) dy += 1;
      if (this.keys['a'] || this.keys['arrowleft']) dx -= 1;
      if (this.keys['d'] || this.keys['arrowright']) dx += 1;

      // Normalize diagonal
      if (dx !== 0 && dy !== 0) {
        const len = Math.sqrt(dx * dx + dy * dy);
        dx /= len;
        dy /= len;
      }

      if (dx !== 0) {
        p.facing = dx > 0 ? 1 : -1;
      }

      // Calculate speed with upgrades
      let currentSpeed = p.speed;
      if (p.guarding) currentSpeed *= 0.3;

      const nextX = p.x + dx * currentSpeed * dt;
      const nextY = p.y + dy * currentSpeed * dt;

      // Collision handling on both axes separately
      if (!this.checkTileCollision(nextX, p.y)) {
        p.x = nextX;
      }
      if (!this.checkTileCollision(p.x, nextY)) {
        p.y = nextY;
      }

      // Clamp to world
      p.x = Math.max(TILE_SIZE * 2, Math.min(WORLD_WIDTH - TILE_SIZE * 2, p.x));
      p.y = Math.max(TILE_SIZE * 2, Math.min(WORLD_HEIGHT - TILE_SIZE * 2, p.y));

      // State & Animations
      if (p.state !== 'attack1' && p.state !== 'attack2') {
        if (dx !== 0 || dy !== 0) {
          p.state = 'run';
          // Footstep dust
          if (Math.random() < 0.15) {
            this.spawnDust(p.x, p.y + 16);
          }
        } else {
          p.state = 'idle';
        }
      }

      // Hunger System
      p.hungerTimer += dt;
      if (p.hungerTimer >= 5.0) { // Drain 1 hunger every 5 seconds
        p.hungerTimer = 0;
        p.hunger = Math.max(0, p.hunger - 1);
        if (p.hunger <= 0) {
          // Starvation damage
          this.damagePlayer(4, 'Starvation');
          this.showToast('You are starving! Eat meat to restore hunger.');
        }
      }

      // Animation Timer
      p.animTimer += dt;
      if (p.animTimer >= 0.1) {
        p.animTimer = 0;
        p.animFrame = (p.animFrame + 1) % 8;
      }
    }

    triggerAttack() {
      const p = this.player;
      if (p.dodgeTimer > 0 || p.guarding) return;
      if (p.attackCooldown > 0) return;

      this.sound.resume();
      this.sound.playSwish();

      p.state = p.comboStep === 0 ? 'attack1' : 'attack2';
      p.attackCooldown = 0.35;
      p.comboStep = p.comboStep === 0 ? 1 : 0;
      p.comboTimer = 0.8;
      p.animFrame = 0;

      // Slash Hitbox
      const hitRange = 75;
      const hitBox = {
        x: p.x + (p.facing === 1 ? 10 : -hitRange - 10),
        y: p.y - 30,
        w: hitRange,
        h: 60
      };

      // Calculate attack damage
      let weaponDmg = 25;
      const eq = EQUIPMENT_DATA.find(e => e.id === p.equippedWeapon);
      if (eq) weaponDmg = eq.atk;
      const totalDmg = weaponDmg + (p.level - 1) * 6;

      // Check hits on Enemies
      this.enemies.forEach(en => {
        if (en.dead) return;
        if (this.rectIntersect(hitBox, { x: en.x - 24, y: en.y - 30, w: 48, h: 60 })) {
          this.damageEnemy(en, totalDmg);
        }
      });

      // Check hits on Sheep
      this.sheep.forEach(sh => {
        if (sh.dead) return;
        if (this.rectIntersect(hitBox, { x: sh.x - 20, y: sh.y - 20, w: 40, h: 40 })) {
          this.damageSheep(sh, totalDmg);
        }
      });
    }

    triggerDodge() {
      const p = this.player;
      if (p.dodgeCooldown > 0 || p.dodgeTimer > 0) return;

      this.sound.playDodge();
      p.state = 'dodge';
      p.dodgeTimer = 0.22;
      p.dodgeCooldown = 0.8;
      p.iFrames = 0.28;

      let dx = 0;
      let dy = 0;
      if (this.keys['w'] || this.keys['arrowup']) dy -= 1;
      if (this.keys['s'] || this.keys['arrowdown']) dy += 1;
      if (this.keys['a'] || this.keys['arrowleft']) dx -= 1;
      if (this.keys['d'] || this.keys['arrowright']) dx += 1;

      if (dx === 0 && dy === 0) {
        dx = p.facing;
      } else {
        const len = Math.sqrt(dx * dx + dy * dy);
        dx /= len;
        dy /= len;
      }

      p.vx = dx * 480;
      p.vy = dy * 480;
      this.spawnDust(p.x, p.y + 12);
    }

    damageEnemy(en, dmg) {
      this.sound.playHit();
      en.health -= dmg;
      en.state = 'hit';
      en.stateTimer = 0.25;

      // Knockback
      const kx = this.player.facing * 18;
      en.x += kx;

      this.camera.shake = 4;
      this.spawnParticles(en.x, en.y, '#e74c3c', 8);
      this.spawnFloatingText(en.x, en.y - 20, '-' + dmg, '#f1c40f');

      if (en.health <= 0) {
        en.dead = true;
        this.player.stats.enemiesSlain++;
        this.spawnExplosion(en.x, en.y);

        // Gold & XP Reward
        const goldGain = en.isChampion ? 60 : (en.type === 'boss' ? 500 : (12 + Math.floor(Math.random() * 15)));
        const xpGain = en.isChampion ? 100 : (en.type === 'boss' ? 1000 : 35);
        this.addGold(goldGain);
        this.addXp(xpGain);

        // Drop Meat or Potion occasionally
        if (Math.random() < 0.4) {
          this.pickups.push({ type: 'meat', x: en.x, y: en.y });
        }

        // Quest progress updates
        this.notifyQuestProgress('kill_' + en.type);
        this.notifyQuestProgress('kill_any');
        if (en.color === 'purple') this.notifyQuestProgress('kill_purple');
        if (en.color === 'black') this.notifyQuestProgress('kill_black');
        if (en.isChampion) this.notifyQuestProgress('kill_champion');
        if (en.type === 'boss') {
          this.notifyQuestProgress('kill_boss');
          this.triggerVictory();
        }
      }
    }

    damageSheep(sh, dmg) {
      sh.health -= dmg;
      this.sound.playSheepBleat();
      sh.state = 'flee';
      sh.stateTimer = 2.5;

      // Flee away from player
      const angle = Math.atan2(sh.y - this.player.y, sh.x - this.player.x);
      sh.vx = Math.cos(angle) * 160;
      sh.vy = Math.sin(angle) * 160;

      this.spawnFloatingText(sh.x, sh.y - 15, '-' + dmg, '#ecf0f1');

      if (sh.health <= 0) {
        sh.dead = true;
        sh.respawnTimer = 25.0; // Respawns in 25 seconds
        this.player.stats.sheepHunted++;
        this.sound.playHit();
        this.spawnParticles(sh.x, sh.y, '#e74c3c', 6);
        // Meat drop!
        this.pickups.push({ type: 'meat', x: sh.x, y: sh.y });
      }
    }

    damagePlayer(rawDmg, source = 'Enemy') {
      const p = this.player;
      if (p.iFrames > 0 || p.health <= 0) return;

      let finalDmg = rawDmg;

      // Equipment Defense reduction
      const eqArmor = EQUIPMENT_DATA.find(e => e.id === p.equippedArmor);
      const def = eqArmor ? eqArmor.def : 0;
      finalDmg = Math.max(2, finalDmg - def);

      // Guarding mitigation (75% damage reduction)
      if (p.guarding) {
        finalDmg = Math.max(1, Math.floor(finalDmg * 0.25));
        this.sound.playBlock();
        this.spawnFloatingText(p.x, p.y - 25, 'BLOCKED! -' + finalDmg, '#3498db');
      } else {
        this.sound.playHit();
        this.spawnFloatingText(p.x, p.y - 25, '-' + finalDmg, '#e74c3c');
      }

      p.health = Math.max(0, p.health - finalDmg);
      p.iFrames = 0.5; // Half second invulnerability
      this.camera.shake = 6;
      this.spawnParticles(p.x, p.y, '#c0392b', 7);

      if (p.health <= 0) {
        this.sound.playTone(80, 'sawtooth', 0.5, 0.4);
        document.getElementById('gameover-modal').style.display = 'flex';
      }
    }

    respawnPlayer() {
      const p = this.player;
      p.health = p.maxHealth;
      p.hunger = 80;
      p.x = 18 * TILE_SIZE;
      p.y = 60 * TILE_SIZE;
      p.state = 'idle';
      this.closeModals();
      this.showToast('Respawned safely at Greenmeadow village.');
    }

    updateEntities(dt) {
      const p = this.player;

      // Update Sheep
      this.sheep.forEach(sh => {
        if (sh.dead) {
          sh.respawnTimer -= dt;
          if (sh.respawnTimer <= 0) {
            sh.dead = false;
            sh.health = sh.maxHealth;
            sh.x = sh.homeX;
            sh.y = sh.homeY;
            sh.state = 'idle';
          }
          return;
        }

        sh.animTimer += dt;
        if (sh.animTimer >= 0.12) {
          sh.animTimer = 0;
          sh.animFrame = (sh.animFrame + 1) % 6;
        }

        sh.stateTimer -= dt;
        if (sh.stateTimer <= 0) {
          // Change state between idle, move, grass
          const r = Math.random();
          if (r < 0.4) {
            sh.state = 'idle';
            sh.vx = 0;
            sh.vy = 0;
            sh.stateTimer = 2 + Math.random() * 3;
          } else if (r < 0.7) {
            sh.state = 'grass';
            sh.vx = 0;
            sh.vy = 0;
            sh.stateTimer = 2.5 + Math.random() * 2;
          } else {
            sh.state = 'move';
            const angle = Math.random() * Math.PI * 2;
            sh.vx = Math.cos(angle) * 35;
            sh.vy = Math.sin(angle) * 35;
            sh.facing = sh.vx > 0 ? 1 : -1;
            sh.stateTimer = 2 + Math.random() * 2;
          }
        }

        // Flee if player is sprinting too close
        const distToPlayer = Math.hypot(sh.x - p.x, sh.y - p.y);
        if (distToPlayer < 80 && sh.state !== 'flee') {
          sh.state = 'flee';
          sh.stateTimer = 2.0;
          const a = Math.atan2(sh.y - p.y, sh.x - p.x);
          sh.vx = Math.cos(a) * 110;
          sh.vy = Math.sin(a) * 110;
          sh.facing = sh.vx > 0 ? 1 : -1;
        }

        // Apply movement
        if (sh.state === 'move' || sh.state === 'flee') {
          const nx = sh.x + sh.vx * dt;
          const ny = sh.y + sh.vy * dt;
          if (!this.checkTileCollision(nx, sh.y)) sh.x = nx;
          if (!this.checkTileCollision(sh.x, ny)) sh.y = ny;
        }
      });

      // Update Enemies
      this.enemies.forEach(en => {
        if (en.dead) return;

        en.animTimer += dt;
        if (en.animTimer >= 0.12) {
          en.animTimer = 0;
          en.animFrame = (en.animFrame + 1) % 6;
        }

        if (en.attackCooldown > 0) en.attackCooldown -= dt;

        const dist = Math.hypot(p.x - en.x, p.y - en.y);
        const aggroRadius = en.type === 'boss' ? 450 : 260;

        // Boss Special Logic
        if (en.type === 'boss') {
          // Show boss health bar when player enters arena
          const bossBar = document.getElementById('boss-bar-container');
          if (dist < 600) {
            bossBar.style.display = 'flex';
            const fill = document.getElementById('boss-bar-fill');
            fill.style.width = Math.max(0, (en.health / en.maxHealth) * 100) + '%';
          } else {
            bossBar.style.display = 'none';
          }
        }

        if (dist < aggroRadius) {
          en.facing = p.x > en.x ? 1 : -1;

          if (en.type === 'archer') {
            // Keep distance and shoot
            if (dist < 180) {
              // Back away
              const a = Math.atan2(en.y - p.y, en.x - p.x);
              en.x += Math.cos(a) * 90 * dt;
              en.y += Math.sin(a) * 90 * dt;
              en.state = 'run';
            } else if (dist > 300) {
              // Move closer
              const a = Math.atan2(p.y - en.y, p.x - en.x);
              en.x += Math.cos(a) * 90 * dt;
              en.y += Math.sin(a) * 90 * dt;
              en.state = 'run';
            } else {
              en.state = 'idle';
              if (en.attackCooldown <= 0) {
                en.attackCooldown = 2.2;
                this.shootArrow(en.x, en.y, p.x, p.y, en.dmg);
              }
            }
          } else if (en.type === 'lancer') {
            // Long range thrust
            const reach = 85;
            if (dist > reach) {
              const a = Math.atan2(p.y - en.y, p.x - en.x);
              en.x += Math.cos(a) * 115 * dt;
              en.y += Math.sin(a) * 115 * dt;
              en.state = 'run';
            } else {
              en.state = 'attack';
              if (en.attackCooldown <= 0) {
                en.attackCooldown = 1.6;
                this.damagePlayer(en.dmg, 'Lancer');
              }
            }
          } else if (en.type === 'boss') {
            // Lord Malakor multi-phase attack
            if (dist > 90) {
              const a = Math.atan2(p.y - en.y, p.x - en.x);
              en.x += Math.cos(a) * 130 * dt;
              en.y += Math.sin(a) * 130 * dt;
              en.state = 'run';
            } else {
              en.state = 'attack';
              if (en.attackCooldown <= 0) {
                en.attackCooldown = 1.3;
                this.damagePlayer(en.dmg, 'Lord Malakor');
                this.camera.shake = 8;
              }
            }
          } else {
            // Standard Warrior
            const reach = 50;
            if (dist > reach) {
              const a = Math.atan2(p.y - en.y, p.x - en.x);
              en.x += Math.cos(a) * 125 * dt;
              en.y += Math.sin(a) * 125 * dt;
              en.state = 'run';
            } else {
              en.state = 'attack';
              if (en.attackCooldown <= 0) {
                en.attackCooldown = 1.2;
                this.damagePlayer(en.dmg, 'Warrior');
              }
            }
          }
        } else {
          // Patrol back towards home
          const distHome = Math.hypot(en.homeX - en.x, en.homeY - en.y);
          if (distHome > 20) {
            const a = Math.atan2(en.homeY - en.y, en.homeX - en.x);
            en.x += Math.cos(a) * 50 * dt;
            en.y += Math.sin(a) * 50 * dt;
            en.facing = en.homeX > en.x ? 1 : -1;
            en.state = 'run';
          } else {
            en.state = 'idle';
          }
        }
      });
    }

    shootArrow(sx, sy, tx, ty, dmg) {
      const angle = Math.atan2(ty - sy, tx - sx);
      this.sound.playSwish();
      this.projectiles.push({
        x: sx,
        y: sy - 15,
        vx: Math.cos(angle) * 340,
        vy: Math.sin(angle) * 340,
        angle: angle,
        dmg: dmg,
        life: 1.6
      });
    }

    updateProjectiles(dt) {
      for (let i = this.projectiles.length - 1; i >= 0; i--) {
        const pr = this.projectiles[i];
        pr.x += pr.vx * dt;
        pr.y += pr.vy * dt;
        pr.life -= dt;

        // Check hit with player
        const distToPlayer = Math.hypot(pr.x - this.player.x, pr.y - (this.player.y - 15));
        if (distToPlayer < 24) {
          this.damagePlayer(pr.dmg, 'Arrow');
          this.projectiles.splice(i, 1);
          continue;
        }

        if (pr.life <= 0 || this.checkTileCollision(pr.x, pr.y)) {
          this.projectiles.splice(i, 1);
        }
      }
    }

    updateParticles(dt) {
      // Combat particle bursts
      for (let i = this.particles.length - 1; i >= 0; i--) {
        const pt = this.particles[i];
        pt.x += pt.vx * dt;
        pt.y += pt.vy * dt;
        pt.life -= dt;
        if (pt.life <= 0) {
          this.particles.splice(i, 1);
        }
      }

      // Floating text numbers
      for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
        const ft = this.floatingTexts[i];
        ft.y -= 25 * dt;
        ft.life -= dt;
        if (ft.life <= 0) {
          this.floatingTexts.splice(i, 1);
        }
      }
    }

    updateClouds(dt) {
      this.clouds.forEach(cl => {
        cl.x += cl.speed * dt;
        if (cl.x > WORLD_WIDTH + 200) {
          cl.x = -200;
          cl.y = Math.random() * WORLD_HEIGHT * 0.7;
        }
      });
    }

    updateCamera(dt) {
      // Smooth camera follow player
      const targetX = this.player.x - this.camera.width / 2;
      const targetY = this.player.y - this.camera.height / 2;

      this.camera.x += (targetX - this.camera.x) * 0.1;
      this.camera.y += (targetY - this.camera.y) * 0.1;

      // Clamp camera to world bounds
      this.camera.x = Math.max(0, Math.min(WORLD_WIDTH - this.camera.width, this.camera.x));
      this.camera.y = Math.max(0, Math.min(WORLD_HEIGHT - this.camera.height, this.camera.y));

      // Shake decay
      if (this.camera.shake > 0) {
        this.camera.shake = Math.max(0, this.camera.shake - dt * 25);
      }
    }

    // --- TILE & COLLISION CHECK ---
    checkTileCollision(wx, wy) {
      const col = Math.floor(wx / TILE_SIZE);
      const row = Math.floor(wy / TILE_SIZE);
      if (row < 0 || row >= MAP_ROWS || col < 0 || col >= MAP_COLS) return true;
      return this.collisionMap[row][col] === 1;
    }

    rectIntersect(r1, r2) {
      return !(r2.x > r1.x + r1.w ||
               r2.x + r2.w < r1.x ||
               r2.y > r1.y + r1.h ||
               r2.y + r2.h < r1.y);
    }

    // --- INTERACTION & QUESTS ---
    checkNearbyInteractions() {
      const p = this.player;
      let promptText = null;

      // Pickups check (Meat, Wood, Gold)
      for (let i = this.pickups.length - 1; i >= 0; i--) {
        const pk = this.pickups[i];
        if (Math.hypot(p.x - pk.x, p.y - pk.y) < 40) {
          if (pk.type === 'meat') {
            p.meat++;
            this.sound.playCoin();
            this.showToast('+1 Fresh Roast Meat collected!');
            this.notifyQuestProgress('collect_meat');
            this.notifyQuestProgress('have_meat');
            this.pickups.splice(i, 1);
          } else if (pk.type === 'wood') {
            p.wood++;
            this.sound.playCoin();
            this.showToast('+1 Wood Resource collected!');
            this.notifyQuestProgress('collect_wood');
            this.pickups.splice(i, 1);
          } else if (pk.type === 'gold') {
            this.addGold(pk.amount || 30);
            this.pickups.splice(i, 1);
          }
        }
      }

      // Check nearby NPCs
      this.npcs.forEach(npc => {
        if (Math.hypot(p.x - npc.x, p.y - npc.y) < 70) {
          promptText = `[E] Speak with ${npc.name}`;
        }
      });

      // Check nearby Chests
      this.chests.forEach(ch => {
        if (!ch.opened && Math.hypot(p.x - ch.x, p.y - ch.y) < 60) {
          promptText = '[E] Open Treasure Chest';
        }
      });

      const promptEl = document.getElementById('interact-prompt');
      if (promptText) {
        promptEl.textContent = promptText;
        promptEl.style.display = 'block';
      } else {
        promptEl.style.display = 'none';
      }
    }

    handleInteraction() {
      const p = this.player;

      // Check Chests
      for (const ch of this.chests) {
        if (!ch.opened && Math.hypot(p.x - ch.x, p.y - ch.y) < 70) {
          ch.opened = true;
          this.sound.playCoin();
          this.addGold(ch.gold);
          if (ch.item === 'potion') p.potions++;
          if (ch.item === 'elixir') p.elixirs++;
          this.showToast(`Found ${ch.gold} Gold & ${ch.item.toUpperCase()}!`);
          this.notifyQuestProgress('open_chest');
          return;
        }
      }

      // Check NPCs
      for (const npc of this.npcs) {
        if (Math.hypot(p.x - npc.x, p.y - npc.y) < 75) {
          this.notifyQuestProgress('talk', npc.id);

          if (npc.isSkinShop) {
            this.openSkinShop();
            return;
          }
          if (npc.isEquipShop) {
            this.openEquipShop();
            return;
          }
          if (npc.isBountyBoard) {
            this.toggleModal('quests-modal');
            this.renderQuestsList('bounties');
            return;
          }

          // Open Dialogue modal
          document.getElementById('npc-name').textContent = npc.name + ' (' + npc.role + ')';
          document.getElementById('npc-dialogue-text').textContent = npc.dialogue;
          document.getElementById('dialogue-modal').style.display = 'flex';
          return;
        }
      }
    }

    notifyQuestProgress(eventType, param) {
      const curQ = this.quests.find(q => q.id === this.activeQuestId);
      if (!curQ || curQ.completed) return;

      if (curQ.type === eventType) {
        if (curQ.type === 'talk' && curQ.targetNpc !== param) return;

        curQ.current++;
        this.sound.playCoin();
        this.showToast(`Quest: ${curQ.title} (${curQ.current}/${curQ.total})`);

        if (curQ.current >= curQ.total) {
          this.completeQuest(curQ);
        }
      } else if (curQ.type === 'have_meat' && eventType === 'have_meat') {
        curQ.current = this.player.meat;
        if (curQ.current >= curQ.total) {
          this.completeQuest(curQ);
        }
      }
    }

    completeQuest(q) {
      q.completed = true;
      this.player.stats.questsCompleted++;
      this.sound.playFanfare();
      this.addGold(q.rewardGold);
      this.addXp(q.rewardXp);
      this.showToast(`🏆 Quest Complete: ${q.title}! (+${q.rewardGold}G, +${q.rewardXp}XP)`);

      // Advance to next quest
      if (this.activeQuestId < this.quests.length) {
        this.activeQuestId++;
        const nxt = this.quests.find(x => x.id === this.activeQuestId);
        if (nxt) {
          setTimeout(() => {
            this.showToast(`New Quest: ${nxt.title}`);
          }, 1200);
        }
      }
      this.saveGame();
    }

    updateQuestsProgress() {
      // Check current region quest
      const curQ = this.quests.find(q => q.id === this.activeQuestId);
      if (!curQ || curQ.completed) return;

      const pCol = Math.floor(this.player.x / TILE_SIZE);
      const pRow = Math.floor(this.player.y / TILE_SIZE);
      const curRegId = this.regionMap[pRow] ? this.regionMap[pRow][pCol] : 0;
      const regNames = ['Greenmeadow', 'Whispering Wilds', 'Riverlands', 'Red Frontier', 'Blackstone Fortress'];
      const regName = regNames[curRegId] || 'Greenmeadow';

      if (curQ.type === 'reach_region' && curQ.targetRegion === regName) {
        curQ.current = 1;
        this.completeQuest(curQ);
      }
      if (curQ.type === 'reach_level') {
        curQ.current = this.player.level;
        if (curQ.current >= curQ.total) {
          this.completeQuest(curQ);
        }
      }
    }

    // --- REWARDS, XP & LEVELING ---
    addGold(amount) {
      this.player.gold += amount;
      this.player.stats.goldEarned += amount;
      this.sound.playCoin();
      this.spawnFloatingText(this.player.x, this.player.y - 30, `+${amount} Gold`, '#f1c40f');
    }

    addXp(amount) {
      const p = this.player;
      p.xp += amount;
      this.spawnFloatingText(p.x, p.y - 45, `+${amount} XP`, '#2ecc71');

      while (p.xp >= p.xpToNext) {
        p.xp -= p.xpToNext;
        p.level++;
        p.xpToNext = Math.floor(p.xpToNext * 1.5);
        p.maxHealth += 20;
        p.health = p.maxHealth;
        this.sound.playFanfare();
        this.showToast(`⭐ LEVEL UP! You reached Level ${p.level}! Max Health increased!`);
        this.notifyQuestProgress('reach_level');
      }
    }

    useHotbar(slot) {
      const p = this.player;
      if (slot === 1) {
        // Roast Meat
        if (p.meat > 0) {
          p.meat--;
          p.hunger = Math.min(p.maxHunger, p.hunger + 35);
          p.health = Math.min(p.maxHealth, p.health + 15);
          this.sound.playEat();
          this.spawnFloatingText(p.x, p.y - 20, '+35 Hunger, +15 HP', '#2ecc71');
          this.showToast('Delicious roast meat restores vigor!');
        } else {
          this.showToast('No meat remaining! Hunt sheep to get more.');
        }
      } else if (slot === 2) {
        // Health Potion
        if (p.potions > 0) {
          p.potions--;
          p.health = Math.min(p.maxHealth, p.health + 50);
          this.sound.playPotion();
          this.spawnFloatingText(p.x, p.y - 20, '+50 Health', '#e74c3c');
        } else {
          this.showToast('No potions left! Purchase from Eldrin or find chests.');
        }
      } else if (slot === 3) {
        // Elixir of Vigor
        if (p.elixirs > 0) {
          p.elixirs--;
          p.health = p.maxHealth;
          p.hunger = p.maxHunger;
          this.sound.playPotion();
          this.spawnFloatingText(p.x, p.y - 20, 'FULL RESTORE!', '#f1c40f');
        } else {
          this.showToast('No Elixirs in pouch!');
        }
      } else if (slot === 4) {
        // Teleport to Greenmeadow
        p.x = 18 * TILE_SIZE;
        p.y = 60 * TILE_SIZE;
        this.sound.playPotion();
        this.showToast('Teleported back to Greenmeadow village!');
      }
    }

    // --- UI MODALS & SHOPS ---
    toggleModal(modalId) {
      const el = document.getElementById(modalId);
      if (!el) return;
      const isOpen = el.style.display === 'flex';
      this.closeModals();
      if (!isOpen) {
        el.style.display = 'flex';
        if (modalId === 'inventory-modal') this.renderInventory();
        if (modalId === 'quests-modal') this.renderQuestsList('active');
        if (modalId === 'map-modal') this.renderWorldMap();
      }
    }

    closeModals() {
      const ids = ['inventory-modal', 'quests-modal', 'map-modal', 'dialogue-modal', 'skin-shop-modal', 'equip-shop-modal', 'settings-modal', 'pause-modal'];
      ids.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = 'none';
      });
    }

    togglePause() {
      this.paused = !this.paused;
      const pModal = document.getElementById('pause-modal');
      pModal.style.display = this.paused ? 'flex' : 'none';
    }

    openSkinShop() {
      this.closeModals();
      const modal = document.getElementById('skin-shop-modal');
      const listEl = document.getElementById('skins-list');
      listEl.innerHTML = '';

      SKINS_DATA.forEach(skin => {
        const owned = this.player.ownedSkins.includes(skin.id);
        const equipped = this.player.equippedSkin === skin.id;

        const card = document.createElement('div');
        card.style.background = '#14110e';
        card.style.border = equipped ? '3px solid #f1c40f' : '1px solid #574635';
        card.style.borderRadius = '8px';
        card.style.padding = '12px';
        card.style.textAlign = 'center';

        card.innerHTML = `
          <div style="font-family:'Cinzel'; font-size:16px; color:#f1c40f; margin-bottom:6px;">${skin.name}</div>
          <div style="font-size:12px; color:#bdc3c7; height:34px; margin-bottom:10px;">${skin.desc}</div>
          <div style="font-family:'Press Start 2P'; font-size:10px; color:${owned ? '#2ecc71' : '#f39c12'}; margin-bottom:10px;">
            ${equipped ? 'EQUIPPED' : (owned ? 'OWNED' : '🪙 ' + skin.price + ' Gold')}
          </div>
          <button class="btn-primary" style="width:100%; padding:6px; font-size:12px;" ${equipped ? 'disabled' : ''}>
            ${equipped ? 'Active' : (owned ? 'Equip' : 'Buy Skin')}
          </button>
        `;

        const btn = card.querySelector('button');
        btn.onclick = () => {
          if (equipped) return;
          if (owned) {
            this.player.equippedSkin = skin.id;
            this.sound.playCoin();
            this.showToast(`Equipped ${skin.name}!`);
            this.openSkinShop();
          } else {
            if (this.player.gold >= skin.price) {
              this.player.gold -= skin.price;
              this.player.ownedSkins.push(skin.id);
              this.player.equippedSkin = skin.id;
              this.sound.playFanfare();
              this.showToast(`Purchased and equipped ${skin.name}!`);
              this.openSkinShop();
            } else {
              this.showToast(`Not enough gold! Need ${skin.price}G.`);
            }
          }
        };

        listEl.appendChild(card);
      });

      modal.style.display = 'flex';
    }

    openEquipShop() {
      this.closeModals();
      const modal = document.getElementById('equip-shop-modal');
      const listEl = document.getElementById('equip-items-list');
      listEl.innerHTML = '';

      EQUIPMENT_DATA.forEach(item => {
        if (item.price === 0) return; // Skip basic starters
        const owned = this.player.ownedEquipment.includes(item.id);
        const equipped = (this.player.equippedWeapon === item.id || this.player.equippedArmor === item.id);

        const row = document.createElement('div');
        row.style.display = 'flex';
        row.style.alignItems = 'center';
        row.style.justifyContent = 'space-between';
        row.style.background = '#14110e';
        row.style.border = equipped ? '2px solid #f1c40f' : '1px solid #4a3827';
        row.style.borderRadius = '6px';
        row.style.padding = '8px 14px';

        row.innerHTML = `
          <div>
            <div style="font-size:16px; font-weight:bold; color:#f1c40f;">${item.name}</div>
            <div style="font-size:12px; color:#bdc3c7;">${item.desc || ''}</div>
          </div>
          <div style="display:flex; align-items:center; gap:12px;">
            <div style="font-family:'Press Start 2P'; font-size:10px; color:#f39c12;">
              ${owned ? 'OWNED' : '🪙 ' + item.price + 'G'}
            </div>
            <button class="btn-primary" style="padding:6px 14px; font-size:12px;" ${equipped ? 'disabled' : ''}>
              ${equipped ? 'Equipped' : (owned ? 'Equip' : 'Upgrade')}
            </button>
          </div>
        `;

        const btn = row.querySelector('button');
        btn.onclick = () => {
          if (equipped) return;
          if (owned) {
            if (item.type === 'weapon') this.player.equippedWeapon = item.id;
            if (item.type === 'armor') this.player.equippedArmor = item.id;
            this.sound.playCoin();
            this.showToast(`Equipped ${item.name}!`);
            this.openEquipShop();
          } else {
            if (this.player.gold >= item.price) {
              this.player.gold -= item.price;
              this.player.ownedEquipment.push(item.id);
              if (item.type === 'weapon') this.player.equippedWeapon = item.id;
              if (item.type === 'armor') {
                this.player.equippedArmor = item.id;
                this.player.maxHealth += item.hpBonus;
                this.player.health += item.hpBonus;
              }
              this.sound.playFanfare();
              this.showToast(`Upgraded to ${item.name}!`);
              this.openEquipShop();
            } else {
              this.showToast(`Insufficient gold! Need ${item.price}G.`);
            }
          }
        };

        listEl.appendChild(row);
      });

      modal.style.display = 'flex';
    }

    renderInventory() {
      const p = this.player;
      const statsEl = document.getElementById('inventory-stats');
      const eqWeapon = EQUIPMENT_DATA.find(e => e.id === p.equippedWeapon);
      const eqArmor = EQUIPMENT_DATA.find(e => e.id === p.equippedArmor);

      statsEl.innerHTML = `
        <div>Level: <b style="color:#f1c40f;">${p.level}</b> (${p.xp}/${p.xpToNext} XP)</div>
        <div>Health: <b style="color:#e74c3c;">${p.health}/${p.maxHealth}</b></div>
        <div>Hunger: <b style="color:#e67e22;">${p.hunger}/${p.maxHunger}</b></div>
        <div>Attack Power: <b style="color:#e74c3c;">${eqWeapon ? eqWeapon.atk + (p.level-1)*6 : 25}</b></div>
        <div>Defense: <b style="color:#3498db;">${eqArmor ? eqArmor.def : 0}</b></div>
        <div>Gold: <b style="color:#f1c40f;">${p.gold}</b></div>
        <div>Wood Logs: <b style="color:#bdc3c7;">${p.wood}</b></div>
      `;

      const eqEl = document.getElementById('inventory-equipment');
      eqEl.innerHTML = `
        <div>Banner Skin: <b style="color:#9b59b6;">${p.equippedSkin.toUpperCase()}</b></div>
        <div>Main Weapon: <b style="color:#f1c40f;">${eqWeapon ? eqWeapon.name : 'Rusty Blade'}</b></div>
        <div>Armor: <b style="color:#3498db;">${eqArmor ? eqArmor.name : 'Leather Tunic'}</b></div>
        <div style="margin-top:8px; font-size:12px; color:#7f8c8d;">Tip: Visit Sylas and Eldrin in Greenmeadow for upgrades!</div>
      `;

      const gridEl = document.getElementById('inventory-grid');
      gridEl.innerHTML = '';

      const items = [
        { name: 'Roast Meat', icon: '🍖', count: p.meat, action: () => this.useHotbar(1) },
        { name: 'Health Potion', icon: '🧪', count: p.potions, action: () => this.useHotbar(2) },
        { name: 'Elixir of Vigor', icon: '✨', count: p.elixirs, action: () => this.useHotbar(3) },
        { name: 'Teleport Stone', icon: '🧿', count: p.teleports, action: () => this.useHotbar(4) }
      ];

      items.forEach(it => {
        const slot = document.createElement('div');
        slot.style.background = '#181410';
        slot.style.border = '2px solid #574635';
        slot.style.borderRadius = '6px';
        slot.style.padding = '8px';
        slot.style.textAlign = 'center';
        slot.style.cursor = 'pointer';

        slot.innerHTML = `
          <div style="font-size:24px;">${it.icon}</div>
          <div style="font-size:11px; margin-top:4px; font-weight:bold;">${it.name}</div>
          <div style="font-family:'Press Start 2P'; font-size:9px; color:#f1c40f;">x${it.count}</div>
        `;
        slot.onclick = () => {
          it.action();
          this.renderInventory();
        };
        gridEl.appendChild(slot);
      });
    }

    renderQuestsList(tab = 'active') {
      const listEl = document.getElementById('quests-list');
      listEl.innerHTML = '';

      // Highlight active tab
      ['active', 'completed', 'bounties'].forEach(t => {
        const btn = document.getElementById('tab-' + (t === 'bounties' ? 'bounties' : t + '-quests'));
        if (btn) btn.style.opacity = (t === tab) ? '1' : '0.6';
      });

      if (tab === 'bounties') {
        listEl.innerHTML = `
          <div style="background:#14110e; border:1px solid #7f6448; border-radius:6px; padding:12px;">
            <div style="font-size:15px; color:#f1c40f; font-weight:bold;">Repeatable Bounty: Bandit Patrols</div>
            <div style="font-size:13px; color:#ecf0f1; margin:6px 0;">Defeat patrolling hostile units anywhere across the realm.</div>
            <div style="font-family:'Press Start 2P'; font-size:10px; color:#2ecc71;">Enemies Slain: ${this.player.stats.enemiesSlain}</div>
          </div>
          <div style="background:#14110e; border:1px solid #7f6448; border-radius:6px; padding:12px;">
            <div style="font-size:15px; color:#f1c40f; font-weight:bold;">Repeatable Bounty: Village Sustenance</div>
            <div style="font-size:13px; color:#ecf0f1; margin:6px 0;">Hunt wild sheep to ensure village meat provisions.</div>
            <div style="font-family:'Press Start 2P'; font-size:10px; color:#2ecc71;">Sheep Hunted: ${this.player.stats.sheepHunted}</div>
          </div>
        `;
        return;
      }

      const filtered = this.quests.filter(q => tab === 'completed' ? q.completed : !q.completed);
      if (filtered.length === 0) {
        listEl.innerHTML = `<div style="text-align:center; padding:20px; color:#7f8c8d;">No ${tab} quests found.</div>`;
        return;
      }

      filtered.forEach(q => {
        const item = document.createElement('div');
        item.style.background = q.id === this.activeQuestId ? 'rgba(241, 196, 15, 0.12)' : '#14110e';
        item.style.border = q.id === this.activeQuestId ? '2px solid #f1c40f' : '1px solid #4a3827';
        item.style.borderRadius = '6px';
        item.style.padding = '10px 14px';

        item.innerHTML = `
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
            <div style="font-family:'Cinzel'; font-size:15px; color:${q.completed ? '#2ecc71' : '#f1c40f'}; font-weight:bold;">
              ${q.title}
            </div>
            <div style="font-family:'Press Start 2P'; font-size:9px; color:#bdc3c7;">
              ${q.completed ? 'COMPLETED' : `${q.current}/${q.total}`}
            </div>
          </div>
          <div style="font-size:13px; color:#ecf0f1; margin-bottom:6px;">${q.desc}</div>
          <div style="font-family:'Press Start 2P'; font-size:9px; color:#f39c12;">
            Rewards: 🪙 ${q.rewardGold} Gold &middot; ⭐ ${q.rewardXp} XP
          </div>
        `;
        listEl.appendChild(item);
      });
    }

    renderWorldMap() {
      const cvs = document.getElementById('world-map-canvas');
      const ctx = cvs.getContext('2d');
      const w = cvs.width;
      const h = cvs.height;

      ctx.clearRect(0, 0, w, h);

      // Draw map regions
      // Region 0: Greenmeadow
      ctx.fillStyle = '#27ae60';
      ctx.fillRect(0, h * 0.45, w * 0.4, h * 0.55);

      // Region 1: Whispering Wilds
      ctx.fillStyle = '#16a085';
      ctx.fillRect(0, 0, w * 0.4, h * 0.45);

      // Region 2: Riverlands
      ctx.fillStyle = '#2980b9';
      ctx.fillRect(w * 0.4, 0, w * 0.25, h);

      // Bridges
      ctx.fillStyle = '#7f8c8d';
      ctx.fillRect(w * 0.4, h * 0.55, w * 0.25, 18);
      ctx.fillRect(w * 0.4, h * 0.26, w * 0.25, 18);

      // Region 3: Red Frontier
      ctx.fillStyle = '#c0392b';
      ctx.fillRect(w * 0.65, h * 0.45, w * 0.35, h * 0.55);

      // Region 4: Blackstone Fortress
      ctx.fillStyle = '#2c3e50';
      ctx.fillRect(w * 0.65, 0, w * 0.35, h * 0.45);

      // Landmark labels
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 12px Cinzel, serif';
      ctx.fillText('🏰 Greenmeadow', 25, h * 0.72);
      ctx.fillText('🌲 Whispering Wilds', 25, h * 0.22);
      ctx.fillText('🌊 Riverlands', w * 0.44, h * 0.42);
      ctx.fillText('⚔️ Red Frontier', w * 0.72, h * 0.72);
      ctx.fillText('⬛ Blackstone Citadel', w * 0.70, h * 0.22);

      // Draw Player Position Icon
      const px = (this.player.x / WORLD_WIDTH) * w;
      const py = (this.player.y / WORLD_HEIGHT) * h;
      ctx.fillStyle = '#f1c40f';
      ctx.beginPath();
      ctx.arc(px, py, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Current Region label
      const pCol = Math.floor(this.player.x / TILE_SIZE);
      const pRow = Math.floor(this.player.y / TILE_SIZE);
      const curRegId = this.regionMap[pRow] ? this.regionMap[pRow][pCol] : 0;
      const regNames = ['Greenmeadow Village', 'Whispering Wilds', 'Riverlands Crossing', 'Red Frontier', 'Blackstone Fortress'];
      document.getElementById('map-current-region').textContent = 'Location: ' + (regNames[curRegId] || 'Greenmeadow');
    }

    triggerVictory() {
      this.sound.playFanfare();
      const modal = document.getElementById('victory-modal');
      const statsEl = document.getElementById('victory-stats');
      statsEl.innerHTML = `
        <div>Total Quests Completed: <b>${this.player.stats.questsCompleted} / 24</b></div>
        <div>Enemies Slain: <b>${this.player.stats.enemiesSlain}</b></div>
        <div>Sheep Hunted: <b>${this.player.stats.sheepHunted}</b></div>
        <div>Total Gold Earned: <b>${this.player.stats.goldEarned} G</b></div>
        <div>Final Hero Level: <b>Level ${this.player.level}</b></div>
      `;
      modal.style.display = 'flex';
    }

    updateHUD() {
      const p = this.player;
      // Health
      const hpPercent = Math.max(0, Math.min(100, (p.health / p.maxHealth) * 100));
      document.getElementById('health-bar-fill').style.width = hpPercent + '%';
      document.getElementById('health-text').textContent = `${Math.ceil(p.health)}/${p.maxHealth}`;

      // Hunger
      const hungerPercent = Math.max(0, Math.min(100, (p.hunger / p.maxHunger) * 100));
      document.getElementById('hunger-bar-fill').style.width = hungerPercent + '%';
      document.getElementById('hunger-text').textContent = `${Math.ceil(p.hunger)}/${p.maxHunger}`;

      // Level / XP
      const xpPercent = Math.max(0, Math.min(100, (p.xp / p.xpToNext) * 100));
      document.getElementById('xp-bar-fill').style.width = xpPercent + '%';
      document.getElementById('xp-text').textContent = `${p.xp}/${p.xpToNext}`;
      document.getElementById('level-badge').textContent = `L${p.level}`;

      // Currency
      document.getElementById('gold-count').textContent = p.gold;
      document.getElementById('wood-count').textContent = p.wood;

      // Hotbar Counts
      document.getElementById('hotbar-meat-count').textContent = p.meat;
      document.getElementById('hotbar-potion-count').textContent = p.potions;
      document.getElementById('hotbar-elixir-count').textContent = p.elixirs;
      document.getElementById('hotbar-teleport-count').textContent = p.teleports;

      // Active Quest Tracker
      const curQ = this.quests.find(q => q.id === this.activeQuestId);
      if (curQ && !curQ.completed) {
        document.getElementById('quest-tracker-title').textContent = `QUEST ${curQ.id} [CH.${curQ.chapter}]`;
        document.getElementById('quest-tracker-desc').textContent = `${curQ.title}: ${curQ.desc} (${curQ.current}/${curQ.total})`;
      } else {
        document.getElementById('quest-tracker-title').textContent = 'ALL MAIN QUESTS COMPLETED';
        document.getElementById('quest-tracker-desc').textContent = 'Explore the realms or take on repeatable bounties!';
      }
    }

    showToast(msg) {
      const container = document.getElementById('toast-container');
      const toast = document.createElement('div');
      toast.className = 'toast-msg';
      toast.textContent = msg;
      container.appendChild(toast);
      setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
      }, 3200);
    }

    spawnFloatingText(x, y, text, color) {
      this.floatingTexts.push({
        x: x,
        y: y,
        text: text,
        color: color,
        life: 0.9
      });
    }

    spawnParticles(x, y, color, count = 6) {
      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const spd = 40 + Math.random() * 80;
        this.particles.push({
          x: x,
          y: y,
          vx: Math.cos(angle) * spd,
          vy: Math.sin(angle) * spd,
          color: color,
          size: 2 + Math.random() * 3,
          life: 0.25 + Math.random() * 0.25
        });
      }
    }

    spawnDust(x, y) {
      this.particles.push({
        x: x,
        y: y,
        vx: (Math.random() - 0.5) * 20,
        vy: -15 - Math.random() * 15,
        color: 'rgba(210, 190, 160, 0.6)',
        size: 4 + Math.random() * 4,
        life: 0.3
      });
    }

    spawnExplosion(x, y) {
      this.particles.push({
        isExplosion: true,
        x: x,
        y: y,
        frame: 0,
        frameTimer: 0,
        life: 0.45
      });
    }

    // --- SAVE & LOAD (LOCALSTORAGE) ---
    saveGame() {
      try {
        const data = {
          player: {
            x: this.player.x,
            y: this.player.y,
            health: this.player.health,
            maxHealth: this.player.maxHealth,
            hunger: this.player.hunger,
            level: this.player.level,
            xp: this.player.xp,
            xpToNext: this.player.xpToNext,
            gold: this.player.gold,
            wood: this.player.wood,
            meat: this.player.meat,
            potions: this.player.potions,
            elixirs: this.player.elixirs,
            equippedSkin: this.player.equippedSkin,
            ownedSkins: this.player.ownedSkins,
            equippedWeapon: this.player.equippedWeapon,
            equippedArmor: this.player.equippedArmor,
            ownedEquipment: this.player.ownedEquipment,
            stats: this.player.stats
          },
          activeQuestId: this.activeQuestId,
          quests: this.quests,
          chests: this.chests.map(c => ({ id: c.id, opened: c.opened }))
        };
        localStorage.setItem('the_long_road_save', JSON.stringify(data));
      } catch (e) {
        console.warn('Save failed:', e);
      }
    }

    loadGame() {
      try {
        const raw = localStorage.getItem('the_long_road_save');
        if (!raw) return;
        const data = JSON.parse(raw);
        Object.assign(this.player, data.player);
        this.activeQuestId = data.activeQuestId;
        if (data.quests) this.quests = data.quests;
        if (data.chests) {
          data.chests.forEach(saved => {
            const match = this.chests.find(c => c.id === saved.id);
            if (match) match.opened = saved.opened;
          });
        }
        document.getElementById('title-screen').style.display = 'none';
        this.generateWorld();
        this.resize();
        this.running = true;
        this.paused = false;
        this.sound.resume();
        this.sound.startAmbientMusic();
        this.lastTime = performance.now();
        this.showToast('Game loaded successfully!');
        this.updateHUD();
        requestAnimationFrame((t) => this.gameLoop(t));
      } catch (e) {
        console.warn('Load failed:', e);
      }
    }

    // --- RENDERING ---
    render() {
      const ctx = this.ctx;
      const cam = this.camera;

      // Apply screen shake
      let shakeX = 0;
      let shakeY = 0;
      if (cam.shake > 0) {
        shakeX = (Math.random() - 0.5) * cam.shake * 2;
        shakeY = (Math.random() - 0.5) * cam.shake * 2;
      }

      ctx.save();
      ctx.translate(-Math.floor(cam.x + shakeX), -Math.floor(cam.y + shakeY));

      // 1. Draw Visible Tiles
      this.renderTiles(ctx);

      // 2. Collect Entities for Y-Sorting
      const renderables = [];

      // Scenery (Buildings, Trees, Rocks, Bushes)
      this.scenery.forEach(sc => {
        if (this.isOnScreen(sc.x, sc.y, sc.w, sc.h)) {
          renderables.push({ type: 'scenery', y: sc.y + sc.h * 0.7, obj: sc });
        }
      });

      // Chests
      this.chests.forEach(ch => {
        if (this.isOnScreen(ch.x, ch.y, 48, 48)) {
          renderables.push({ type: 'chest', y: ch.y, obj: ch });
        }
      });

      // Pickups
      this.pickups.forEach(pk => {
        if (this.isOnScreen(pk.x, pk.y, 32, 32)) {
          renderables.push({ type: 'pickup', y: pk.y, obj: pk });
        }
      });

      // Sheep
      this.sheep.forEach(sh => {
        if (!sh.dead && this.isOnScreen(sh.x, sh.y, 64, 64)) {
          renderables.push({ type: 'sheep', y: sh.y, obj: sh });
        }
      });

      // NPCs
      this.npcs.forEach(npc => {
        if (this.isOnScreen(npc.x, npc.y, 64, 64)) {
          renderables.push({ type: 'npc', y: npc.y, obj: npc });
        }
      });

      // Enemies
      this.enemies.forEach(en => {
        if (!en.dead && this.isOnScreen(en.x, en.y, 64, 64)) {
          renderables.push({ type: 'enemy', y: en.y, obj: en });
        }
      });

      // Player
      renderables.push({ type: 'player', y: this.player.y, obj: this.player });

      // Sort by Y-coordinate for true 2.5D depth
      renderables.sort((a, b) => a.y - b.y);

      // Draw all Y-sorted entities
      renderables.forEach(r => {
        if (r.type === 'scenery') this.renderScenery(ctx, r.obj);
        else if (r.type === 'chest') this.renderChest(ctx, r.obj);
        else if (r.type === 'pickup') this.renderPickup(ctx, r.obj);
        else if (r.type === 'sheep') this.renderSheep(ctx, r.obj);
        else if (r.type === 'npc') this.renderNPC(ctx, r.obj);
        else if (r.type === 'enemy') this.renderEnemy(ctx, r.obj);
        else if (r.type === 'player') this.renderPlayer(ctx, r.obj);
      });

      // 3. Projectiles (Arrows)
      this.renderProjectiles(ctx);

      // 4. Particles & Floating Texts
      this.renderParticles(ctx);

      // 5. Overhead Clouds
      this.renderClouds(ctx);

      ctx.restore();
    }

    isOnScreen(x, y, w = 64, h = 64) {
      const cam = this.camera;
      return (
        x + w >= cam.x - 50 &&
        x <= cam.x + cam.width + 50 &&
        y + h >= cam.y - 50 &&
        y <= cam.y + cam.height + 50
      );
    }

    renderTiles(ctx) {
      const cam = this.camera;
      const startCol = Math.max(0, Math.floor(cam.x / TILE_SIZE));
      const endCol = Math.min(MAP_COLS - 1, Math.ceil((cam.x + cam.width) / TILE_SIZE));
      const startRow = Math.max(0, Math.floor(cam.y / TILE_SIZE));
      const endRow = Math.min(MAP_ROWS - 1, Math.ceil((cam.y + cam.height) / TILE_SIZE));

      const waterImg = this.assets.get('water_bg');
      const foamImg = this.assets.get('water_foam');
      const timeSec = performance.now() / 1000;
      const foamFrame = Math.floor(timeSec * 8) % 16;

      for (let r = startRow; r <= endRow; r++) {
        for (let c = startCol; c <= endCol; c++) {
          const tType = this.tileMap[r][c];
          const reg = this.regionMap[r][c];
          const dx = c * TILE_SIZE;
          const dy = r * TILE_SIZE;

          if (tType === 'water') {
            // Draw deep water tile
            if (waterImg && waterImg.complete) {
              ctx.drawImage(waterImg, 0, 0, 64, 64, dx, dy, TILE_SIZE, TILE_SIZE);
            } else {
              ctx.fillStyle = '#1e3799';
              ctx.fillRect(dx, dy, TILE_SIZE, TILE_SIZE);
            }
            // Draw animated shore water foam if adjacent to land
            if (this.isAdjacentToLand(r, c) && foamImg && foamImg.complete) {
              ctx.drawImage(foamImg, foamFrame * 192, 0, 192, 192, dx - 64, dy - 64, 192, 192);
            }
          } else if (tType === 'bridge') {
            // Draw wooden bridge plank crossing
            ctx.fillStyle = '#6d4c41';
            ctx.fillRect(dx, dy, TILE_SIZE, TILE_SIZE);
            ctx.fillStyle = '#4e342e';
            ctx.fillRect(dx, dy + 6, TILE_SIZE, 3);
            ctx.fillRect(dx, dy + 22, TILE_SIZE, 3);
            ctx.fillRect(dx, dy + 38, TILE_SIZE, 3);
            ctx.fillRect(dx, dy + 54, TILE_SIZE, 3);
          } else {
            // Ground tile: choose appropriate regional tilemap
            let tmapName = 'tilemap_1'; // Greenmeadow
            if (reg === 1) tmapName = 'tilemap_3'; // Whispering Wilds (teal / forest)
            if (reg === 2) tmapName = 'tilemap_1'; // Riverlands
            if (reg === 3) tmapName = 'tilemap_4'; // Red Frontier
            if (reg === 4) tmapName = 'tilemap_5'; // Blackstone Fortress

            const sheet = this.assets.get(tmapName);
            if (sheet && sheet.complete) {
              // Solid center grass tile in 9-slice grid is at col 1, row 1 (sx: 64, sy: 64)
              ctx.drawImage(sheet, 64, 64, 64, 64, dx, dy, TILE_SIZE, TILE_SIZE);
            } else {
              ctx.fillStyle = reg === 3 ? '#b71c1c' : (reg === 4 ? '#263238' : '#27ae60');
              ctx.fillRect(dx, dy, TILE_SIZE, TILE_SIZE);
            }
          }
        }
      }
    }

    isAdjacentToLand(r, c) {
      const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
      for (const [dr, dc] of dirs) {
        const nr = r + dr;
        const nc = c + dc;
        if (nr >= 0 && nr < MAP_ROWS && nc >= 0 && nc < MAP_COLS) {
          if (this.tileMap[nr][nc] === 'ground' || this.tileMap[nr][nc] === 'bridge') return true;
        }
      }
      return false;
    }

    renderScenery(ctx, sc) {
      const img = this.assets.get(sc.asset);
      if (!img || !img.complete) return;

      if (sc.type === 'tree') {
        // Tree animation frame (idle sway)
        const frame = sc.frame || 0;
        const frameW = img.height; // Square frame width = height
        ctx.drawImage(img, frame * frameW, 0, frameW, frameW, sc.x - frameW / 2, sc.y - frameW + 30, frameW, frameW);
      } else if (sc.type === 'building') {
        ctx.drawImage(img, sc.x - sc.w / 2, sc.y - sc.h + 20, sc.w, sc.h);
      } else {
        ctx.drawImage(img, sc.x, sc.y, sc.w, sc.h);
      }
    }

    renderChest(ctx, ch) {
      ctx.fillStyle = ch.opened ? '#574635' : '#e67e22';
      ctx.fillRect(ch.x, ch.y, 40, 32);
      ctx.strokeStyle = '#f1c40f';
      ctx.lineWidth = 2;
      ctx.strokeRect(ch.x, ch.y, 40, 32);
      ctx.fillStyle = '#f1c40f';
      ctx.fillRect(ch.x + 16, ch.y + 12, 8, 8);
    }

    renderPickup(ctx, pk) {
      if (pk.type === 'meat') {
        const img = this.assets.get('meat_resource');
        if (img && img.complete) {
          ctx.drawImage(img, pk.x - 16, pk.y - 16, 32, 32);
        } else {
          ctx.fillStyle = '#e74c3c';
          ctx.beginPath();
          ctx.arc(pk.x, pk.y, 10, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (pk.type === 'wood') {
        const img = this.assets.get('wood_resource');
        if (img && img.complete) {
          ctx.drawImage(img, pk.x - 16, pk.y - 16, 32, 32);
        } else {
          ctx.fillStyle = '#8d6e63';
          ctx.fillRect(pk.x - 10, pk.y - 6, 20, 12);
        }
      } else if (pk.type === 'gold') {
        const img = this.assets.get('gold_resource');
        if (img && img.complete) {
          ctx.drawImage(img, pk.x - 16, pk.y - 16, 32, 32);
        } else {
          ctx.fillStyle = '#f1c40f';
          ctx.beginPath();
          ctx.arc(pk.x, pk.y, 8, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    renderSheep(ctx, sh) {
      let sheetKey = 'sheep_idle';
      let maxFrames = 6;
      if (sh.state === 'move' || sh.state === 'flee') {
        sheetKey = 'sheep_move';
        maxFrames = 4;
      } else if (sh.state === 'grass') {
        sheetKey = 'sheep_grass';
        maxFrames = 12;
      }

      const img = this.assets.get(sheetKey);
      if (!img || !img.complete) return;

      const frame = sh.animFrame % maxFrames;
      ctx.save();
      ctx.translate(Math.floor(sh.x), Math.floor(sh.y));
      if (sh.facing === -1) ctx.scale(-1, 1);
      // Frame size 128x128
      ctx.drawImage(img, frame * 128, 0, 128, 128, -64, -75, 128, 128);
      ctx.restore();
    }

    renderNPC(ctx, npc) {
      const img = this.assets.get(npc.asset);
      if (!img || !img.complete) return;

      const timeSec = performance.now() / 1000;
      const frame = Math.floor(timeSec * 6) % 6;

      ctx.save();
      ctx.translate(Math.floor(npc.x), Math.floor(npc.y));
      ctx.drawImage(img, frame * 192, 0, 192, 192, -96, -135, 192, 192);

      // Nameplate & Role
      ctx.font = 'bold 11px MedievalSharp, Georgia';
      ctx.fillStyle = '#f1c40f';
      ctx.textAlign = 'center';
      ctx.fillText(npc.name, 0, -110);
      ctx.font = '10px sans-serif';
      ctx.fillStyle = '#bdc3c7';
      ctx.fillText(npc.role, 0, -96);
      ctx.restore();
    }

    renderEnemy(ctx, en) {
      let sheetKey = `${en.color}_${en.type}_idle`;
      let maxFrames = 6;
      let frameW = 192;
      let drawOffset = 135;

      if (en.type === 'lancer') {
        frameW = 320;
        drawOffset = 180;
        sheetKey = `${en.color}_lancer_idle`;
        maxFrames = 12;
        if (en.state === 'run') {
          sheetKey = `${en.color}_lancer_run`;
          maxFrames = 6;
        } else if (en.state === 'attack') {
          sheetKey = `${en.color}_lancer_attack`;
          maxFrames = 3;
        }
      } else if (en.type === 'archer') {
        frameW = 192;
        sheetKey = `${en.color}_archer_idle`;
        maxFrames = 6;
        if (en.state === 'run') {
          sheetKey = `${en.color}_archer_run`;
          maxFrames = 4;
        } else if (en.state === 'shoot') {
          sheetKey = `${en.color}_archer_shoot`;
          maxFrames = 8;
        }
      } else {
        // Warrior & Boss
        sheetKey = `${en.color}_warrior_idle`;
        maxFrames = 8;
        if (en.state === 'run') {
          sheetKey = `${en.color}_warrior_run`;
          maxFrames = 6;
        } else if (en.state === 'attack') {
          sheetKey = `${en.color}_warrior_attack1`;
          maxFrames = 4;
        }
      }

      const img = this.assets.get(sheetKey);
      if (!img || !img.complete) return;

      const frame = en.animFrame % maxFrames;

      ctx.save();
      ctx.translate(Math.floor(en.x), Math.floor(en.y));
      if (en.facing === -1) ctx.scale(-1, 1);

      // Hit Flash (white outline or tint)
      if (en.state === 'hit') {
        ctx.filter = 'brightness(2.2)';
      }

      // Boss scale
      if (en.type === 'boss') {
        ctx.scale(1.35, 1.35);
      }

      ctx.drawImage(img, frame * frameW, 0, frameW, frameW, -frameW / 2, -drawOffset, frameW, frameW);
      ctx.restore();

      // Enemy Health Bar over head
      if (en.type !== 'boss' && en.health < en.maxHealth) {
        const barW = 36;
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(en.x - barW / 2, en.y - 70, barW, 5);
        ctx.fillStyle = '#e74c3c';
        ctx.fillRect(en.x - barW / 2, en.y - 70, (en.health / en.maxHealth) * barW, 5);
      }
    }

    renderPlayer(ctx, p) {
      const skin = p.equippedSkin;
      let sheetKey = `${skin}_warrior_idle`;
      let maxFrames = 8;

      if (p.state === 'run') {
        sheetKey = `${skin}_warrior_run`;
        maxFrames = 6;
      } else if (p.state === 'attack1') {
        sheetKey = `${skin}_warrior_attack1`;
        maxFrames = 4;
      } else if (p.state === 'attack2') {
        sheetKey = `${skin}_warrior_attack2`;
        maxFrames = 4;
      } else if (p.state === 'guard') {
        sheetKey = `${skin}_warrior_guard`;
        maxFrames = 6;
      } else if (p.state === 'dodge') {
        sheetKey = `${skin}_warrior_run`;
        maxFrames = 6;
      }

      const img = this.assets.get(sheetKey);
      if (!img || !img.complete) return;

      const frame = p.animFrame % maxFrames;

      ctx.save();
      ctx.translate(Math.floor(p.x), Math.floor(p.y));
      if (p.facing === -1) ctx.scale(-1, 1);

      // Dodge roll angle or iFrames blink
      if (p.iFrames > 0 && Math.floor(performance.now() / 60) % 2 === 0) {
        ctx.globalAlpha = 0.45;
      }

      // 192x192 frame size
      ctx.drawImage(img, frame * 192, 0, 192, 192, -96, -135, 192, 192);
      ctx.restore();
    }

    renderProjectiles(ctx) {
      const arrowImg = this.assets.get('arrow');
      this.projectiles.forEach(pr => {
        ctx.save();
        ctx.translate(pr.x, pr.y);
        ctx.rotate(pr.angle);
        if (arrowImg && arrowImg.complete) {
          ctx.drawImage(arrowImg, -16, -4, 32, 8);
        } else {
          ctx.fillStyle = '#f1c40f';
          ctx.fillRect(-12, -2, 24, 4);
        }
        ctx.restore();
      });
    }

    renderParticles(ctx) {
      // Dust & Sparks
      this.particles.forEach(pt => {
        if (pt.isExplosion) {
          const expImg = this.assets.get('explosion');
          if (expImg && expImg.complete) {
            ctx.drawImage(expImg, 0, 0, 192, 192, pt.x - 96, pt.y - 96, 192, 192);
          }
        } else {
          ctx.fillStyle = pt.color;
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
          ctx.fill();
        }
      });

      // Floating text
      this.floatingTexts.forEach(ft => {
        ctx.font = 'bold 13px MedievalSharp, Georgia';
        ctx.fillStyle = ft.color;
        ctx.textAlign = 'center';
        ctx.shadowColor = '#000';
        ctx.shadowBlur = 4;
        ctx.fillText(ft.text, ft.x, ft.y);
        ctx.shadowBlur = 0;
      });
    }

    renderClouds(ctx) {
      this.clouds.forEach(cl => {
        const img = this.assets.get(cl.asset);
        if (img && img.complete) {
          ctx.save();
          ctx.globalAlpha = cl.opacity;
          ctx.drawImage(img, cl.x, cl.y);
          ctx.restore();
        }
      });
    }
  }

  window.Game = Game;

  function initGame() {
    if (document.getElementById('game-canvas') && !window.gameInstance) {
      window.gameInstance = new Game();
    }
  }

  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    initGame();
  } else {
    window.addEventListener('DOMContentLoaded', initGame);
  }

})();

