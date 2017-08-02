import {
  Vector2,
  Vector3,
  Euler,
  Quaternion,
  Matrix3,
} from 'three';
import {
  flow
} from 'lodash';

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
    const sy = height / filmHeight;

    vector_pixels.set(
      sx * vector_film2.x + ox,
      sy * vector_film2.y + oy,
    );

    return vector_pixels;
  };
};

const fromCameraToFilm3 = camera => {
  const M = new Matrix3()
  const vector_film = new Vector3();

  return vector_camera => {
    const f = camera.getFocalLength();
    M.set(
      f, 0, 0,
      0, f, 0,
      0, 0, 1,
    );

    vector_film
      .copy(vector_camera)
      .applyMatrix3(M)

    return vector_film;
  }
}

const fromWorldToCamera = camera => {
  const q = new Quaternion();
  const vector_camera = new Vector3()

  return vector_world => {
    vector_camera.copy(vector_world);
    q.copy(camera.quaternion).inverse();
    return vector_camera.applyQuaternion(q);
  };
}

const fromFilm3ToFilm2 = vector_film3 => {
  const vector_film2 = new Vector2()

  vector_film2.set(
    vector_film3.x,
    vector_film3.y,
  );

  return vector_film2;
}

export default class SmoothControls {
  constructor(camera) {
    this.camera = camera;
    this.direction = camera.getWorldDirection();
    this.T = flow([
      fromWorldToCamera(camera),
      fromCameraToFilm3(camera),
      fromFilm3ToFilm2,
      fromFilm2ToPixels(camera, this),
    ])
    this.width = 1521;
    this.height = 1312;
  }

  update() {
    this.direction.applyEuler(new Euler(0, Math.PI/1000, 0, 'YXZ'))
    this.camera.lookAt(this.direction);
    const axis = new Vector3(
      this.camera.quaternion.x,
      this.camera.quaternion.y,
      this.camera.quaternion.z,
    ).normalize();
    const angle = 2 * Math.acos(this.camera.quaternion.w) / Math.PI * 180
    // console.log(axis.x, axis.y, axis.z, angle)
    console.log(this.T(this.camera.getWorldDirection()))
  }
}
