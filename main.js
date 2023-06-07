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

    // Shader Loading
    // var vertexShader = document.getElementById( 'vertexShader' ).src.textContent;
    // var fragmentShader = document.getElementById( 'fragmentShader' ).src.textContent;

    loadShaders();

    const material = new THREE.ShaderMaterial( {

        uniforms: uniforms,
        vertexShader: vertexShader,
        fragmentShader: fragmentShader

    } );

    // Model Loading
    const loader = new GLTFLoader();
    const normalMap = textureLoader.load('/tex/figure/figure_low_poly_Mat_Normal.png');
    normalMap.flipY = false;
    const baseMap = textureLoader.load('/tex/figure/figure_low_poly_Mat_BaseColor.png');

    loader.load( 'models/figure_low_poly.gltf', function ( gltf ) {

        mesh = gltf.scene.children[ 0 ];
        mesh.material = new THREE.MeshStandardMaterial( {
            normalMap: normalMap,
            map: baseMap,
            roughness: 0.2
        } );

        scene.add( mesh );
        mesh.scale.set( 0.5, 0.5, 0.5 );
        mesh.position.set(0, 0.5, 0);
    }, undefined, function ( error ) {

        console.error( error );

    } );

    // mesh = new THREE.Mesh( new THREE.TorusGeometry( size, 0.3, 30, 30 ), material );
    // mesh.rotation.x = 0.3;
    // scene.add( mesh );

    // Rendering
    renderer = new THREE.WebGLRenderer( { antialias: true } );
    renderer.setPixelRatio( window.devicePixelRatio );
    container.appendChild( renderer.domElement );
    renderer.autoClear = false;

    // Camera controls
    const vertRotateBound = Math.PI * (7/12);
    const horizRotateBound = Math.PI * (1/12);

    orbitControls = new OrbitControls( camera, renderer.domElement );
    orbitControls.maxPolarAngle = vertRotateBound;
    orbitControls.minPolarAngle = Math.PI - vertRotateBound;
    orbitControls.maxAzimuthAngle = horizRotateBound;
    orbitControls.minAzimuthAngle = 2 * Math.PI - horizRotateBound;
    orbitControls.maxDistance = camera.position.z + 2;
    orbitControls.minDistance = camera.position.z - 6;
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
    orbitControls.update();

}

function loadShaders() {
    var xhr = new XMLHttpRequest();
    xhr.onreadystatechange = function () {
        if(xhr.readyState == XMLHttpRequest.DONE && xhr.status == 200) {
            vertexShader = xhr.responseText;
        }
    };
    xhr.open("GET", document.getElementById( 'vertexShader' ).src, false)
    xhr.send();

    var xhr1 = new XMLHttpRequest();
    xhr1.onreadystatechange = function () {
        if(xhr1.readyState === XMLHttpRequest.DONE && xhr1.status === 200) {
            fragmentShader = xhr1.responseText;
        }
    };
    xhr1.open("GET", document.getElementById( 'fragmentShader' ).src, false)
    xhr1.send();
}