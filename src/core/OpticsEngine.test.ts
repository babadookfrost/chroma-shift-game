import { describe, it, expect } from 'vitest';
import { ColorUtils, OpticsEngine, GameElement } from './OpticsEngine';

describe('ColorUtils and Additive Blending', () => {
  it('should correctly perform additive color blending', () => {
    const red = { r: 255, g: 0, b: 0 };
    const green = { r: 0, g: 255, b: 0 };
    const blue = { r: 0, g: 0, b: 255 };

    // Red + Green = Yellow
    expect(ColorUtils.blend(red, green)).toEqual({ r: 255, g: 255, b: 0 });

    // Green + Blue = Cyan
    expect(ColorUtils.blend(green, blue)).toEqual({ r: 0, g: 255, b: 255 });

    // Red + Blue = Magenta
    expect(ColorUtils.blend(red, blue)).toEqual({ r: 255, g: 0, b: 255 });

    // Red + Green + Blue = White
    const yellow = ColorUtils.blend(red, green);
    expect(ColorUtils.blend(yellow, blue)).toEqual({ r: 255, g: 255, b: 255 });
  });

  it('should correctly evaluate color matches within thresholds', () => {
    const c1 = { r: 255, g: 10, b: 5 };
    const c2 = { r: 245, g: 5, b: 0 };
    expect(ColorUtils.isMatch(c1, c2, 15)).toBe(true);
    expect(ColorUtils.isMatch(c1, c2, 4)).toBe(false);
  });

  it('should correctly split mixed colors through a prism', () => {
    const white = { r: 255, g: 255, b: 255 };
    const splits = ColorUtils.split(white);

    expect(splits).toHaveLength(3);
    expect(splits).toContainEqual({ r: 255, g: 0, b: 0 });
    expect(splits).toContainEqual({ r: 0, g: 255, b: 0 });
    expect(splits).toContainEqual({ r: 0, g: 0, b: 255 });

    const cyan = { r: 0, g: 255, b: 255 };
    const splitsCyan = ColorUtils.split(cyan);
    expect(splitsCyan).toHaveLength(2);
    expect(splitsCyan).toContainEqual({ r: 0, g: 255, b: 0 });
    expect(splitsCyan).toContainEqual({ r: 0, g: 0, b: 255 });
  });
});

describe('OpticsEngine Ray Tracing Simulation', () => {
  it('should trace a single straight ray from emitter into boundary', () => {
    const engine = new OpticsEngine(800, 1200);
    const emitter: GameElement = {
      id: 'emitter_1',
      type: 'emitter',
      x: 100,
      y: 100,
      angle: 0, // Points directly right
      color: { r: 255, g: 255, b: 255 }
    };
    engine.setElement(emitter);

    const trace = engine.traceBeams();
    expect(trace.segments).toHaveLength(1);

    const seg = trace.segments[0];
    expect(seg.startX).toBe(100);
    expect(seg.startY).toBe(100);
    // Should hit the right boundary (X = 800)
    expect(seg.endX).toBe(800);
    expect(seg.endY).toBe(100);
  });

  it('should reflect rays correctly off mirrors', () => {
    const engine = new OpticsEngine(800, 1200);

    const emitter: GameElement = {
      id: 'emitter_1',
      type: 'emitter',
      x: 100,
      y: 100,
      angle: 0, // Points directly right
      color: { r: 255, g: 255, b: 255 }
    };

    // Mirror placed at X=400, angled at 45 degrees
    const mirror: GameElement = {
      id: 'mirror_1',
      type: 'mirror',
      x: 400,
      y: 100,
      angle: 45,
      width: 60
    };

    engine.setElement(emitter);
    engine.setElement(mirror);

    const trace = engine.traceBeams();
    // Emitter to Mirror, and Mirror to bottom screen boundary
    expect(trace.segments).toHaveLength(2);

    const seg1 = trace.segments[0];
    expect(seg1.endX).toBeCloseTo(400, 1);
    expect(seg1.endY).toBeCloseTo(100, 1);
  });
});
