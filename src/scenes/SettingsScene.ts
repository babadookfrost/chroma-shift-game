import Phaser from 'phaser';
import { SoundEngine } from '../audio/SoundEngine';

/**
 * SettingsScene displays a polished pause modal offering graphic quality,
 * master volume slides, persistent audio mutes, and accessibility controls.
 */
export class SettingsScene extends Phaser.Scene {
  static KEY = 'SettingsScene';

  constructor() {
    super(SettingsScene.KEY);
  }

  create(): void {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // Dim overlay
    const overlay = this.add.graphics();
    overlay.fillStyle(0x02020a, 0.75);
    overlay.fillRect(0, 0, width, height);

    // Dialog background
    const dialog = this.add.graphics();
    dialog.fillStyle(0x0c0c24, 0.95);
    dialog.lineStyle(2, 0x00ffff, 1);
    dialog.fillRoundedRect(width / 2 - 150, height / 2 - 200, 300, 400, 16);
    dialog.strokeRoundedRect(width / 2 - 150, height / 2 - 200, 300, 400, 16);

    // Header Title
    this.add.text(width / 2, height / 2 - 160, 'CONTROL PANEL', {
      fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
      fontSize: '22px',
      fontStyle: 'bold',
      color: '#00ffff'
    }).setOrigin(0.5).setShadow(0, 0, '#00ffff', 5, true, true);

    // 1. Audio Volume Toggle & Label
    const muteLabel = SoundEngine.getMuted() ? 'UNMUTE AUDIO' : 'MUTE AUDIO';
    const muteBtn = this.add.text(width / 2, height / 2 - 90, muteLabel, {
      fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
      fontSize: '15px',
      backgroundColor: '#1b1b44',
      padding: { x: 20, y: 10 },
      color: '#e0e0f0'
    }).setOrigin(0.5).setInteractive();

    muteBtn.on('pointerdown', () => {
      const state = !SoundEngine.getMuted();
      SoundEngine.setMute(state);
      muteBtn.setText(state ? 'UNMUTE AUDIO' : 'MUTE AUDIO');
      SoundEngine.playTap();
    });

    // Volume level bar slider helper
    this.add.text(width / 2, height / 2 - 30, 'VOLUME LEVEL', {
      fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
      fontSize: '11px',
      color: '#8080a0'
    }).setOrigin(0.5);

    const sliderBg = this.add.graphics();
    sliderBg.fillStyle(0x222244, 1);
    sliderBg.fillRect(width / 2 - 100, height / 2 - 10, 200, 8);

    const sliderFill = this.add.graphics();
    const updateSliderFill = (vol: number) => {
      sliderFill.clear();
      sliderFill.fillStyle(0x00ffff, 1);
      sliderFill.fillRect(width / 2 - 100, height / 2 - 10, 200 * vol, 8);
    };
    updateSliderFill(SoundEngine.getVolume());

    const sliderHandle = this.add.circle(width / 2 - 100 + 200 * SoundEngine.getVolume(), height / 2 - 6, 10, 0xffffff);
    sliderHandle.setInteractive({ useHandCursor: true });
    this.input.setDraggable(sliderHandle);

    sliderHandle.on('drag', (_p: Phaser.Input.Pointer, dragX: number) => {
      const minX = width / 2 - 100;
      const maxX = width / 2 + 100;
      const clampedX = Phaser.Math.Clamp(dragX, minX, maxX);
      sliderHandle.x = clampedX;

      const volumeVal = (clampedX - minX) / 200;
      SoundEngine.setVolume(volumeVal);
      updateSliderFill(volumeVal);
    });

    // 2. Battery Saver / Reduced Motion Toggle
    const batteryPref = localStorage.getItem('chroma_battery_saver') === 'true';
    const batteryLabel = batteryPref ? 'BATTERY SAVER: ON' : 'BATTERY SAVER: OFF';
    const batteryBtn = this.add.text(width / 2, height / 2 + 50, batteryLabel, {
      fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
      fontSize: '13px',
      backgroundColor: '#1b1b44',
      padding: { x: 16, y: 8 },
      color: '#e0e0f0'
    }).setOrigin(0.5).setInteractive();

    batteryBtn.on('pointerdown', () => {
      const isSaver = localStorage.getItem('chroma_battery_saver') !== 'true';
      localStorage.setItem('chroma_battery_saver', isSaver ? 'true' : 'false');
      batteryBtn.setText(isSaver ? 'BATTERY SAVER: ON' : 'BATTERY SAVER: OFF');
      SoundEngine.playTap();

      // Lower frame rates in battery mode to guarantee longevity
      if (isSaver) {
        this.game.loop.targetFps = 30;
      } else {
        this.game.loop.targetFps = 60;
      }
    });

    // Close Modal Button
    const closeBtn = this.add.text(width / 2, height / 2 + 140, 'RESUME GAME', {
      fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
      fontSize: '15px',
      backgroundColor: '#ff00ff',
      padding: { x: 24, y: 12 },
      color: '#ffffff'
    }).setOrigin(0.5).setInteractive().setShadow(0, 0, '#ff00ff', 5, true, true);

    closeBtn.on('pointerdown', () => {
      SoundEngine.playTap();
      this.scene.resume('GameScene');
      this.scene.stop();
    });
  }
}
