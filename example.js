import * as THREE from 'three';
import NaturalPanoramicControls from './src/NaturalPanoramicControls';

const state = {
  camera: null,
  controls: null,
  renderer: null,
  scene: null,
};
global.v = THREE.Vector3
global.q = THREE.Quaternion
global.s = state;

init();
animate();

function init() {
  var container = document.getElementById( 'container' );
  state.renderer = new THREE.WebGLRenderer();
  state.renderer.setPixelRatio( window.devicePixelRatio );
  state.renderer.setSize( window.innerWidth, window.innerHeight );
  container.appendChild( state.renderer.domElement );
  state.scene = new THREE.Scene();
  state.camera = new THREE.PerspectiveCamera( 90, window.innerWidth / window.innerHeight, 0.1, 100 );
  state.camera.position.z = 0;
  state.controls = new NaturalPanoramicControls(state.camera, state.renderer.domElement);
  var textures = getTexturesFromAtlasFile( "example/textures/sun_temple_stripe.jpg", 6 );
  var materials = [];
  for ( var i = 0; i < 6; i ++ ) {
    materials.push( new THREE.MeshBasicMaterial( { map: textures[ i ] } ) );
  }
  var skyBox = new THREE.Mesh( new THREE.CubeGeometry( 1, 1, 1 ), materials );
  skyBox.applyMatrix( new THREE.Matrix4().makeScale( 1, 1, - 1 ) );
  state.scene.add( skyBox );
  window.addEventListener( 'resize', onWindowResize, false );
}

function getTexturesFromAtlasFile( atlasImgUrl, tilesNum ) {
  var textures = [];
  for ( var i = 0; i < tilesNum; i ++ ) {
    textures[ i ] = new THREE.Texture();
  }
  var imageObj = new Image();
  imageObj.onload = function() {
    var canvas, context;
    var tileWidth = imageObj.height;
    for ( var i = 0; i < textures.length; i ++ ) {
      canvas = document.createElement( 'canvas' );
      context = canvas.getContext( '2d' );
      canvas.height = tileWidth;
      canvas.width = tileWidth;
      context.drawImage( imageObj, tileWidth * i, 0, tileWidth, tileWidth, 0, 0, tileWidth, tileWidth );
      textures[ i ].image = canvas
      textures[ i ].needsUpdate = true;
    }
  };
  imageObj.src = atlasImgUrl;
  return textures;
}

function onWindowResize() {
  state.camera.aspect = window.innerWidth / window.innerHeight;
  state.camera.updateProjectionMatrix();
  state.renderer.setSize( window.innerWidth, window.innerHeight );
}

function animate() {
  state.controls.update();
  state.renderer.render( state.scene, state.camera );
  requestAnimationFrame( animate );
}

if (module.hot) {
  module.hot.accept('./example.js', function() {
    state.controls = new NaturalPanoramicControls(state.camera, state.renderer.domElement);
  })
  module.hot.accept('./src/NaturalPanoramicControls.js', function() {
    state.controls.dispose();
    const NewNaturalPanoramicControls = require('./src/NaturalPanoramicControls').default;
    state.controls = new NewNaturalPanoramicControls(state.camera, state.renderer.domElement);
  })
}
