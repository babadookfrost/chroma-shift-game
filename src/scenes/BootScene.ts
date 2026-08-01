import Phaser from 'phaser';
import { SoundEngine } from '../audio/SoundEngine';
import { SaveSystem } from '../save/SaveSystem';

/**
 * BootScene preloads assets, restores save files, requests Audio context activation,
 * and handles transition into the main gameplay scene.
 */
export class BootScene extends Phaser.Scene {
  static KEY = 'BootScene';

  constructor() {
    super(BootScene.KEY);
  }

  preload(): void {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // Beautiful typography for Title
    const titleText = this.add.text(width / 2, height / 2 - 80, 'CHROMA SHIFT', {
      fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
      fontSize: '38px',
      fontStyle: 'bold',
      color: '#00ffff'
    }).setOrigin(0.5);
    titleText.setShadow(0, 0, '#00ffff', 10, true, true);

    const subtitleText = this.add.text(width / 2, height / 2 - 30, 'PREMIUM OPTICS PUZZLE', {
      fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
      fontSize: '12px',
      color: '#ff00ff'
    }).setOrigin(0.5);
    subtitleText.setShadow(0, 0, '#ff00ff', 5, true, true);

    // Progress bar components
    const progressBar = this.add.graphics();
    const progressBox = this.add.graphics();
    progressBox.fillStyle(0x111133, 0.8);
    progressBox.fillRect(width / 2 - 160, height / 2 + 50, 320, 20);

    const loadingText = this.add.text(width / 2, height / 2 + 90, 'INITIALIZING PRISMS...', {
      fontSize: '14px',
      color: '#8080a0'
    }).setOrigin(0.5);

    this.load.on('progress', (value: number) => {
      progressBar.clear();
      progressBar.fillStyle(0x3c14ff, 1);
      progressBar.fillRect(width / 2 - 150, height / 2 + 55, 300 * value, 10);
    });

    this.load.on('complete', () => {
      progressBar.destroy();
      progressBox.destroy();
      loadingText.setText('TAP TO SHIFT SPECTRUM');

      // Make title pulse beautifully
      this.tweens.add({
        targets: titleText,
        scaleX: 1.05,
        scaleY: 1.05,
        duration: 800,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });

      // Tap-to-start unlock screen
      this.input.once('pointerdown', async () => {
        // Unlock sound on mobile Safari / Chrome
        SoundEngine.init();
        await SoundEngine.resume();
        SoundEngine.playTap();

        // Load progress before entering game
        await SaveSystem.loadProgress();

        this.scene.start('GameScene');
      });
    });

    try {
      this.createProceduralTextures();
    } catch (err: any) {
      const errorMsg = `Procedural Asset Generation Failure: ${err?.message || err}\nMake sure Canvas/WebGL is fully supported on your browser.`;
      console.error('[BootScene] ' + errorMsg, err);
      if (typeof (window as any).showErrorOverlay === 'function') {
        (window as any).showErrorOverlay(errorMsg);
      }
    }
  }

  /**
   * Dynamically renders beautiful high-fidelity assets into Phaser cache,
   * avoiding any external assets load delay over network!
   */
  private createProceduralTextures(): void {
    // 1. Mirror Element Graphic (Silver-neon glowing bar)
    const mirrorGfx = this.make.graphics();
    mirrorGfx.fillStyle(0x1a1a40, 1);
    mirrorGfx.fillRect(0, 0, 60, 16);
    mirrorGfx.lineStyle(2, 0x00ffff, 1);
    mirrorGfx.strokeRect(0, 0, 60, 16);
    mirrorGfx.fillStyle(0xffffff, 0.8);
    mirrorGfx.fillRect(4, 4, 52, 8);
    if (!mirrorGfx.generateTexture('mirror_texture', 60, 16)) {
      throw new Error('Failed to generate mirror_texture');
    }

    // 2. Prism Element Graphic (Translucent triangular prism with colorful spectrum cores)
    const prismGfx = this.make.graphics();
    prismGfx.lineStyle(2, 0xff00ff, 1);
    prismGfx.strokeTriangle(25, 5, 5, 40, 45, 40);
    prismGfx.fillStyle(0xffffff, 0.4);
    prismGfx.fillTriangle(25, 12, 10, 37, 40, 37);
    if (!prismGfx.generateTexture('prism_texture', 50, 45)) {
      throw new Error('Failed to generate prism_texture');
    }

    // 3. Emitter Graphic (Chunky metal cylinder with colored lens)
    const emitterGfx = this.make.graphics();
    emitterGfx.fillStyle(0x222233, 1);
    emitterGfx.fillRect(0, 10, 40, 20);
    emitterGfx.lineStyle(2, 0x8888aa, 1);
    emitterGfx.strokeRect(0, 10, 40, 20);
    emitterGfx.fillStyle(0xffffff, 1);
    emitterGfx.fillRect(36, 12, 4, 16);
    if (!emitterGfx.generateTexture('emitter_texture', 40, 40)) {
      throw new Error('Failed to generate emitter_texture');
    }

    // 4. Target Crystal Graphic (A beautiful neon core gemstone)
    const crystalGfx = this.make.graphics();
    crystalGfx.lineStyle(2, 0xffff00, 1);
    crystalGfx.strokeTriangle(20, 2, 5, 20, 35, 20);
    crystalGfx.strokeTriangle(20, 38, 5, 20, 35, 20);
    crystalGfx.fillStyle(0xffff00, 0.5);
    crystalGfx.fillTriangle(20, 8, 10, 20, 30, 20);
    crystalGfx.fillTriangle(20, 32, 10, 20, 30, 20);
    if (!crystalGfx.generateTexture('crystal_texture', 40, 40)) {
      throw new Error('Failed to generate crystal_texture');
    }
  }
}
