// Исправленный компонент ARLotteryView.js
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
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [ticket, setTicket] = useState(null);
  const [arStarted, setArStarted] = useState(false);
  const [isWebXRSupported, setIsWebXRSupported] = useState(null);
  const [isIOS, setIsIOS] = useState(false);
  const [logs, setLogs] = useState([]);
  const [is3DMode, setIs3DMode] = useState(false);
  const [animationPlayed, setAnimationPlayed] = useState(false);
  const [debugMode, setDebugMode] = useState(true); // Режим отладки включен по умолчанию

  // Состояние для звуков
  const [sounds, setSounds] = useState({
    chestOpen: null,
    chestClose: null,
  });

  // Refs для Three.js
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
  const reticleRef = useRef(null); // Для визуального указателя в AR
  const hitTestSourceRef = useRef(null);
  const hitTestSourceRequested = useRef(false);
  const placedObjectRef = useRef(false); // Флаг для отслеживания размещения объекта

  // Функция логирования с более информативными сообщениями
  const addLog = (message) => {
    if (debugMode) {
      const timestamp = new Date().toLocaleTimeString();
      setLogs((prev) => [...prev, `[${timestamp}] ${message}`].slice(-20)); // Храним только последние 20 сообщений
    }
  };

  // Проверка платформы и поддержки WebXR
  useEffect(() => {
    addLog("Инициализация компонента");
    
    // Определение iOS устройства
    const iosRegex = /iPad|iPhone|iPod/i;
    const isIOSDevice = iosRegex.test(navigator.userAgent) && !window.MSStream;
    setIsIOS(isIOSDevice);
    addLog(`Платформа определена: ${isIOSDevice ? "iOS" : "Android/Desktop"}`);

    // Проверка поддержки WebXR
    const checkWebXR = async () => {
      if (typeof navigator.xr === 'undefined') {
        addLog("WebXR API не доступен в этом браузере");
        setIsWebXRSupported(false);
        return;
      }
      
      try {
        const isSupported = await navigator.xr.isSessionSupported("immersive-ar");
        addLog(`WebXR AR поддерживается: ${isSupported}`);
        setIsWebXRSupported(isSupported);
      } catch (err) {
        addLog(`Ошибка при проверке поддержки WebXR: ${err.message}`);
        setIsWebXRSupported(false);
      }
    };
    
    checkWebXR();
  }, []);

  // Получение данных билета
  useEffect(() => {
    const fetchTicket = async () => {
      setLoading(true);
      try {
        addLog(`Запрос данных билета с ID: ${id}`);
        
        const { data, error } = await supabase
          .from("ar_lottery_tickets")
          .select("*")
          .eq("id", id)
          .single();

        if (error) {
          addLog(`Ошибка при получении билета: ${error.message}`);
          throw error;
        }
        
        addLog(`Билет получен успешно: ${data.id}, выигрыш: ${data.is_win ? 'да' : 'нет'}`);
        setTicket(data);

        // Отмечаем билет как просмотренный, если он еще не был просмотрен
        if (!data.viewed) {
          addLog("Обновление статуса просмотра билета");
          await supabase
            .from("ar_lottery_tickets")
            .update({ viewed: true })
            .eq("id", id);
        }
      } catch (err) {
        addLog(`Ошибка запроса: ${err.message}`);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchTicket();
  }, [id]);

  // Активация аудиоконтекста
  const activateAudioContext = () => {
    try {
      const audioContext = THREE.AudioContext.getContext();
      if (audioContext.state === "suspended") {
        audioContext.resume();
        addLog("Аудиоконтекст активирован успешно");
      }
    } catch (err) {
      addLog(`Ошибка активации аудиоконтекста: ${err.message}`);
    }
  };

  // Загрузка звуковых эффектов
  const loadSounds = (scene) => {
    if (!listener.current) {
      try {
        listener.current = new THREE.AudioListener();
        addLog("AudioListener создан");
        
        if (cameraRef.current) {
          cameraRef.current.add(listener.current);
          addLog("AudioListener добавлен к камере");
        } else {
          addLog("Предупреждение: камера не инициализирована для AudioListener");
        }
      } catch (err) {
        addLog(`Ошибка создания AudioListener: ${err.message}`);
        return;
      }
    }

    if (!audioLoader.current) {
      audioLoader.current = new THREE.AudioLoader();
      addLog("AudioLoader создан");
    }

    // Предопределенные звуки
    const soundsToLoad = {
      chestOpen: { url: "/sounds/chest_open.mp3", volume: 1.0 },
      chestClose: { url: "/sounds/chest_close.mp3", volume: 0.8 },
    };

    // Загрузка всех звуков
    Object.entries(soundsToLoad).forEach(([key, { url, volume }]) => {
      try {
        const sound = new THREE.Audio(listener.current);
        
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
            // Логирование прогресса только для важных этапов
            if (progress.total > 0 && progress.loaded / progress.total > 0.5) {
              addLog(`Загрузка ${key}: ${Math.round((progress.loaded / progress.total) * 100)}%`);
            }
          },
          (error) => {
            addLog(`Ошибка загрузки звука ${key}: ${error.message}`);
            // Устанавливаем null для этого звука, чтобы можно было обработать его отсутствие
            setSounds((prev) => ({ ...prev, [key]: null }));
          }
        );
      } catch (err) {
        addLog(`Ошибка при инициализации звука ${key}: ${err.message}`);
      }
    });
  };

  // Воспроизведение звука с обработкой ошибок
  const playSound = (soundName) => {
    try {
      const sound = sounds[soundName];
      
      if (sound && sound.buffer) {
        // Останавливаем звук, если он уже проигрывается
        if (sound.isPlaying) {
          sound.stop();
        }
        
        sound.play();
        addLog(`Звук ${soundName} воспроизводится`);
        return true;
      } else {
        addLog(`Звук ${soundName} не загружен или не имеет буфера`);
        return false;
      }
    } catch (err) {
      addLog(`Ошибка воспроизведения звука ${soundName}: ${err.message}`);
      return false;
    }
  };

  // Воспроизведение анимации сундука
  const playSpecificAnimation = (isWin) => {
    addLog(`Запуск анимации: ${isWin ? 'выигрышной' : 'проигрышной'}`);
    
    if (!objectRef.current) {
      addLog("Ошибка: объект сундука не инициализирован");
      return;
    }
    
    // Делаем объект видимым в любом случае
    objectRef.current.visible = true;
    
    // Воспроизведение звука независимо от анимации
    playSound(isWin ? "chestOpen" : "chestClose");
    
    try {
      if (mixerRef.current) {
        addLog("Поиск подходящей анимации");
        
        // Проверка наличия анимаций в объекте
        let animations = {};
        let hasAnimations = false;
        
        // Поиск анимаций в объекте
        if (objectRef.current.animations && objectRef.current.animations.length > 0) {
          objectRef.current.animations.forEach((clip) => {
            animations[clip.name] = mixerRef.current.clipAction(clip);
            hasAnimations = true;
          });
          addLog(`Найдены анимации в объекте: ${Object.keys(animations).join(", ")}`);
        }
        
        // Поиск анимаций в корне миксера
        if (!hasAnimations && mixerRef.current._root && mixerRef.current._root.animations) {
          addLog("Поиск анимаций в корне миксера");
          if (mixerRef.current._root.animations.length > 0) {
            mixerRef.current._root.animations.forEach((clip) => {
              animations[clip.name] = mixerRef.current.clipAction(clip);
              hasAnimations = true;
            });
            addLog(`Найдены анимации в миксере: ${Object.keys(animations).join(", ")}`);
          }
        }
        
        // Воспроизведение подходящей анимации
        if (hasAnimations) {
          const animationNames = Object.keys(animations);
          let actionToPlay = null;
          
          // Выбор подходящей анимации в зависимости от результата
          if (isWin) {
            const winAnimName = animationNames.find(name => 
              name.toLowerCase().includes("win") || 
              name.toLowerCase().includes("open") || 
              name.toLowerCase().includes("victory"));
              
            if (winAnimName) {
              actionToPlay = animations[winAnimName];
              addLog(`Выбрана анимация выигрыша: ${winAnimName}`);
            }
          } else {
            const loseAnimName = animationNames.find(name => 
              name.toLowerCase().includes("lose") || 
              name.toLowerCase().includes("close") || 
              name.toLowerCase().includes("fail"));
              
            if (loseAnimName) {
              actionToPlay = animations[loseAnimName];
              addLog(`Выбрана анимация проигрыша: ${loseAnimName}`);
            }
          }
          
          // Если подходящая анимация не найдена, используем первую доступную
          if (!actionToPlay && animationNames.length > 0) {
            actionToPlay = animations[animationNames[0]];
            addLog(`Используем первую доступную анимацию: ${animationNames[0]}`);
          }
          
          // Воспроизведение анимации
          if (actionToPlay) {
            // Остановка всех текущих анимаций
            Object.values(animations).forEach(action => {
              if (action.isRunning()) action.stop();
            });
            
            // Настройка и запуск выбранной анимации
            actionToPlay.setLoop(THREE.LoopOnce);
            actionToPlay.clampWhenFinished = true;
            actionToPlay.reset().play();
            addLog(`Анимация запущена: ${actionToPlay._clip.name}`);
          } else {
            addLog("Анимации не найдены, применяем простое вращение");
            applySimpleAnimation(isWin);
          }
        } else {
          addLog("Анимации не найдены, применяем простое вращение");
          applySimpleAnimation(isWin);
        }
      } else {
        addLog("Миксер анимаций не инициализирован, применяем простое вращение");
        applySimpleAnimation(isWin);
      }
      
      setAnimationPlayed(true);
    } catch (err) {
      addLog(`Ошибка воспроизведения анимации: ${err.message}`);
      
      // В случае ошибки применяем простую анимацию
      applySimpleAnimation(isWin);
      setAnimationPlayed(true);
    }
  };
  
  // Применение простой анимации вращения и масштабирования
  const applySimpleAnimation = (isWin) => {
    if (!objectRef.current) return;
    
    addLog("Применяем простую анимацию");
    
    const startRotation = { 
      x: objectRef.current.rotation.x, 
      y: objectRef.current.rotation.y,
      z: objectRef.current.rotation.z
    };
    
    const startScale = { 
      x: objectRef.current.scale.x,
      y: objectRef.current.scale.y, 
      z: objectRef.current.scale.z
    };
    
    // Целевые значения анимации
    const targetRotation = { 
      x: isWin ? Math.PI / 4 : -Math.PI / 6, 
      y: startRotation.y + Math.PI, 
      z: startRotation.z
    };
    
    const targetScale = {
      x: isWin ? startScale.x * 1.2 : startScale.x,
      y: isWin ? startScale.y * 1.2 : startScale.y,
      z: isWin ? startScale.z * 1.2 : startScale.z
    };
    
    // Количество шагов и текущий шаг
    const steps = 60;
    let currentStep = 0;
    
    // Функция анимации
    const animateObject = () => {
      if (currentStep < steps) {
        // Интерполяция значений
        const progress = currentStep / steps;
        
        // Применение вращения
        objectRef.current.rotation.x = startRotation.x + (targetRotation.x - startRotation.x) * progress;
        objectRef.current.rotation.y = startRotation.y + (targetRotation.y - startRotation.y) * progress;
        
        // Применение масштабирования для победы
        if (isWin) {
          objectRef.current.scale.x = startScale.x + (targetScale.x - startScale.x) * progress;
          objectRef.current.scale.y = startScale.y + (targetScale.y - startScale.y) * progress;
          objectRef.current.scale.z = startScale.z + (targetScale.z - startScale.z) * progress;
        }
        
        currentStep++;
        requestAnimationFrame(animateObject);
      }
    };
    
    // Запуск анимации
    animateObject();
  };

  // Инициализация AR режима
  const initAR = async () => {
    addLog("Инициализация AR режима");
    
    if (!ticket) {
      addLog("Ошибка: билет не загружен");
      setError("Билет не найден");
      return;
    }
    
    // Проверка поддержки WebXR
    if (!isWebXRSupported || isIOS) {
      addLog(`Режим AR не поддерживается, запускаем 3D режим (WebXR: ${isWebXRSupported}, iOS: ${isIOS})`);
      init3DMode();
      return;
    }
    
    try {
      // Создание сцены Three.js
      const scene = new THREE.Scene();
      sceneRef.current = scene;
      
      // Настройка камеры
      const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.01, 20);
      camera.position.set(0, 1.6, 0); // Высота камеры примерно на уровне глаз
      cameraRef.current = camera;
      
      // Настройка рендерера с поддержкой WebXR
      const renderer = new THREE.WebGLRenderer({ 
        antialias: true, 
        alpha: true,
        preserveDrawingBuffer: true, // Для отладки
        powerPreference: "high-performance" // Оптимизация
      });
      
      renderer.setPixelRatio(window.devicePixelRatio);
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.xr.enabled = true;
      renderer.outputEncoding = THREE.sRGBEncoding;
      renderer.setClearColor(0x000000, 0);
      rendererRef.current = renderer;
      
      // Добавление canvas в DOM
      if (containerRef.current) {
        containerRef.current.appendChild(renderer.domElement);
        addLog("Рендерер для AR успешно инициализирован");
      } else {
        throw new Error("Контейнер для рендеринга не найден");
      }
      
      // Настройка освещения
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
      scene.add(ambientLight);
      
      const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
      directionalLight.position.set(0, 2, 1);
      directionalLight.castShadow = true;
      scene.add(directionalLight);
      
      // Создание визуального указателя для размещения в AR
      const reticle = new THREE.Mesh(
        new THREE.RingGeometry(0.15, 0.2, 32),
        new THREE.MeshBasicMaterial({ color: 0xffffff * Math.random() })
      );
      reticle.matrixAutoUpdate = false;
      reticle.visible = false;
      reticle.rotation.x = -Math.PI / 2;
      scene.add(reticle);
      reticleRef.current = reticle;
      
      // Загрузка звуков
      loadSounds(scene);
      activateAudioContext();
      
      // Загрузка 3D модели сундука
      const loader = new GLTFLoader();
      const modelPath = ticket.is_win 
          ? "/models/treasure_chest_win.glb" 
          : "/models/treasure_chest_lose.glb";
          
      addLog(`Загрузка модели: ${modelPath}`);
      
      loader.load(
        modelPath,
        (gltf) => {
          addLog("Модель успешно загружена");
          
          // Настройка модели
          const model = gltf.scene;
          model.scale.set(0.15, 0.15, 0.15); // Устанавливаем начальный масштаб
          model.position.set(0, 0, -0.5); // Начальная позиция
          model.visible = false; // Скрываем до размещения
          scene.add(model);
          objectRef.current = model;
          
          // Логирование информации о модели
          addLog(`Полигонов в модели: ${countPolygons(model)}`);
          
          // Настройка анимаций
          if (gltf.animations && gltf.animations.length > 0) {
            mixerRef.current = new THREE.AnimationMixer(model);
            gltf.animations.forEach((clip, index) => {
              mixerRef.current.clipAction(clip);
              addLog(`Анимация ${index}: ${clip.name}, длительность: ${clip.duration}с`);
            });
          } else {
            addLog("Предупреждение: модель не содержит анимаций");
          }
        },
        (progress) => {
          if (progress.total > 0) {
            const percent = Math.round((progress.loaded / progress.total) * 100);
            if (percent % 25 === 0) { // Логируем только каждые 25%
              addLog(`Загрузка модели: ${percent}%`);
            }
          }
        },
        (error) => {
          addLog(`Ошибка загрузки модели: ${error.message}`);
          
          // Создаем простую геометрию как замену
          createFallbackModel(scene, ticket.is_win);
        }
      );
      
      // Создание кнопки AR
      const button = ARButton.createButton(renderer, {
        requiredFeatures: ['hit-test'], // Включаем hit-test
        optionalFeatures: ['dom-overlay'],
        domOverlay: { root: document.body } // Для интерактивности
      });
      
      document.body.appendChild(button);
      addLog("Кнопка AR создана");
      
      // Обработчики событий сессии WebXR
      renderer.xr.addEventListener("sessionstart", () => {
        addLog("AR сессия запущена");
        activateAudioContext();
        renderer.setAnimationLoop(onARFrame);
      });
      
      renderer.xr.addEventListener("sessionend", () => {
        addLog("AR сессия завершена");
        renderer.setAnimationLoop(null);
        setArStarted(false);
        
        // Сброс состояния hit-test
        hitTestSourceRef.current = null;
        hitTestSourceRequested.current = false;
        placedObjectRef.current = false;
      });
      
      setArStarted(true);
      
    } catch (err) {
      addLog(`Ошибка инициализации AR: ${err.message}`);
      setError(`Не удалось запустить режим AR: ${err.message}`);
      // Переход к 3D режиму в случае ошибки
      init3DMode();
    }
  };

  // Функция создания резервной модели при ошибке загрузки
  const createFallbackModel = (scene, isWin) => {
    addLog("Создание резервной модели сундука");
    
    try {
      // Материалы для сундука
      const boxMaterial = new THREE.MeshStandardMaterial({
        color: isWin ? 0xffd700 : 0x8b4513,
        roughness: 0.7,
        metalness: isWin ? 0.6 : 0.3
      });
      
      // Геометрия для сундука
      const boxGeometry = new THREE.BoxGeometry(0.3, 0.2, 0.3);
      
      // Создание меша
      const box = new THREE.Mesh(boxGeometry, boxMaterial);
      box.position.set(0, 0, -0.5);
      box.visible = true;
      scene.add(box);
      objectRef.current = box;
      
      addLog("Резервная модель сундука создана успешно");
    } catch (err) {
      addLog(`Ошибка создания резервной модели: ${err.message}`);
    }
  };

  // Подсчет полигонов в модели для отладки
  const countPolygons = (object) => {
    let count = 0;
    object.traverse((child) => {
      if (child.isMesh && child.geometry) {
        const geometry = child.geometry;
        if (geometry.index !== null) {
          count += geometry.index.count / 3;
        } else {
          count += geometry.attributes.position.count / 3;
        }
      }
    });
    return Math.round(count);
  };

  // Обработка кадров в AR режиме
  const onARFrame = (timestamp, frame) => {
    if (!frame || !sceneRef.current || !rendererRef.current || !cameraRef.current) {
      return;
    }
    
    // Обновление анимаций
    if (mixerRef.current) {
      const delta = clock.current.getDelta();
      mixerRef.current.update(delta);
    }
    
    // Обработка hit-test для размещения объекта
    const referenceSpace = rendererRef.current.xr.getReferenceSpace();
    const session = rendererRef.current.xr.getSession();
    
    if (!placedObjectRef.current) { // Если объект еще не размещен
      if (!hitTestSourceRef.current) {
        if (!hitTestSourceRequested.current) {
          // Запрашиваем источник hit-test только один раз
          session.requestReferenceSpace('viewer').then((viewerSpace) => {
            session.requestHitTestSource({ space: viewerSpace }).then((source) => {
              hitTestSourceRef.current = source;
              addLog("Hit-test источник создан");
            }).catch((error) => {
              addLog(`Ошибка создания hit-test источника: ${error.message}`);
              
              // Если не удалось создать hit-test, размещаем объект принудительно
              if (objectRef.current && !objectRef.current.visible) {
                objectRef.current.position.set(0, 0, -0.5);
                objectRef.current.visible = true;
                placedObjectRef.current = true;
                playSpecificAnimation(ticket.is_win);
                reticleRef.current.visible = false;
              }
            });
          });
          
          hitTestSourceRequested.current = true;
          addLog("Hit-test источник запрошен");
        }
      } else {
        // Получаем результаты hit-test
        const hitTestResults = frame.getHitTestResults(hitTestSourceRef.current);
        
        if (hitTestResults.length > 0) {
          const hit = hitTestResults[0];
          const pose = hit.getPose(referenceSpace);
          
          if (pose) {
            // Обновляем позицию reticle
            reticleRef.current.visible = true;
            reticleRef.current.matrix.fromArray(pose.transform.matrix);
            
            // При касании экрана размещаем объект
            const inputSources = session.inputSources;
            for (let i = 0; i < inputSources.length; i++) {
              const inputSource = inputSources[i];
              if (inputSource.gamepad && inputSource.gamepad.buttons[0].pressed) {
                // Размещаем объект в позиции reticle
                if (objectRef.current && !placedObjectRef.current) {
                  objectRef.current.position.setFromMatrixPosition(reticleRef.current.matrix);
                  objectRef.current.visible = true;
                  placedObjectRef.current = true;
                  reticleRef.current.visible = false;
                  
                  addLog("Объект размещен по hit-test");
                  playSpecificAnimation(ticket.is_win);
                  
                  // Прекращаем hit-test
                  if (hitTestSourceRef.current) {
                    hitTestSourceRef.current.cancel();
                    hitTestSourceRef.current = null;
                  }
                }
                break;
              }
            }
          }
        } else {
          reticleRef.current.visible = false;
        }
      }
    }
    
    // Если объект еще не размещен после 5 секунд, размещаем его принудительно
    if (!placedObjectRef.current && objectRef.current && objectRef.current.visible === false && arStarted) {
      const elapsedTime = clock.current.getElapsedTime();
      if (elapsedTime > 5) {
        addLog("Принудительное размещение объекта (тайм-аут hit-test)");
        objectRef.current.position.set(0, 0, -1);
        objectRef.current.visible = true;
        placedObjectRef.current = true;
        
        if (reticleRef.current) reticleRef.current.visible = false;
        playSpecificAnimation(ticket.is_win);
      }
    }
    
    // Отрисовка сцены
    rendererRef.current.render(sceneRef.current, cameraRef.current);
  };

  // Инициализация 3D режима (как запасной вариант)
  const init3DMode = async () => {
    addLog("Инициализация 3D режима");
    
    if (!ticket) {
      addLog("Ошибка: билет не загружен");
      setError("Билет не найден");
      return;
    }

    try {
      // Создание сцены Three.js
      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0x000020); // Темно-синий фон
      sceneRef.current = scene;

      // Настройка камеры
      const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 20);
      camera.position.set(0, 0.5, 1.5); // Позиция камеры для хорошего обзора сундука
      cameraRef.current = camera;

      // Настройка рендерера
      const renderer = new THREE.WebGLRenderer({ 
        antialias: true, 
        alpha: true,
        powerPreference: "high-performance"
      });
      
      renderer.setPixelRatio(window.devicePixelRatio);
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.outputEncoding = THREE.sRGBEncoding;
      renderer.setClearColor(0x000000, 0);
      rendererRef.current = renderer;
      
      // Добавление canvas в DOM
      if (containerRef.current) {
        containerRef.current.appendChild(renderer.domElement);
        addLog("Рендерер для 3D режима инициализирован");
      } else {
        throw new Error("Контейнер для рендеринга не найден");
      }

      // Настройка элементов управления сценой
      const controls = new OrbitControls(camera, renderer.domElement);
      controls.target.set(0, 0, 0);
      controls.enableDamping = true;
      controls.dampingFactor = 0.1;
      controls.rotateSpeed = 0.5;
      controls.minDistance = 0.8;
      controls.maxDistance = 4;
      controls.maxPolarAngle = Math.PI * 0.8; // Ограничиваем вращение вниз
      controls.update();
      controlsRef.current = controls;

      // Настройка освещения
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
      scene.add(ambientLight);
      
      const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
      directionalLight.position.set(0, 1, 1);
      directionalLight.castShadow = true;
      scene.add(directionalLight);
      
      // Добавляем точечный свет для выделения объекта
      const spotLight = new THREE.SpotLight(0xffffcc, 1);
      spotLight.position.set(0, 2, 0);
      spotLight.angle = Math.PI / 4;
      spotLight.penumbra = 0.1;
      spotLight.decay = 2;
      spotLight.distance = 10;
      scene.add(spotLight);

      // Создание пола для визуального контекста
      const floorGeometry = new THREE.PlaneGeometry(4, 4);
      const floorMaterial = new THREE.MeshStandardMaterial({
        color: 0xaa7744,
        roughness: 0.8,
        metalness: 0.2,
      });
      const floor = new THREE.Mesh(floorGeometry, floorMaterial);
      floor.rotation.x = -Math.PI / 2;
      floor.position.y = -0.5;
      floor.receiveShadow = true;
      scene.add(floor);

      // Загрузка звуков
      loadSounds(scene);
      activateAudioContext();

      // Загрузка 3D модели сундука
      const loader = new GLTFLoader();
      const modelPath = ticket.is_win 
        ? "/models/treasure_chest_win.glb" 
        : "/models/treasure_chest_lose.glb";
      
      addLog(`Загрузка модели для 3D: ${modelPath}`);
      
      loader.load(
        modelPath,
        (gltf) => {
          addLog("Модель успешно загружена");
          
          // Настройка модели
          const model = gltf.scene;
          model.scale.set(0.15, 0.15, 0.15); // Установка масштаба
          model.position.set(0, -0.3, -0.3); // Позиция на полу
          model.rotation.y = Math.PI / 4; // Слегка повернем для лучшего вида
          model.traverse(function(child) {
            if (child.isMesh) {
              child.castShadow = true;
              child.receiveShadow = true;
            }
          });
          model.visible = true;
          scene.add(model);
          objectRef.current = model;
          
          // Логирование информации о модели
          addLog(`Полигонов в модели: ${countPolygons(model)}`);
          
          // Настройка анимаций
          if (gltf.animations && gltf.animations.length > 0) {
            mixerRef.current = new THREE.AnimationMixer(model);
            gltf.animations.forEach((clip, index) => {
              const action = mixerRef.current.clipAction(clip);
              action.clampWhenFinished = true;
              addLog(`Анимация ${index}: ${clip.name}, длительность: ${clip.duration}с`);
            });
            
            // Обработчик завершения анимации
            mixerRef.current.addEventListener("finished", () => {
              addLog("Анимация завершена");
            });
            
            // Воспроизведение анимации
            playSpecificAnimation(ticket.is_win);
          } else {
            addLog("Предупреждение: модель не содержит анимаций");
            playSound(ticket.is_win ? "chestOpen" : "chestClose");
          }
        },
        (progress) => {
          if (progress.total > 0) {
            const percent = Math.round((progress.loaded / progress.total) * 100);
            if (percent % 25 === 0) { // Логируем только каждые 25%
              addLog(`Загрузка модели для 3D: ${percent}%`);
            }
          }
        },
        (error) => {
          addLog(`Ошибка загрузки модели: ${error.message}`);
          
          // Создаем простую геометрию как замену
          createFallbackModel(scene, ticket.is_win);
          playSound(ticket.is_win ? "chestOpen" : "chestClose");
        }
      );

      // Функция анимации для 3D режима
      const animate = () => {
        if (!arStarted) return; // Прекращаем анимацию, если компонент размонтирован
        
        requestAnimationFrame(animate);
        
        if (controlsRef.current) {
          controlsRef.current.update();
        }
        
        if (mixerRef.current) {
          const delta = clock.current.getDelta();
          mixerRef.current.update(delta);
        }
        
        // Простое вращение для резервной модели без анимаций
        if (objectRef.current && !mixerRef.current) {
          objectRef.current.rotation.y += 0.005;
        }
        
        if (rendererRef.current && sceneRef.current && cameraRef.current) {
          rendererRef.current.render(sceneRef.current, cameraRef.current);
        }
      };

      // Запуск анимации
      animate();
      setIs3DMode(true);
      setArStarted(true);

      // Обработчик изменения размера окна
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

  // Очистка ресурсов при размонтировании компонента
  useEffect(() => {
    return () => {
      addLog("Очистка ресурсов");
      
      // Остановка звуков
      Object.values(sounds).forEach((sound) => {
        if (sound && sound.isPlaying) {
          sound.stop();
        }
      });

      // Очистка рендерера
      if (rendererRef.current) {
        rendererRef.current.setAnimationLoop(null);
        rendererRef.current.dispose();
        
        if (containerRef.current && rendererRef.current.domElement) {
          containerRef.current.removeChild(rendererRef.current.domElement);
        }
      }

      // Удаление кнопки AR
      const arButton = document.querySelector("button.webxr-button");
      if (arButton) {
        arButton.remove();
      }

      // Очистка источника hit-test
      if (hitTestSourceRef.current) {
        hitTestSourceRef.current.cancel();
        hitTestSourceRef.current = null;
      }

      // Остановка анимаций
      if (mixerRef.current) {
        mixerRef.current.stopAllAction();
        mixerRef.current = null;
      }

      // Освобождение ресурсов сцены
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
    };
  }, [sounds]);

  // Отображение загрузки
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <ClipLoader size={40} color="#000" />
      </div>
    );
  }

  // Отображение ошибки
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

  // Отображение если билет не найден
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

  // Основной интерфейс
  return (
    <div className="h-screen relative">
      {/* Контейнер для сцены Three.js */}
      <div ref={containerRef} className="absolute inset-0" style={{ zIndex: 0 }}></div>
      
      {/* Стартовый экран до начала AR/3D */}
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
              {isWebXRSupported && !isIOS ? "Запустить AR просмотр" : "Запустить 3D просмотр"}
            </button>
            <p className="mt-4 text-sm opacity-80">
              {isWebXRSupported && !isIOS
                ? "Сундук появится на плоской поверхности перед вами. Коснитесь экрана для размещения."
                : "Вы сможете вращать сундук касанием или мышью"}
            </p>
          </div>
        </div>
      ) : (
        // Панель результата после запуска AR/3D
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
                  if (objectRef.current) {
                    setAnimationPlayed(false);
                    playSpecificAnimation(ticket.is_win);
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
      
      {/* Панель логов (видимая в режиме отладки) */}
      {debugMode && (
        <div
          className="absolute top-4 left-4 right-4 bg-black bg-opacity-50 text-white p-2 max-h-40 overflow-y-auto z-20"
          style={{ display: "block", fontSize: "8px" }}
        >
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs font-bold">Журнал отладки</span>
            <button 
              onClick={() => setDebugMode(false)} 
              className="text-xs bg-red-500 px-2 rounded"
            >
              Скрыть
            </button>
          </div>
          {logs.map((log, index) => (
            <p key={index} className="text-xs">
              {log}
            </p>
          ))}
        </div>
      )}
    </div>
  );
};

export default ARLotteryView;