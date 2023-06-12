import * as THREE from 'three';

import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { FilmPass } from 'three/addons/postprocessing/FilmPass.js';
import { BloomPass } from 'three/addons/postprocessing/BloomPass.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

let camera, renderer, composer, clock, orbitControls;

let uniforms, mesh;
let vertexShader, fragmentShader;

init();
animate();

function init() {

    const container = document.getElementById( 'container' );

    camera = new THREE.PerspectiveCamera( 35, window.innerWidth / window.innerHeight, 1, 3000 );
    camera.position.z = 10;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color( 0xf0f0f0);
    const topLight = new THREE.DirectionalLight( 0xffffff, 1 );
    const ambientLight = new THREE.AmbientLight( 0xffffff, 0.05 );
    topLight.position.set( 0, 2, 1 );
    scene.add( topLight );
    scene.add(ambientLight);

    clock = new THREE.Clock();

    const textureLoader = new THREE.TextureLoader();

    uniforms = {

        'fogDensity': { value: 0.45 },
        'fogColor': { value: new THREE.Vector3( 0, 0, 0 ) },
        'time': { value: 1.0 },
        'uvScale': { value: new THREE.Vector2( 3.0, 1.0 ) },
        'texture1': { value: textureLoader.load( 'tex/cloud.png' ) },
        'texture2': { value: textureLoader.load( 'tex/lavatile.jpg' ) }

    };

    uniforms[ 'texture1' ].value.wrapS = uniforms[ 'texture1' ].value.wrapT = THREE.RepeatWrapping;
    uniforms[ 'texture2' ].value.wrapS = uniforms[ 'texture2' ].value.wrapT = THREE.RepeatWrapping;

    const size = 0.65;

    // Rendering
    renderer = new THREE.WebGLRenderer( { antialias: true } );
    renderer.setPixelRatio( window.devicePixelRatio );
    container.appendChild( renderer.domElement );
    renderer.autoClear = false;

    // Shader Loading
    // var vertexShader = document.getElementById( 'vertexShader' ).src.textContent;
    // var fragmentShader = document.getElementById( 'fragmentShader' ).src.textContent;

    var frag = loadShader('fragmentChunk');

    const shaderMat = new THREE.ShaderMaterial( {

        uniforms: uniforms,
        vertexShader: vertexShader,
        fragmentShader: fragmentShader

    } );

    // Model Loading
    const loader = new GLTFLoader();
    const normalMap = textureLoader.load('/tex/ghost/ghost_lowpoly_gl_DefaultMaterial_Normal.png');
    normalMap.flipY = false;
    const baseMap = textureLoader.load('/tex/ghost/base.png');

    loader.load( 'models/ghost_highpoly_frontal_gl.gltf', function ( gltf ) {

        mesh = gltf.scene.children[ 0 ];
        mesh.material = new THREE.MeshDepthMaterial();
        scene.add( mesh );
        mesh.scale.set( 0.5, 0.5, 0.5 );
        mesh.position.set(0, 0.9, 0);
        scene.background = new THREE.Color( 0x000000);
        let depthMap = getDepthMap(scene);
        scene.remove(mesh);

        let fov_y = camera.position.z * camera.getFilmHeight() / camera.getFocalLength();
        console.log(fov_y * camera.aspect, fov_y);

        mesh.material = new THREE.MeshNormalMaterial();
        scene.add( mesh );
        let normalMapBaked = getDepthMap(scene);
        scene.remove(mesh);

        const depthMesh = new THREE.Mesh(
            new THREE.PlaneGeometry(fov_y * camera.aspect, fov_y),
            new THREE.MeshBasicMaterial({ map: normalMapBaked })
        );
        // depthMesh.position.set(1.5, 1, 5);
        // scene.add(depthMesh);

        var customMat = new THREE.MeshStandardMaterial( {
            map: baseMap,
            roughness: 1.0,
            transparent: true
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
                shader.fragmentShader = shader.fragmentShader.replace('#include <output_fragment>', frag);
            }
        };
        mesh.material = customMat;
        // mesh.material = shaderMat;
        // scene.background = new THREE.Color( 0xf0f0f0);
        const cube_loader = new THREE.CubeTextureLoader();
        // const bg = loader.load([
        //     'tex/background/sides.png',
        //     'tex/background/sides.png',
        //     'tex/background/top.png',
        //     'tex/background/bottom.png',
        //     'tex/background/sides.png',
        //     'tex/background/sides.png',
        // ]);
        const bg = textureLoader.load('tex/background/sides.png');
        bg.offset.set(0.001, 0.001);
        scene.background = bg;


        scene.add( mesh );
        // mesh.scale.set( 0.5, 0.5, 0.5 );
        // mesh.position.set(0, 0.5, 0);
        // let depthMap = getDepthMap(scene);
        // const depthMesh = new THREE.Mesh(
        //     new THREE.PlaneGeometry(5, 5),
        //     new THREE.MeshBasicMaterial({ map: depthMap })
        // );
        // depthMesh.position.set(0, 0, 5);
        // scene.add(depthMesh);
    }, undefined, function ( error ) {

        console.error( error );

    } );

    // mesh = new THREE.Mesh( new THREE.TorusGeometry( size, 0.3, 30, 30 ), material );
    // mesh.rotation.x = 0.3;
    // scene.add( mesh );

    // Camera controls
    // const vertRotateBound = Math.PI * (7/12);
    // const horizRotateBound = Math.PI * (1/12);

    // orbitControls = new OrbitControls( camera, renderer.domElement );
    // orbitControls.maxPolarAngle = vertRotateBound;
    // orbitControls.minPolarAngle = Math.PI - vertRotateBound;
    // orbitControls.maxAzimuthAngle = horizRotateBound;
    // orbitControls.minAzimuthAngle = 2 * Math.PI - horizRotateBound;
    // orbitControls.maxDistance = camera.position.z + 2;
    // orbitControls.minDistance = camera.position.z - 6;
    // orbitControls.enableDamping = true;


    //

    const renderModel = new RenderPass( scene, camera );
    const effectBloom = new BloomPass( 1.25 );
    const effectFilm = new FilmPass( 0.35, 0.95, 2048, false );

    composer = new EffectComposer( renderer );

    composer.addPass( renderModel );
    // composer.addPass( effectBloom );
    // composer.addPass( effectFilm );

    //

    onWindowResize();

    window.addEventListener( 'resize', onWindowResize );

}

function onWindowResize() {

    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize( window.innerWidth, window.innerHeight );
    composer.setSize( window.innerWidth, window.innerHeight );

}

//

function animate() {

    requestAnimationFrame( animate );

    render();

}

function render() {

    const delta = 5 * clock.getDelta();
    uniforms[ 'time' ].value += 0.2 * delta;

    // mesh.rotation.y += 0.0125 * delta;
    // mesh.rotation.x += 0.05 * delta;

    renderer.clear();
    composer.render( 0.01 );
    // orbitControls.update();

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

function getDepthMap(scene) {
    let fov_y = camera.position.z * camera.getFilmHeight() / camera.getFocalLength();
    const renderTarget = new THREE.WebGLRenderTarget(window.innerWidth, window.innerHeight);
    // const dmat = new THREE.MeshNormalMaterial();

    // scene.overrideMaterial = dmat;
    renderer.setRenderTarget(renderTarget);
    renderer.render(scene, camera);
    renderer.setRenderTarget(null);
    scene.overrideMaterial = null;

    return renderTarget.texture;
}