import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { GameScene } from './scenes/GameScene';
import { SettingsScene } from './scenes/SettingsScene';
import { LevelEditorScene } from './scenes/LevelEditorScene';
import { ChromaPipeline } from './shaders/ChromaPipeline';

// Standard 9:16 portrait resolution optimized for modern iPhone viewports
const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.WEBGL, // Force high performance WebGL
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

// Initialize the Phaser game instance
const game = new Phaser.Game(config);

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
