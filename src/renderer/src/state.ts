import { Vector3 } from 'three';

/**
 * Describes a collection of state objects where the first
 * element contains the current state. Elements 1 - N contain
 * saved states
 */
export type StateCollection = [State, ...State[]];

export interface State {
    position: Vector3;
    direction: Vector3;
    length: number;
    radius: number;
    angle: number;
}

export function currentState(states: StateCollection): State {
    return states[0];
}

/**
 * Adds a copy of the current state to the saved state area.
 * @param states state collection where the first state is the considered
 * the current state
 */
export function save(states: StateCollection): void {
    const current = clone(currentState(states));
    states.push(current);
}

export function restore(states: StateCollection): State | null {
    if (states.length <= 1) {
        return null; // no state to restore.
    }
    const lifoState = states.pop();

    if (!lifoState) {
        return null; // no lifo to restore.
    }

    states[0] = lifoState;

    return lifoState;
}

export function clone(state: State): State {
    return {
        position: state.position.clone(),
        direction: state.direction.clone(),
        length: state.length,
        radius: state.radius,
        angle: state.angle,
    };
}
