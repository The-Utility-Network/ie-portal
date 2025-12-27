'use client';

import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { Entity, Scene } from 'aframe-react';

// Define the interface for the InteractionState system
interface InteractionStateSystem {
  userInteracting: boolean;
  lastInteractionTime: number;
}

// Define the props for VRScene
interface VRSceneProps {
  onLoad: () => void;
}

// Dynamically import A-Frame to ensure it runs only on the client side
const VRScene: React.FC<VRSceneProps> = ({ onLoad }) => {
  const [isAframeLoaded, setIsAframeLoaded] = useState(false);

  useEffect(() => {
    // Simulate loading process (you can adjust or remove the timeout based on actual loading needs)
    const loadTimer = setTimeout(() => {
      onLoad();
    }, 2000); // 2 seconds loading time simulation

    return () => clearTimeout(loadTimer);
  }, [onLoad]);

  useEffect(() => {
    const loadAframe = async () => {
      try {
        // Dynamically import A-Frame
        const aframeModule = await import('aframe');
        const aframe = aframeModule.default;

        // Register the InteractionState system if not already registered
        if (!aframe.systems['interactionState']) {
          aframe.registerSystem('interactionState', {
            init: function () {
              this.userInteracting = false;
              this.lastInteractionTime = Date.now();
            },
            userInteracting: false,
            lastInteractionTime: 0,
          });
        }

        // Register the auto-rotate component if not already registered
        if (!aframe.components['auto-rotate']) {
          aframe.registerComponent('auto-rotate', {
            init: function () {
              this.el.object3D.rotation.y = 0; // Set initial rotation
            },
            tick: function () {
              const interactionState = this.el.sceneEl?.systems['interactionState'] as InteractionStateSystem | undefined;
              if (interactionState) {
                const timeSinceLastInteraction = Date.now() - interactionState.lastInteractionTime;
                if (!interactionState.userInteracting || timeSinceLastInteraction > 30000) { // 30 seconds
                  this.el.object3D.rotation.y += 0.001; // Adjust rotation speed as needed
                }
              }
            },
          });
        }

        // Register the detect-user-interaction component if not already registered
        if (!aframe.components['detect-user-interaction']) {
          aframe.registerComponent('detect-user-interaction', {
            init: function () {
              // Bind event handlers
              this.onUserInteraction = this.onUserInteraction.bind(this);

              // Add event listeners for user interactions
              this.el.sceneEl?.addEventListener('mousedown', this.onUserInteraction);
              this.el.sceneEl?.addEventListener('touchstart', this.onUserInteraction);
              this.el.sceneEl?.addEventListener('camera-set-active', (event: Event) => {
                const detailEvent = event as unknown as { detail: { cameraEl: { addEventListener: (arg0: string, arg1: any) => void } } };
                if (detailEvent?.detail?.cameraEl) {
                  detailEvent.detail.cameraEl.addEventListener('trackpaddown', this.onUserInteraction);
                }
              });
            },
            onUserInteraction: function () {
              const interactionState = this.el.sceneEl?.systems['interactionState'] as InteractionStateSystem | undefined;
              if (interactionState) {
                interactionState.userInteracting = true;
                interactionState.lastInteractionTime = Date.now();

                // Reset userInteracting after 30 seconds of inactivity
                setTimeout(() => {
                  interactionState.userInteracting = false;
                }, 30000);
              }
            },
          });
        }

        // After registering components and systems, set A-Frame as loaded
        setIsAframeLoaded(true);
      } catch (error) {
        console.error('Error loading A-Frame:', error);
      }
    };

    loadAframe();
  }, []);

  // Render a loading message while A-Frame is being loaded
  if (!isAframeLoaded) {
    return <p></p>;
  }

  return (
    <Scene
      embedded
      detect-user-interaction
      auto-rotate
      device-orientation-permission-ui="enabled: false"
      background="color: #000000"
      style={{ width: '100%', height: '100vh' }}
    >
      {/* Large sphere serving as the VR background */}
      <Entity
        primitive="a-sphere"
        src="/radio.jpg" // Ensure this image is in your public directory
        radius="1000"
        segments-width="100"
        segments-height="100"
        position="0 0 0"
        scale="-1 1 1" // Invert the sphere to make the texture visible from inside
        material="side: double; src: url(/radio.jpg)"
        auto-rotate
      />

      {/* Camera entity with look-controls enabled */}
      <Entity
        primitive="a-camera"
        position="0 0 0"
        look-controls="enabled: true"
        wasd-controls-enabled="false" // Disable default WASD controls if not needed
      >
        {/* Optionally, add cursor or other interactive components here */}
      </Entity>
    </Scene>
  );
};

export default VRScene;
