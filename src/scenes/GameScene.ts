import Phaser from 'phaser';
import { OpticsEngine, GameElement, BeamSegment } from '../core/OpticsEngine';
import { InputController } from '../input/InputController';
import { SoundEngine } from '../audio/SoundEngine';
import { SaveSystem } from '../save/SaveSystem';
import { ChromaPipeline } from '../shaders/ChromaPipeline';

/**
 * GameScene implements the main puzzle board. It utilizes the OpticsEngine
 * to trace light rays, visualizes them via WebGL additive blend modes, manages particle glows,
 * and triggers gorgeous transition animations when level objectives are met.
 */
export class GameScene extends Phaser.Scene {
  static KEY = 'GameScene';

  private opticsEngine!: OpticsEngine;

  // Render elements lists
  private boardSprites: Map<string, Phaser.GameObjects.Sprite> = new Map();
  private beamGraphics!: Phaser.GameObjects.Graphics;
  private particleEmitter!: Phaser.GameObjects.Particles.ParticleEmitter;

  // Level definition
  private currentLevelId = 'level_1';
  private levelName = 'Prismatic Splitting';
  private startTime = 0;
  private isLevelComplete = false;

  constructor() {
    super(GameScene.KEY);
  }

  create(): void {
    this.isLevelComplete = false;
    this.startTime = this.time.now;

    // Reset layout
    this.boardSprites.clear();

    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // Draw cyber grid background
    this.drawBackgroundGrid(width, height);

    // Initialize core Optics Engine
    this.opticsEngine = new OpticsEngine(width, height);

    // Create high-fidelity glowing vector beam graphic object
    this.beamGraphics = this.add.graphics().setDepth(10);
    this.beamGraphics.setBlendMode(Phaser.BlendModes.ADD);

    // Create custom particle system for sparkling crystal completions
    this.createGlowingParticles();

    // Setup the Level 1 layout as defined in user prompt:
    this.loadLevel1();

    // Bind custom Input and gesture controller (Instantiated to hook into pointer events)
    const gestureController = new InputController(this);
    console.log('[GameScene] InputController successfully registered: ', gestureController);

    // Set up active post-processing effects pipeline
    if (this.game.renderer.type === Phaser.WEBGL) {
      const renderer = this.renderer as Phaser.Renderer.WebGL.WebGLRenderer;
      if (renderer && renderer.pipelines) {
        // Dynamically add the pipeline if it wasn't added in the global config
        if (typeof renderer.pipelines.has === 'function' && !renderer.pipelines.has(ChromaPipeline.KEY)) {
            try {
                renderer.pipelines.addPostPipeline(ChromaPipeline.KEY, ChromaPipeline);
            } catch (e) {
                console.warn('[GameScene] Failed to add ChromaPipeline dynamically:', e);
            }
        }

        if (typeof renderer.pipelines.has === 'function' && renderer.pipelines.has(ChromaPipeline.KEY)) {
            this.cameras.main.setPostPipeline(ChromaPipeline.KEY);
        }
      }
    } else {
      console.log('[GameScene] Post-processing pipeline skipped (Renderer is Canvas)');
    }

    // UI Overlay Header
    this.createUIOverlay(width);

    // Start background analytics / update tracking
    InputController.setAppBadge(1); // Set PWA badge showing 1 remaining challenge!
  }

  update(): void {
    if (typeof (window as any).chromaDebug === 'object') {
      (window as any).chromaDebug.fps = this.game.loop.actualFps;
    }

    if (this.isLevelComplete) return;

    // 1. Sync physical positions from Phaser sprites into the mathematical OpticsEngine
    for (const [id, sprite] of this.boardSprites.entries()) {
      const elem = this.opticsEngine.getElement(id);
      if (elem) {
        elem.x = sprite.x;
        elem.y = sprite.y;
        elem.angle = sprite.angle;
        this.opticsEngine.setElement(elem);
      }
    }

    // 2. Compute path-tracing in real-time
    const trace = this.opticsEngine.traceBeams();

    if (typeof (window as any).chromaDebug === 'object') {
      (window as any).chromaDebug.activeBeams = trace.segments.length;
    }

    // 3. Clear and redraw active glowing laser beams
    this.drawBeams(trace.segments);

    // 4. Update targets states and handle visual achievements
    this.updateTargetCrystals(trace.activatedTargets);
  }

  /**
   * Layout configuration for Level 1: "Prismatic Splitting"
   */
  private loadLevel1(): void {
    // A. Emitter (White beam)
    const emitter: GameElement = {
      id: 'emitter_white',
      type: 'emitter',
      x: 100,
      y: 200,
      angle: 60, // Aiming diagonally downwards towards the mirror
      color: { r: 255, g: 255, b: 255 },
      width: 40
    };

    // B. Mirror (Draggable and Rotatable)
    const mirror: GameElement = {
      id: 'mirror_1',
      type: 'mirror',
      x: 220,
      y: 460,
      angle: -15,
      width: 60
    };

    // C. Prism (Splits beams into components)
    const prism: GameElement = {
      id: 'prism_1',
      type: 'prism',
      x: 440,
      y: 320,
      angle: 0,
      width: 50
    };

    // D. Red Crystal Target
    const targetRed: GameElement = {
      id: 'target_red',
      type: 'target',
      x: 650,
      y: 180,
      angle: 0,
      color: { r: 255, g: 0, b: 0 },
      width: 40
    };

    // E. Green Crystal Target
    const targetGreen: GameElement = {
      id: 'target_green',
      type: 'target',
      x: 680,
      y: 400,
      angle: 0,
      color: { r: 0, g: 255, b: 0 },
      width: 40
    };

    // F. Blue Crystal Target
    const targetBlue: GameElement = {
      id: 'target_blue',
      type: 'target',
      x: 640,
      y: 620,
      angle: 0,
      color: { r: 0, g: 0, b: 255 },
      width: 40
    };

    // Push into Optics Engine
    this.opticsEngine.setElement(emitter);
    this.opticsEngine.setElement(mirror);
    this.opticsEngine.setElement(prism);
    this.opticsEngine.setElement(targetRed);
    this.opticsEngine.setElement(targetGreen);
    this.opticsEngine.setElement(targetBlue);

    // Build associated Phaser interactive sprites
    this.createGameSprite(emitter, 'emitter_texture', false);
    this.createGameSprite(mirror, 'mirror_texture', true);
    this.createGameSprite(prism, 'prism_texture', true);
    this.createGameSprite(targetRed, 'crystal_texture', false, 0xff3333);
    this.createGameSprite(targetGreen, 'crystal_texture', false, 0x33ff33);
    this.createGameSprite(targetBlue, 'crystal_texture', false, 0x3333ff);
  }

  /**
   * Generates a Phaser display Sprite and sets up interactive bounds.
   */
  private createGameSprite(
    elem: GameElement,
    texture: string,
    draggable: boolean,
    tint?: number
  ): void {
    const sprite = this.add.sprite(elem.x, elem.y, texture);
    sprite.setAngle(elem.angle);
    sprite.setData('id', elem.id);
    sprite.setData('baseScale', 1.0);
    sprite.setDepth(15);

    if (tint) {
      sprite.setTint(tint);
    }

    if (draggable) {
      sprite.setInteractive({ useHandCursor: true });
      this.input.setDraggable(sprite);

      // Trigger standard scale pulses on selection
      sprite.on('pointerdown', () => {
        this.tweens.add({
          targets: sprite,
          scaleX: 1.15,
          scaleY: 1.15,
          duration: 100,
          ease: 'Quad.easeOut'
        });
      });

      sprite.on('pointerup', () => {
        this.tweens.add({
          targets: sprite,
          scaleX: 1.0,
          scaleY: 1.0,
          duration: 100,
          ease: 'Quad.easeIn'
        });
      });
    }

    // Set listener for Context Menu Delete button
    sprite.on('delete-element', () => {
      this.opticsEngine.removeElement(elem.id);
      sprite.destroy();
      this.boardSprites.delete(elem.id);
    });

    this.boardSprites.set(elem.id, sprite);
  }

  /**
   * Redraws all beam line geometries with rich additive core-and-glow overlay.
   */
  private drawBeams(segments: BeamSegment[]): void {
    this.beamGraphics.clear();

    for (const seg of segments) {
      const phaserColor = Phaser.Display.Color.GetColor(seg.color.r, seg.color.g, seg.color.b);

      // 1. Draw outer glowing halo beam (Thick semi-translucent)
      this.beamGraphics.lineStyle(8, phaserColor, 0.25);
      this.beamGraphics.lineBetween(seg.startX, seg.startY, seg.endX, seg.endY);

      // 2. Draw medium beam (Bright core)
      this.beamGraphics.lineStyle(4, phaserColor, 0.6);
      this.beamGraphics.lineBetween(seg.startX, seg.startY, seg.endX, seg.endY);

      // 3. Draw innermost laser core (Super bright white-hot center)
      this.beamGraphics.lineStyle(1.5, 0xffffff, 0.95);
      this.beamGraphics.lineBetween(seg.startX, seg.startY, seg.endX, seg.endY);

      // Spark some neon particles along the beams at random intervals (ambient dust glow)
      if (Math.random() < 0.12) {
        const t = Math.random();
        const px = seg.startX + (seg.endX - seg.startX) * t;
        const py = seg.startY + (seg.endY - seg.startY) * t;
        this.particleEmitter.emitParticleAt(px, py);
      }
    }
  }

  /**
   * Evaluates active crystals, updates tints, triggers chime feedback, and checks completion.
   */
  private updateTargetCrystals(activeIds: Set<string>): void {
    let allCleared = true;
    const crystalIds = ['target_red', 'target_green', 'target_blue'];

    for (const id of crystalIds) {
      const sprite = this.boardSprites.get(id);
      const isNowActive = activeIds.has(id);

      if (sprite) {
        const wasActive = sprite.getData('active') === true;

        if (isNowActive && !wasActive) {
          // Play crystal activation sound
          SoundEngine.playCrystalActivation(sprite.x);

          // Flash white briefly before solidifying
          sprite.setTint(0xffffff);
          this.time.delayedCall(150, () => {
            if (id === 'target_red') sprite.setTint(0xff0000);
            if (id === 'target_green') sprite.setTint(0x00ff00);
            if (id === 'target_blue') sprite.setTint(0x0000ff);
          });

          // Burst glittering particles
          this.triggerCrystalExplosion(sprite.x, sprite.y);
          sprite.setData('active', true);
        } else if (!isNowActive && wasActive) {
          // Revert back to soft tinted state
          if (id === 'target_red') sprite.setTint(0xff3333);
          if (id === 'target_green') sprite.setTint(0x33ff33);
          if (id === 'target_blue') sprite.setTint(0x3333ff);
          sprite.setData('active', false);
        }
      }

      if (!isNowActive) {
        allCleared = false;
      }
    }

    if (allCleared && !this.isLevelComplete) {
      this.triggerLevelSuccess();
    }
  }

  /**
   * Complete Success routine! Arpeggiates major chord, saves metrics, shows star rating overlay.
   */
  private triggerLevelSuccess(): void {
    this.isLevelComplete = true;
    SoundEngine.playLevelComplete();

    const duration = Math.round((this.time.now - this.startTime) / 1000);
    const starCount = duration < 12 ? 3 : duration < 25 ? 2 : 1;

    // Save progression
    SaveSystem.completeLevel(this.currentLevelId, starCount, duration, 4);

    // Camera completion sweep flash
    this.cameras.main.flash(400, 255, 255, 255);

    // Render Success Modal Overlay
    this.showCompletionModal(starCount, duration);
  }

  /**
   * Spawns a gorgeous, high-depth transparent modal with glowing success metrics.
   */
  private showCompletionModal(stars: number, seconds: number): void {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    const modalContainer = this.add.container(0, 0).setDepth(150);

    // Dim background
    const overlay = this.add.graphics();
    overlay.fillStyle(0x050514, 0.85);
    overlay.fillRect(0, 0, width, height);
    modalContainer.add(overlay);

    const dialog = this.add.graphics();
    dialog.fillStyle(0x0a0a21, 0.95);
    dialog.lineStyle(2, 0xff00ff, 1);
    dialog.fillRoundedRect(width / 2 - 160, height / 2 - 200, 320, 400, 16);
    dialog.strokeRoundedRect(width / 2 - 160, height / 2 - 200, 320, 400, 16);
    modalContainer.add(dialog);

    // Success title
    const successTitle = this.add.text(width / 2, height / 2 - 150, 'GRID ALIGNED', {
      fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
      fontSize: '28px',
      fontStyle: 'bold',
      color: '#00ffff'
    }).setOrigin(0.5);
    successTitle.setShadow(0, 0, '#00ffff', 10, true, true);
    modalContainer.add(successTitle);

    // Level statistics
    const statsText = this.add.text(width / 2, height / 2 - 90, `Time: ${seconds} seconds\nRating:`, {
      fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
      fontSize: '16px',
      color: '#b0b0d0',
      align: 'center'
    }).setOrigin(0.5);
    modalContainer.add(statsText);

    // Gorgeous Golden Glowing Stars
    for (let i = 0; i < 3; i++) {
      const starGlow = this.add.text(width / 2 - 60 + i * 60, height / 2 - 30, '★', {
        fontSize: '42px',
        color: i < stars ? '#ffff00' : '#333355'
      }).setOrigin(0.5);
      if (i < stars) {
        starGlow.setShadow(0, 0, '#ffff00', 10, true, true);
      }
      modalContainer.add(starGlow);
    }

    // Share Challenge Button
    const shareBtn = this.add.text(width / 2, height / 2 + 50, 'SHARE SOLUTION', {
      fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
      fontSize: '16px',
      backgroundColor: '#3c14ff',
      color: '#ffffff',
      padding: { x: 24, y: 12 }
    }).setOrigin(0.5).setInteractive();
    shareBtn.on('pointerdown', () => {
      InputController.shareProgress(this.levelName, stars);
    });
    modalContainer.add(shareBtn);

    // Settings / Next Level button
    const nextBtn = this.add.text(width / 2, height / 2 + 120, 'RESTART SPECTRUM', {
      fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
      fontSize: '14px',
      color: '#ff00ff'
    }).setOrigin(0.5).setInteractive();
    nextBtn.on('pointerdown', () => {
      this.scene.restart();
    });
    modalContainer.add(nextBtn);
  }

  /**
   * Triggers a burst of neon sparkles when crystal completes.
   */
  private triggerCrystalExplosion(x: number, y: number): void {
    for (let i = 0; i < 15; i++) {
      this.particleEmitter.emitParticleAt(x, y);
    }
  }

  /**
   * Sets up a high-performance vector particle emitter.
   */
  private createGlowingParticles(): void {
    // Generate a simple circular neon particle texture dynamically
    const pGfx = this.make.graphics();
    pGfx.fillStyle(0xffffff, 1);
    pGfx.fillCircle(4, 4, 3);
    try {
      pGfx.generateTexture('glow_particle', 8, 8);
    } catch (e) {
      console.warn('[GameScene] Failed to generate glow_particle', e);
    }

    this.particleEmitter = this.add.particles(0, 0, 'glow_particle', {
      speed: { min: 40, max: 180 },
      scale: { start: 1.2, end: 0 },
      alpha: { start: 0.8, end: 0 },
      lifespan: 600,
      blendMode: 'ADD',
      frequency: -1 // Emit only on-demand
    });
    this.particleEmitter.setDepth(18);
  }

  /**
   * Renders the technical background grid aligning to the 40px snap nodes.
   */
  private drawBackgroundGrid(width: number, height: number): void {
    const grid = this.add.graphics();
    grid.lineStyle(1, 0x111126, 0.4);

    for (let x = 0; x < width; x += 40) {
      grid.lineBetween(x, 0, x, height);
    }
    for (let y = 0; y < height; y += 40) {
      grid.lineBetween(0, y, width, y);
    }
  }

  /**
   * Renders UI labels, header stats, level title, and quick-settings access.
   */
  private createUIOverlay(width: number): void {
    // Level Title info
    const label = this.add.text(24, 24, this.levelName, {
      fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
      fontSize: '18px',
      fontStyle: 'bold',
      color: '#ffffff'
    });
    label.setShadow(0, 0, '#ffffff', 3, true, true);

    this.add.text(24, 48, 'ALIGN MIRRORS TO SPLIT THE WHITE SPECTRUM', {
      fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
      fontSize: '10px',
      color: '#8080a0'
    });

    // Simple Interactive Quick-settings toggle button
    const settingsBtn = this.add.text(width - 120, 24, 'SETTINGS', {
      fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
      fontSize: '13px',
      backgroundColor: '#11112c',
      padding: { x: 12, y: 6 },
      color: '#ff00ff'
    }).setInteractive();

    settingsBtn.on('pointerdown', () => {
      SoundEngine.playTap();
      this.scene.pause();
      this.scene.launch('SettingsScene');
    });
  }
}
