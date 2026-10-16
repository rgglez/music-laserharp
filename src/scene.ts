import * as THREE from "three";
import { beamX } from "./notes.js";
import { LASER_COLORS, type Beam } from "./presets.js";

/** Draw a colored fan without a continuous animation loop or postprocessing. */
export function createHarpScene(
  canvas: HTMLCanvasElement,
  initialBeams: readonly Beam[]
) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: true,
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  const scene = new THREE.Scene();
  // The orthographic camera makes drawing and pointer hit-testing use the same
  // normalized coordinate system, regardless of the container's aspect ratio.
  const camera = new THREE.OrthographicCamera(0, 1, 1, 0, 0.1, 10);
  camera.position.z = 2;
  const plane = new THREE.PlaneGeometry(1, 1);
  const circle = new THREE.CircleGeometry(1, 24);
  let materials: THREE.Material[] = [];
  let activeBeams = new Map<number, number>();
  let frame = 0;

  function createBeams(assignments: readonly Beam[]) {
    return assignments.map((assignment, index) => {
      const color = new THREE.Color(
        LASER_COLORS[assignment.color ?? "green"].hex
      );
      // Gaussian falloffs create a sharp core, a soft halo, and faint scattered
      // light. The static haze varies along the beam like light in dry smoke.
      // Keeping blur inside the shader preserves the crisp interaction area.
      const material = new THREE.ShaderMaterial({
        uniforms: { laserColor: { value: color } },
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        vertexShader: `
          varying vec2 beamUv;
          void main() {
            beamUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          uniform vec3 laserColor;
          varying vec2 beamUv;
          void main() {
            float x = beamUv.x - 0.5;
            float core = exp(-pow(x * 80.0, 2.0));
            float halo = exp(-pow(x * 15.0, 2.0));
            float haze = exp(-pow(x * 4.5, 2.0));
            float smoke = 0.8 + 0.2 * sin(beamUv.y * 31.0 + x * 12.0);
            float endFade = smoothstep(0.0, 0.035, beamUv.y)
              * smoothstep(0.0, 0.035, 1.0 - beamUv.y);
            float opacity = (core * 0.95 + halo * 0.25 + haze * smoke * 0.12) * endFade;
            gl_FragColor = vec4(mix(laserColor, vec3(1.0), core * 0.28), opacity);
          }
        `,
      });
      const ray = new THREE.Mesh(plane, material);
      // Contact flares and emitter dots share their material, but each preset
      // owns its materials so switching cannot leak GPU resources.
      const dotMaterial = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.9,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      materials.push(material, dotMaterial);
      const flare = new THREE.Mesh(circle, dotMaterial);
      flare.visible = false;
      const emitter = new THREE.Mesh(circle, dotMaterial);
      emitter.position.set(beamX(index, 0.94, assignments.length), 0.06, 0);
      emitter.scale.set(0.006, 0.004, 1);
      scene.add(ray, flare, emitter);
      return { ray, flare };
    });
  }
  let beams = createBeams(initialBeams);

  function render() {
    frame = 0;
    const { width, height } = canvas.getBoundingClientRect();
    if (!width || !height) return;
    beams.forEach(({ ray, flare }, index) => {
      // A held beam stops at the nearest contact to the emitter. The visible
      // beam and flare therefore follow the user's finger during a drag.
      const y = activeBeams.get(index) ?? 0.025;
      const start = new THREE.Vector2(beamX(index, 0.94, beams.length), 0.06);
      const end = new THREE.Vector2(beamX(index, y, beams.length), 1 - y);
      const delta = end.clone().sub(start);
      ray.position.set((start.x + end.x) / 2, (start.y + end.y) / 2, 0);
      ray.rotation.z = -Math.atan2(delta.x, delta.y);
      ray.scale.set(72 / width, delta.length(), 1);
      flare.visible = activeBeams.has(index);
      flare.position.set(end.x, end.y, 0.01);
      flare.scale.set(7 / width, 7 / height, 1);
    });
    renderer.render(scene, camera);
  }
  // Coalesce rapid pointer events into one draw per frame. There is no GPU
  // animation work when the harp is idle, even with the wider smoke halos.
  function requestRender() {
    if (!frame) frame = requestAnimationFrame(render);
  }
  const observer = new ResizeObserver(() => {
    const { width, height } = canvas.getBoundingClientRect();
    renderer.setSize(width, height, false);
    requestRender();
  });
  observer.observe(canvas);
  return {
    setBeams(assignments: readonly Beam[]) {
      scene.clear();
      materials.forEach(material => material.dispose());
      materials = [];
      activeBeams.clear();
      beams = createBeams(assignments);
      requestRender();
    },
    update(contacts: Map<number, number>) {
      activeBeams = contacts;
      requestRender();
    },
    dispose() {
      observer.disconnect();
      cancelAnimationFrame(frame);
      plane.dispose();
      circle.dispose();
      materials.forEach(material => material.dispose());
      scene.clear();
      renderer.dispose();
      renderer.forceContextLoss();
    },
  };
}
