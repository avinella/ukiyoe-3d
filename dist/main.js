import * as THREE from 'three';

import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { NoiseShader } from './noise.js';

let camera, renderer, composer, clock, orbitControls;

let mesh;
let time, lastAni;
let fireflies, directions;
let screenshot;

init();
animate();

function init() {

    const container = document.getElementById( 'container' );

    camera = new THREE.PerspectiveCamera( 35, window.innerWidth / window.innerHeight, 1, 3000 );
    camera.position.z = 10;
    screenshot = false;
    

    const scene = new THREE.Scene();
    scene.background = new THREE.Color( 0xf0f0f0);
    const topLight = new THREE.DirectionalLight( 0xffffff, 1 );
    const ambientLight = new THREE.AmbientLight( 0xffffff, 0.25 );
    topLight.position.set( 0, 2, 1 );
    scene.add( topLight );
    scene.add(ambientLight);

    clock = new THREE.Clock();
    time = 1.0;
    lastAni = time;

    const textureLoader = new THREE.TextureLoader();

    // Rendering
    renderer = new THREE.WebGLRenderer( { antialias: true, preserveDrawingBuffer: true } );
    renderer.setPixelRatio( window.devicePixelRatio );
    container.appendChild( renderer.domElement );
    renderer.autoClear = false;

    // Camera controls
    const vertRotateBound = (Math.PI / 2) * 0.99 ;
    const horizRotateBound = 0;

    orbitControls = new OrbitControls( camera, renderer.domElement );
    orbitControls.maxPolarAngle = vertRotateBound;
    orbitControls.minPolarAngle = vertRotateBound;
    orbitControls.maxAzimuthAngle = horizRotateBound;
    orbitControls.minAzimuthAngle = 2 * Math.PI - horizRotateBound;
    orbitControls.enableZoom = false;
    orbitControls.update();

    // Model Loading
    const loader = new GLTFLoader();
    const figureBaseMap = textureLoader.load('figure_baseColor.png');
    figureBaseMap.flipY = false;
    figureBaseMap.colorSpace = THREE.LinearSRGBColorSpace;

    loader.load( 'https://media.githubusercontent.com/media/avinella/ukiyoe-3d/main/dist/figure_highpoly_frontal_gl_v2.gltf?raw=true', function ( gltf ) {

        mesh = gltf.scene.children[ 0 ];
        mesh.material = new THREE.MeshDepthMaterial();
        scene.add( mesh );
        mesh.scale.set( 0.45, 0.45, 0.45 );
        mesh.position.set(0, 0.6, 2);
        scene.background = new THREE.Color( 0x000000);
        let depthMap = generateMap(scene);
        scene.remove(mesh);

        let fov_y = camera.position.z * camera.getFilmHeight() / camera.getFocalLength();
        console.log(fov_y * camera.aspect, fov_y);

        mesh.material = new THREE.MeshNormalMaterial();
        scene.add( mesh );
        let normalMapBaked = generateMap(scene);
        scene.remove(mesh);

        // const depthMesh = new THREE.Mesh(
        //     new THREE.PlaneGeometry(fov_y * camera.aspect, fov_y),
        //     new THREE.MeshBasicMaterial({ map: depthMap })
        // );
        // depthMesh.position.set(1.5, 1, 5);
        // scene.add(depthMesh);

        const figureShader = loadShader('figureShader');
        var customMat = new THREE.MeshStandardMaterial( {
            map: figureBaseMap,
            roughness: 0.5
        } );
        mesh.onBeforeRender = function () {
            customMat.userData.depthBaked = {value: depthMap};
            customMat.userData.normalBaked = {value: normalMapBaked};
            customMat.userData.windowDims = {value: new THREE.Vector2(fov_y * camera.aspect, fov_y)};
            customMat.onBeforeCompile = shader => {
                shader.uniforms.depthBaked = customMat.userData.depthBaked;
                shader.uniforms.normalBaked = customMat.userData.normalBaked;
                shader.uniforms.windowDims = customMat.userData.windowDims;
                shader.fragmentShader = 'uniform sampler2D depthBaked;\nuniform sampler2D normalBaked;\nuniform vec2 windowDims;\n' + shader.fragmentShader;
                shader.fragmentShader = shader.fragmentShader.replace('#include <output_fragment>', figureShader);
            }
        };
        mesh.material = customMat;

        const bg = textureLoader.load('sides.png');
        bg.colorSpace = THREE.LinearSRGBColorSpace;
        bg.offset.set(0.001, 0.001);
        scene.background = bg;

        scene.add( mesh );

        screenshot = true;
    }, undefined, function ( error ) {

        console.error( error );

    } );

    const ghostBaseMap = textureLoader.load('ghost_baseColor.png');
    ghostBaseMap.flipY = false;
    ghostBaseMap.colorSpace = THREE.LinearSRGBColorSpace;

    loader.load( 'https://media.githubusercontent.com/media/avinella/ukiyoe-3d/main/dist/ghost_highpoly_frontal_gl.gltf?raw=true', function ( gltf ) {

        mesh = gltf.scene.children[ 0 ];
        mesh.material = new THREE.MeshDepthMaterial();
        scene.add( mesh );
        mesh.scale.set( 0.45, 0.5, 0.5 );
        mesh.position.set(-0.5, 1.0, -1);
        scene.background = new THREE.Color( 0x000000);
        let depthMap = generateMap(scene);
        scene.remove(mesh);

        let fov_y = camera.position.z * camera.getFilmHeight() / camera.getFocalLength();
        console.log(fov_y * camera.aspect, fov_y);

        mesh.material = new THREE.MeshNormalMaterial();
        scene.add( mesh );
        let normalMapBaked = generateMap(scene);
        scene.remove(mesh);

        // const depthMesh = new THREE.Mesh(
        //     new THREE.PlaneGeometry(fov_y * camera.aspect, fov_y),
        //     new THREE.MeshBasicMaterial({ map: depthMap })
        // );
        // depthMesh.position.set(1.5, 1, 5);
        // scene.add(depthMesh);

        const ghostShader = loadShader('ghostShader');
        var customMat = new THREE.MeshStandardMaterial( {
            map: ghostBaseMap,
            roughness: 0.4,
            transparent: true,
            emissive: 0xd1e9f0,
            emissiveIntensity: 0.1,
            forceSinglePass: true
        } );
        mesh.onBeforeRender = function () {
            customMat.userData.time = {value: time};
            customMat.userData.depthBaked = {value: depthMap};
            customMat.userData.normalBaked = {value: normalMapBaked};
            customMat.userData.windowDims = {value: new THREE.Vector2(fov_y * camera.aspect, fov_y)};
            customMat.onBeforeCompile = shader => {
                shader.uniforms.time = customMat.userData.time;
                shader.uniforms.depthBaked = customMat.userData.depthBaked;
                shader.uniforms.normalBaked = customMat.userData.normalBaked;
                shader.uniforms.windowDims = customMat.userData.windowDims;
                shader.fragmentShader = 'uniform sampler2D depthBaked;\nuniform sampler2D normalBaked;\nuniform vec2 windowDims;\nuniform float time;\n' + shader.fragmentShader;
                shader.fragmentShader = shader.fragmentShader.replace('#include <output_fragment>', ghostShader);
            }
        };
        mesh.receiveShadow = true;
        mesh.material = customMat;

        scene.add( mesh );
        const bg = textureLoader.load('sides.png');
        bg.colorSpace = THREE.LinearSRGBColorSpace;
        bg.offset.set(0.001, 0.001);
        scene.background = bg;
    }, undefined, function ( error ) {

        console.error( error );

    } );

    fireflies = [new THREE.Group(), new THREE.Group(), new THREE.Group()];
    directions = [new THREE.Vector3(Math.random() * 2 - 1, Math.random() * 2 - 1, 0).normalize(), 
            new THREE.Vector3(Math.random() * 2 - 1, Math.random() * 2 - 1, 0).normalize(), 
            new THREE.Vector3(Math.random() * 2 - 1, Math.random() * 2 - 1, 0).normalize()];

    loader.load( 'https://media.githubusercontent.com/media/avinella/ukiyoe-3d/main/dist/firefly.gltf?raw=true', function ( gltf ) {

        mesh = gltf.scene.children[ 0 ];
        mesh.material = new THREE.MeshStandardMaterial( {
            color: 0x5e5b53
        });
        mesh.scale.set( 0.5, 0.5, 0.5 );
        mesh.rotation.x += 0.9;
        mesh.rotation.y += 0.4;
        mesh.position.set(-1.83, 1.1, -1);

        const light = new THREE.Mesh(
            new THREE.SphereGeometry(0.15),
            new THREE.MeshStandardMaterial( {
                color: 0xf7f2e4,
                emissive: 0xf7f2e4,
                emissiveIntensity: 0.8
            })
        );
        light.position.set(-2.00, 1.1, -0.7);

        fireflies[0].add(mesh);
        fireflies[0].add(light);
        fireflies[0].scale.set(0.7, 0.7, 0.7);
        fireflies[1] = fireflies[0].clone();
        fireflies[2] = fireflies[0].clone();

        fireflies[0].position.set(0.5, 2.3, -0.7);
        fireflies[1].rotation.set(0.0, 0.0, -1.2);
        fireflies[1].position.set(-2.5, 0.9, -0.7);
        fireflies[2].rotation.set(0.0, 0.0, 1.7);
        fireflies[2].position.set(1.1, 4.2, -0.7);

        for (let i = 0; i < 3; i++) {
            scene.add(fireflies[i]);
        }

    }, undefined, function ( error ) {

        console.error( error );

    } );

    const renderModel = new RenderPass( scene, camera );
    const effectNoise = new ShaderPass(NoiseShader);

    composer = new EffectComposer( renderer );

    composer.addPass( renderModel );
    composer.addPass( effectNoise);

    onWindowResize();

    window.addEventListener( 'resize', onWindowResize );

}

function onWindowResize() {

    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize( window.innerWidth, window.innerHeight );
    composer.setSize( window.innerWidth, window.innerHeight );

}

function animate() {
    const speed = 0.0005;
    for (let i = 0; i < 3; i++) {
        if (time - lastAni > 10) {
            let direction = new THREE.Vector3(Math.random() * 2 - 1, Math.random() * 2 - 1, 0).normalize();
            directions[i] = direction;
        }
        let shift = new THREE.Vector3(); 
        shift.copy(directions[i]).multiplyScalar(speed);
        
        fireflies[i].position.add(shift);
    }
    if (time - lastAni > 10) {
        lastAni = time;
    }
    fireflies[0].position.clamp(new THREE.Vector3(0.4, 2.2, -0.7), new THREE.Vector3(0.6, 2.4, -0.7));
    fireflies[1].position.clamp(new THREE.Vector3(-2.6, 0.8, -0.7), new THREE.Vector3(-2.4, 1.0, -0.7));
    fireflies[2].position.clamp(new THREE.Vector3(1.0, 4.1, -0.7), new THREE.Vector3(1.2, 4.3, -0.7));

    requestAnimationFrame( animate );

    render();

}

function render() {

    const delta = 5 * clock.getDelta();
    time += 2.0 * delta;
    composer.passes[1].uniforms["seed"].value = time;

    renderer.clear();
    composer.render( 0.01 );
    
    // if (screenshot) {
    //     var imgData, imgNode;
    //     try {
    //         imgData = renderer.domElement.toDataURL();      
    //         // console.log(imgData);
    //     } 
    //     catch(e) {
    //         console.log("Browser does not support taking screenshot of 3d context");
    //         return;
    //     }
    //     imgNode = document.createElement("img");
    //     imgNode.src = imgData;
    //     document.body.appendChild(imgNode);
    //     screenshot = false;
    // }

}

function loadShader(path) {
    let shader = null;
    let xhr = new XMLHttpRequest();
    xhr.onreadystatechange = function () {
        if(xhr.readyState == XMLHttpRequest.DONE && xhr.status == 200) {
            shader = xhr.responseText;
        }
    };
    xhr.open("GET", document.getElementById(path).src, false)
    xhr.send();
    return shader;
}

function generateMap(scene) {
    let fov_y = camera.position.z * camera.getFilmHeight() / camera.getFocalLength();
    const renderTarget = new THREE.WebGLRenderTarget(window.innerWidth, window.innerHeight);

    renderer.setRenderTarget(renderTarget);
    renderer.render(scene, camera);
    renderer.setRenderTarget(null);
    scene.overrideMaterial = null;

    return renderTarget.texture;
}