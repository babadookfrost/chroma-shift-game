import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { GameScene } from './scenes/GameScene';
import { SettingsScene } from './scenes/SettingsScene';
import { LevelEditorScene } from './scenes/LevelEditorScene';
import { ChromaPipeline } from './shaders/ChromaPipeline';

// Standard 9:16 portrait resolution optimized for modern iPhone viewports
const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.CANVAS, // Force Phaser.CANVAS instead of Phaser.AUTO as temporary test
  width: 800,
  height: 1200,
  parent: 'game-container',
  backgroundColor: '#05050f',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 0 },
      debug: false
    }
  },
  // Load customized visual pipeline
  pipeline: {
    // We register the custom post fx pipeline here to make it globally available to cameras
    [ChromaPipeline.KEY as any]: ChromaPipeline as any
  } as any,
  scene: [BootScene, GameScene, SettingsScene, LevelEditorScene]
};

// Initialize the Phaser game instance with environment checks and resilient fallbacks
console.log('[System] Browser environment diagnostics:');
try {
  const canvasCheck = document.createElement('canvas');
  const hasCanvas = typeof canvasCheck.getContext === 'function';
  console.log('[System] Canvas element supported:', hasCanvas);
  if (hasCanvas) {
    const glCheck = canvasCheck.getContext('webgl') || canvasCheck.getContext('experimental-webgl');
    console.log('[System] WebGL context supported:', !!glCheck);
    if (!glCheck) {
      console.warn('[System] WebGL is NOT supported/enabled in this browser context.');
    }
  }
} catch (diagErr) {
  console.error('[System] Failed to perform canvas/WebGL environment check:', diagErr);
}

let game: Phaser.Game | null = null;
let rendererDetected = false;

const initTimeout = setTimeout(() => {
  if (!rendererDetected) {
    const errorMsg = 'Phaser Renderer Initialization Timeout:\nRenderer not detected in 3 seconds. The game loop is not running. Please verify if WebGL/Canvas is supported, or if there is a CORS or security issue blocking canvas creation.';
    console.error('[System] ' + errorMsg);
    if (typeof (window as any).showErrorOverlay === 'function') {
      (window as any).showErrorOverlay(errorMsg);
    }
  }
}, 3000);

try {
  console.log('[System] Initializing standard Phaser configuration (type: Phaser.CANVAS)...');
  game = new Phaser.Game(config);
  console.log('[System] Standard Phaser Game instance created.');
} catch (err: any) {
  console.error('[System] Standard Phaser config failed to initialize:', err);
  console.log('[System] Attempting minimal fallback Phaser configuration...');

  try {
    const fallbackConfig: Phaser.Types.Core.GameConfig = {
      type: Phaser.CANVAS, // Fallback to canvas
      width: 800,
      height: 1200,
      parent: 'game-container',
      backgroundColor: '#05050f',
      scene: {
        preload: function(this: Phaser.Scene) {
          console.log('[FallbackScene] Preload started');
        },
        create: function(this: Phaser.Scene) {
          console.log('[FallbackScene] Create started. Drawing a colored rectangle...');
          const rect = this.add.graphics();
          rect.fillStyle(0x00ffff, 1);
          rect.fillRect(200, 400, 400, 400);

          this.add.text(400, 300, 'CHROMA SHIFT', { fontSize: '32px', color: '#00ffff' }).setOrigin(0.5);
          this.add.text(400, 360, 'FALLBACK MODE ACTIVE', { fontSize: '18px', color: '#ff00ff' }).setOrigin(0.5);
        }
      }
    };
    game = new Phaser.Game(fallbackConfig);
    console.log('[System] Fallback Phaser Game instance created.');
  } catch (fallbackErr: any) {
    console.error('[System] Fallback Phaser config also failed:', fallbackErr);
    if (typeof (window as any).showErrorOverlay === 'function') {
      (window as any).showErrorOverlay(`Phaser Critical Failure:\nFailed to initialize both standard and fallback configurations.\nStandard error: ${err?.message || err}\nFallback error: ${fallbackErr?.message || fallbackErr}`);
    }
  }
}

if (game) {
  const activeGame = game;
  activeGame.events.once('ready', () => {
    rendererDetected = true;
    clearTimeout(initTimeout);
    const isWebGL = activeGame.renderer.type === Phaser.WEBGL;
    if (typeof (window as any).chromaDebug === 'object') {
      (window as any).chromaDebug.renderer = isWebGL ? 'WebGL' : 'Canvas';
    }
    if (!isWebGL) {
      console.warn('[Phaser] WebGL not available. Falling back to Canvas Rendering Mode.');
      const banner = document.getElementById('compatibility-banner');
      if (banner) {
        banner.style.display = 'block';
      }
    }
  });
}

// Resize handling logic
window.addEventListener('resize', () => {
  if (game) {
    game.scale.refresh();
  }
});

// Register battery status triggers to automatically toggle battery saver mode
if ('getBattery' in navigator) {
  (navigator as any).getBattery().then((battery: any) => {
    const handleBatterySaver = () => {
      if (battery.saveMode || battery.level < 0.2) {
        if (game) {
          // Lower target FPS and simplify rendering dynamically
          game.loop.targetFps = 30;
          localStorage.setItem('chroma_battery_saver', 'true');
          console.log('[Battery] Battery low or power-saver active. Capping FPS to 30.');
        }
      }
    };
    battery.addEventListener('levelchange', handleBatterySaver);
    battery.addEventListener('chargingchange', handleBatterySaver);
    handleBatterySaver();
  });
}
