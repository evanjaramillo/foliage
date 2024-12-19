import { Vector3 } from 'three';

export interface State {
    position: Vector3;
    direction: Vector3;
    length: number;
    radius: number;
    angle: number;
}
