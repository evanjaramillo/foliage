import {
    ArrowHelper,
    ColorRepresentation,
    CylinderGeometry,
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
import { applyRules } from './rule';
import { State } from './state';

function init(): void {
    window.addEventListener('DOMContentLoaded', () => {
        createScene();
    });
}
const grammar: Grammar[] = [
    {
        axiom: 'Z',
        rules: [
            {
                input: 'F',
                output: 'FX[FX[+XF]]',
                probability: 0,
            },
            {
                input: 'X',
                output: 'F[+XZ++X-F[+ZX]][-X++F-X]',
                probability: 0,
            },
            {
                input: 'Z',
                output: '[+F-X-F][++ZX]',
                probability: 0,
            },
        ],
    },
];

function computeDestination(
    start: Vector3,
    direction: Vector3,
    length: number,
): Vector3 {
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
function createSegment(
    start: Vector3,
    end: Vector3,
    startRadius: number,
    endRadius: number,
): Mesh {
    const dir = new Vector3().subVectors(end, start);
    const length = dir.length();
    const geom = new CylinderGeometry(endRadius, startRadius, length);
    const material = new MeshBasicMaterial({ color: 0x8b4513 });
    const mesh = new Mesh(geom, material);
    const center = new Vector3().addVectors(start, end).multiplyScalar(0.5);

    // mesh.position.copy(center);

    // mesh.position.y -= length / 2;

    // const angle = dir.angleTo(new Vector3(0, 1, 0));
    // const rotAx = new Vector3().crossVectors(new Vector3(0, 1, 0), dir);
    //
    // mesh.setRotationFromAxisAngle(rotAx, angle);
    return mesh;
}

function drawDebugPoint(
    position: Vector3,
    scene: Scene,
    color: ColorRepresentation = 0xff0000,
) {
    const geom = new SphereGeometry(0.01);
    const point = new Mesh(geom, new MeshBasicMaterial({ color: color }));
    point.position.copy(position);
    scene.add(point);
}

function createScene(): void {
    const scene = new Scene();
    const camera = new PerspectiveCamera(
        75,
        window.innerWidth / window.innerHeight,
        0.1,
        1000,
    );

    const renderer = new WebGLRenderer();
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    const groundPlane = new PlaneGeometry(4, 4, 2, 2);
    const groundPlaneMaterial = new MeshBasicMaterial({ color: 0x00ff00 });
    const ground = new Mesh(groundPlane, groundPlaneMaterial);

    // we need to make the ground look like the ground.
    ground.rotateOnWorldAxis(new Vector3(1, 0, 0), Math.PI * (-90 / 180));

    scene.add(ground);

    const currentGrammar = grammar[0];
    const currentAxiom = currentGrammar.axiom;
    const currentRules = currentGrammar.rules;

    let currentPosition = new Vector3(0, 0, 0);
    let currentDirection = new Vector3(0, 1, 0).normalize();
    let lengthFactor = 0.5;
    let currentRadius = 0.1;
    let currentAngle = 0;
    const iterations = 4;
    const state: State[] = [];

    let renderedCommands = currentAxiom;
    for (let i = 0; i < iterations; i++) {
        renderedCommands += applyRules(renderedCommands, currentRules);
    }

    for (let i = 0; i < renderedCommands.length; i++) {
        const command = renderedCommands[i];

        switch (command) {
            case 'F':
                const dst = computeDestination(
                    currentPosition,
                    currentDirection,
                    lengthFactor,
                );
                drawDebugPoint(currentPosition, scene);
                drawDebugPoint(dst, scene);
                scene.add(
                    new ArrowHelper(
                        currentDirection.normalize(),
                        currentPosition,
                        lengthFactor,
                    ),
                );

                // scene.add(
                //     createSegment(
                //         currentPosition,
                //         dst,
                //         currentRadius,
                //         currentRadius,
                //     ),
                // );

                currentPosition = dst;

                lengthFactor *= 0.9;

                break;
            case '+':
                currentAngle += 20;
                currentDirection = randomDirectionVector(
                    Math.PI * (currentAngle / 180),
                );
                currentDirection.normalize();
                break;
            case '-':
                currentAngle -= 20;
                currentDirection = randomDirectionVector(
                    Math.PI * (currentAngle / 180),
                );
                currentDirection.normalize();
                break;
            case '[':
                state.push({
                    position: currentPosition.clone(),
                    direction: currentDirection.clone(),
                    angle: currentAngle,
                    length: lengthFactor,
                    radius: currentRadius,
                });
                break;
            case ']':
                const saved = state.pop();
                if (!saved) {
                    drawDebugPoint(currentPosition, scene, 0x00ff00);
                    break;
                }
                currentPosition = saved.position;
                currentDirection = saved.direction;
                currentRadius = saved.radius;
                currentAngle = saved.angle;
                lengthFactor = saved.length;
                drawDebugPoint(currentPosition, scene, 0x00ff00);
                break;
        }
    }

    const orbitControls = new OrbitControls(camera, renderer.domElement);
    // we want the camera to slowly rotate.
    orbitControls.autoRotate = true;
    // we want the plane to be viewed from the top down.
    orbitControls.maxPolarAngle = Math.PI * (80 / 180);
    camera.position.z = 4;

    function animate(): void {
        // orbit the camera and render any changes.
        orbitControls.update();
        renderer.render(scene, camera);
    }

    renderer.setAnimationLoop(animate);
}

init();
