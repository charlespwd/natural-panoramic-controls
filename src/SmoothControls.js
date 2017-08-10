import {
  Vector2,
  Vector3,
  Euler,
  Quaternion,
  Matrix3,
  Matrix4,
  Math as Utils,
} from 'three';
import {
  flow,
} from 'lodash';

const {
  abs,
  acos,
  asin,
  atan,
  cos,
  sin,
  tan,
  sqrt,
} = Math;

const pi = Math.PI;
const PI = pi;

const logN = n => n.toFixed(3);
const logV = v => {
  console.log(
    logN(v.x),
    logN(v.y),
    logN(v.z || 0),
  )
}

const deg = x => 180 / pi * x

const logQ = q => {
  console.log(
    q.x / Math.sqrt(2) * 2,
    q.y / Math.sqrt(2) * 2,
    q.z / Math.sqrt(2) * 2,
    q.w / Math.sqrt(2) * 2,
  )

  console.log(
    'theta=', 180 / PI * Math.acos(q.w) * 2,
  );
}

const logMV = (m, v) => {
  console.group(m);
  logV(v)
  console.groupEnd(m);
}

export const fromPixelsToFilm2 = (camera, state) => {
  const vector_pixelsC = new Vector2();
  const vector_film2 = new Vector2();

  return (vector_pixels) => {
    const width = state.width;
    const height = state.height;
    const filmWidth = camera.getFilmWidth();
    const filmHeight = camera.getFilmHeight();

    const ox = width / 2;
    const oy = height / 2;
    const sx = width / filmWidth;
    const sy = -height / filmHeight;

    vector_pixelsC.set(
      vector_pixels.x - ox,
      vector_pixels.y - oy,
    );

    vector_film2.set(
      (vector_pixels.x - ox) / sx,
      (vector_pixels.y - oy) / sy,
    );

    return vector_film2;
  };
}

export const fromFilm2ToPixels = (camera, state) => {
  const vector_pixels = new Vector2();

  return (vector_film2) => {
    const width = state.width;
    const height = state.height;
    const filmWidth = camera.getFilmWidth();
    const filmHeight = camera.getFilmHeight();

    const ox = width / 2;
    const oy = height / 2;
    const sx = width / filmWidth;
    const sy = -height / filmHeight;

    vector_pixels.set(
      sx * vector_film2.x + ox,
      sy * vector_film2.y + oy,
    );

    return vector_pixels;
  };
};

export const fromCameraToFilm3 = camera => {
  const M = new Matrix3()
  const vector_film3 = new Vector3();

  return (vector_camera) => {
    const f = camera.getFocalLength();
    M.set(
      f, 0, 0,
      0, f, 0,
      0, 0, 1,
    );

    vector_film3
      .copy(vector_camera)
      .applyMatrix3(M)

    return vector_film3;
  }
}

export const fromFilm3ToCamera = camera => {
  const M = new Matrix3()
  const vector_camera = new Vector3();

  return (vector_film3) => {
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

export const fromWorldToCamera = camera => {
  const q = new Quaternion();
  const vector_camera = new Vector3()

  return vector_world => {
    return vector_camera
      .copy(vector_world)
      .applyQuaternion(
        q.copy(camera.quaternion).inverse()
      );
  };
}

export const fromCameraToWorld = camera => {
  const vector_world = new Vector3()

  return vector_camera => {
    vector_world
      .copy(vector_camera)
      .applyQuaternion(camera.quaternion);
    return vector_world;
  };
}

export const fromFilm3ToFilm2 = () => {
  const vector_film2 = new Vector2()

  return vector_film3 => {
    vector_film2.set(
      vector_film3.x,
      vector_film3.y,
    );

    return vector_film2;
  }
}

export const fromFilm2ToFilm3 = () => {
  const vector_film3 = new Vector3();

  return vector_film2 => {
    vector_film3
      .set(
        vector_film2.x,
        vector_film2.y,
        -1,
      )

    return vector_film3;
  }
}

const sqrtSolveP = (a, b, c) => (-b + sqrt(b**2 - 4*a*c)) / (2*a);
const sqrtSolveN = (a, b, c) => (-b - sqrt(b**2 - 4*a*c)) / (2*a);
const sqrtSolve = (a, b, c) => {
  let x;
  x = sqrtSolveP(a, b, c);

  if (Math.abs(x) <= 0.4) {
    return x;
  }

  x = sqrtSolveN(a, b, c);

  if (Math.abs(x) <= 0.4) {
    return x;
  }

  throw new Error('Assumption not respected!')
}

const getDeltaRotation = (camera, state) => {
  const p2c = flow([
    fromPixelsToFilm2(camera, state),
    fromFilm2ToFilm3(camera, state),
    fromFilm3ToCamera(camera, state),
  ])

  const xf_camera = new Vector3();
  const xi_camera = new Vector3();
  const offset = new Euler();

  return (xi_pixels, xf_pixels) => {
    xi_camera
      .copy(p2c(xi_pixels))
      .normalize();
    xf_camera
      .copy(p2c(xf_pixels))
      .normalize();

    const x1 = xi_camera.x;
    const y1 = xi_camera.y;
    const z1 = xi_camera.z;

    const x2 = xf_camera.x;
    const y2 = xf_camera.y;
    const z2 = xf_camera.z;

    let a;
    let b;
    let c;

    try {
      a = -y2 / 2;
      b = -z2;
      c = y2 - y1;
      const deltaPitch = sqrtSolve(a, b, c);

      a = -x2 / 2;
      b = deltaPitch * y2 + z2 * (1 - (deltaPitch ** 2) / 2);
      c = x2 - x1;
      const deltaYaw = sqrtSolve(a, b, c);

      offset.set(
        deltaPitch,
        deltaYaw,
        0,
        'YXZ'
      );

      return offset;
    } catch (e) {
      console.error(e);
      return null;
    }
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
    this.camera.rotation.reorder('YXZ')

    this.state = STATE.IDLE;
    this.vi_pixels = null;
    this.vf_pixels = null;

    this.setup();
  }

  setup() {
    this.getDeltaRotation = getDeltaRotation(this.camera, this);
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

    const delta = this.getDeltaRotation(
      this.vi_pixels,
      this.vf_pixels,
    )

    if (delta) {
      this.camera.rotation.y += delta.y;
      this.camera.rotation.x += delta.x;
    }

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
