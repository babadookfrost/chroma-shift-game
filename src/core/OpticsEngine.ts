/**
 * Represents a 2D coordinate point.
 */
export interface Point {
  x: number;
  y: number;
}

/**
 * Represents an RGB color vector where channels range from 0 to 255.
 */
export interface RGBColor {
  r: number;
  g: number;
  b: number;
}

/**
 * Types of interactive or static elements on the playing board.
 */
export type ElementType = 'emitter' | 'mirror' | 'prism' | 'target';

/**
 * Base properties of any element in the Optics Engine.
 */
export interface GameElement {
  id: string;
  type: ElementType;
  x: number;
  y: number;
  angle: number; // in degrees, 0 is pointing right (along +X axis)
  color?: RGBColor; // Used by emitters (for output) and targets (for required input)
  width?: number; // active width for collision detection
  height?: number;
  active?: boolean; // dynamic state (e.g., target activated)
}

/**
 * Represents a single straight segment of a traced light beam.
 */
export interface BeamSegment {
  id: string;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  color: RGBColor;
  sourceId: string;
}

/**
 * Result of tracing all beams in the current board layout.
 */
export interface TraceResult {
  segments: BeamSegment[];
  activatedTargets: Set<string>;
}

/**
 * Helpers for RGB color operations (such as additive blending and splitting).
 */
export class ColorUtils {
  /**
   * Performs additive blending of two colors.
   */
  static blend(c1: RGBColor, c2: RGBColor): RGBColor {
    return {
      r: Math.min(255, c1.r + c2.r),
      g: Math.min(255, c1.g + c2.g),
      b: Math.min(255, c1.b + c2.b)
    };
  }

  /**
   * Checks if two colors match within a reasonable threshold.
   */
  static isMatch(c1: RGBColor, c2: RGBColor, threshold: number = 20): boolean {
    return (
      Math.abs(c1.r - c2.r) <= threshold &&
      Math.abs(c1.g - c2.g) <= threshold &&
      Math.abs(c1.b - c2.b) <= threshold
    );
  }

  /**
   * Splits a color into its constituent primary components if it's a mixed color.
   * If it's already a pure primary, returns just that.
   * White (255,255,255) splits into Red, Green, Blue.
   * Cyan (0,255,255) splits into Green, Blue.
   * Yellow (255,255,0) splits into Red, Green.
   * Magenta (255,0,255) splits into Red, Blue.
   */
  static split(color: RGBColor): RGBColor[] {
    const components: RGBColor[] = [];
    if (color.r > 0) components.push({ r: color.r, g: 0, b: 0 });
    if (color.g > 0) components.push({ r: 0, g: color.g, b: 0 });
    if (color.b > 0) components.push({ r: 0, g: 0, b: color.b });
    return components.length > 0 ? components : [color];
  }

  /**
   * Returns whether a color is close to black/inactive.
   */
  static isZero(color: RGBColor): boolean {
    return color.r === 0 && color.g === 0 && color.b === 0;
  }
}

/**
 * OpticsEngine manages the mathematical tracing of light beams inside the game board,
 * handling reflections off mirrors, chromatic splits off prisms, and target checks.
 */
export class OpticsEngine {
  private elements: Map<string, GameElement> = new Map();
  private maxTraceDepth = 15;
  private width = 800;
  private height = 1200;

  /**
   * Initializes the engine with board dimensions.
   */
  constructor(width: number = 800, height: number = 1200) {
    this.width = width;
    this.height = height;
  }

  /**
   * Adds or updates an element on the board.
   */
  setElement(element: GameElement): void {
    this.elements.set(element.id, { ...element });
  }

  /**
   * Removes an element from the board.
   */
  removeElement(id: string): void {
    this.elements.delete(id);
  }

  /**
   * Clears all elements from the board.
   */
  clear(): void {
    this.elements.clear();
  }

  /**
   * Retrieves an element by its ID.
   */
  getElement(id: string): GameElement | undefined {
    return this.elements.get(id);
  }

  /**
   * Returns all active elements on the board.
   */
  getAllElements(): GameElement[] {
    return Array.from(this.elements.values());
  }

  /**
   * Traces all light beams on the board starting from emitters.
   * Returns all generated beam segments and a set of activated target IDs.
   */
  traceBeams(): TraceResult {
    const segments: BeamSegment[] = [];
    const activatedTargets = new Set<string>();

    const emitters = this.getAllElements().filter(e => e.type === 'emitter');

    for (const emitter of emitters) {
      if (!emitter.color || ColorUtils.isZero(emitter.color)) continue;

      const angleRad = (emitter.angle * Math.PI) / 180;
      const startX = emitter.x;
      const startY = emitter.y;
      const dirX = Math.cos(angleRad);
      const dirY = Math.sin(angleRad);

      this.traceSingleBeam(
        startX,
        startY,
        dirX,
        dirY,
        emitter.color,
        emitter.id,
        0,
        segments,
        activatedTargets
      );
    }

    return { segments, activatedTargets };
  }

  /**
   * Recursively traces a single light beam segment.
   */
  private traceSingleBeam(
    x: number,
    y: number,
    dx: number,
    dy: number,
    color: RGBColor,
    sourceId: string,
    depth: number,
    outSegments: BeamSegment[],
    outActivatedTargets: Set<string>
  ): void {
    if (depth >= this.maxTraceDepth || ColorUtils.isZero(color)) return;

    // Standard ray casting: find closest intersection with any board element
    let closestDist = Infinity;
    let closestPt: Point | null = null;
    let hitElement: GameElement | null = null;

    for (const elem of this.getAllElements()) {
      if (elem.id === sourceId) continue; // Don't collide with the direct source immediately

      const size = elem.width || 40;
      const halfSize = size / 2;

      // Handle mirrors & prisms as rotatable line segments or boxes
      if (elem.type === 'mirror' || elem.type === 'prism') {
        const rad = (elem.angle * Math.PI) / 180;

        // Define a line segment for the mirror/prism
        const p1x = elem.x - Math.cos(rad) * halfSize;
        const p1y = elem.y - Math.sin(rad) * halfSize;
        const p2x = elem.x + Math.cos(rad) * halfSize;
        const p2y = elem.y + Math.sin(rad) * halfSize;

        const inter = this.lineIntersection(x, y, x + dx * 10000, y + dy * 10000, p1x, p1y, p2x, p2y);
        if (inter) {
          const dist = this.distance(x, y, inter.x, inter.y);
          if (dist > 1 && dist < closestDist) {
            closestDist = dist;
            closestPt = inter;
            hitElement = elem;
          }
        }
      } else if (elem.type === 'target') {
        // Treat target crystals as circular triggers for smoother gameplay
        const distToCenter = this.projectPointToRay(elem.x, elem.y, x, y, dx, dy);
        if (distToCenter !== null && distToCenter.distToRay < 30 && distToCenter.t > 0.01) {
          const dist = distToCenter.t;
          if (dist < closestDist) {
            closestDist = dist;
            closestPt = { x: x + dx * dist, y: y + dy * dist };
            hitElement = elem;
          }
        }
      }
    }

    // Hit the boundary of the screen
    if (!closestPt) {
      const boundaryPt = this.findBoundaryCollision(x, y, dx, dy);
      outSegments.push({
        id: `${sourceId}_seg_${depth}`,
        startX: x,
        startY: y,
        endX: boundaryPt.x,
        endY: boundaryPt.y,
        color,
        sourceId
      });
      return;
    }

    // Add segment from start to collision point
    outSegments.push({
      id: `${sourceId}_seg_${depth}`,
      startX: x,
      startY: y,
      endX: closestPt.x,
      endY: closestPt.y,
      color,
      sourceId
    });

    // Handle interactions based on element type
    if (hitElement) {
      if (hitElement.type === 'mirror') {
        // Reflect the beam: V_new = V - 2 * (V . N) * N
        const rad = (hitElement.angle * Math.PI) / 180;
        // Surface normal (orthogonal to mirror orientation)
        let nx = -Math.sin(rad);
        let ny = Math.cos(rad);

        // Ensure normal points back against incoming direction for standard reflection
        const dot = dx * nx + dy * ny;
        if (dot > 0) {
          nx = -nx;
          ny = -ny;
        }

        const dotProd = dx * nx + dy * ny;
        const rx = dx - 2 * dotProd * nx;
        const ry = dy - 2 * dotProd * ny;

        // Propagate reflected beam
        this.traceSingleBeam(
          closestPt.x + rx * 2,
          closestPt.y + ry * 2,
          rx,
          ry,
          color,
          hitElement.id,
          depth + 1,
          outSegments,
          outActivatedTargets
        );
      } else if (hitElement.type === 'prism') {
        // Split the beam based on incoming color constituents
        const constituents = ColorUtils.split(color);
        const rad = (hitElement.angle * Math.PI) / 180;

        // Compute refractive bending
        // A prism splits beams. A white beam splits into Red, Green, and Blue.
        const baseAngle = rad; // alignment direction of the prism

        constituents.forEach((splitColor, idx) => {
          // Introduce subtle dispersion angle (e.g. -15 deg for Red, 0 for Green, +15 deg for Blue)
          const dispersion = ((idx - (constituents.length - 1) / 2) * 15 * Math.PI) / 180;
          const outAngle = baseAngle + dispersion;

          const rx = Math.cos(outAngle);
          const ry = Math.sin(outAngle);

          this.traceSingleBeam(
            closestPt!.x + rx * 5,
            closestPt!.y + ry * 5,
            rx,
            ry,
            splitColor,
            hitElement!.id,
            depth + 1,
            outSegments,
            outActivatedTargets
          );
        });
      } else if (hitElement.type === 'target') {
        // Activate target if incoming color matches the requirement
        if (hitElement.color && ColorUtils.isMatch(color, hitElement.color)) {
          outActivatedTargets.add(hitElement.id);
        }
      }
    }
  }

  /**
   * Intersection of two lines: (x1, y1) -> (x2, y2) and (x3, y3) -> (x4, y4).
   */
  private lineIntersection(
    x1: number, y1: number,
    x2: number, y2: number,
    x3: number, y3: number,
    x4: number, y4: number
  ): Point | null {
    const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
    if (Math.abs(denom) < 0.0001) return null; // Parallel

    const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;
    const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denom;

    if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
      return {
        x: x1 + t * (x2 - x1),
        y: y1 + t * (y2 - y1)
      };
    }
    return null;
  }

  /**
   * Projects a point onto an infinite ray, returning distance and parameter t.
   */
  private projectPointToRay(
    px: number, py: number,
    rx: number, ry: number,
    rdx: number, rdy: number
  ): { distToRay: number; t: number } | null {
    const vx = px - rx;
    const vy = py - ry;

    const t = vx * rdx + vy * rdy;
    if (t < 0) return null;

    const cpx = rx + rdx * t;
    const cpy = ry + rdy * t;

    const distToRay = this.distance(px, py, cpx, cpy);
    return { distToRay, t };
  }

  /**
   * Returns distance between two points.
   */
  private distance(x1: number, y1: number, x2: number, y2: number): number {
    return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
  }

  /**
   * Helper to find where a ray hits the board boundaries.
   */
  private findBoundaryCollision(x: number, y: number, dx: number, dy: number): Point {
    let tMin = Infinity;
    let hitPt: Point = { x: x + dx * 1000, y: y + dy * 1000 };

    if (dx > 0) {
      const t = (this.width - x) / dx;
      if (t < tMin) { tMin = t; hitPt = { x: this.width, y: y + dy * t }; }
    } else if (dx < 0) {
      const t = -x / dx;
      if (t < tMin) { tMin = t; hitPt = { x: 0, y: y + dy * t }; }
    }

    if (dy > 0) {
      const t = (this.height - y) / dy;
      if (t < tMin) { tMin = t; hitPt = { x: x + dx * t, y: this.height }; }
    } else if (dy < 0) {
      const t = -y / dy;
      if (t < tMin) { tMin = t; hitPt = { x: x + dx * t, y: 0 }; }
    }

    return hitPt;
  }
}
