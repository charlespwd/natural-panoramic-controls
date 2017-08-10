// @module NaturalPanoramicControls
// @author charlespwd
//
// NaturalPanoramicControls, camera controls
//
// Dragging your mouse (or panning with your finger) will rotate the camera such
// that the point under your cursor in the world follows your mouse as it is
// being dragged.
//
// Assumptions:
// 1) the camera position is (0, 0, 0);
// 2) the camera.up vector is (0, 1, 0);
// 3) the camera looks through (0, 0, -1);
//
// Some background:
// http://www.cse.psu.edu/~rtc12/CSE486/lecture12.pdf
// http://www.cse.psu.edu/~rtc12/CSE486/lecture13.pdf
import {
  Vector2,
  Vector3,
  Euler,
  Quaternion,
  Matrix3,
} from 'three';

const flow = (fns) => {
  return x => fns.reduce((acc, f) => f(acc), x);
}

const {
  abs,
  sqrt,
  max,
  min,
  PI,
} = Math;

const FRICTION = 0.00000275;
const MAX_ROTATIONAL_SPEED = 2 * PI / 1000;
const bounded = (lower, x, upper) => max(lower, min(x, upper));

export function dxConstantFriction(t0, ti, tf, v0, uk = FRICTION) {
  const ti0 = ti - t0;
  const tf0 = tf - t0;
  const tf02 = tf0 * tf0;
  const ti02 = ti0 * ti0;

  // Drag cannot make you go backward.
  return max(0, v0 * (tf0 - ti0) - uk * (tf02 - ti02));
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
};

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
  const M = new Matrix3();
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
      .applyMatrix3(M);

    return vector_film3;
  };
};

export const fromFilm3ToCamera = camera => {
  const M = new Matrix3();
  const vector_camera = new Vector3();

  return (vector_film3) => {
    const f = camera.getFocalLength();
    M.set(
      1 / f, 0, 0,
      0, 1 / f, 0,
      0, 0, 1,
    );

    vector_camera
      .copy(vector_film3)
      .applyMatrix3(M);

    return vector_camera;
  };
};

export const fromWorldToCamera = camera => {
  const q = new Quaternion();
  const vector_camera = new Vector3();

  return vector_world => (
    vector_camera
      .copy(vector_world)
      .applyQuaternion(
        q.copy(camera.quaternion).inverse()
      )
  );
};

export const fromCameraToWorld = camera => {
  const vector_world = new Vector3();

  return vector_camera => {
    vector_world
      .copy(vector_camera)
      .applyQuaternion(camera.quaternion);
    return vector_world;
  };
};

export const fromFilm3ToFilm2 = () => {
  const vector_film2 = new Vector2();

  return vector_film3 => {
    vector_film2.set(
      vector_film3.x,
      vector_film3.y,
    );

    return vector_film2;
  };
};

export const fromFilm2ToFilm3 = () => {
  const vector_film3 = new Vector3();

  return vector_film2 => {
    vector_film3
      .set(
        vector_film2.x,
        vector_film2.y,
        -1,
      );

    return vector_film3;
  };
};

const sqrtSolveP = (a, b, c) => (-b + sqrt(b**2 - 4*a*c)) / (2*a);
const sqrtSolveN = (a, b, c) => (-b - sqrt(b**2 - 4*a*c)) / (2*a);
const sqrtSolve = (a, b, c) => {
  let x;
  x = sqrtSolveP(a, b, c);

  if (abs(x) <= 0.4) {
    return x;
  }

  x = sqrtSolveN(a, b, c);

  if (abs(x) <= 0.4) {
    return x;
  }

  throw new Error('Assumption not respected!');
};

// https://math.stackexchange.com/questions/2385860/natural-panoramic-camera-controls
const getDeltaRotation = (camera, state) => {
  const pixelsToCamera = flow([
    fromPixelsToFilm2(camera, state),
    fromFilm2ToFilm3(camera, state),
    fromFilm3ToCamera(camera, state),
  ]);

  const xf_camera = new Vector3();
  const xi_camera = new Vector3();
  const offset = new Euler();

  return (xi_pixels, xf_pixels) => {
    xi_camera
      .copy(pixelsToCamera(xi_pixels))
      .normalize();
    xf_camera
      .copy(pixelsToCamera(xf_pixels))
      .normalize();

    const x1 = xi_camera.x;
    const y1 = xi_camera.y;

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
      return null;
    }
  };
};

const STATE = {
  NOT_MOVING: 0,
  PANNING: 1,
  FLOATING: 2,
};

const TWO_PI = 2 * PI;
// returns a angle value between 0 and 2*PI
function normalizedPositiveAngle(angle) {
  const reducedAngle = angle % TWO_PI;

  // force it to be the positive remainder (so that 0 <= angle < TWO_PI)
  return (reducedAngle + TWO_PI) % TWO_PI;
}

export default class NaturalPanoramicControls {
  constructor(camera, node) {
    this.enabled = true;
    this.node = node;
    this.camera = camera;

    // This line is very important! Our camera is set up with Y = up, -Z = at.
    // Maintainining the up vector between rotations means that the roll angle
    // is zero. YXZ means yaw about Y axis, pitch about X', roll about Z''.
    this.camera.rotation.reorder('YXZ');

    this.state = STATE.NOT_MOVING;
    this.vi_pixels = null; // mouse position in pixels at previous frame
    this.vf_pixels = null; // mouse position in pixels currently

    this.enableDamping = true;
    this.dampingFactor = FRICTION;

    this.latestTime = 0; // time at last frame (so we can calculate dtheta / dt)
    this.delta = new Euler(); // YXZ ordered, y is yaw (aka theta), x is pitch (aka phi)

    // We hold these for momentum based pan.
    this.t0 = 0; // the time at which you started floating
    this.ti = 0; // the time at the previous frame
    this.tf = 0; // the time at the present frame
    this.vt0 = 0; // the theta velocity you had when you started floating
    this.vp0 = 0; // the phi velocity you had when you started floating

    this.setup();
  }

  get width() {
    return this.node.clientWidth;
  }

  get height() {
    return this.node.clientHeight;
  }

  setup() {
    this.getDeltaRotation = getDeltaRotation(this.camera, this);
    this.node.addEventListener('mousedown', this.onMouseDown, false);
    this.node.addEventListener('mousemove', this.onMouseMove, false);
    this.node.addEventListener('mouseup', this.onMouseUp, false);
    this.node.addEventListener('touchstart', this.onTouchStart, false);
    this.node.addEventListener('touchmove', this.onTouchMove, false);
    this.node.addEventListener('touchend', this.onTouchEnd, false);
  }

  dispose() {
    this.node.removeEventListener('mousedown', this.onMouseDown, false);
    this.node.removeEventListener('mousemove', this.onMouseMove, false);
    this.node.removeEventListener('mouseup', this.onMouseUp, false);
    this.node.removeEventListener('touchstart', this.onTouchStart, false);
    this.node.removeEventListener('touchmove', this.onTouchMove, false);
    this.node.removeEventListener('touchend', this.onTouchEnd, false);
  }

  rotate(delta) {
    const phi = normalizedPositiveAngle(this.camera.rotation.x);
    const isConsideredUpsideDown = PI / 2 < phi && phi < 3 * PI / 2;
    if (isConsideredUpsideDown) {
      this.camera.rotation.y -= delta.y;
    } else {
      this.camera.rotation.y += delta.y;
    }
    this.camera.rotation.x += delta.x;
  }

  update() {
    if (!this.enabled) return;

    if (this.state === STATE.PANNING) {
      if (!this.vi_pixels && this.vf_pixels) {
        this.vi_pixels = new Vector2().copy(this.vf_pixels);
        return;
      }

      const delta = this.getDeltaRotation(
        this.vi_pixels,
        this.vf_pixels,
      );

      if (delta) {
        this.rotate(delta);
        this.calculateAngularVelocity(delta.y, delta.x);
      }

      this.vi_pixels.copy(this.vf_pixels);

    } else if (this.state === STATE.FLOATING) {
      const delta = this.calculateMomentumBasedDelta();
      this.rotate(delta);

      if (abs(delta.y) <= 0.00001 && abs(delta.x) <= 0.00001) {
        this.state = STATE.NOT_MOVING;
      }
    }

  }

  calculateAngularVelocity(dtheta, dphi) {
    const tf = Date.now();
    const dt = tf - this.latestTime;
    if (this.latestTime && dt !== 0) {
      if (dtheta !== 0) {
        this.vt0 = bounded(-MAX_ROTATIONAL_SPEED, dtheta / dt, MAX_ROTATIONAL_SPEED);
      }
      if (dphi !== 0) {
        this.vp0 = bounded(-MAX_ROTATIONAL_SPEED, dphi / dt, MAX_ROTATIONAL_SPEED);
      }
    }
    this.latestTime = tf;
  }

  calculateMomentumBasedDelta() {
    const t0 = this.t0;
    const ti = this.ti;
    const tf = Date.now();
    const vt0 = this.vt0 || 0;
    const uk = this.dampingFactor;
    const vp0 = this.vp0 || 0;
    const tsign = vt0 >= 0 ? 1 : -1;
    const psign = vp0 >= 0 ? 1 : -1;
    this.delta.y = tsign * dxConstantFriction(t0, ti, tf, abs(vt0), uk);
    this.delta.x = psign * dxConstantFriction(t0, ti, tf, abs(vp0), uk);
    this.ti = tf;
    return this.delta;
  }

  ifEnabled = (handler) => (event) => {
    if (this.enabled) handler(event);
  }

  startPan = (event, offsetX, offsetY) => {
    event.preventDefault();
    this.state = STATE.PANNING;
    this.vf_pixels = new Vector2(offsetX, offsetY);
  }

  moveRotate = (event, offsetX, offsetY) => {
    if (this.state !== STATE.PANNING) return;
    event.preventDefault();
    this.vf_pixels.set(offsetX, offsetY);
  }

  stopPan = (event) => {
    event.preventDefault();
    this.state = this.enableDamping ? STATE.FLOATING : STATE.NOT_MOVING;
    this.vi_pixels = null;
    this.vf_pixels = null;
    this.latestTime = null;
    this.delta.x = 0;
    this.delta.y = 0;
    this.t0 = Date.now();
    this.ti = Date.now();
  }

  onMouseDown = this.ifEnabled((event) => {
    this.startPan(event, event.pageX, event.pageY);
  })

  onMouseMove = this.ifEnabled((event) => {
    this.moveRotate(event, event.pageX, event.pageY);
  })

  onMouseUp = this.ifEnabled((event) => {
    this.stopPan(event);
  });

  onTouchStart = this.ifEnabled((event) => {
    const { pageX, pageY } = event.touches[0];
    this.startPan(event, pageX, pageY);
  })

  onTouchMove = this.ifEnabled((event) => {
    const { pageX, pageY } = event.touches[0];
    this.moveRotate(event, pageX, pageY);
  })

  onTouchEnd = this.ifEnabled((event) => {
    this.stopPan(event);
  });
}
