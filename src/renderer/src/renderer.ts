import {
    ArrowHelper,
    ColorRepresentation,
    Matrix4,
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
import { Axiom, Grammar } from './grammar';
import { Actions, applyActions, applyAllRules, RuleCollection } from './rule';
import { currentState, restore, save, State, StateCollection } from './state';
import { PseudoRandom, PseudoRandomGenerator } from './random';

// Axes
export const UNIT_X = new Vector3(1, 0, 0);
export const UNIT_Y = new Vector3(0, 1, 0);
export const UNIT_Z = new Vector3(0, 0, 1);

export function toRadians(value: number): number {
    return Math.PI * (value / 180);
}

export abstract class AbstractRenderer {
    protected scene: Scene;
    protected camera: PerspectiveCamera;
    protected renderer: WebGLRenderer;
    protected generator: PseudoRandomGenerator<string, number>;
    protected orbitControls: OrbitControls;

    protected constructor(seed: string) {
        this.scene = new Scene();
        this.camera = new PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

        this.render = this.render.bind(this);
        this.resize = this.resize.bind(this);

        this.renderer = new WebGLRenderer();
        document.body.appendChild(this.renderer.domElement);
        this.renderer.setAnimationLoop(this.render);

        this.generator = new PseudoRandom(seed);

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

    protected generateAngle(maxVarianceInDeg: number): number {
        return (this.generator.next() * 2 - 1) * toRadians(maxVarianceInDeg);
    }

    protected perturbDirection(state: State, maxAngleVarianceDegrees: number): Vector3 {
        const direction = new Vector3();
        direction.copy(state.direction).normalize();

        const rotationX = new Matrix4().makeRotationX(this.generateAngle(maxAngleVarianceDegrees));
        const rotationY = new Matrix4().makeRotationY(this.generateAngle(maxAngleVarianceDegrees));
        const rotationZ = new Matrix4().makeRotationZ(this.generateAngle(maxAngleVarianceDegrees));

        const totalRotation = new Matrix4().multiplyMatrices(rotationX, rotationY);
        totalRotation.multiply(rotationZ);

        direction.applyMatrix4(totalRotation);

        return direction;
    }

    protected computeDestination(start: Vector3, direction: Vector3, length: number): Vector3 {
        return start.clone().add(direction.normalize().multiplyScalar(length));
    }

    private render(): void {
        this.renderer.render(this.scene, this.camera);
        this.orbitControls.update();
    }
}

export interface FoliageRendererOptions {
    iterations: number;
    seed: string;
    initialState: State;
}

const foliageRendererDefaultState: State = {
    position: new Vector3(0, 0, 0),
    direction: UNIT_Y,
    length: 0.5,
    radius: 0.1,
    angle: 0,
};

const foliageRendererDefaultOptions = {
    iterations: 3,
    seed: 'default',
    initialState: foliageRendererDefaultState,
};

export class FoliageRenderer extends AbstractRenderer {
    private readonly axiom: Axiom;
    private readonly rules: RuleCollection;
    private readonly iterations: number;
    private readonly actions: Actions;
    private readonly states: StateCollection;

    private _lengthFactor: number = 0.9;
    private _radiusDecayFactor: number = 0.9;
    private _angleOffset: number = 20;

    constructor(grammar: Grammar, options: FoliageRendererOptions = foliageRendererDefaultOptions) {
        super(options.seed);
        this.orbitControls.autoRotate = false;

        // Unpack the L-System information from the provided grammar and the
        // requested number of iterations
        this.axiom = grammar.axiom;
        this.rules = grammar.rules;
        this.iterations = options.iterations;

        // Get the initial state into its state collection
        this.states = [options.initialState];

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

        const destination = this.computeDestination(
            current.position,
            current.direction,
            current.length,
        );

        this.drawStatePoint(current);
        this.drawDebugPoint(destination);
        this.drawDebugArrow(current);

        current.position.copy(destination);
        current.length *= this.lengthFactor;
        current.radius *= this.radiusDecayFactor;
    }

    private deviateFromY(): void {
        const current = currentState(this.states);
        current.direction.copy(this.perturbDirection(current, this.angleOffset));
    }

    private conformToY(): void {
        const current = currentState(this.states);
        current.direction.copy(this.perturbDirection(current, this.angleOffset));
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

        // const initialPosition = new Vector3(0, 0, 0);
        // const direction = new Quaternion().setFromAxisAngle(UNIT_Y, 0);
        //
        // const arrow = new ArrowHelper();
        // arrow.setRotationFromQuaternion(direction);
        // arrow.setLength(1.0);
        // arrow.setColor(0x0000ff);
        // arrow.position.copy(initialPosition);
        // this.scene.add(arrow);
        //
        // const dest = initialPosition.clone().applyQuaternion(direction);
        // dest.multiplyScalar(1);
        //
        // const newArrow = new ArrowHelper();
        // newArrow.position.copy(dest);
        // newArrow.setLength(1);
        // newArrow.setColor(0x0000ff);
        // newArrow.setRotationFromQuaternion(direction);
        // this.scene.add(newArrow);
    }

    get lengthFactor(): number {
        return this._lengthFactor;
    }

    set lengthFactor(value: number) {
        this._lengthFactor = value;
    }

    get angleOffset(): number {
        return this._angleOffset;
    }

    set angleOffset(value: number) {
        this._angleOffset = value;
    }

    get radiusDecayFactor(): number {
        return this._radiusDecayFactor;
    }

    set radiusDecayFactor(value: number) {
        this._radiusDecayFactor = value;
    }
}
