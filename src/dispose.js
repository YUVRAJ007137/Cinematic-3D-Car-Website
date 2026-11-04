import * as THREE from 'three';

/**
 * Memory Management & Teardown Cleaners
 * Prevents WebGL context leaks, GPU VRAM leaks, and orphaned event listeners.
 */

/**
 * Disposes a Three.js texture safely.
 * @param {THREE.Texture | null} texture
 */
export function disposeTexture(texture) {
  if (!texture) return;
  if (typeof texture.dispose === 'function') {
    texture.dispose();
  }
}

/**
 * Recursively disposes all textures assigned to a material.
 * @param {THREE.Material} material
 */
export function disposeMaterialTextures(material) {
  if (!material) return;

  const textureSlots = [
    'map', 'normalMap', 'roughnessMap', 'metalnessMap',
    'emissiveMap', 'bumpMap', 'alphaMap', 'clearcoatMap',
    'clearcoatRoughnessMap', 'clearcoatNormalMap',
    'sheenColorMap', 'sheenRoughnessMap', 'iridescenceMap',
    'iridescenceThicknessMap', 'transmissionMap', 'thicknessMap',
    'specularMap', 'specularColorMap', 'envMap', 'lightMap', 'aoMap'
  ];

  textureSlots.forEach((slot) => {
    if (material[slot] && material[slot].isTexture) {
      disposeTexture(material[slot]);
      material[slot] = null;
    }
  });

  // Handle uniforms if custom shader
  if (material.userData) {
    Object.values(material.userData).forEach((val) => {
      if (val && val.value && val.value.isTexture) {
        disposeTexture(val.value);
        val.value = null;
      }
    });
  }
}

/**
 * Disposes a material and all its attached textures.
 * @param {THREE.Material | THREE.Material[]} mat
 */
export function disposeMaterial(mat) {
  if (!mat) return;
  if (Array.isArray(mat)) {
    mat.forEach(disposeMaterial);
    return;
  }
  disposeMaterialTextures(mat);
  if (typeof mat.dispose === 'function') {
    mat.dispose();
  }
}

/**
 * Deeply disposes a Three.js Object3D (geometries, materials, textures, children).
 * @param {THREE.Object3D} root
 */
export function disposeHierarchy(root) {
  if (!root) return;

  root.traverse((node) => {
    if (node.isMesh || node.isPoints || node.isLine) {
      if (node.geometry) {
        node.geometry.dispose();
        node.geometry = null;
      }
      if (node.material) {
        disposeMaterial(node.material);
        node.material = null;
      }
    }

    if (node.isLight && node.shadow && node.shadow.map) {
      node.shadow.map.dispose();
      node.shadow.map = null;
    }
  });

  while (root.children && root.children.length > 0) {
    const child = root.children[0];
    root.remove(child);
  }
}

/**
 * Disposes post-processing composer and all its passes.
 * @param {any} composer
 */
export function disposeComposer(composer) {
  if (!composer) return;
  if (Array.isArray(composer.passes)) {
    composer.passes.forEach((pass) => {
      if (typeof pass.dispose === 'function') {
        pass.dispose();
      }
    });
  }
  if (typeof composer.dispose === 'function') {
    composer.dispose();
  }
}

/**
 * Full teardown coordinator for scene and renderer.
 */
export function teardownScene({ scene, renderer, composer, controls, lenis }) {
  if (lenis && typeof lenis.destroy === 'function') {
    lenis.destroy();
  }

  if (controls && typeof controls.dispose === 'function') {
    controls.dispose();
  }

  if (composer) {
    disposeComposer(composer);
  }

  if (scene) {
    disposeHierarchy(scene);
    if (scene.environment) {
      disposeTexture(scene.environment);
      scene.environment = null;
    }
  }

  if (renderer) {
    renderer.dispose();
    if (renderer.forceContextLoss) {
      renderer.forceContextLoss();
    }
    const dom = renderer.domElement;
    if (dom && dom.parentNode) {
      dom.parentNode.removeChild(dom);
    }
  }
}
