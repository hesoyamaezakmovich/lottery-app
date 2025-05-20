// src/components/ARLotteryView.js
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
      chestOpen: { url: '/sounds/chest_open.mp3', volume: 1.0 },
      chestClose: { url: '/sounds/chest_close.mp3', volume: 0.8 },
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
  const playSpecificAnimation = (animationName, isWin) => {
    if (mixerRef.current && objectRef.current) {
      try {
        // Сначала воспроизводим звук, чтобы он точно сработал
        playSound(isWin ? "chestOpen" : "chestClose");
        
        // Проверяем наличие анимаций
        const animations = {};
        let hasAnimations = false;
        
        if (objectRef.current.animations && objectRef.current.animations.length > 0) {
          objectRef.current.animations.forEach((clip) => {
            animations[clip.name] = mixerRef.current.clipAction(clip);
            hasAnimations = true;
          });
          addLog(`Найдены анимации объекта: ${Object.keys(animations).join(', ')}`);
        } 
        
        if (mixerRef.current._root && mixerRef.current._root.animations && mixerRef.current._root.animations.length > 0) {
          mixerRef.current._root.animations.forEach((clip) => {
            animations[clip.name] = mixerRef.current.clipAction(clip);
            hasAnimations = true;
          });
          addLog(`Найдены анимации в миксере: ${Object.keys(animations).join(', ')}`);
        }
        
        if (!hasAnimations) {
          // Если нет анимаций, сделаем простую анимацию открытия сундука
          addLog("Анимации не найдены, применяется простая анимация");
          
          // Простая анимация открытия крышки для сундука
          if (objectRef.current.children && objectRef.current.children.length > 1) {
            const lid = objectRef.current.children[1]; // Предполагаем, что крышка - второй элемент
            
            // Анимация открытия крышки
            const startRotation = lid.rotation.x;
            const targetRotation = -Math.PI / 2; // -90 градусов
            const steps = 30;
            let currentStep = 0;
            
            const animateLid = () => {
              if (currentStep < steps) {
                lid.rotation.x = startRotation + (targetRotation - startRotation) * (currentStep / steps);
                currentStep++;
                requestAnimationFrame(animateLid);
              }
            };
            
            animateLid();
          } else {
            // Если нет детей для анимации, просто поворачиваем весь объект
            const startRotation = { x: objectRef.current.rotation.x, y: objectRef.current.rotation.y };
            const targetRotation = { x: isWin ? Math.PI / 6 : -Math.PI / 6, y: startRotation.y + Math.PI };
            const steps = 30;
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
          }
          
          setAnimationPlayed(true);
          return;
        }
        
        // Если анимации найдены, пытаемся найти нужную
        let actionToPlay;
        
        // Ищем подходящую анимацию
        const animationNames = Object.keys(animations);
        addLog(`Доступные анимации: ${animationNames.join(', ')}`);
        
        // Попытка найти специфичную анимацию
        if (isWin) {
          for (const name of animationNames) {
            if (name.toLowerCase().includes('open') || 
                name.toLowerCase().includes('chest') || 
                name.toLowerCase().includes('win')) {
              actionToPlay = animations[name];
              addLog(`Выбрана анимация выигрыша: ${name}`);
              break;
            }
          }
        } else {
          for (const name of animationNames) {
            if (name.toLowerCase().includes('close') || 
                name.toLowerCase().includes('handle') || 
                name.toLowerCase().includes('lose')) {
              actionToPlay = animations[name];
              addLog(`Выбрана анимация проигрыша: ${name}`);
              break;
            }
          }
        }
        
        // Если не нашли подходящую анимацию, используем первую доступную
        if (!actionToPlay && animationNames.length > 0) {
          actionToPlay = animations[animationNames[0]];
          addLog(`Используется первая доступная анимация: ${animationNames[0]}`);
        }
        
        if (actionToPlay) {
          // Останавливаем все текущие анимации
          Object.values(animations).forEach((action) => {
            if (action.isRunning()) action.stop();
          });
          
          // Настраиваем и запускаем анимацию
          actionToPlay.setLoop(THREE.LoopOnce);
          actionToPlay.clampWhenFinished = true;
          actionToPlay.reset().play();
          addLog(`Запущена анимация: ${actionToPlay._clip.name}`);
          
          setAnimationPlayed(true);
        } else {
          addLog("Подходящая анимация не найдена");
          setAnimationPlayed(true);
        }
      } catch (err) {
        addLog(`Ошибка воспроизведения анимации: ${err.message}`);
        console.error("Ошибка анимации:", err);
        setAnimationPlayed(true);
      }
    } else {
      addLog("Миксер или объект не инициализированы");
      // Воспроизводим звук в любом случае
      playSound(isWin ? "chestOpen" : "chestClose");
      setAnimationPlayed(true);
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
      activateAudioContext();

      const loader = new GLTFLoader();
      const chestModelPath = ticket?.is_win ? "/models/treasure_chest_win.glb" : "/models/treasure_chest_lose.glb";

      loader.load(
        chestModelPath,
        (gltf) => {
          addLog("Модель загружена");
          if (gltf.animations && gltf.animations.length > 0) {
            gltf.animations.forEach((anim, index) => {
              addLog(`Анимация ${index}: "${anim.name}", длительность: ${anim.duration}s`);
            });
          } else {
            addLog("В модели нет анимаций!");
          }

          const model = gltf.scene;
          // Еще сильнее уменьшаем размер модели
          model.scale.set(0.08, 0.08, 0.08); // Было 0.5, делаем гораздо меньше
          model.position.set(0, 0, -0.8); // Располагаем ближе к камере
          model.rotation.y = Math.PI / 4;
          model.visible = true;
          scene.add(model);
          objectRef.current = model;
          addLog("Модель сундука добавлена в сцену");

          if (gltf.animations && gltf.animations.length > 0) {
            mixerRef.current = new THREE.AnimationMixer(model);
            gltf.animations.forEach((clip) => {
              mixerRef.current.clipAction(clip); // Добавляем действия анимации
              addLog(`Анимация загружена: ${clip.name}`);
            });
            mixerRef.current.addEventListener("finished", (e) => {
              addLog("Анимация завершена");
            });
            playSpecificAnimation(null, ticket.is_win);
          } else {
            addLog("Анимации не найдены, используется статичная модель");
            // Проверяем, были ли загружены звуки
            if (!sounds.chestOpen || !sounds.chestOpen.buffer) {
              addLog("Звуки не были загружены, повторная попытка");
              // Создаем звуки вручную, если они не были загружены
              const audioContext = THREE.AudioContext.getContext();
              if (audioContext.state === "suspended") {
                audioContext.resume();
              }
              
              const listener = new THREE.AudioListener();
              cameraRef.current.add(listener);
              
              const sound = new THREE.Audio(listener);
              sound.setVolume(1.0);
              
              // Воспроизводим звук без буфера (создаст простой звук)
              playSound(ticket.is_win ? "chestOpen" : "chestClose");
            } else {
              // Если звуки загружены, просто воспроизводим их
              playSound(ticket.is_win ? "chestOpen" : "chestClose");
            }
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
          const boxGeometry = new THREE.BoxGeometry(0.3, 0.2, 0.3); // Уменьшаем размер запасного сундука
          const boxMaterial = new THREE.MeshStandardMaterial({
            color: ticket?.is_win ? 0xffd700 : 0x8b4513,
            roughness: 0.7,
            metalness: 0.3,
          });
          const box = new THREE.Mesh(boxGeometry, boxMaterial);
          const lidGeometry = new THREE.BoxGeometry(0.3, 0.1, 0.3); // Уменьшаем крышку
          const lidMaterial = new THREE.MeshStandardMaterial({
            color: ticket?.is_win ? 0xffd700 : 0x8b4513,
            roughness: 0.7,
            metalness: 0.3,
          });
          const lid = new THREE.Mesh(lidGeometry, lidMaterial);
          lid.position.y = 0.15; // Корректируем позицию крышки
          const chest = new THREE.Group();
          chest.add(box);
          chest.add(lid);
          chest.position.set(0, 0, -0.5);
          chest.visible = true;
          scene.add(chest);
          objectRef.current = chest;
          addLog("Создан резервный сундук");
          playSound(ticket.is_win ? "chestOpen" : "chestClose"); // Fallback на звук
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
      addLog(`Ошибка инициализации 3D режима: ${err.message}`);
      setError(`Не удалось запустить 3D режим: ${err.message}`);
    }
  };

  // Оптимизированный метод для hit-testing в AR
  const onXRFrame = (time, frame) => {
    const session = frame.session;
    if (!cameraRef.current || !rendererRef.current || !sceneRef.current) return;
    
    // Запрашиваем hitTestSource только один раз
    if (!hitTestSourceRequested.current) {
      session.requestReferenceSpace('viewer').then((referenceSpace) => {
        session.requestHitTestSource({ space: referenceSpace }).then((source) => {
          hitTestSource.current = source;
        });
      });
      hitTestSourceRequested.current = true;
    }

    // Обрабатываем результаты hit-test
    if (hitTestSource.current && objectRef.current && !objectRef.current.visible) {
      const hitTestResults = frame.getHitTestResults(hitTestSource.current);
      
      if (hitTestResults.length > 0) {
        addLog(`Найдена поверхность: ${hitTestResults.length} результат(ов)`);
        const hit = hitTestResults[0];
        const referenceSpace = rendererRef.current.xr.getReferenceSpace();
        const pose = hit.getPose(referenceSpace);
        
        if (pose) {
          // Уменьшаем размер еще больше
          objectRef.current.scale.set(0.1, 0.1, 0.1); // Сильно уменьшаем размер в AR-режиме
          
          // Размещаем объект на найденной поверхности
          const matrix = new THREE.Matrix4().fromArray(pose.transform.matrix);
          const position = new THREE.Vector3().setFromMatrixPosition(matrix);
          
          // Устанавливаем сундук ПРЯМО на поверхность (без поднятия)
          objectRef.current.position.copy(position);
          
          // Направляем объект к камере
          const cameraPosition = new THREE.Vector3();
          cameraRef.current.getWorldPosition(cameraPosition);
          const direction = new THREE.Vector3().subVectors(cameraPosition, position).normalize();
          direction.y = 0; // Обнуляем вертикальную составляющую для выравнивания по горизонтали
          if (direction.length() > 0.001) {
            objectRef.current.lookAt(cameraPosition.x, position.y, cameraPosition.z);
          }
          
          objectRef.current.visible = true;
          addLog(`Объект размещен: ${position.x.toFixed(2)}, ${position.y.toFixed(2)}, ${position.z.toFixed(2)}`);
          
          // Запускаем анимацию НЕМЕДЛЕННО, без задержки
          playSpecificAnimation(null, ticket.is_win);
          
          // Отписываемся от hit-test после размещения
          hitTestSource.current.cancel();
          hitTestSource.current = null;
        }
      }
    }

    // Обновляем анимации
    if (mixerRef.current) {
      const delta = clock.current.getDelta();
      mixerRef.current.update(delta);
    }
    
    // Рендерим сцену
    rendererRef.current.render(sceneRef.current, cameraRef.current);
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
      addLog("Рендерер для AR инициализирован");

      // Улучшаем освещение
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.7); // Увеличиваем интенсивность
      scene.add(ambientLight);
      const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0); // Увеличиваем яркость
      directionalLight.position.set(0, 1, 1);
      scene.add(directionalLight);

      loadSounds(scene);
      activateAudioContext();

      const loader = new GLTFLoader();
      const chestModelPath = ticket?.is_win ? "/models/treasure_chest_win.glb" : "/models/treasure_chest_lose.glb";

      loader.load(
        chestModelPath,
        (gltf) => {
          const model = gltf.scene;
          // Уменьшаем размер модели для AR
          model.scale.set(0.15, 0.15, 0.15); // Еще меньше для AR
          model.visible = false;
          scene.add(model);
          objectRef.current = model;
          addLog("Модель сундука загружена для AR");
          
          if (gltf.animations && gltf.animations.length > 0) {
            mixerRef.current = new THREE.AnimationMixer(model);
            const animations = {};
            gltf.animations.forEach((clip) => {
              const action = mixerRef.current.clipAction(clip);
              animations[clip.name] = action;
              addLog(`Анимация для AR: ${clip.name}`);
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
          const boxGeometry = new THREE.BoxGeometry(0.2, 0.15, 0.2); // Уменьшенный размер для AR
          const boxMaterial = new THREE.MeshStandardMaterial({
            color: ticket?.is_win ? 0xffd700 : 0x8b4513,
          });
          const box = new THREE.Mesh(boxGeometry, boxMaterial);
          box.visible = false;
          scene.add(box);
          objectRef.current = box;
          addLog("Создан резервный сундук для AR");
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
          activateAudioContext();
          hitTestSourceRequested.current = false;
          
          // Устанавливаем функцию отрисовки для XR
          renderer.setAnimationLoop(onXRFrame);

          // Fallback для случая, когда hit-test не работает
          setTimeout(() => {
            if (objectRef.current && !objectRef.current.visible) {
              addLog("Hit-test не сработал, размещение сундука по умолчанию");
              objectRef.current.position.set(0, 0, -1.0); // Прямо перед камерой
              objectRef.current.scale.set(0.08, 0.08, 0.08); // Совсем маленький размер
              objectRef.current.rotation.set(0, 0, 0); // Сброс вращения
              objectRef.current.visible = true;
              playSpecificAnimation(null, ticket.is_win);
            }
          }, 3000); // Уменьшаем тайм-аут до 3 секунд
        });

        renderer.xr.addEventListener("sessionend", () => {
          addLog("WebXR сессия завершена");
          renderer.setAnimationLoop(null);
          setArStarted(false);
          if (hitTestSource.current) {
            hitTestSource.current.cancel();
            hitTestSource.current = null;
          }
        });
      } catch (err) {
        addLog(`Ошибка создания AR кнопки: ${err.message}`);
        init3DMode();
        return;
      }

      setArStarted(true);
    } catch (err) {
      addLog(`Ошибка инициализации AR: ${err.message}`);
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
      if (hitTestSource.current) {
        hitTestSource.current.cancel();
        hitTestSource.current = null;
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
                  if (mixerRef.current) {
                    setAnimationPlayed(false);
                    playSpecificAnimation(null, ticket.is_win);
                  } else {
                    addLog("Миксер анимаций не инициализирован");
                    playSound(ticket.is_win ? "chestOpen" : "chestClose"); // Fallback на звук
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
        style={{ display: "block" }} // Показываем логи для отладки
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