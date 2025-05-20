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

  const [sounds, setSounds] = useState({
    chestOpen: null,
    chestClose: null,
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
  const hitTestSource = useRef(null);
  const hitTestSourceRequested = useRef(false);
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

  // Активация аудиоконтекста
  const activateAudioContext = () => {
    if (THREE.AudioContext.getContext().state === "suspended") {
      THREE.AudioContext.getContext().resume();
      addLog("Аудиоконтекст активирован");
    }
  };

  // Загрузка звуковых эффектов
  const loadSounds = (scene) => {
    if (!listener.current) {
      listener.current = new THREE.AudioListener();
      if (cameraRef.current) {
        cameraRef.current.add(listener.current);
        addLog("AudioListener привязан к камере");
      } else {
        addLog("Камера не готова для AudioListener");
      }
    }

    if (!audioLoader.current) {
      audioLoader.current = new THREE.AudioLoader();
    }

    const soundsToLoad = {
      chestOpen: { url: "/sounds/chest_open.mp3", volume: 1.0 },
      chestClose: { url: "/sounds/chest_close.mp3", volume: 0.8 },
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
            addLog(`Звук ${key} успешно загружен`);
          },
          (progress) => {
            if (progress.total > 0) {
              addLog(`Загрузка звука ${key}: ${Math.round((progress.loaded / progress.total) * 100)}%`);
            }
          },
          (error) => {
            addLog(`Ошибка загрузки звука ${key}: ${error.message}`);
            setSounds((prev) => ({ ...prev, [key]: null }));
          }
        );
      } catch (err) {
        addLog(`Исключение при загрузке звука ${key}: ${err.message}`);
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
      addLog(`Звук ${soundName} не загружен или отсутствует буфер`);
    }
  };

  // Воспроизведение конкретной анимации
  const playSpecificAnimation = (isWin) => {
    if (!mixerRef.current || !objectRef.current) {
      addLog("Миксер или объект не инициализированы");
      playSound(isWin ? "chestOpen" : "chestClose");
      if (objectRef.current) objectRef.current.visible = true; // Убедимся, что сундук виден
      setAnimationPlayed(true);
      return;
    }
  
    try {
      playSound(isWin ? "chestOpen" : "chestClose");
  
      const animations = {};
      let hasAnimations = false;
  
      if (objectRef.current.animations && objectRef.current.animations.length > 0) {
        objectRef.current.animations.forEach((clip) => {
          animations[clip.name] = mixerRef.current.clipAction(clip);
          hasAnimations = true;
        });
        addLog(`Найдены анимации объекта: ${Object.keys(animations).join(", ")}`);
      }
  
      if (!hasAnimations && mixerRef.current._root && mixerRef.current._root.animations && mixerRef.current._root.animations.length > 0) {
        mixerRef.current._root.animations.forEach((clip) => {
          animations[clip.name] = mixerRef.current.clipAction(clip);
          hasAnimations = true;
        });
        addLog(`Найдены анимации в миксере: ${Object.keys(animations).join(", ")}`);
      }
  
      if (hasAnimations) {
        const animationNames = Object.keys(animations);
        let actionToPlay;
  
        if (isWin) {
          actionToPlay = animationNames.find((name) => name.toLowerCase().includes("win"));
          if (actionToPlay) {
            actionToPlay = animations[actionToPlay];
            addLog(`Выбрана анимация выигрыша: ${actionToPlay._clip.name}`);
          }
        } else {
          actionToPlay = animationNames.find((name) => name.toLowerCase().includes("lose") || name.toLowerCase().includes("close"));
          if (actionToPlay) {
            actionToPlay = animations[actionToPlay];
            addLog(`Выбрана анимация проигрыша: ${actionToPlay._clip.name}`);
          }
        }
  
        if (!actionToPlay && animationNames.length > 0) {
          actionToPlay = animations[animationNames[0]];
          addLog(`Используется первая доступная анимация: ${animationNames[0]}`);
        }
  
        if (actionToPlay) {
          Object.values(animations).forEach((action) => {
            if (action.isRunning()) action.stop();
          });
          actionToPlay.setLoop(THREE.LoopOnce);
          actionToPlay.clampWhenFinished = true;
          actionToPlay.reset().play();
          addLog(`Запущена анимация: ${actionToPlay._clip.name}`);
          objectRef.current.visible = true;
          setAnimationPlayed(true);
        } else {
          addLog("Подходящая анимация не найдена");
        }
      } else {
        addLog("Анимации не найдены, применяется простая анимация");
        const startRotation = { x: objectRef.current.rotation.x, y: objectRef.current.rotation.y };
        const targetRotation = { x: isWin ? Math.PI / 6 : -Math.PI / 6, y: startRotation.y + Math.PI };
        const steps = 60;
        let currentStep = 0;
        const animateObject = () => {
          if (currentStep < steps) {
            objectRef.current.rotation.x = startRotation.x + (targetRotation.x - startRotation.x) * (currentStep / steps);
            objectRef.current.rotation.y = startRotation.y + (targetRotation.y - startRotation.y) * (currentStep / steps);
            currentStep++;
            requestAnimationFrame(animateObject);
          }
        };
        animateObject();
        objectRef.current.visible = true;
        setAnimationPlayed(true);
      }
    } catch (err) {
      addLog(`Ошибка воспроизведения анимации: ${err.message}`);
      playSound(isWin ? "chestOpen" : "chestClose");
      objectRef.current.visible = true;
      setAnimationPlayed(true);
    }
  };

  // Инициализация AR режима
  const initAR = async () => {
    if (!ticket) {
      addLog("Билет не загружен, невозможно инициализировать AR");
      setError("Билет не найден");
      return;
    }
  
    addLog("Инициализация AR режима");
    if (!isWebXRSupported || isIOS) {
      addLog("WebXR не поддерживается или устройство iOS, запуск 3D режима");
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
      if (containerRef.current) {
        containerRef.current.appendChild(renderer.domElement);
        addLog("Рендерер для AR инициализирован");
      } else {
        addLog("Контейнер не найден");
        throw new Error("Контейнер не найден");
      }
  
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
      scene.add(ambientLight);
      const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
      directionalLight.position.set(0, 1, 1);
      scene.add(directionalLight);
  
      loadSounds(scene);
      activateAudioContext();
  
      const loader = new GLTFLoader();
      const chestModelPath = ticket.is_win ? "/models/treasure_chest_win.glb" : "/models/treasure_chest_lose.glb";
  
      loader.load(
        chestModelPath,
        (gltf) => {
          const model = gltf.scene;
          model.scale.set(0.2, 0.2, 0.2); // Увеличим масштаб
          model.visible = false;
          scene.add(model);
          objectRef.current = model;
          addLog(`Модель сундука загружена для AR: ${chestModelPath}`);
  
          if (gltf.animations && gltf.animations.length > 0) {
            mixerRef.current = new THREE.AnimationMixer(model);
            gltf.animations.forEach((clip) => {
              const action = mixerRef.current.clipAction(clip);
              action.clampWhenFinished = true;
              addLog(`Анимация для AR: ${clip.name}, длительность: ${clip.duration}s`);
            });
          } else {
            addLog("Анимации не найдены в модели для AR");
          }
        },
        (progress) => {
          if (progress.total > 0) {
            const percent = Math.round((progress.loaded / progress.total) * 100);
            addLog(`Загрузка модели для AR: ${percent}%`);
          }
        },
        (err) => {
          addLog(`Ошибка загрузки модели для AR: ${err.message}`);
          const boxGeometry = new THREE.BoxGeometry(0.2, 0.15, 0.2);
          const boxMaterial = new THREE.MeshStandardMaterial({
            color: ticket.is_win ? 0xffd700 : 0x8b4513,
          });
          const box = new THREE.Mesh(boxGeometry, boxMaterial);
          box.visible = true;
          box.position.set(0, 0, -0.3);
          scene.add(box);
          objectRef.current = box;
          addLog("Создан резервный сундук для AR");
        }
      );
  
      const button = ARButton.createButton(renderer, {
        requiredFeatures: [], // Без hit-test
        optionalFeatures: [], // Убираем domOverlay для теста
      });
      document.body.appendChild(button);
  
      renderer.xr.addEventListener("sessionstart", () => {
        addLog("WebXR сессия начата");
        activateAudioContext();
        renderer.setAnimationLoop(onXRFrame);
  
        if (objectRef.current && !objectRef.current.visible) {
          addLog("Размещение сундука по умолчанию");
          objectRef.current.position.set(0, 0, -0.3);
          objectRef.current.scale.set(0.2, 0.2, 0.2);
          objectRef.current.rotation.set(0, 0, 0);
          objectRef.current.visible = true;
          playSpecificAnimation(ticket.is_win);
        }
      });
  
      renderer.xr.addEventListener("sessionend", () => {
        addLog("WebXR сессия завершена");
        renderer.setAnimationLoop(null);
        setArStarted(false);
      });
  
      setArStarted(true);
    } catch (err) {
      addLog(`Ошибка инициализации AR: ${err.message}`);
      setError(`Не удалось запустить AR: ${err.message}`);
      init3DMode();
    }
  };

  // Инициализация 3D режима
  const init3DMode = async () => {
    if (!ticket) {
      addLog("Билет не загружен, невозможно инициализировать 3D режим");
      setError("Билет не найден");
      return;
    }

    addLog("Инициализация 3D режима");
    try {
      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0x000020);
      sceneRef.current = scene;

      const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 20);
      camera.position.set(0, 0.5, 1.5); // Ближе к сундуку
      cameraRef.current = camera;

      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setPixelRatio(window.devicePixelRatio);
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.setClearColor(0x000000, 0);
      renderer.outputEncoding = THREE.sRGBEncoding;
      renderer.xr.enabled = isWebXRSupported;
      rendererRef.current = renderer;
      if (containerRef.current) {
        containerRef.current.appendChild(renderer.domElement);
        addLog("Рендерер инициализирован");
      } else {
        addLog("Контейнер не найден");
        throw new Error("Контейнер не найден");
      }

      const controls = new OrbitControls(camera, renderer.domElement);
      controls.target.set(0, 0, 0);
      controls.update();
      controls.enablePan = false;
      controls.enableDamping = true;
      controlsRef.current = controls;

      const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
      scene.add(ambientLight);
      const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
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
      floor.position.y = -0.5;
      scene.add(floor);

      loadSounds(scene);
      activateAudioContext();

      const loader = new GLTFLoader();
      const chestModelPath = ticket.is_win ? "/models/treasure_chest_win.glb" : "/models/treasure_chest_lose.glb";

      loader.load(
        chestModelPath,
        (gltf) => {
          addLog(`Модель загружена: ${chestModelPath}`);
          if (gltf.animations && gltf.animations.length > 0) {
            gltf.animations.forEach((anim, index) => {
              addLog(`Анимация ${index}: "${anim.name}", длительность: ${anim.duration}s`);
            });
          } else {
            addLog("В модели нет анимаций!");
          }

          const model = gltf.scene;
          model.scale.set(0.15, 0.15, 0.15); // Унифицированный масштаб для 3D
          model.position.set(0, -0.5, -0.5); // Размещаем ближе
          model.rotation.y = Math.PI / 4;
          model.visible = true; // Убедимся, что сундук виден
          scene.add(model);
          objectRef.current = model;
          addLog("Модель сундука добавлена в сцену");

          if (gltf.animations && gltf.animations.length > 0) {
            mixerRef.current = new THREE.AnimationMixer(model);
            gltf.animations.forEach((clip) => {
              const action = mixerRef.current.clipAction(clip);
              action.clampWhenFinished = true;
              addLog(`Анимация загружена: ${clip.name}`);
            });
            mixerRef.current.addEventListener("finished", (e) => {
              addLog("Анимация завершена");
            });
            playSpecificAnimation(ticket.is_win);
          } else {
            addLog("Анимации не найдены, используется статичная модель");
            playSound(ticket.is_win ? "chestOpen" : "chestClose");
          }
        },
        (progress) => {
          if (progress.total > 0) {
            const percent = Math.round((progress.loaded / progress.total) * 100);
            addLog(`Загрузка модели: ${percent}%`);
          }
        },
        (err) => {
          addLog(`Ошибка загрузки модели: ${err.message}`);
          const boxGeometry = new THREE.BoxGeometry(0.3, 0.2, 0.3);
          const boxMaterial = new THREE.MeshStandardMaterial({
            color: ticket.is_win ? 0xffd700 : 0x8b4513,
            roughness: 0.7,
            metalness: 0.3,
          });
          const box = new THREE.Mesh(boxGeometry, boxMaterial);
          box.position.set(0, -0.5, -0.5);
          box.visible = true; // Убедимся, что сундук виден
          scene.add(box);
          objectRef.current = box;
          addLog("Создан резервный сундук");
          playSound(ticket.is_win ? "chestOpen" : "chestClose");
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
        if (rendererRef.current && sceneRef.current && cameraRef.current) {
          rendererRef.current.render(sceneRef.current, cameraRef.current);
        }
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
      addLog(`Ошибка инициализации 3D режима: ${err.message}`);
      setError(`Не удалось запустить 3D режим: ${err.message}`);
    }
  };

  // Оптимизированный метод для hit-testing в AR
  const onXRFrame = (time, frame) => {
    if (!cameraRef.current || !rendererRef.current || !sceneRef.current) {
      addLog("Ошибка: Камера, рендерер или сцена не инициализированы");
      return;
    }
  
    if (objectRef.current && !objectRef.current.visible) {
      addLog("Размещение сундука по умолчанию в XR");
      objectRef.current.position.set(0, 0, -0.3); // Еще ближе к камере
      objectRef.current.scale.set(0.2, 0.2, 0.2); // Увеличим масштаб для видимости
      objectRef.current.rotation.set(0, 0, 0);
      objectRef.current.visible = true;
      playSpecificAnimation(ticket.is_win);
    }
  
    if (mixerRef.current) {
      const delta = clock.current.getDelta();
      mixerRef.current.update(delta);
    }
  
    addLog("Рендеринг выполнен"); // Лог для проверки
    rendererRef.current.render(sceneRef.current, cameraRef.current);
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

      if (hitTestSource.current) {
        hitTestSource.current.cancel();
        hitTestSource.current = null;
      }

      if (mixerRef.current) {
        mixerRef.current.stopAllAction();
        mixerRef.current = null;
      }

      if (sceneRef.current) {
        sceneRef.current.traverse((object) => {
          if (object.geometry) object.geometry.dispose();
          if (object.material) {
            if (Array.isArray(object.material)) {
              object.material.forEach((mat) => mat.dispose());
            } else {
              object.material.dispose();
            }
          }
        });
        sceneRef.current = null;
      }

      addLog("Ресурсы очищены");
    };
  }, [sounds]);

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
      <div ref={containerRef} className="absolute inset-0" style={{ zIndex: 0 }}></div>
      {!arStarted ? (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-70 z-10">
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
              onClick={() => {
                initAR();
                activateAudioContext();
              }}
              className="w-full px-6 py-3 bg-yellow-500 text-black font-bold rounded-lg hover:bg-yellow-600 transition-colors duration-300"
            >
              {isWebXRSupported ? "Запустить AR просмотр" : "Запустить 3D просмотр"}
            </button>
            <p className="mt-4 text-sm opacity-80">
              {isWebXRSupported
                ? "Сундук автоматически появится на полу перед вами"
                : "Вы сможете вращать сундук касанием или мышью"}
            </p>
          </div>
        </div>
      ) : (
        <div
          className="absolute bottom-24 left-0 right-0 p-6 bg-black bg-opacity-70 text-white z-30"
          style={{ minHeight: "140px", pointerEvents: "auto" }}
        >
          <div className="text-center">
            <h2 className="text-xl font-bold mb-4">
              {ticket.is_win
                ? `Поздравляем! Вы выиграли ${ticket.win_amount} ₽`
                : "К сожалению, сундук оказался пуст"}
            </h2>
            <div className="flex justify-center space-x-8">
              <button
                onClick={() => {
                  activateAudioContext();
                  if (mixerRef.current && objectRef.current) {
                    setAnimationPlayed(false);
                    playSpecificAnimation(ticket.is_win);
                  } else {
                    addLog("Миксер или объект не инициализированы");
                    playSound(ticket.is_win ? "chestOpen" : "chestClose");
                    if (objectRef.current) objectRef.current.visible = true; // Убедимся, что сундук виден
                    setAnimationPlayed(true);
                  }
                }}
                className="px-8 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-lg"
                style={{ pointerEvents: "auto" }}
              >
                Повторить анимацию
              </button>
              <button
                onClick={() => navigate("/dashboard")}
                className="px-8 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 text-lg"
                style={{ pointerEvents: "auto" }}
              >
                Вернуться на главную
              </button>
            </div>
          </div>
        </div>
      )}
      <div
        className="absolute top-4 left-4 right-4 bg-black bg-opacity-50 text-white p-2 max-h-40 overflow-y-auto z-20"
        style={{ display: "block" }}
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