import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { GameScene } from './scenes/GameScene';
import { SettingsScene } from './scenes/SettingsScene';
import { LevelEditorScene } from './scenes/LevelEditorScene';


// Standard 9:16 portrait resolution optimized for modern iPhone viewports
const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
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

    // Load customized visual pipeline ONLY if WebGL is available
  // We'll register it later dynamically in BootScene/GameScene if needed,
  // or use the new pipeline registration API
  scene: [BootScene, GameScene, SettingsScene, LevelEditorScene]
};

// Initialize the Phaser game instance
const game = new Phaser.Game(config);

// WebGL Fallback detection with 3-second timeout fallback
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

game.events.once('ready', () => {
  rendererDetected = true;
  clearTimeout(initTimeout);
  const isWebGL = game.renderer.type === Phaser.WEBGL;
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

// Resize handling logic
window.addEventListener('resize', () => {
  game.scale.refresh();
});

// Register battery status triggers to automatically toggle battery saver mode
if ('getBattery' in navigator) {
  (navigator as any).getBattery().then((battery: any) => {
    const handleBatterySaver = () => {
      if (battery.saveMode || battery.level < 0.2) {
        // Lower target FPS and simplify rendering dynamically
        game.loop.targetFps = 30;
        localStorage.setItem('chroma_battery_saver', 'true');
        console.log('[Battery] Battery low or power-saver active. Capping FPS to 30.');
      }
    };
    battery.addEventListener('levelchange', handleBatterySaver);
    battery.addEventListener('chargingchange', handleBatterySaver);
    handleBatterySaver();
  });
}
