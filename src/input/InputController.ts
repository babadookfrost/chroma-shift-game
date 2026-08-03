import Phaser from 'phaser';
import { SoundEngine } from '../audio/SoundEngine';

/**
 * Interface representing a gridded or magnetic snap coordinate.
 */
export interface SnapTarget {
  x: number;
  y: number;
}

/**
 * InputController intercepts raw touches/clicks and structures them into advanced
 * tactile gestures: single finger dragging, two-finger rotation, pinch-to-zoom,
 * double-tap magnetic locking, and long-press context menus.
 */
export class InputController {
  private scene: Phaser.Scene;
  private camera: Phaser.Cameras.Scene2D.Camera;

  // Active state tracking
  private activeElement: Phaser.GameObjects.Sprite | null = null;
  private isDragging = false;
  private lastTapTime = 0;
  private longPressTimer: Phaser.Time.TimerEvent | null = null;

  // Two-touch state tracking
  private prevTouchDistance = 0;
  private prevTouchAngle = 0;

  // Wake Lock state to keep screen awake
  private wakeLock: any = null;

  /**
   * Initializes the gesture engine for a Phaser Scene.
   */
  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.camera = scene.cameras.main;

    this.setupListeners();
    this.requestWakeLock();
  }

  /**
   * Binds pointer and touch listeners, ensuring standard Safari gestures are locked.
   */
  private setupListeners(): void {
    const input = this.scene.input;

    // Set maximum active pointers for multitouch
    input.addPointer(2);

    input.on('pointerdown', (pointer: Phaser.Input.Pointer, gameObjects: Phaser.GameObjects.GameObject[]) => {
      this.handlePointerDown(pointer, gameObjects);
    });

    input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      this.handlePointerMove(pointer);
    });

    input.on('pointerup', (_pointer: Phaser.Input.Pointer) => {
      this.handlePointerUp();
    });
  }

  /**
   * Helper to count down pointers.
   */
  private getActivePointersCount(): number {
    let count = 0;
    if (this.scene.input.pointer1.isDown) count++;
    if (this.scene.input.pointer2.isDown) count++;
    return count;
  }

  /**
   * Handles pointer down for selection, double-tap snapping, and long-press countdown.
   */
  private handlePointerDown(pointer: Phaser.Input.Pointer, gameObjects: Phaser.GameObjects.GameObject[]): void {
    // 1. Play beautiful tap visual ripple
    this.spawnTapRipple(pointer.worldX, pointer.worldY);

    const activePointersCount = this.getActivePointersCount();

    if (activePointersCount <= 1) {
      // Single Finger Touch Mode
      const clickedObject = gameObjects[0] as Phaser.GameObjects.Sprite;

      if (clickedObject) {
        this.activeElement = clickedObject;
        this.isDragging = true;

        // Double Tap Detection for immediate snapping
        const now = this.scene.time.now;
        if (now - this.lastTapTime < 300) {
          this.triggerDoubleTapSnap(clickedObject);
          this.lastTapTime = 0; // reset
        } else {
          this.lastTapTime = now;
        }

        // Long press detection for contextual menu
        if (this.longPressTimer) this.longPressTimer.destroy();
        this.longPressTimer = this.scene.time.delayedCall(600, () => {
          if (this.isDragging && this.activeElement === clickedObject) {
            this.triggerLongPressMenu(clickedObject, pointer.worldX, pointer.worldY);
          }
        });

        // Soft tactile tap sound
        SoundEngine.playTap(pointer.x);
      } else {
        // Clear active element selection
        this.activeElement = null;
      }
    } else if (activePointersCount === 2) {
      // Dual Touch Gestures (Pinch to zoom, Rotate element)
      const p1 = this.scene.input.pointer1;
      const p2 = this.scene.input.pointer2;

      this.prevTouchDistance = Phaser.Math.Distance.Between(p1.x, p1.y, p2.x, p2.y);
      this.prevTouchAngle = Phaser.Math.Angle.Between(p1.x, p1.y, p2.x, p2.y);

      if (this.longPressTimer) {
        this.longPressTimer.destroy();
        this.longPressTimer = null;
      }
    }
  }

  /**
   * Evaluates dynamic move events: element dragging, two-finger rotation, or camera panning/zooming.
   */
  private handlePointerMove(pointer: Phaser.Input.Pointer): void {
    const activePointersCount = this.getActivePointersCount();

    if (activePointersCount <= 1) {
      // Single Touch drag movement
      if (this.isDragging && this.activeElement) {
        // Cancel long press timer on substantial drag movement
        const dragDist = Phaser.Math.Distance.Between(pointer.downX, pointer.downY, pointer.x, pointer.y);
        if (dragDist > 15 && this.longPressTimer) {
          this.longPressTimer.destroy();
          this.longPressTimer = null;
        }

        // Smooth springy position updating
        this.activeElement.x = pointer.worldX;
        this.activeElement.y = pointer.worldY;
      } else if (pointer.isDown && !this.activeElement) {
        // Two-finger drag to pan standard WebGL camera
        this.camera.scrollX -= (pointer.x - pointer.prevPosition.x) / this.camera.zoom;
        this.camera.scrollY -= (pointer.y - pointer.prevPosition.y) / this.camera.zoom;
      }
    } else if (activePointersCount === 2) {
      // Multitouch calculations
      const p1 = this.scene.input.pointer1;
      const p2 = this.scene.input.pointer2;

      const currentDistance = Phaser.Math.Distance.Between(p1.x, p1.y, p2.x, p2.y);
      const currentAngle = Phaser.Math.Angle.Between(p1.x, p1.y, p2.x, p2.y);

      // Pinch to Zoom
      const zoomFactor = currentDistance / this.prevTouchDistance;
      const targetZoom = Phaser.Math.Clamp(this.camera.zoom * zoomFactor, 0.5, 2.5);
      this.camera.zoom = targetZoom;

      // Two-finger rotation of currently active element
      if (this.activeElement) {
        const deltaAngle = currentAngle - this.prevTouchAngle;
        const deltaDeg = Phaser.Math.RadToDeg(deltaAngle);

        this.activeElement.angle += deltaDeg;
      } else {
        // Two-finger drag-pan mapping
        const midX = (p1.x + p2.x) / 2;
        const midY = (p1.y + p2.y) / 2;
        const prevMidX = (p1.prevPosition.x + p2.prevPosition.x) / 2;
        const prevMidY = (p1.prevPosition.y + p2.prevPosition.y) / 2;

        this.camera.scrollX -= (midX - prevMidX) / this.camera.zoom;
        this.camera.scrollY -= (midY - prevMidY) / this.camera.zoom;
      }

      this.prevTouchDistance = currentDistance;
      this.prevTouchAngle = currentAngle;
    }
  }

  /**
   * Pointer up handles releasing, launching physical snaps and haptic fallbacks.
   */
  private handlePointerUp(): void {
    if (this.longPressTimer) {
      this.longPressTimer.destroy();
      this.longPressTimer = null;
    }

    if (this.isDragging && this.activeElement) {
      this.isDragging = false;

      // Trigger tactile magnetic snap on release!
      this.triggerMagneticSnap(this.activeElement);
    }
  }

  /**
   * Spawns a gorgeous tap ripple effect (exploding colored stroke circle) at coordinate.
   */
  private spawnTapRipple(x: number, y: number): void {
    const circle = this.scene.add.graphics();
    circle.lineStyle(3, 0x00ffff, 1.0);
    circle.strokeCircle(x, y, 4);
    circle.setDepth(100);

    this.scene.tweens.add({
      targets: circle,
      scaleX: 12,
      scaleY: 12,
      alpha: 0,
      duration: 350,
      ease: 'Quad.easeOut',
      onComplete: () => {
        circle.destroy();
      }
    });
  }

  /**
   * Tactile snap matching the nearest 45 degree angle and logical grid coordinates.
   */
  private triggerDoubleTapSnap(sprite: Phaser.GameObjects.Sprite): void {
    // Snap angle to nearest 45 degrees
    const currentAngle = sprite.angle;
    const snappedAngle = Math.round(currentAngle / 45) * 45;

    // Snap position to nearest 40px grid node
    const gridX = Math.round(sprite.x / 40) * 40;
    const gridY = Math.round(sprite.y / 40) * 40;

    SoundEngine.playSnap(sprite.x);
    this.triggeriOSHaptic();

    // Satisfying squash-and-stretch transition
    this.scene.tweens.add({
      targets: sprite,
      x: gridX,
      y: gridY,
      angle: snappedAngle,
      scaleX: sprite.scaleX * 1.25,
      scaleY: sprite.scaleY * 0.75,
      duration: 120,
      yoyo: true,
      ease: 'Back.easeOut',
      onComplete: () => {
        sprite.setScale(sprite.getData('baseScale') || 1);
      }
    });
  }

  /**
   * Magnetic snap on placement: snaps position to 40px node if within a 25px range.
   */
  private triggerMagneticSnap(sprite: Phaser.GameObjects.Sprite): void {
    const gridX = Math.round(sprite.x / 40) * 40;
    const gridY = Math.round(sprite.y / 40) * 40;

    const dx = Math.abs(sprite.x - gridX);
    const dy = Math.abs(sprite.y - gridY);

    if (dx < 25 && dy < 25) {
      SoundEngine.playSnap(sprite.x);
      this.triggeriOSHaptic();

      this.scene.tweens.add({
        targets: sprite,
        x: gridX,
        y: gridY,
        duration: 180,
        ease: 'Bounce.easeOut'
      });
    }
  }

  /**
   * Displays context menu on elements.
   */
  private triggerLongPressMenu(sprite: Phaser.GameObjects.Sprite, x: number, y: number): void {
    this.isDragging = false;
    this.triggeriOSHaptic();

    // Draw visual context button to duplicate or delete the element
    const menuContainer = this.scene.add.container(x, y - 60).setDepth(200);

    const deleteBtn = this.scene.add.text(-45, 0, '🗑', {
      fontSize: '20px',
      backgroundColor: '#300a0a',
      color: '#ff4444',
      padding: { x: 8, y: 8 }
    }).setInteractive();

    const rotateBtn = this.scene.add.text(15, 0, '⟳', {
      fontSize: '20px',
      backgroundColor: '#0a1030',
      color: '#00ffff',
      padding: { x: 8, y: 8 }
    }).setInteractive();

    menuContainer.add([deleteBtn, rotateBtn]);

    // Handle clicks
    deleteBtn.on('pointerdown', () => {
      sprite.emit('delete-element');
      menuContainer.destroy();
      SoundEngine.playTap();
    });

    rotateBtn.on('pointerdown', () => {
      this.scene.tweens.add({
        targets: sprite,
        angle: sprite.angle + 45,
        duration: 150,
        ease: 'Back.easeOut'
      });
      SoundEngine.playTap();
      menuContainer.destroy();
    });

    // Automatically destroy menu when clicking elsewhere
    this.scene.input.once('pointerdown', () => {
      menuContainer.destroy();
    });
  }

  /**
   * Emulates haptic vibration via screen shakes & brief high-contrast chromatic flashes (iOS fallback).
   */
  private triggeriOSHaptic(): void {
    try {
      if (typeof navigator.vibrate === 'function') {
        navigator.vibrate(15);
      } else {
        // iOS Safari Fallback: screen-shake
        this.camera.shake(80, 0.003);
      }
    } catch (e) {
      // Ignore vibration errors on restrictive browsers
      this.camera.shake(80, 0.003);
    }
  }

  /**
   * Activates screen wake lock keeping mobile viewport active during sessions.
   */
  private async requestWakeLock(): Promise<void> {
    if ('wakeLock' in navigator) {
      try {
        this.wakeLock = await (navigator as any).wakeLock.request('screen');
        console.log('[WakeLock] Screen wake-lock successfully active: ', this.wakeLock);
      } catch (err) {
        console.warn('[WakeLock] Failed to obtain wake lock.');
      }
    }
  }

  /**
   * PWA Native sharing API integration.
   */
  static async shareProgress(levelName: string, stars: number): Promise<void> {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Chroma Shift Challenge',
          text: `I just cleared level "${levelName}" in Chroma Shift with a perfect ${stars}-star rating! Can you beat my solution?`,
          url: window.location.href
        });
        console.log('[Web Share] Shared progress successfully.');
      } catch (err) {
        console.log('[Web Share] Dismissed or unsupported.');
      }
    } else {
      // Fallback: Copy link to clipboard
      try {
        await navigator.clipboard.writeText(window.location.href);
        alert('Challenge link copied to clipboard!');
      } catch (e) {
        alert('Could not open sharing. Try copying the page URL!');
      }
    }
  }

  /**
   * Dynamic iOS / Android App Badging API.
   */
  static setAppBadge(count: number): void {
    if ('setAppBadge' in navigator) {
      (navigator as any).setAppBadge(count).catch(() => {});
    }
  }
}
