// src/components/ARLotteryView.js - Обновленная версия с анимированными сундуками и звуком
import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { ClipLoader } from "react-spinners";
import * as THREE from "three";
import { ARButton } from "three/examples/jsm/webxr/ARButton.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

const ARLotteryView = () => {
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [ticket, setTicket] = useState(null);
  const [arStarted, setArStarted] = useState(false);
  const [isWebXRSupported, setIsWebXRSupported] = useState(null);
  const [isIOS, setIsIOS] = useState(false);
  const [logs, setLogs] = useState([]);
  const [is3DMode, setIs3DMode] = useState(false);
  const [animationPlayed, setAnimationPlayed] = useState(false);

  // Sound effects
  const [sounds, setSounds] = useState({
    chestOpen: null,
    chestClose: null,
    win: null,
    lose: null,
    pirateWin: null,
    pirateLose: null,
  });

  const containerRef = useRef(null);
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const cameraRef = useRef(null);
  const objectRef = useRef(null);
  const mixerRef = useRef(null);
  const controlsRef = useRef(null);
  const clock = useRef(new THREE.Clock());
  const listener = useRef(null);
  const audioLoader = useRef(null);
  const navigate = useNavigate();

  const addLog = (message) => {
    setLogs((prev) => [...prev, message].slice(-10));
  };

  // Проверка платформы и WebXR
  useEffect(() => {
    const iosRegex = /iPad|iPhone|iPod/i;
    const isIOSDevice = iosRegex.test(navigator.userAgent) && !window.MSStream;
    setIsIOS(isIOSDevice);
    addLog(`Платформа: ${isIOSDevice ? "iOS" : "Не iOS"}`);

    const checkWebXR = async () => {
      if (!navigator.xr) {
        setIsWebXRSupported(false);
        addLog("WebXR не поддерживается");
        return;
      }
      try {
        const isSupported = await navigator.xr.isSessionSupported("immersive-ar");
        setIsWebXRSupported(isSupported);
        addLog(`WebXR поддерживается: ${isSupported}`);
      } catch (err) {
        setIsWebXRSupported(false);
        addLog(`Ошибка проверки WebXR: ${err.message}`);
      }
    };
    checkWebXR();
  }, []);

  // Получаем данные билета
  useEffect(() => {
    const fetchTicket = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("ar_lottery_tickets")
          .select("*")
          .eq("id", id)
          .single();

        if (error) throw error;
        setTicket(data);

        if (!data.viewed) {
          await supabase
            .from("ar_lottery_tickets")
            .update({ viewed: true })
            .eq("id", id);
        }
      } catch (err) {
        addLog(`Ошибка при получении билета: ${err.message}`);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchTicket();
  }, [id]);

  // Загрузка звуковых эффектов
  const loadSounds = (scene) => {
    if (!listener.current) {
      listener.current = new THREE.AudioListener();
      if (cameraRef.current) {
        cameraRef.current.add(listener.current);
      }
    }

    if (!audioLoader.current) {
      audioLoader.current = new THREE.AudioLoader();
    }

    const soundsToLoad = {
      chestOpen: { url: '/sounds/chest_open.mp3', volume: 0.5 },
      chestClose: { url: '/sounds/chest_close.mp3', volume: 0.3 },
      win: { url: '/sounds/win.mp3', volume: 0.5 },
      lose: { url: '/sounds/lose.mp3', volume: 0.5 },
      pirateWin: { url: '/sounds/pirate_win.mp3', volume: 0.7 },
      pirateLose: { url: '/sounds/pirate_lose.mp3', volume: 0.7 },
    };

    Object.entries(soundsToLoad).forEach(([key, { url, volume }]) => {
      const sound = new THREE.Audio(listener.current);
      try {
        audioLoader.current.load(
          url,
          (buffer) => {
            sound.setBuffer(buffer);
            sound.setVolume(volume);
            sound.setLoop(false);
            setSounds((prev) => ({ ...prev, [key]: sound }));
            addLog(`Звук ${key} загружен`);
          },
          (progress) => {},
          (error) => {
            addLog(`Ошибка загрузки звука ${key}: ${error.message}`);
            setSounds((prev) => ({ ...prev, [key]: null }));
          }
        );
      } catch (err) {
        addLog(`Ошибка при загрузке звука ${key}: ${err.message}`);
      }
    });
  };

  // Воспроизведение звука
  const playSound = (soundName) => {
    if (sounds[soundName] && sounds[soundName].buffer) {
      if (sounds[soundName].isPlaying) {
        sounds[soundName].stop();
      }
      sounds[soundName].play();
      addLog(`Воспроизведение звука: ${soundName}`);
    } else {
      addLog(`Звук ${soundName} не загружен`);
    }
  };

  // Воспроизведение конкретной анимации
  const playSpecificAnimation = (animationName, isWin) => {
    if (mixerRef.current && objectRef.current) {
      try {
        const animations = {};
        if (objectRef.current.animations) {
          objectRef.current.animations.forEach((clip) => {
            animations[clip.name] = mixerRef.current.clipAction(clip);
          });
        } else if (mixerRef.current._root && mixerRef.current._root.animations) {
          mixerRef.current._root.animations.forEach((clip) => {
            animations[clip.name] = mixerRef.current.clipAction(clip);
          });
        }
        console.log("Доступные анимации:", Object.keys(animations));
        let actionToPlay;
        // Проверяйте имена анимаций в вашей модели (например, в Blender или glTF Viewer)
        if (isWin) {
          actionToPlay = animations["Armature|Exaggerated Opening"] || Object.values(animations)[0];
        } else {
          actionToPlay = animations["Armature|Taunting Close"] || (Object.values(animations)[1] || Object.values(animations)[0]);
        }
        if (actionToPlay) {
          Object.values(animations).forEach((action) => {
            if (action.isRunning()) action.stop();
          });
          actionToPlay.setLoop(THREE.LoopOnce);
          actionToPlay.clampWhenFinished = true;
          actionToPlay.reset().play();
          playSound("chestOpen");
          setTimeout(() => {
            if (isWin) {
              playSound("win");
              setTimeout(() => playSound("pirateWin"), 500);
            } else {
              playSound("lose");
              setTimeout(() => playSound("pirateLose"), 500);
            }
          }, 1000);
          setAnimationPlayed(true);
        } else {
          console.error("Не удалось найти нужную анимацию");
        }
      } catch (err) {
        console.error("Ошибка при воспроизведении анимации:", err);
      }
    }
  };

  // Инициализация 3D режима
  const init3DMode = async () => {
    addLog("Инициализация 3D режима");
    try {
      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0x000020);
      sceneRef.current = scene;

      const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 20);
      camera.position.set(0, 0.5, 2);
      cameraRef.current = camera;

      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setPixelRatio(window.devicePixelRatio);
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.setClearColor(0x000000, 0);
      renderer.outputEncoding = THREE.sRGBEncoding;
      renderer.xr.enabled = isWebXRSupported;
      rendererRef.current = renderer;
      containerRef.current.appendChild(renderer.domElement);
      addLog("Рендерер инициализирован");

      const controls = new OrbitControls(camera, renderer.domElement);
      controls.target.set(0, 0, 0);
      controls.update();
      controls.enablePan = false;
      controls.enableDamping = true;
      controlsRef.current = controls;

      const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
      scene.add(ambientLight);
      const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
      directionalLight.position.set(0, 1, 1);
      scene.add(directionalLight);
      const spotLight = new THREE.SpotLight(0xffffcc, 1);
      spotLight.position.set(0, 2, 0);
      spotLight.angle = Math.PI / 4;
      spotLight.penumbra = 0.1;
      spotLight.decay = 2;
      spotLight.distance = 10;
      scene.add(spotLight);

      const floorGeometry = new THREE.PlaneGeometry(4, 4);
      const floorMaterial = new THREE.MeshStandardMaterial({
        color: 0xaa7744,
        roughness: 0.8,
        metalness: 0.2,
      });
      const floor = new THREE.Mesh(floorGeometry, floorMaterial);
      floor.rotation.x = -Math.PI / 2;
      floor.position.y = -0.3;
      scene.add(floor);

      loadSounds(scene);

      const loader = new GLTFLoader();
      // Для единой модели замените на: const chestModelPath = "/models/treasure_chest_animation.glb";
      const chestModelPath = ticket?.is_win ? "/models/treasure_chest_win.glb" : "/models/treasure_chest_lose.glb";

      loader.load(
        chestModelPath,
        (gltf) => {
          console.log("====== АНИМАЦИИ В МОДЕЛИ ======");
          if (gltf.animations && gltf.animations.length > 0) {
            gltf.animations.forEach((anim, index) => {
              console.log(`Анимация ${index}: "${anim.name}", продолжительность: ${anim.duration}s`);
            });
          } else {
            console.log("В модели нет анимаций!");
          }

          const model = gltf.scene;
          model.scale.set(0.5, 0.5, 0.5);
          model.position.set(0, 0, -0.5);
          model.rotation.y = Math.PI / 4;
          scene.add(model);
          objectRef.current = model;
          addLog("Модель сундука загружена");

          if (gltf.animations && gltf.animations.length > 0) {
            mixerRef.current = new THREE.AnimationMixer(model);
            const animations = {};
            gltf.animations.forEach((clip) => {
              const action = mixerRef.current.clipAction(clip);
              animations[clip.name] = action;
              addLog(`Анимация загружена: ${clip.name}`);
            });
            mixerRef.current.addEventListener("finished", (e) => {
              addLog("Анимация завершена");
            });
            setTimeout(() => {
              playSpecificAnimation(null, ticket.is_win);
            }, 2000);
          } else {
            addLog("Анимации не найдены");
          }
        },
        (progress) => {
          const percent = Math.round((progress.loaded / progress.total) * 100);
          addLog(`Загрузка модели: ${percent}%`);
        },
        (err) => {
          addLog(`Ошибка загрузки модели: ${err.message}`);
          const boxGeometry = new THREE.BoxGeometry(0.5, 0.3, 0.4);
          const boxMaterial = new THREE.MeshStandardMaterial({
            color: ticket?.is_win ? 0xffd700 : 0x8b4513,
            roughness: 0.7,
            metalness: 0.3,
          });
          const box = new THREE.Mesh(boxGeometry, boxMaterial);
          const lidGeometry = new THREE.BoxGeometry(0.5, 0.1, 0.4);
          const lidMaterial = new THREE.MeshStandardMaterial({
            color: ticket?.is_win ? 0xffd700 : 0x8b4513,
            roughness: 0.7,
            metalness: 0.3,
          });
          const lid = new THREE.Mesh(lidGeometry, lidMaterial);
          lid.position.y = 0.2;
          const chest = new THREE.Group();
          chest.add(box);
          chest.add(lid);
          chest.position.set(0, 0, -0.5);
          scene.add(chest);
          objectRef.current = chest;
          addLog("Создан простой сундук");
        }
      );

      const animate = () => {
        requestAnimationFrame(animate);
        if (controlsRef.current) {
          controlsRef.current.update();
        }
        if (mixerRef.current) {
          const delta = clock.current.getDelta();
          mixerRef.current.update(delta);
        }
        if (objectRef.current && !mixerRef.current) {
          objectRef.current.rotation.y += 0.005;
        }
        renderer.render(scene, camera);
      };

      animate();
      setIs3DMode(true);
      setArStarted(true);

      const handleResize = () => {
        if (cameraRef.current && rendererRef.current) {
          cameraRef.current.aspect = window.innerWidth / window.innerHeight;
          cameraRef.current.updateProjectionMatrix();
          rendererRef.current.setSize(window.innerWidth, window.innerHeight);
        }
      };

      window.addEventListener("resize", handleResize);
      return () => {
        window.removeEventListener("resize", handleResize);
      };
    } catch (err) {
      addLog(`Ошибка при инициализации 3D режима: ${err.message}`);
      setError(`Не удалось запустить 3D режим: ${err.message}`);
    }
  };

  // Инициализация AR режима
  const initAR = async () => {
    addLog("Инициализация AR режима");
    if (!isWebXRSupported || isIOS) {
      addLog("WebXR не поддерживается, запуск 3D режима");
      init3DMode();
      return;
    }

    try {
      const scene = new THREE.Scene();
      sceneRef.current = scene;
      const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 20);
      cameraRef.current = camera;
      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setPixelRatio(window.devicePixelRatio);
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.setClearColor(0x000000, 0);
      renderer.xr.enabled = true;
      rendererRef.current = renderer;
      containerRef.current.appendChild(renderer.domElement);

      const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
      scene.add(ambientLight);
      const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
      directionalLight.position.set(0, 1, 1);
      scene.add(directionalLight);

      loadSounds(scene);

      const loader = new GLTFLoader();
      // Для единой модели замените на: const chestModelPath = "/models/treasure_chest_animation.glb";
      const chestModelPath = ticket?.is_win ? "/models/treasure_chest_win.glb" : "/models/treasure_chest_lose.glb";

      loader.load(
        chestModelPath,
        (gltf) => {
          const model = gltf.scene;
          model.scale.set(0.2, 0.2, 0.2);
          model.position.set(0, 0, -0.5);
          model.visible = true;
          scene.add(model);
          objectRef.current = model;
          if (gltf.animations && gltf.animations.length > 0) {
            mixerRef.current = new THREE.AnimationMixer(model);
            const animations = {};
            gltf.animations.forEach((clip) => {
              const action = mixerRef.current.clipAction(clip);
              animations[clip.name] = action;
            });
          }
        },
        undefined,
        (err) => {
          addLog(`Ошибка загрузки модели: ${err.message}`);
          const boxGeometry = new THREE.BoxGeometry(0.2, 0.1, 0.15);
          const boxMaterial = new THREE.MeshStandardMaterial({
            color: ticket?.is_win ? 0xffd700 : 0x8b4513,
          });
          const box = new THREE.Mesh(boxGeometry, boxMaterial);
          box.position.set(0, 0, -0.5);
          scene.add(box);
          objectRef.current = box;
        }
      );

      try {
        const button = ARButton.createButton(renderer, {
          requiredFeatures: ["hit-test"],
          optionalFeatures: ["dom-overlay"],
          domOverlay: { root: document.body },
        });
        document.body.appendChild(button);

        renderer.xr.addEventListener("sessionstart", () => {
          addLog("WebXR сессия начата");
          if (objectRef.current) {
            objectRef.current.visible = false;
          }
          const controller = renderer.xr.getController(0);
          controller.addEventListener("select", () => {
            if (objectRef.current && !objectRef.current.visible) {
              objectRef.current.visible = true;
              objectRef.current.position.set(0, 0, -0.5).applyMatrix4(controller.matrixWorld);
              objectRef.current.quaternion.setFromRotationMatrix(controller.matrixWorld);
              setTimeout(() => {
                playSpecificAnimation(null, ticket.is_win);
              }, 2000);
            }
          });
          scene.add(controller);
        });

        renderer.xr.addEventListener("sessionend", () => {
          addLog("WebXR сессия завершена");
          setArStarted(false);
        });
      } catch (err) {
        addLog(`Ошибка при создании AR кнопки: ${err.message}`);
        init3DMode();
        return;
      }

      const animate = () => {
        renderer.setAnimationLoop((time, frame) => {
          if (mixerRef.current) {
            const delta = clock.current.getDelta();
            mixerRef.current.update(delta);
          }
          if (objectRef.current && !mixerRef.current) {
            objectRef.current.rotation.y += 0.01;
          }
          renderer.render(scene, camera);
        });
      };

      animate();
      setArStarted(true);
    } catch (err) {
      addLog(`Ошибка при инициализации AR: ${err.message}`);
      setError(`Не удалось запустить AR: ${err.message}`);
      init3DMode();
    }
  };

  // Очистка ресурсов
  useEffect(() => {
    return () => {
      Object.values(sounds).forEach((sound) => {
        if (sound && sound.isPlaying) {
          sound.stop();
        }
      });
      if (rendererRef.current) {
        rendererRef.current.setAnimationLoop(null);
        rendererRef.current.dispose();
        if (containerRef.current && rendererRef.current.domElement) {
          containerRef.current.removeChild(rendererRef.current.domElement);
        }
      }
      const arButton = document.querySelector("button.webxr-button");
      if (arButton) {
        arButton.remove();
      }
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <ClipLoader size={40} color="#000" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
          <h2 className="text-2xl font-bold text-black mb-4 text-center">Ошибка</h2>
          <p className="text-red-600 text-center">{error}</p>
          <button
            onClick={() => navigate("/dashboard")}
            className="mt-4 w-full py-2 px-4 bg-yellow-500 text-black font-semibold rounded-md hover:bg-yellow-600"
          >
            Вернуться на главную
          </button>
        </div>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
          <h2 className="text-2xl font-bold text-black mb-4 text-center">Билет не найден</h2>
          <p className="text-gray-700 text-center">Билет AR лотереи не найден или был удален.</p>
          <button
            onClick={() => navigate("/dashboard")}
            className="mt-4 w-full py-2 px-4 bg-yellow-500 text-black font-semibold rounded-md hover:bg-yellow-600"
          >
            Вернуться на главную
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen relative">
      <div ref={containerRef} className="absolute inset-0"></div>
      {!arStarted ? (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-70">
          <div className="text-center text-white p-6 max-w-md bg-gray-800 bg-opacity-80 rounded-lg border border-yellow-500">
            <h2 className="text-2xl font-bold mb-6">Сундук с сокровищами</h2>
            <div className="mb-8">
              {ticket.is_win ? (
                <div className="text-center">
                  <div className="text-5xl mb-2">💰</div>
                  <p className="text-xl text-yellow-400 font-bold">
                    Поздравляем! Вы выиграли {ticket.win_amount} ₽
                  </p>
                </div>
              ) : (
                <div className="text-center">
                  <div className="text-5xl mb-2">📦</div>
                  <p className="text-xl text-gray-300">К сожалению, вы не выиграли в этот раз</p>
                </div>
              )}
            </div>
            <p className="mb-6">
              Нажмите кнопку, чтобы увидеть результат вашей лотереи в виде анимированного сундука с
              сокровищами!
            </p>
            <button
              onClick={initAR}
              className="w-full px-6 py-3 bg-yellow-500 text-black font-bold rounded-lg hover:bg-yellow-600 transition-colors duration-300"
            >
              {isWebXRSupported ? "Запустить AR просмотр" : "Запустить 3D просмотр"}
            </button>
            <p className="mt-4 text-sm opacity-80">
              {isWebXRSupported
                ? "Направьте камеру на плоскую поверхность и нажмите, чтобы разместить сундук"
                : "Вы сможете вращать сундук касанием или мышью"}
            </p>
          </div>
        </div>
      ) : (
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-black bg-opacity-70 text-white">
          <div className="text-center">
            <h2 className="text-xl font-bold mb-2">
              {ticket.is_win
                ? `Поздравляем! Вы выиграли ${ticket.win_amount} ₽`
                : "К сожалению, сундук оказался пуст"}
            </h2>
            <div className="flex justify-center space-x-4 mt-4">
              <button
                onClick={() => {
                  if (mixerRef.current) {
                    setAnimationPlayed(false);
                    playSpecificAnimation(null, ticket.is_win);
                  }
                }}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Повторить анимацию
              </button>
              <button
                onClick={() => navigate("/dashboard")}
                className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
              >
                Вернуться на главную
              </button>
            </div>
          </div>
        </div>
      )}
      <div
        className="absolute top-4 left-4 right-4 bg-black bg-opacity-50 text-white p-2 max-h-40 overflow-y-auto"
        style={{ display: "none" }}
      >
        {logs.map((log, index) => (
          <p key={index} className="text-xs">
            {log}
          </p>
        ))}
      </div>
    </div>
  );
};

export default ARLotteryView;