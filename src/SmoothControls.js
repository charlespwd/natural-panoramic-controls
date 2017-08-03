import {
  Vector2,
  Vector3,
  Euler,
  Quaternion,
  Matrix3,
  Math as Utils,
} from 'three';
import {
  flow,
  leftPad,
} from 'lodash';

const pi = Math.PI;
const PI = pi;

const logA = x => x < 0 ? x.toFixed(4) : (' ' + x.toFixed(4));
const logV = v => {
  // console.log(
  //   '%10.5f %10.5f %10.5f', v.x, v.y, v.z || 0
  // )
}

const logMV = (m, v) => {
  // console.group(m);
  logV(v)
  // console.groupEnd(m);
}

const fromPixelsToFilm2 = (camera, state) => {
  const vector_pixelsC = new Vector2();
  const vector_film2 = new Vector2();

  return vector_pixels => {
    const width = state.width;
    const height = state.height;
    const filmWidth = camera.getFilmWidth();
    const filmHeight = camera.getFilmHeight();

    const ox = width / 2;
    const oy = height / 2;
    const sx = width / filmWidth;
    const sy = - height / filmHeight;

    vector_pixelsC.set(
      vector_pixels.x - ox,
      vector_pixels.y - oy,
    );

    logMV('pixels_center', vector_pixelsC);

    vector_film2.set(
      (vector_pixels.x - ox) / sx,
      (vector_pixels.y - oy) / sy,
    );

    return vector_film2;
  };
}

const fromFilm2ToPixels = (camera, state) => {
  const vector_pixels = new Vector2();

  return vector_film2 => {
    const width = state.width;
    const height = state.height;
    const filmWidth = camera.getFilmWidth();
    const filmHeight = camera.getFilmHeight();

    const ox = width / 2;
    const oy = height / 2;
    const sx = width / filmWidth;
    const sy = - height / filmHeight;

    vector_pixels.set(
      sx * vector_film2.x + ox,
      sy * vector_film2.y + oy,
    );

    return vector_pixels;
  };
};

const fromCameraToFilm3 = camera => {
  const M = new Matrix3()
  const vector_film3 = new Vector3();

  return vector_camera => {
    const f = camera.getFocalLength();
    M.set(
      f, 0, 0,
      0, f, 0,
      0, 0, 1,
    );

    vector_film3
      .copy(vector_camera)
      .applyMatrix3(M)

    // logV(vector_camera)

    return vector_film3;
  }
}

const fromFilm3ToCamera = camera => {
  const M = new Matrix3()
  const vector_camera = new Vector3();

  return vector_film3 => {
    const f = camera.getFocalLength();
    M.set(
      1/f, 0, 0,
      0, 1/f, 0,
      0, 0, 1,
    );

    vector_camera
      .copy(vector_film3)
      .applyMatrix3(M)

    return vector_camera;
  }
}

const fromWorldToCamera = camera => {
  const q = new Quaternion();
  const vector_camera = new Vector3()

  return vector_world => {
    logMV('v_world', vector_world);
    return vector_camera
      .copy(vector_world)
      .applyQuaternion(
        q.copy(camera.quaternion).inverse()
      );
  };
}

const fromCameraToWorld = camera => {
  const vector_world = new Vector3()

  return vector_camera => {
    vector_world
      .copy(vector_camera)
      .applyQuaternion(camera.quaternion);
    return vector_world;
  };
}

const fromFilm3ToFilm2 = () => {
  const vector_film2 = new Vector2()

  return vector_film3 => {
    vector_film2.set(
      vector_film3.x,
      vector_film3.y,
    );

    return vector_film2;
  }
}

const fromFilm2ToFilm3 = camera => {
  const vector_film3 = new Vector3();

  return vector_film2 => {
    const f = camera.getFocalLength();

    vector_film3
      .set(
        vector_film2.x,
        vector_film2.y,
        -1,
      )

    return vector_film3;
  }
}

const getNewWorldDirection = (camera, state) => {
  const p2c = flow([
    fromPixelsToFilm2(camera, state),
    fromFilm2ToFilm3(camera, state),
    fromFilm3ToCamera(camera, state),
  ])

  const p2w = flow([
    fromPixelsToFilm2(camera, state),
    fromFilm2ToFilm3(camera, state),
    fromFilm3ToCamera(camera, state),
    fromCameraToWorld(camera, state),
  ]);

  const q = new Quaternion();
  const axis = new Vector3();
  const defaultWorldDirection_world = new Vector3(0, 0, -1);
  const worldDirection_world = new Vector3();
  let angle; // in radians

  return (xi_pixels, xf_pixels) => {
    const xf_camera = p2c(xf_pixels);
    const xi_world = p2w(xi_pixels);

    angle = xf_camera.angleTo(xi_world);
    axis.copy(xf_camera).cross(xi_world).normalize();

    q.setFromAxisAngle(axis, angle);

    return q;
  }
}

const STATE = {
  IDLE: 0,
  PANNING: 1,
}

export default class SmoothControls {
  constructor(camera, node) {
    this.enabled = true;
    this.node = node;
    this.camera = camera;
    this.width = window.innerWidth;
    this.height = window.innerHeight;

    this.state = STATE.IDLE;
    this.vi_pixels = null;
    this.vf_pixels = null;

    this.setup();
  }

  setup() {
    this.getNewWorldDirection = getNewWorldDirection(this.camera, this);

    this.node.addEventListener('mousedown', this.onMouseDown);
    this.node.addEventListener('mousemove', this.onMouseMove);
    this.node.addEventListener('mouseup', this.onMouseUp);
  }

  dispose() {
    this.node.removeEventListener('mousedown', this.onMouseDown);
    this.node.removeEventListener('mousemove', this.onMouseMove);
    this.node.removeEventListener('mouseup', this.onMouseUp);
  }

  update() {
    if (!this.enabled) return;

    if (this.state !== STATE.PANNING) return;

    if (!this.vi_pixels && this.vf_pixels) {
      this.vi_pixels = new Vector2().copy(this.vf_pixels);
      return;
    }

    const direction = this.getNewWorldDirection(
      this.vi_pixels,
      this.vf_pixels,
    )

    this.camera.setRotationFromQuaternion(direction);

    this.vi_pixels.copy(this.vf_pixels);
  }

  onMouseUp = () => {
    this.state = STATE.IDLE;
    this.vi_pixels = null;
    this.vf_pixels = null;
  }

  onMouseDown = ({ pageX, pageY }) => {
    this.state = STATE.PANNING;
    this.vf_pixels = new Vector2(pageX, pageY);
  }

  onMouseMove = ({ pageX, pageY }) => {
    if (this.state !== STATE.PANNING) return;
    this.vf_pixels.set(pageX, pageY);
  }
}
