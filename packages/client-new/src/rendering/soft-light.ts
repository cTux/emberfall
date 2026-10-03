import { BlendModeFilter, extensions, ExtensionType } from "pixi.js";

/** Canvas-compatible soft light. Pixi textures contain premultiplied colors;
 * the blend equation must use straight colors before compositing their alpha.
 */
class SoftLight extends BlendModeFilter {
  static extension = { name: "soft-light", type: ExtensionType.BlendMode };
  constructor() {
    super({
      gl: {
        functions: `
          float softLight(float b, float s) {
            float d = b <= 0.25 ? ((16.0 * b - 12.0) * b + 4.0) * b : sqrt(b);
            return s <= 0.5 ? b - (1.0 - 2.0 * s) * b * (1.0 - b)
                            : b + (2.0 * s - 1.0) * (d - b);
          }
        `,
        main: `
          vec3 b = back.rgb / max(back.a, 0.00001);
          vec3 s = front.rgb / max(front.a, 0.00001);
          vec3 blended = vec3(softLight(b.r, s.r), softLight(b.g, s.g), softLight(b.b, s.b));
          vec3 rgb = front.rgb * (1.0 - back.a) + back.rgb * (1.0 - front.a)
                   + blended * front.a * back.a;
          finalColor = vec4(rgb, blendedAlpha) * uBlend;
        `,
      },
      gpu: {
        functions: `
          fn softLight(b: f32, s: f32) -> f32 {
            var d = sqrt(b);
            if (b <= 0.25) { d = ((16.0 * b - 12.0) * b + 4.0) * b; }
            if (s <= 0.5) { return b - (1.0 - 2.0 * s) * b * (1.0 - b); }
            return b + (2.0 * s - 1.0) * (d - b);
          }
        `,
        main: `
          let b = back.rgb / max(back.a, 0.00001);
          let s = front.rgb / max(front.a, 0.00001);
          let blended = vec3<f32>(softLight(b.r, s.r), softLight(b.g, s.g), softLight(b.b, s.b));
          let rgb = front.rgb * (1.0 - back.a) + back.rgb * (1.0 - front.a)
                  + blended * front.a * back.a;
          out = vec4<f32>(rgb, blendedAlpha) * blendUniforms.uBlend;
        `,
      },
    });
  }
}

extensions.add(SoftLight);
