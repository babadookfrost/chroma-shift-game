import Phaser from 'phaser';

/**
 * Custom Post-Processing shader pipeline for Chroma Shift.
 * Implements high-end cinematic Chromatic Aberration, Vignette shadow vignette,
 * and cinematic color grading (rich neon contrast).
 */
export class ChromaPipeline extends Phaser.Renderer.WebGL.Pipelines.PostFXPipeline {
  static KEY = 'ChromaPostFX';

  constructor(game: Phaser.Game) {
    super({
      game: game,
      name: ChromaPipeline.KEY,
      fragShader: `
        #ifdef GL_FRAGMENT_PRECISION_HIGH
        precision highp float;
        #else
        precision mediump float;
        #endif

        uniform sampler2D uMainSampler;
        varying vec2 outTexCoord;

        // Custom parameters
        uniform float uChromAb; // Aberration intensity (e.g. 0.005)
        uniform float uVignette; // Vignette strength (e.g. 1.2)
        uniform float uTime;

        void main() {
          vec2 uv = outTexCoord;

          // 1. Chromatic Aberration (RGB shift radiating outwards)
          vec2 dist = uv - 0.5;
          vec2 shift = dist * uChromAb * (1.0 + sin(uTime * 2.0) * 0.1);

          float r = texture2D(uMainSampler, uv - shift).r;
          float g = texture2D(uMainSampler, uv).g;
          float b = texture2D(uMainSampler, uv + shift).b;
          float a = texture2D(uMainSampler, uv).a;

          vec3 color = vec3(r, g, b);

          // 2. AAA Color Grading (Slight contrast lift and saturation boost)
          color = mix(color, color * color * (3.0 - 2.0 * color), 0.2); // S-curve contrast
          color.r *= 1.05; // Cinematic warm highlights
          color.b *= 1.10; // Cyberpunk blue shadows

          // 3. Vignette Effect
          float d = length(uv - 0.5);
          float vignette = smoothstep(0.8, 0.4, d * uVignette);
          color *= mix(0.3, 1.0, vignette);

          gl_FragColor = vec4(color, a);
        }
      `
    });
  }

  /**
   * Called automatically by Phaser to set uniforms every frame.
   */
  onPreRender(): void {
    this.set1f('uChromAb', 0.006);
    this.set1f('uVignette', 1.15);
    this.set1f('uTime', this.game.loop.time / 1000);
  }
}
