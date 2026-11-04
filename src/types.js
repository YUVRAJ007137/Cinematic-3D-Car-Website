/**
 * @file JSDoc Type Definitions for Cinematic 3D Car Website
 * Provides rich autocomplete and schema validation in modern IDEs.
 */

/**
 * @typedef {Object} ExplodeSubsystemConfig
 * @property {[number, number, number]} direction Unit direction vector [x, y, z]
 * @property {number} distance Travel distance in world units
 * @property {number} start Normalized start progress within explode chapter [0, 1]
 * @property {number} end Normalized end progress within explode chapter [0, 1]
 * @property {string} [ease] GSAP easing curve string
 * @property {Object} [camera] Subsystem focus camera angles
 * @property {[number, number, number]} [camera.position]
 * @property {[number, number, number]} [camera.target]
 * @property {number} [camera.fov]
 */

/**
 * @typedef {Record<string, ExplodeSubsystemConfig>} ExplodeConfigManifest
 */

/**
 * @typedef {'body_panels' | 'glass_and_lights' | 'interior' | 'mechanical' | 'brakes' | 'wheels' | 'misc'} SubsystemGroup
 */

/**
 * @typedef {'high' | 'medium' | 'low'} ClassificationConfidence
 */

/**
 * @typedef {Object} MeshClassification
 * @property {SubsystemGroup} group Functional vehicle subsystem
 * @property {ClassificationConfidence} [confidence] Heuristic classification confidence
 * @property {string} [reason] Human or geometric classification explanation
 */

/**
 * @typedef {Record<string, MeshClassification>} GroupsManifest
 */

/**
 * @typedef {Object} PartMetadata
 * @property {string} name Mesh node name
 * @property {number} triangles Triangle / polygon count
 * @property {[number, number, number]} size Bounding box dimensions [x, y, z]
 * @property {[number, number, number]} center Bounding box center coordinates [x, y, z]
 * @property {string[]} materials Array of assigned original material names
 */

/**
 * @typedef {Object} PaintPreset
 * @property {string} name Human-readable color name
 * @property {string} hex Primary basecoat hex color
 * @property {number} metalness PBR metalness [0, 1]
 * @property {number} roughness PBR roughness [0, 1]
 * @property {number} [clearcoat] Clearcoat intensity [0, 1]
 * @property {number} [clearcoatRoughness] Clearcoat roughness [0, 1]
 * @property {string} [accentHex] Grazing angle Fresnel shift color
 * @property {boolean} [pearlescent] Whether to enable multi-angle iridescence
 */

/**
 * @typedef {Object} WheelPreset
 * @property {string} name Finish title
 * @property {string} hex Metallic base hex
 * @property {number} metalness PBR metalness
 * @property {number} roughness PBR surface roughness
 */

/**
 * @typedef {Object} CaliperPreset
 * @property {string} name Caliper color title
 * @property {string} hex PBR diffuse hex
 * @property {number} metalness PBR metalness
 * @property {number} roughness PBR roughness
 */

/**
 * @typedef {Object} InteriorPreset
 * @property {string} name Upholstery material title
 * @property {string} hex Base color hex
 * @property {number} roughness High roughness for Alcantara / leather
 * @property {number} metalness
 */

/**
 * @typedef {Object} HotspotDefinition
 * @property {string} id Unique hotspot key
 * @property {string[]} targetMeshNames Substring matches for raycast hits
 * @property {[number, number, number]} anchor 3D world anchor coordinates
 * @property {string} tag Subsystem category label
 * @property {string} title High-impact feature title
 * @property {string} stat Primary engineering figure
 * @property {string} statLabel Metric subtitle
 * @property {string} desc Technical specification description
 */

/**
 * @typedef {Object} CustomizerState
 * @property {string} paint Selected paint preset key
 * @property {string} finish Selected surface finish (gloss, satin, matte)
 * @property {string} wheels Selected wheel finish key
 * @property {string} calipers Selected caliper color key
 * @property {string} interior Selected interior upholstery key
 */

export {};
