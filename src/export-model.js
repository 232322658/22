import * as THREE from 'three';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';

/** Portable static snapshot: geometry, outlines, signs and embedded textures.
 * Browser-only rain/reflection effects and the presentation background are omitted.
 * Toon materials become standard glTF PBR materials; the web scene is untouched.
 */
export async function exportModel(scene) {
  scene.updateMatrixWorld(true);
  const model = new THREE.Group();
  model.name = 'Komorebi Mart — Rainy Corner';
  model.userData = {
    description: 'Static convenience-store diorama. Original web version has toon lighting, animated rain, sliding doors and real-time reflections.',
    units: 'meters',
  };
  const convertedMaterials = new Map();
  function convert(source) {
    if (convertedMaterials.has(source.uuid)) return convertedMaterials.get(source.uuid);
    let material;
    if (source.isLineBasicMaterial) {
      material = source.clone();
    } else {
      material = new THREE.MeshStandardMaterial({
        name: source.name || 'Diorama material',
        color: source.color?.clone() || new THREE.Color('#263644'),
        map: source.map || null,
        emissive: source.emissive?.clone() || new THREE.Color(0),
        emissiveMap: source.emissiveMap || null,
        emissiveIntensity: source.emissiveIntensity ?? 0,
        roughness: source.roughness ?? 0.8,
        metalness: source.metalness ?? 0,
        opacity: source.opacity,
        transparent: source.transparent,
        side: source.side,
        depthWrite: source.depthWrite,
      });
      if (source.isShaderMaterial) {
        material.color.set('#263644');
        material.emissive.set(0);
        material.metalness = 0.15;
        material.roughness = 0.24;
      }
    }
    convertedMaterials.set(source.uuid, material);
    return material;
  }
  scene.traverse(object => {
    if (!object.isMesh && !object.isLineSegments) return;
    let ancestor = object;
    while (ancestor) {
      if (ancestor.userData.excludeFromExport || !ancestor.visible) return;
      ancestor = ancestor.parent;
    }
    const materials = Array.isArray(object.material) ? object.material.map(convert) : convert(object.material);
    const copy = object.isMesh
      ? new THREE.Mesh(object.geometry, materials)
      : new THREE.LineSegments(object.geometry, materials);
    copy.name = object.name || (object.isMesh ? 'Model geometry' : 'Contour lines');
    object.matrixWorld.decompose(copy.position, copy.quaternion, copy.scale);
    model.add(copy);
  });
  try {
    return await new GLTFExporter().parseAsync(model, {
      binary: true, onlyVisible: true, maxTextureSize: 2048,
    });
  } finally {
    convertedMaterials.forEach(material => material.dispose());
  }
}
