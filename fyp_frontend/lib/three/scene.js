import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { OutlinePass } from 'three/examples/jsm/postprocessing/OutlinePass.js';
import { worldObjects } from "./world.js";
// Alias the import so it's clear what it's doing
import { RGBELoader } from "three/examples/jsm/loaders/RGBELoader.js";

export let scene, camera, renderer, controls, composer, outlinePass, renderPass;
export let heatmapCanvas, heatmapCtx, heatmapTexture, heatmapPlane, heatmapSize, heatmapWidth, heatmapHeight;
export let heatmapLiveCanvas, heatmapLiveCtx, heatmapLiveTexture, heatmapLivePlane, heatmapLiveSize, heatmapLiveWidth, heatmapLiveHeight;
export function initScene(container) {
    // Force a minimum size if container is briefly 0x0 during React hydration
    const w = container.clientWidth || window.innerWidth || 800;
    const h = container.clientHeight || window.innerHeight || 600;

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(w, h);
    renderer.shadowMap.enabled = true;
    
    // PCFShadowMap (Without the 'Soft') is the new standard
    renderer.shadowMap.type = THREE.PCFShadowMap; 
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x131314);

    // Use the RGBELoader normally
    const hdrLoader = new RGBELoader();
    
    // Note: ensure your path starts with / for Next.js public folder
    hdrLoader.load('/models/qwantani_sunset_puresky_4k.hdr', function(texture) {
        texture.mapping = THREE.EquirectangularReflectionMapping;
        scene.environment = texture; 
        scene.background = texture; 
    });

    const fov = 75;
    const aspect = w / h;
    camera = new THREE.PerspectiveCamera(fov, aspect, 0.1, 200);
    camera.position.set(-10, 15, 0);

    // INJECT INTO REACT CONTAINER
    container.appendChild(renderer.domElement);

    const sunLight = new THREE.DirectionalLight(0xffcc33, 3);
    sunLight.position.set(10, 20, 10); 
    sunLight.castShadow = true;

    const d = 20;
    sunLight.shadow.camera.left = -d;
    sunLight.shadow.camera.right = d;
    sunLight.shadow.camera.top = d;
    sunLight.shadow.camera.bottom = -d;
    sunLight.shadow.mapSize.width = 4096; 
    sunLight.shadow.mapSize.height = 4096;
    sunLight.shadow.bias = -0.0001; 
    scene.add(sunLight);

    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.enableRotate = true; 
    controls.screenSpacePanning = false; 
    controls.maxPolarAngle = Math.PI / 2;

    scene.add(camera);

    const renderTarget = new THREE.WebGLRenderTarget(w, h, {
        samples: 4, // 4x MSAA (Hardware Anti-Aliasing)
        format: THREE.RGBAFormat,
    });

    // 1. Initialize the Composer
    composer = new EffectComposer(renderer, renderTarget);
    // Export composer for use in other modules

    // // 2. Add the standard RenderPass (renders your scene normally)
    renderPass = new RenderPass(scene, camera);
    composer.addPass(renderPass);

    // // 3. Add the OutlinePass
    // outlinePass = new OutlinePass(
    //     new THREE.Vector2(window.innerWidth, window.innerHeight),
    //     scene,
    //     camera
    // );

    // // Customize the outline appearance
    // outlinePass.edgeStrength = 0.0; // How thick the outline is
    // outlinePass.edgeGlow = 0.0;     // Set to 0 for a hard, cartoon-like black line
    // outlinePass.edgeThickness = 0.0;
    // outlinePass.pulsePeriod = 0;
    // outlinePass.visibleEdgeColor.set('#ffffff'); // Black outline
    // outlinePass.hiddenEdgeColor.set('#ffffff');  // Outline color when hidden behind other objects

    // composer.addPass(outlinePass);

}

export function setupHeatmap(showHeatmap) {
    // ----------------- Heatmap Setup -----------------
    const floorWidth = 25.25;   // X-axis (-9 to 9)
    const floorDepth = 18; // Z-axis (-8.75 to 8.75)
    const aspectRatio = floorWidth / floorDepth; 
    const heatmapBaseSize = 128;
    heatmapWidth = heatmapBaseSize;
    heatmapHeight = Math.round(heatmapBaseSize / aspectRatio);
    heatmapSize = heatmapBaseSize; 

    // heatmapWidth = 256;
    // heatmapHeight = 256;
    // heatmapSize = 256;
    heatmapCanvas = document.createElement("canvas");
    heatmapCanvas.width = Math.floor(heatmapWidth);
    heatmapCanvas.height = Math.floor(heatmapHeight);
    heatmapWidth = heatmapCanvas.width;
    heatmapHeight = heatmapCanvas.height;
    heatmapCtx = heatmapCanvas.getContext("2d");

    heatmapTexture = new THREE.CanvasTexture(heatmapCanvas);
    heatmapTexture.minFilter = THREE.LinearFilter;
    heatmapTexture.magFilter = THREE.LinearFilter;
    // heatmapTexture.wrapS = THREE.ClampToEdgeWrapping;
    // heatmapTexture.wrapT = THREE.ClampToEdgeWrapping;
    // heatmapTexture.repeat.x = -1;
    // heatmapTexture.offset.x = 1;

    // 1. Draw the exact L-Shape
    // Note: Because we pitch the plane down by 90 degrees later, 
    // the 2D 'Y' coordinates here correspond to the 3D '-Z' coordinates!
    // (e.g. Y = 8.75 maps to the top/back wall at Z = -8.75)
    const floorShape = new THREE.Shape();
    floorShape.moveTo(-8.75, -9);  // Start at mirrored origin
    
    // --- THE CUTOUT (Mirrored X, Reversed Order) ---
    floorShape.lineTo(-2.75, -9);  // Cutout corner going 'right'
    floorShape.lineTo(-2.75, -5);  // Cutout corner going 'up'
    floorShape.lineTo(8.75, -5);   // Bottom inner-corner (X = 8.75)
    floorShape.lineTo(8.75, -9);   
    floorShape.lineTo(12.75, -9);   
    floorShape.lineTo(12.75, -4.75);   
    floorShape.lineTo(16.5, -4.75);   
    floorShape.lineTo(16.5, 9);  
    // --------------------------------------------------------
    
    floorShape.lineTo(-8.75, 9);   // Top-Right (mirrored)
    floorShape.lineTo(-8.75, -9);  // Close shape back to start

    const customGeometry = new THREE.ShapeGeometry(floorShape);

    const posAttribute = customGeometry.attributes.position;
    const uvAttribute = customGeometry.attributes.uv;

    for (let i = 0; i < posAttribute.count; i++) {
        const x = posAttribute.getX(i);
        const y = posAttribute.getY(i);

        const u = (x + 8.75) / 25.25; 
        const v = 1.0 - ((y + 9) / 18); 

        uvAttribute.setXY(i, u, v);
    }

    heatmapPlane = new THREE.Mesh(
        // new THREE.PlaneGeometry(floorWidth, floorDepth, 16, 16),
        customGeometry,
        new THREE.MeshBasicMaterial({
            map: heatmapTexture,
            transparent: true,
            opacity: 0.6,
            depthWrite: false,
        })
    );

    heatmapPlane.material.opacity = showHeatmap ? 1 : 0;
    
    // 2. Lay it flat.
    // REMOVED the rotation.z hack. The shape handles the mapping perfectly.
    heatmapPlane.rotation.x = -Math.PI / 2;
    heatmapPlane.rotation.z = -Math.PI/2;
    // Position is 0,0,0 because the vertices were drawn using exact world coordinates!
    heatmapPlane.position.set(0, 0.1, 0);                  
    
    scene.add(heatmapPlane);
}

export function setupHeatmapLive(showHeatmapLive) {
    // --- HARDCODED LAB DIMENSIONS ---
    const floorWidth = 7.5;
    const floorDepth = 4.25;
    const bounds = { xMin: -4.25/2, xMax: 4.25/2, zMin: 0, zMax: 7.5 };
    const opacity = 0.6;
    const floorVertices = [
        [-4.25/2, 0], [-4.25/2, 7.5], [4.25/2, 7.5], [4.25/2, 0], [-4.25/2, 0]
    ];
    // --------------------------------

    const aspectRatio = floorWidth / floorDepth; 
    const heatmapLiveBaseSize = 128;
    heatmapLiveWidth = heatmapLiveBaseSize;
    heatmapLiveHeight = Math.round(heatmapLiveBaseSize / aspectRatio);
    heatmapLiveSize = heatmapLiveBaseSize; 

    heatmapLiveCanvas = document.createElement("canvas");
    heatmapLiveCanvas.width = Math.floor(heatmapLiveWidth);
    heatmapLiveCanvas.height = Math.floor(heatmapLiveHeight);
    heatmapLiveWidth = heatmapLiveCanvas.width;
    heatmapLiveHeight = heatmapLiveCanvas.height;
    heatmapLiveCtx = heatmapLiveCanvas.getContext("2d");

    heatmapLiveTexture = new THREE.CanvasTexture(heatmapLiveCanvas);
    heatmapLiveTexture.minFilter = THREE.LinearFilter;
    heatmapLiveTexture.magFilter = THREE.LinearFilter;

    const floorShape = new THREE.Shape();
    floorVertices.forEach((vertex, idx) => {
        if (idx === 0) {
            floorShape.moveTo(vertex[0], vertex[1]);
        } else {
            floorShape.lineTo(vertex[0], vertex[1]);
        }
    });

    const customGeometry = new THREE.ShapeGeometry(floorShape);
    const posAttribute = customGeometry.attributes.position;
    const uvAttribute = customGeometry.attributes.uv;

    for (let i = 0; i < posAttribute.count; i++) {
        const x = posAttribute.getX(i);
        const y = posAttribute.getY(i);
        const u = (x - bounds.xMin) / floorWidth; 
        const v = 1.0 - ((y - bounds.zMin) / floorDepth); 
        uvAttribute.setXY(i, u, v);
    }

    heatmapLivePlane = new THREE.Mesh(
        customGeometry,
        new THREE.MeshBasicMaterial({
            map: heatmapLiveTexture,
            transparent: true,
            opacity: opacity,
            depthWrite: false,
        })
    );

    heatmapLivePlane.material.opacity = showHeatmapLive ? 1 : 0;
    heatmapLivePlane.rotation.x = -Math.PI / 2;
    heatmapLivePlane.rotation.z = -Math.PI / 2;
    heatmapLivePlane.position.set(0, 0.1, 0);                  
    
    scene.add(heatmapLivePlane);
}