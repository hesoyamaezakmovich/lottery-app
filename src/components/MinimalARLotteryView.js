import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { ClipLoader } from 'react-spinners';
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

// Improved AR/3D viewer with multiple fixes
function MinimalARLotteryView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [ticket, setTicket] = useState(null);
  const [debugLog, setDebugLog] = useState([]);
  const [ar3DMode, setAr3DMode] = useState('none'); // 'none', 'ar', '3d'
  const [showDebug, setShowDebug] = useState(false);
  
  // Refs for Three.js and WebXR
  const containerRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const rendererRef = useRef(null);
  const xrSessionRef = useRef(null);
  const objectRef = useRef(null);
  const reticleRef = useRef(null);
  const controlsRef = useRef(null);
  const mixerRef = useRef(null);
  const clockRef = useRef(new THREE.Clock());
  const animationFrameRef = useRef(null);
  
  // Logging function for debugging
  const addLog = (message) => {
    console.log(`[AR] ${message}`);
    setDebugLog(prev => [...prev, `${message}`].slice(-15));
  };
  
  // Fetch ticket data
  useEffect(() => {
    const fetchTicket = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from("ar_lottery_tickets")
          .select("*")
          .eq("id", id)
          .single();
          
        if (error) throw error;
        setTicket(data);
        addLog(`Ticket loaded: ID ${id}, win: ${data.is_win ? 'yes' : 'no'}`);
      } catch (err) {
        setError(`Error loading ticket: ${err.message}`);
        addLog(`Error: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };
    
    fetchTicket();
  }, [id]);

  // Clean up resources when unmounting
  useEffect(() => {
    return () => {
      if (xrSessionRef.current) {
        xrSessionRef.current.end().catch(console.error);
      }
      
      if (rendererRef.current) {
        rendererRef.current.setAnimationLoop(null);
        rendererRef.current.dispose();
      }
      
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      
      // Reset body styles
      document.body.classList.remove('ar-active');
      document.body.style.background = '';
      document.body.style.backgroundColor = '';
    };
  }, []);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (cameraRef.current && rendererRef.current) {
        cameraRef.current.aspect = window.innerWidth / window.innerHeight;
        cameraRef.current.updateProjectionMatrix();
        rendererRef.current.setSize(window.innerWidth, window.innerHeight);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  // Initialize basic 3D scene (fallback mode)
  const init3DScene = () => {
    if (!containerRef.current) return;
    addLog('Initializing 3D mode');
    
    try {
      // Clear container
      while (containerRef.current.firstChild) {
        containerRef.current.removeChild(containerRef.current.firstChild);
      }
      
      // Create scene
      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0x6633aa); // Purple background for 3D mode
      sceneRef.current = scene;
      
      // Create camera
      const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
      camera.position.z = 3;
      cameraRef.current = camera;
      
      // Create renderer
      const renderer = new THREE.WebGLRenderer({ antialias: true });
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      rendererRef.current = renderer;
      
      // Add canvas to page
      containerRef.current.appendChild(renderer.domElement);
      
      // Add lights
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
      scene.add(ambientLight);
      
      const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
      directionalLight.position.set(1, 2, 3);
      scene.add(directionalLight);
      
      // Create a cube or chest model
      const geometry = new THREE.BoxGeometry(1, 0.8, 0.7);
      const material = new THREE.MeshStandardMaterial({ 
        color: ticket && ticket.is_win ? 0xffcc00 : 0xcccccc,
        roughness: 0.4,
        metalness: 0.6
      });
      const cube = new THREE.Mesh(geometry, material);
      scene.add(cube);
      objectRef.current = cube;
      
      // Add OrbitControls for interactive rotation
      const controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.05;
      controlsRef.current = controls;
      
      // Animation loop
      const animate = () => {
        if (objectRef.current) {
          // Subtle automatic rotation
          objectRef.current.rotation.y += 0.005;
        }
        
        if (controlsRef.current) {
          controlsRef.current.update();
        }
        
        if (rendererRef.current && sceneRef.current && cameraRef.current) {
          rendererRef.current.render(sceneRef.current, cameraRef.current);
        }
        
        animationFrameRef.current = requestAnimationFrame(animate);
      };
      
      animate();
      addLog('3D scene initialized successfully');
      
    } catch (err) {
      addLog(`Error initializing 3D: ${err.message}`);
      setError(`3D Error: ${err.message}`);
    }
  };
  
  // Initialize AR mode
  const initAR = async () => {
    if (!containerRef.current) return;
    addLog('Initializing AR mode');
    
    try {
      // Explicitly request camera permissions before launching AR
      try {
        addLog('Requesting camera permission...');
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: {
            facingMode: 'environment', // Use back camera
            width: { ideal: window.innerWidth },
            height: { ideal: window.innerHeight }
          } 
        });
        stream.getTracks().forEach(track => track.stop());
        addLog('Camera permission granted');
      } catch (err) {
        addLog(`Camera access error: ${err.message}`);
        throw new Error(`Camera access required for AR. ${err.message}`);
      }
      
      // Check WebXR support
      if (!navigator.xr) {
        throw new Error('WebXR not supported in this browser');
      }
      
      const isArSupported = await navigator.xr.isSessionSupported('immersive-ar');
      if (!isArSupported) {
        throw new Error('AR not supported on this device');
      }
      
      // Clear container
      while (containerRef.current.firstChild) {
        containerRef.current.removeChild(containerRef.current.firstChild);
      }
      
      // Set transparent background for AR session
      document.body.classList.add('ar-active');
      
      // Create scene with transparent background
      const scene = new THREE.Scene();
      sceneRef.current = scene;
      
      // Create camera
      const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 20);
      cameraRef.current = camera;
      
      // Create renderer with transparent background for AR
      const renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: true,
        logarithmicDepthBuffer: true
      });
      renderer.setPixelRatio(window.devicePixelRatio);
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.xr.enabled = true;
      renderer.setClearColor(0x000000, 0); // Completely transparent background
      rendererRef.current = renderer;
      
      // Add canvas to page with proper styles
      const canvas = renderer.domElement;
      canvas.style.position = 'absolute';
      canvas.style.top = '0';
      canvas.style.left = '0';
      canvas.style.width = '100%';
      canvas.style.height = '100%';
      canvas.style.zIndex = '10000';
      canvas.style.background = 'transparent';
      containerRef.current.appendChild(canvas);
      
      // Add lights
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
      scene.add(ambientLight);
      
      const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
      directionalLight.position.set(0, 5, 10);
      scene.add(directionalLight);
      
      // Create treasure chest model (simple box for now)
      const geometry = new THREE.BoxGeometry(0.15, 0.12, 0.1);
      const material = new THREE.MeshStandardMaterial({
        color: ticket && ticket.is_win ? 0xffdd00 : 0xcccccc,
        roughness: 0.3,
        metalness: 0.8
      });
      const chest = new THREE.Mesh(geometry, material);
      scene.add(chest);
      chest.visible = false; // Hide until placed
      objectRef.current = chest;
      
      // Create reticle for placement
      const reticle = new THREE.Mesh(
        new THREE.RingGeometry(0.08, 0.11, 32).rotateX(-Math.PI / 2),
        new THREE.MeshBasicMaterial({ color: 0xffffff })
      );
      reticle.matrixAutoUpdate = false;
      reticle.visible = false;
      scene.add(reticle);
      reticleRef.current = reticle;
      
      // Set up and start AR session
      addLog('Requesting AR session...');
      const session = await navigator.xr.requestSession('immersive-ar', {
        requiredFeatures: ['hit-test'],
        optionalFeatures: ['dom-overlay'],
        domOverlay: { root: document.body }
      });
      
      xrSessionRef.current = session;
      addLog('AR session created');
      
      // Set reference space and session
      await renderer.xr.setSession(session);
      renderer.xr.setReferenceSpaceType('local');
      
      let hitTestSource = null;
      let hitTestSourceRequested = false;
      
      // Handle tap to place the object
      session.addEventListener('select', () => {
        if (reticleRef.current && reticleRef.current.visible) {
          // Copy reticle position to place object
          if (objectRef.current) {
            objectRef.current.position.setFromMatrixPosition(reticleRef.current.matrix);
            objectRef.current.visible = true;
          }
          reticleRef.current.visible = false;
          addLog('Object placed');
        }
      });
      
      // Handle session end
      session.addEventListener('end', () => {
        xrSessionRef.current = null;
        addLog('AR session ended');
        document.body.classList.remove('ar-active');
        setAr3DMode('none');
      });
      
      // Animation loop for AR
      renderer.setAnimationLoop((timestamp, frame) => {
        if (!frame) return;
        
        // Handle hit testing for surface detection
        if (objectRef.current && !objectRef.current.visible) {
          if (!hitTestSource && !hitTestSourceRequested) {
            session.requestReferenceSpace('viewer').then((viewerSpace) => {
              session.requestHitTestSource({ space: viewerSpace }).then((source) => {
                hitTestSource = source;
                addLog('Hit test source created');
              }).catch(e => {
                addLog(`Hit test source error: ${e.message}`);
              });
            }).catch(e => {
              addLog(`Viewer space error: ${e.message}`);
            });
            
            hitTestSourceRequested = true;
          }
          
          if (hitTestSource && frame) {
            const referenceSpace = renderer.xr.getReferenceSpace();
            if (referenceSpace) {
              const hitTestResults = frame.getHitTestResults(hitTestSource);
              
              if (hitTestResults.length > 0) {
                const hit = hitTestResults[0];
                const hitPose = hit.getPose(referenceSpace);
                
                if (hitPose && reticleRef.current) {
                  reticleRef.current.visible = true;
                  reticleRef.current.matrix.fromArray(hitPose.transform.matrix);
                }
              } else if (reticleRef.current) {
                reticleRef.current.visible = false;
              }
            }
          }
        }
        
        // Update animations and render
        if (objectRef.current && objectRef.current.visible) {
          objectRef.current.rotation.y += 0.01;
        }
        
        if (mixerRef.current) {
          const delta = clockRef.current.getDelta();
          mixerRef.current.update(delta);
        }
        
        // Render scene
        if (rendererRef.current && sceneRef.current && cameraRef.current) {
          rendererRef.current.render(sceneRef.current, cameraRef.current);
        }
      });
      
      addLog('AR initialized successfully');
      
    } catch (err) {
      addLog(`Error initializing AR: ${err.message}`);
      setError(`AR Error: ${err.message}`);
      // Fallback to 3D mode if AR fails
      setAr3DMode('3d');
    }
  };
  
  // Start AR or 3D mode based on user choice
  useEffect(() => {
    if (ar3DMode === 'ar') {
      initAR();
    } else if (ar3DMode === '3d') {
      init3DScene();
    }
  }, [ar3DMode]);

  // Handle exiting AR session
  const handleExitAR = () => {
    if (xrSessionRef.current) {
      xrSessionRef.current.end().catch(console.error);
    }
  };

  // Loading screen
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <ClipLoader color="#fff" size={50} />
      </div>
    );
  }

  // Error screen
  if (error && ar3DMode === 'none') {
    return (
      <div className="min-h-screen flex items-center justify-center flex-col p-5 bg-gray-900 text-white">
        <h2 className="text-2xl font-bold text-red-500 mb-4">Error</h2>
        <p className="mb-6 text-center">{error}</p>
        <div className="flex gap-4">
          <button 
            onClick={() => setAr3DMode('3d')}
            className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Try 3D Mode Instead
          </button>
          <button 
            onClick={() => navigate('/dashboard')}
            className="px-5 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // Mode selection screen
  if (ar3DMode === 'none') {
    return (
      <div className="min-h-screen flex items-center justify-center flex-col p-5 bg-gray-900 text-white">
        <h2 className="text-3xl font-bold mb-8">Treasure Chest</h2>
        
        {ticket && (
          <div className="text-center mb-10">
            {ticket.is_win ? (
              <>
                <div className="text-6xl mb-4">💰</div>
                <p className="text-2xl font-bold text-yellow-400 mb-2">
                  Congratulations! You won {ticket.win_amount} ₽
                </p>
              </>
            ) : (
              <>
                <div className="text-6xl mb-4">📦</div>
                <p className="text-2xl text-gray-300 mb-2">
                  Sorry, no win this time
                </p>
              </>
            )}
          </div>
        )}
        
        <div className="flex flex-col gap-4 w-full max-w-xs">
          <button 
            onClick={() => setAr3DMode('ar')}
            className="px-6 py-4 bg-green-600 text-white rounded-xl font-bold text-lg hover:bg-green-700 transition-colors shadow-lg"
          >
            Launch AR Experience
          </button>
          
          <button 
            onClick={() => setAr3DMode('3d')}
            className="px-6 py-4 bg-blue-600 text-white rounded-xl font-bold text-lg hover:bg-blue-700 transition-colors shadow-lg"
          >
            3D View (No AR)
          </button>
          
          <button 
            onClick={() => navigate('/dashboard')}
            className="px-6 py-4 bg-gray-600 text-white rounded-xl text-lg hover:bg-gray-700 transition-colors mt-2"
          >
            Back to Dashboard
          </button>
        </div>
        
        <p className="mt-8 text-sm text-gray-400 max-w-md text-center">
          AR mode requires camera permissions and works only on compatible devices.
          If you encounter problems, try the 3D view instead.
        </p>
        
        <button 
          onClick={() => setShowDebug(!showDebug)} 
          className="mt-4 text-xs text-gray-500 underline"
        >
          {showDebug ? 'Hide Debug' : 'Show Debug'}
        </button>
      </div>
    );
  }

  // AR or 3D mode active
  return (
    <div className="relative w-screen h-screen">
      {/* Three.js container */}
      <div 
        ref={containerRef} 
        className={`fixed inset-0 w-full h-full ${ar3DMode === 'ar' ? 'bg-transparent' : 'bg-gray-900'}`}
      />
      
      {/* UI overlay */}
      <div className="fixed bottom-20 left-0 right-0 flex justify-center z-10">
        <div className="bg-black bg-opacity-70 text-white px-6 py-4 rounded-xl">
          <p className="font-bold mb-4 text-center text-lg">
            {ticket && ticket.is_win 
              ? `Congratulations! You won ${ticket.win_amount} ₽` 
              : "The chest is empty this time"}
          </p>
          <div className="flex justify-center gap-4">
            {ar3DMode === 'ar' && (
              <button
                onClick={handleExitAR}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Exit AR
              </button>
            )}
            <button
              onClick={() => {
                if (ar3DMode === 'ar' && xrSessionRef.current) {
                  xrSessionRef.current.end().catch(console.error);
                }
                navigate('/dashboard');
              }}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              Dashboard
            </button>
          </div>
        </div>
      </div>
      
      {/* AR placement instructions */}
      {ar3DMode === 'ar' && (
        <div className="fixed top-20 left-0 right-0 flex justify-center z-10">
          <div className="bg-black bg-opacity-70 text-white px-6 py-4 rounded-xl max-w-xs text-center">
            <p className="font-bold mb-1">Find a flat surface</p>
            <p className="text-sm">Tap to place the treasure chest</p>
          </div>
        </div>
      )}
      
      {/* Debug panel */}
      {showDebug && (
        <div className="fixed top-4 left-4 right-4 bg-black bg-opacity-80 text-white p-3 rounded-lg text-xs z-20 max-h-40 overflow-y-auto">
          <div className="flex justify-between items-center mb-1">
            <span className="font-bold">Debug</span>
            <button 
              onClick={() => setShowDebug(false)} 
              className="text-xs bg-red-600 px-2 py-0.5 rounded"
            >
              Close
            </button>
          </div>
          <p>Mode: {ar3DMode}</p>
          <p>AR session: {xrSessionRef.current ? 'active' : 'inactive'}</p>
          {debugLog.map((log, i) => (
            <div key={i} className="text-gray-300">{log}</div>
          ))}
        </div>
      )}
    </div>
  );
}

export default MinimalARLotteryView;