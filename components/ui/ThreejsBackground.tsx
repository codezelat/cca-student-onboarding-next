"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

export default function ThreejsBackground() {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        if (!canvasRef.current) return;

        const canvas = canvasRef.current;
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(
            75,
            window.innerWidth / window.innerHeight,
            0.1,
            1000,
        );
        const renderer = new THREE.WebGLRenderer({
            canvas: canvas,
            alpha: true,
            antialias: true,
        });

        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        camera.position.z = 25;

        // Create large, elegant geometric shapes
        const createShape = (
            geometry: THREE.BufferGeometry,
            color: number,
            emissive: number,
            position: { x: number; y: number; z: number },
            scale = 1,
        ) => {
            const material = new THREE.MeshPhongMaterial({
                color: color,
                emissive: emissive,
                emissiveIntensity: 0.3,
                shininess: 150,
                transparent: true,
                opacity: 0.25,
                side: THREE.DoubleSide,
            });
            const mesh = new THREE.Mesh(geometry, material);
            mesh.position.set(position.x, position.y, position.z);
            mesh.scale.set(scale, scale, scale);
            return mesh;
        };

        const shapes: {
            mesh: THREE.Mesh;
            wireMesh?: THREE.Mesh;
            rotSpeed: { x: number; y: number; z: number };
        }[] = [];

        // Large central icosahedron
        const centerIco = createShape(
            new THREE.IcosahedronGeometry(8, 1),
            0x8b5cf6,
            0x7c3aed,
            { x: 0, y: 0, z: -15 },
            1,
        );
        shapes.push({
            mesh: centerIco,
            rotSpeed: { x: 0.001, y: 0.002, z: 0.0005 },
        });
        scene.add(centerIco);

        // Large left octahedron
        const leftOcta = createShape(
            new THREE.OctahedronGeometry(6, 0),
            0xa855f7,
            0x9333ea,
            { x: -20, y: 8, z: -25 },
            1.2,
        );
        shapes.push({
            mesh: leftOcta,
            rotSpeed: { x: 0.0015, y: 0.001, z: 0.002 },
        });
        scene.add(leftOcta);

        // Large right dodecahedron
        const rightDodeca = createShape(
            new THREE.DodecahedronGeometry(5, 0),
            0x6366f1,
            0x4f46e5,
            { x: 20, y: -6, z: -20 },
            1.3,
        );
        shapes.push({
            mesh: rightDodeca,
            rotSpeed: { x: 0.002, y: 0.0015, z: 0.001 },
        });
        scene.add(rightDodeca);

        // Top tetrahedron
        const topTetra = createShape(
            new THREE.TetrahedronGeometry(7, 0),
            0xc084fc,
            0xa855f7,
            { x: -8, y: 15, z: -18 },
            1,
        );
        shapes.push({
            mesh: topTetra,
            rotSpeed: { x: 0.0012, y: 0.0018, z: 0.0008 },
        });
        scene.add(topTetra);

        // Bottom right torus
        const bottomTorus = createShape(
            new THREE.TorusGeometry(4.5, 1.2, 30, 100),
            0x818cf8,
            0x6366f1,
            { x: 15, y: -12, z: -22 },
            1.1,
        );
        shapes.push({
            mesh: bottomTorus,
            rotSpeed: { x: 0.0008, y: 0.002, z: 0.0015 },
        });
        scene.add(bottomTorus);

        // Add wireframe versions
        shapes.forEach((shape) => {
            const wireGeo = shape.mesh.geometry.clone();
            const wireMat = new THREE.MeshBasicMaterial({
                color: 0xffffff,
                wireframe: true,
                transparent: true,
                opacity: 0.08,
            });
            const wireMesh = new THREE.Mesh(wireGeo, wireMat);
            wireMesh.position.copy(shape.mesh.position);
            wireMesh.scale.copy(shape.mesh.scale);
            shape.wireMesh = wireMesh;
            scene.add(wireMesh);
        });

        // Premium lighting setup
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        scene.add(ambientLight);

        const keyLight = new THREE.DirectionalLight(0x8b5cf6, 1.5);
        keyLight.position.set(10, 10, 10);
        scene.add(keyLight);

        const fillLight = new THREE.DirectionalLight(0xa855f7, 1);
        fillLight.position.set(-10, 5, 5);
        scene.add(fillLight);

        const backLight = new THREE.DirectionalLight(0x6366f1, 0.8);
        backLight.position.set(0, -5, -10);
        scene.add(backLight);

        const pointLight1 = new THREE.PointLight(0xc084fc, 2, 50);
        pointLight1.position.set(15, 10, 5);
        scene.add(pointLight1);

        const pointLight2 = new THREE.PointLight(0x8b5cf6, 2, 50);
        pointLight2.position.set(-15, -10, 5);
        scene.add(pointLight2);

        // Mouse interaction
        let mouseX = 0;
        let mouseY = 0;

        const handleMouseMove = (event: MouseEvent) => {
            mouseX = (event.clientX / window.innerWidth) * 2 - 1;
            mouseY = -(event.clientY / window.innerHeight) * 2 + 1;
        };
        document.addEventListener("mousemove", handleMouseMove);

        // Animation loop
        let time = 0;
        let animationFrameId: number;

        const animate = () => {
            animationFrameId = requestAnimationFrame(animate);
            time += 0.01;

            camera.position.x += (mouseX * 4 - camera.position.x) * 0.05;
            camera.position.y += (mouseY * 3 - camera.position.y) * 0.05;
            camera.lookAt(0, 0, -15);

            shapes.forEach((shape, index) => {
                shape.mesh.rotation.x += shape.rotSpeed.x;
                shape.mesh.rotation.y += shape.rotSpeed.y;
                shape.mesh.rotation.z += shape.rotSpeed.z;

                if (shape.wireMesh) {
                    shape.wireMesh.rotation.copy(shape.mesh.rotation);
                }

                const floatOffset = time + (index * Math.PI) / 3;
                shape.mesh.position.y += Math.sin(floatOffset * 0.5) * 0.015;
                if (shape.wireMesh) {
                    shape.wireMesh.position.y = shape.mesh.position.y;
                }

                const breathe = 1 + Math.sin(time * 0.8 + index) * 0.03;
                shape.mesh.scale.setScalar(
                    shape.mesh.scale.x > 0 ? breathe : breathe,
                );
                if (shape.wireMesh) {
                    shape.wireMesh.scale.copy(shape.mesh.scale);
                }
            });

            pointLight1.position.x = Math.sin(time * 0.5) * 20 + 15;
            pointLight1.position.z = Math.cos(time * 0.5) * 10 + 5;

            pointLight2.position.x = Math.cos(time * 0.5) * 20 - 15;
            pointLight2.position.z = Math.sin(time * 0.5) * 10 + 5;

            renderer.render(scene, camera);
        };

        const handleResize = () => {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
            renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        };
        window.addEventListener("resize", handleResize);

        animate();

        return () => {
            window.removeEventListener("resize", handleResize);
            document.removeEventListener("mousemove", handleMouseMove);
            cancelAnimationFrame(animationFrameId);

            // Cleanup THREE.js resources
            scene.clear();
            renderer.dispose();

            shapes.forEach((shape) => {
                shape.mesh.geometry.dispose();
                (shape.mesh.material as THREE.Material).dispose();
                if (shape.wireMesh) {
                    shape.wireMesh.geometry.dispose();
                    (shape.wireMesh.material as THREE.Material).dispose();
                }
            });
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            className="fixed inset-0 w-full h-full -z-10"
            style={{
                position: "fixed",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
                zIndex: -10,
            }}
        />
    );
}
