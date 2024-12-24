import {
    ArrowHelper,
    ColorRepresentation,
    Mesh,
    MeshBasicMaterial,
    PerspectiveCamera,
    PlaneGeometry,
    Scene,
    SphereGeometry,
    Vector3,
    WebGLRenderer,
} from 'three';

import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { Grammar } from './grammar';
import { Actions, applyActions, applyAllRules, RuleCollection } from './rule';
import { currentState, restore, save, State, StateCollection } from './state';

export const UNIT_X = new Vector3(1, 0, 0);
export const UNIT_Y = new Vector3(0, 1, 0);
export const UNIT_Z = new Vector3(0, 0, 1);

export abstract class AbstractRenderer {
    protected scene: Scene;
    protected camera: PerspectiveCamera;
    protected renderer: WebGLRenderer;

    private orbitControls: OrbitControls;

    protected constructor() {
        this.scene = new Scene();
        this.camera = new PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

        this.render = this.render.bind(this);
        this.resize = this.resize.bind(this);

        this.renderer = new WebGLRenderer();
        document.body.appendChild(this.renderer.domElement);
        this.renderer.setAnimationLoop(this.render);

        this.orbitControls = new OrbitControls(this.camera, this.renderer.domElement);
        // we want the camera to slowly rotate.
        this.orbitControls.autoRotate = true;
        // we want the plane to be viewed from the top down.
        this.orbitControls.maxPolarAngle = Math.PI * (80 / 180);
        this.camera.position.z = 4;

        window.addEventListener('resize', this.resize);
        this.resize();
    }

    protected resize(): void {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();

        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    protected drawStatePoint(state: State, color: ColorRepresentation = 0xff0000): void {
        const geom = new SphereGeometry(0.01);
        const point = new Mesh(geom, new MeshBasicMaterial({ color: color }));
        point.position.copy(state.position);
        this.scene.add(point);
    }
    protected drawDebugPoint(point: Vector3, color: ColorRepresentation = 0xff0000): void {
        const geom = new SphereGeometry(0.01);
        const p = new Mesh(geom, new MeshBasicMaterial({ color: color }));
        p.position.copy(point);
        this.scene.add(p);
    }
    protected drawDebugArrow(state: State, color: ColorRepresentation = 0xffff00): void {
        const arrow = new ArrowHelper(state.direction.normalize(), state.position, state.length);
        arrow.setColor(color);
        this.scene.add(arrow);
    }

    private render(): void {
        this.renderer.render(this.scene, this.camera);
        this.orbitControls.update();
    }
}

const foliageRendererDefaultState: State = {
    position: new Vector3(0, 0, 0),
    direction: UNIT_Y,
    length: 0.5,
    radius: 0.1,
    angle: 0,
};

export class FoliageRenderer extends AbstractRenderer {
    private readonly axiom: string;
    private readonly rules: RuleCollection;
    private readonly iterations: number;

    private readonly actions: Actions;

    private states: StateCollection;

    constructor(
        grammar: Grammar,
        iterations: number = 3,
        initialState: State = foliageRendererDefaultState,
    ) {
        super();

        // Unpack the L-System information from the provided grammar and the
        // requested number of iterations
        this.axiom = grammar.axiom;
        this.rules = grammar.rules;
        this.iterations = iterations;

        // Get the initial state into its state collection
        this.states = [initialState];

        // bind state functions.
        this.advect = this.advect.bind(this);
        this.conformToY = this.conformToY.bind(this);
        this.deviateFromY = this.deviateFromY.bind(this);
        this.saveState = this.saveState.bind(this);
        this.restoreState = this.restoreState.bind(this);

        this.actions = {
            F: this.advect,
            '+': this.deviateFromY,
            '-': this.conformToY,
            '[': this.saveState,
            ']': this.restoreState,
        };

        this.initialize();
    }

    private initializeGround(): void {
        const groundPlane = new PlaneGeometry(4, 4, 2, 2);

        const groundPlaneMaterial = new MeshBasicMaterial({ color: 0x00ff00 });
        const ground = new Mesh(groundPlane, groundPlaneMaterial);
        // we need to make the ground look like the ground.
        ground.rotateOnWorldAxis(new Vector3(1, 0, 0), Math.PI * (-90 / 180));

        this.scene.add(ground);
    }

    private advect(): void {
        const current = currentState(this.states);

        const destination = computeDestination(current.position, current.direction, current.length);

        this.drawStatePoint(current);
        this.drawDebugPoint(destination);
        this.drawDebugArrow(current);

        // scene.add(
        //     createSegment(
        //         currentPosition,
        //         dst,
        //         currentRadius,
        //         currentRadius,
        //     ),
        // );

        current.position.copy(destination);
        current.length *= 0.9;
    }

    private deviateFromY(): void {
        const current = currentState(this.states);

        current.angle += 20;
        current.direction.copy(randomDirectionVector(Math.PI * (current.angle / 180)).normalize());
    }

    private conformToY(): void {
        const current = currentState(this.states);
        current.angle -= 20;
        current.direction.copy(randomDirectionVector(Math.PI * (current.angle / 180)).normalize());
    }

    private saveState(): void {
        save(this.states);
    }

    private restoreState(): void {
        const restored = restore(this.states);
        if (!restored) {
            this.drawStatePoint(currentState(this.states), 0x00ff00);
            return;
        }
        this.drawStatePoint(restored, 0x00ff00);
    }

    private initialize(): void {
        this.initializeGround();

        // process the L-System
        const renderedCommands = applyAllRules(this.axiom, this.iterations, this.rules);

        applyActions(renderedCommands, this.actions);
    }
}

function computeDestination(start: Vector3, direction: Vector3, length: number): Vector3 {
    return start.clone().add(direction.normalize().multiplyScalar(length));
}

function randomDirectionVector(angleFromY: number): Vector3 {
    // Generate a random azimuthal angle between 0 and 2π
    const azimuthalAngle = Math.random() * 2 * Math.PI;

    // Calculate the direction vector using spherical coordinates
    const x = Math.sin(angleFromY) * Math.cos(azimuthalAngle);
    const y = Math.cos(angleFromY);
    const z = Math.sin(angleFromY) * Math.sin(azimuthalAngle);

    // Return the resulting vector
    return new Vector3(x, y, z);
}

// function createSegment(start: Vector3, end: Vector3, startRadius: number, endRadius: number): Mesh {
//     const dir = new Vector3().subVectors(end, start);
//     const length = dir.length();
//     const geom = new CylinderGeometry(endRadius, startRadius, length);
//     const material = new MeshBasicMaterial({ color: 0x8b4513 });
//     const mesh = new Mesh(geom, material);
//     const center = new Vector3().addVectors(start, end).multiplyScalar(0.5);
//
//     // mesh.position.copy(center);
//
//     // mesh.position.y -= length / 2;
//
//     // const angle = dir.angleTo(new Vector3(0, 1, 0));
//     // const rotAx = new Vector3().crossVectors(new Vector3(0, 1, 0), dir);
//     //
//     // mesh.setRotationFromAxisAngle(rotAx, angle);
//     return mesh;
// }
