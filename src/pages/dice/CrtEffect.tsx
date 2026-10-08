import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { Vector2 } from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";

// A full-screen CRT pass: a soft blur for phosphor fuzz, strong horizontal scanlines, a faint
// RGB aperture mask, a vignette and a faint flicker, over a very dark backdrop. No curvature.
const CRT_SHADER = {
  uniforms: {
    tDiffuse: { value: null },
    time: { value: 0 },
    resolution: { value: new Vector2(1, 1) },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float time;
    uniform vec2 resolution;
    varying vec2 vUv;

    // a small blur with a touch of horizontal chromatic bleed: the phosphor fuzz
    vec3 fuzzy(vec2 uv) {
      vec2 px = 1.0 / resolution;
      vec3 sum = vec3(0.0);
      for (int x = -2; x <= 2; x++) {
        for (int y = -1; y <= 1; y++) {
          vec2 offset = vec2(float(x) * 0.35, float(y) * 0.2) * px;
          sum += texture2D(tDiffuse, uv + offset).rgb;
        }
      }
      vec3 colour = sum / 15.0;
      colour.r = mix(colour.r, texture2D(tDiffuse, uv + vec2(1.5, 0.0) * px).r, 0.5);
      colour.b = mix(colour.b, texture2D(tDiffuse, uv - vec2(1.5, 0.0) * px).b, 0.5);
      return colour;
    }

    void main() {
      vec2 uv = vUv;
      vec3 colour = fuzzy(uv) + 0.022;
      float scanline = 0.55 + 0.45 * pow(0.5 + 0.5 * sin(uv.y * resolution.y * 1.5), 0.6);
      float column = mod(floor(uv.x * resolution.x / 2.0), 3.0);
      vec3 mask = 0.96 + 0.04 * vec3(column == 0.0, column == 1.0, column == 2.0);
      vec2 edge = uv * (1.0 - uv);
      float vignette = pow(edge.x * edge.y * 24.0, 0.25);
      float flicker = 0.98 + 0.02 * sin(time * 25.0);
      gl_FragColor = vec4(colour * scanline * mask * vignette * flicker, 1.0);
    }
  `,
};

const CrtEffect = () => {
  const gl = useThree((state) => state.gl);
  const scene = useThree((state) => state.scene);
  const camera = useThree((state) => state.camera);
  const size = useThree((state) => state.size);
  // the two live uniforms are owned here so frames and resizes can write them freely
  const uniforms = useRef({ time: { value: 0 }, resolution: { value: new Vector2(1, 1) } });
  const composer = useMemo(() => {
    const instance = new EffectComposer(gl);
    const crt = new ShaderPass(CRT_SHADER);
    Object.assign(crt.uniforms, uniforms.current);
    instance.addPass(new RenderPass(scene, camera));
    instance.addPass(crt);
    instance.addPass(new OutputPass());
    return instance;
  }, [gl, scene, camera]);

  useEffect(() => {
    composer.setPixelRatio(gl.getPixelRatio());
    composer.setSize(size.width, size.height);
    uniforms.current.resolution.value.set(size.width, size.height);
  }, [composer, gl, size]);
  useEffect(() => () => composer.dispose(), [composer]);

  // a positive priority takes over rendering from the default loop
  useFrame(({ clock }) => {
    uniforms.current.time.value = clock.elapsedTime;
    composer.render();
  }, 1);

  return null;
};

export default CrtEffect;
