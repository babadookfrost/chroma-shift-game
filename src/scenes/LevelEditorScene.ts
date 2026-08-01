import Phaser from 'phaser';
import { OpticsEngine, GameElement } from '../core/OpticsEngine';
import { InputController } from '../input/InputController';
import { SoundEngine } from '../audio/SoundEngine';

/**
 * LevelEditorScene provides custom layout generation tools.
 * Elements can be spawned, dragged, and aligned with double-taps.
 * Customized levels can be instantly exported as compressed base64 query hashes!
 */
export class LevelEditorScene extends Phaser.Scene {
  static KEY = 'LevelEditorScene';

  private opticsEngine!: OpticsEngine;
  private editSprites: Map<string, Phaser.GameObjects.Sprite> = new Map();
  private elementCounter = 0;

  constructor() {
    super(LevelEditorScene.KEY);
  }

  create(): void {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    this.editSprites.clear();
    this.elementCounter = 0;

    // Grid backdrop
    this.drawBackgroundGrid(width, height);

    // Mathematical simulation engine
    this.opticsEngine = new OpticsEngine(width, height);

    // Bind inputs gesture system
    const gestureController = new InputController(this);
    console.log('[LevelEditorScene] Registered InputController: ', gestureController);

    // Draw bottom layout utility buttons panel
    this.createEditorControls(width, height);

    // UI labels
    this.add.text(24, 24, 'CHROMA WORKSHOP', {
      fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
      fontSize: '20px',
      fontStyle: 'bold',
      color: '#00ffff'
    }).setShadow(0, 0, '#00ffff', 5, true, true);

    this.add.text(24, 52, 'DRAG & ALIGN SPECTRUMS TO BUILD CUSTOM LEVELS', {
      fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
      fontSize: '10px',
      color: '#8080a0'
    });
  }

  update(): void {
    // Keep internal mathematical engine synced with visual elements
    for (const [id, sprite] of this.editSprites.entries()) {
      const elem = this.opticsEngine.getElement(id);
      if (elem) {
        elem.x = sprite.x;
        elem.y = sprite.y;
        elem.angle = sprite.angle;
        this.opticsEngine.setElement(elem);
      }
    }
  }

  /**
   * Spawns an interactive sandbox element dynamically.
   */
  private spawnElement(type: 'mirror' | 'prism' | 'target'): void {
    this.elementCounter++;
    const id = `custom_${type}_${this.elementCounter}`;

    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    const newElement: GameElement = {
      id,
      type,
      x: width / 2,
      y: height / 2,
      angle: 0,
      width: type === 'prism' ? 50 : 40,
      color: type === 'target' ? { r: 255, g: 0, b: 0 } : undefined // default Red target
    };

    this.opticsEngine.setElement(newElement);

    const texture = type === 'mirror' ? 'mirror_texture'
                  : type === 'prism' ? 'prism_texture'
                  : 'crystal_texture';

    const tint = type === 'target' ? 0xff3333 : undefined;

    this.createGameSprite(newElement, texture, tint);
    SoundEngine.playTap();
  }

  /**
   * Builds an interactive editable element inside the sandbox view.
   */
  private createGameSprite(elem: GameElement, texture: string, tint?: number): void {
    const sprite = this.add.sprite(elem.x, elem.y, texture);
    sprite.setAngle(elem.angle);
    sprite.setData('id', elem.id);
    sprite.setData('baseScale', 1.0);
    sprite.setDepth(15);
    sprite.setInteractive({ useHandCursor: true });
    this.input.setDraggable(sprite);

    if (tint) {
      sprite.setTint(tint);
    }

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

    sprite.on('delete-element', () => {
      this.opticsEngine.removeElement(elem.id);
      sprite.destroy();
      this.editSprites.delete(elem.id);
    });

    this.editSprites.set(elem.id, sprite);
  }

  /**
   * Serializes custom boards and prints/exports direct base64 share query hashes.
   */
  private exportCustomLevel(): void {
    const activeElements = this.opticsEngine.getAllElements();
    if (activeElements.length === 0) {
      alert('Add elements first to build a custom level!');
      return;
    }

    try {
      // Stringify and base64 encode
      const serialized = JSON.stringify(activeElements);
      const hash = btoa(serialized);
      const shareUrl = `${window.location.origin}${window.location.pathname}?level=${hash}`;

      // Try copy to clipboard
      navigator.clipboard.writeText(shareUrl).then(() => {
        alert('Level exported! Copied direct sharing URL to clipboard.');
      }).catch(() => {
        alert(`Copy URL manually: ${shareUrl}`);
      });
    } catch (e) {
      alert('Error encoding custom levels. Ensure elements are in standard positions.');
    }
  }

  /**
   * Helper grid background.
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
   * Instantiates action utility buttons.
   */
  private createEditorControls(width: number, height: number): void {
    // 1. Spawners Panel (bottom)
    const panelY = height - envSafeOffset(60);

    const addMirror = this.add.text(width / 4 - 50, panelY, '+ MIRROR', {
      fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
      fontSize: '12px',
      backgroundColor: '#1b1b44',
      padding: { x: 10, y: 6 },
      color: '#00ffff'
    }).setOrigin(0.5).setInteractive();

    addMirror.on('pointerdown', () => this.spawnElement('mirror'));

    const addPrism = this.add.text(width / 2, panelY, '+ PRISM', {
      fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
      fontSize: '12px',
      backgroundColor: '#1b1b44',
      padding: { x: 10, y: 6 },
      color: '#ff00ff'
    }).setOrigin(0.5).setInteractive();

    addPrism.on('pointerdown', () => this.spawnElement('prism'));

    const addTarget = this.add.text((3 * width) / 4 + 50, panelY, '+ CRYSTAL', {
      fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
      fontSize: '12px',
      backgroundColor: '#1b1b44',
      padding: { x: 10, y: 6 },
      color: '#ffff00'
    }).setOrigin(0.5).setInteractive();

    addTarget.on('pointerdown', () => this.spawnElement('target'));

    // 2. Action Buttons (top-right header)
    const exportBtn = this.add.text(width - 120, 24, 'SHARE LEVEL', {
      fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
      fontSize: '12px',
      backgroundColor: '#ff00ff',
      padding: { x: 12, y: 6 },
      color: '#ffffff'
    }).setInteractive();

    exportBtn.on('pointerdown', () => {
      SoundEngine.playTap();
      this.exportCustomLevel();
    });

    const backBtn = this.add.text(width - 240, 24, 'BACK', {
      fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
      fontSize: '12px',
      backgroundColor: '#11112c',
      padding: { x: 12, y: 6 },
      color: '#8080a0'
    }).setInteractive();

    backBtn.on('pointerdown', () => {
      SoundEngine.playTap();
      this.scene.start('GameScene');
    });
  }
}

/**
 * Returns safe positioning offset on iPhones with notches.
 */
function envSafeOffset(px: number): number {
  return px + 20;
}
