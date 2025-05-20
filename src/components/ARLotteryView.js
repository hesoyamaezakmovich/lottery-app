import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { ClipLoader } from "react-spinners";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

// Компонент оверлея для отображения сообщений поверх AR-представления
const AROverlay = ({ children, className }) => (
  <div className={`fixed z-50 p-4 bg-black bg-opacity-60 text-white rounded-lg shadow-lg ${className}`}>
    {children}
  </div>
);

const ARLotteryView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [ticket, setTicket] = useState(null);
  const [viewStarted, setViewStarted] = useState(false);
  const [deviceInfo, setDeviceInfo] = useState("");
  const [arSupported, setArSupported] = useState(false);
  const [arActive, setArActive] = useState(false);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [debugMode, setDebugMode] = useState(true);
  const [logs, setLogs] = useState([]);
  const [arSessionEnded, setArSessionEnded] = useState(false);

  // Refs для Three.js и WebXR
  const containerRef = useRef(null);
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const cameraRef = useRef(null);
  const objectRef = useRef(null);
  const mixerRef = useRef(null);
  const controlsRef = useRef(null);
  const clock = useRef(new THREE.Clock());
  const arSessionRef = useRef(null);
  const hitTestSourceRef = useRef(null);
  const hitTestSourceRequiredRef = useRef(true);
  const modelPlaced = useRef(false);

  // Функция логирования
  const addLog = (message) => {
    if (debugMode) {
      const timestamp = new Date().toLocaleTimeString();
      setLogs((prev) => [...prev, `[${timestamp}] ${message}`].slice(-15));
    }
    console.log(`[AR] ${message}`); // Также выводим в консоль для отладки
  };

  // Применяем класс ar-active к body при активной AR сессии
  useEffect(() => {
    if (arActive) {
      document.body.classList.add('ar-active');
    } else {
      document.body.classList.remove('ar-active');
    }

    return () => {
      document.body.classList.remove('ar-active');
    };
  }, [arActive]);

  // Полная очистка при размонтировании компонента
  useEffect(() => {
    return () => {
      // Завершаем AR сессию если она активна
      if (arSessionRef.current) {
        arSessionRef.current.end().catch(console.error);
      }
      
      // Очищаем Three.js ресурсы
      if (rendererRef.current) {
        rendererRef.current.dispose();
      }
      
      // Удаляем класс с body
      document.body.classList.remove('ar-active');
      
      // Удаляем обработчики событий
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Обработчик изменения размера окна
  const handleResize = () => {
    if (cameraRef.current && rendererRef.current) {
      cameraRef.current.aspect = window.innerWidth / window.innerHeight;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(window.innerWidth, window.innerHeight);
    }
  };

  // Проверка и запрос разрешения на использование камеры
  const checkCameraPermission = async () => {
    try {
      addLog("Запрашиваем разрешение на доступ к камере...");
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: {
          width: { ideal: window.innerWidth },
          height: { ideal: window.innerHeight },
          facingMode: 'environment' // Использовать заднюю камеру
        } 
      });
      stream.getTracks().forEach(track => track.stop()); // Останавливаем стрим, нам нужно только разрешение
      setPermissionGranted(true);
      addLog("Разрешение на доступ к камере получено!");
      return true;
    } catch (err) {
      addLog(`Ошибка при запросе доступа к камере: ${err.message}`);
      setPermissionGranted(false);
      setError("Для AR необходим доступ к камере. Пожалуйста, разрешите доступ к камере в настройках браузера.");
      return false;
    }
  };

  // Определяем тип устройства и поддержку AR
  useEffect(() => {
    const detectDevice = async () => {
      const ua = navigator.userAgent;
      
      // Определяем тип устройства и браузер
      const isIOS = /iPad|iPhone|iPod/.test(ua) && !window.MSStream;
      const isAndroid = /Android/.test(ua);
      const isMobile = isIOS || isAndroid;
      const browser = 
        /CriOS/.test(ua) ? "Chrome на iOS" :
        /FxiOS/.test(ua) ? "Firefox на iOS" :
        /EdgiOS/.test(ua) ? "Edge на iOS" :
        /OPiOS/.test(ua) ? "Opera на iOS" :
        /Safari/.test(ua) && isIOS ? "Safari на iOS" :
        /Chrome/.test(ua) ? "Chrome" :
        /Firefox/.test(ua) ? "Firefox" :
        /Edge/.test(ua) ? "Edge" :
        /Opera/.test(ua) ? "Opera" :
        "Неизвестный браузер";
      
      const deviceType = isIOS ? "iOS" : isAndroid ? "Android" : "Десктоп";
      const deviceInfo = `${deviceType}, ${browser}`;
      
      setDeviceInfo(deviceInfo);
      addLog(`Устройство: ${deviceInfo}`);
      
      // Проверка ограничений
      if (!isMobile) {
        addLog('AR обычно доступен только на мобильных устройствах');
      }
      
      if (isIOS && !/Safari/.test(ua)) {
        addLog('Внимание: на iOS AR работает только в Safari');
      }
      
      // Проверяем поддержку WebXR
      if ('xr' in navigator) {
        try {
          const supported = await navigator.xr.isSessionSupported('immersive-ar');
          setArSupported(supported);
          addLog(`Поддержка AR: ${supported ? 'Да' : 'Нет'}`);

          // Если AR поддерживается, проверяем разрешение камеры
          if (supported && isMobile) {
            await checkCameraPermission();
          } else if (!isMobile) {
            setArSupported(false);
            addLog('AR недоступен на десктопе');
          }
        } catch (err) {
          addLog(`Ошибка при проверке поддержки AR: ${err.message}`);
          setArSupported(false);
        }
      } else {
        addLog('WebXR API не поддерживается в этом браузере');
        setArSupported(false);
      }
    };
    
    detectDevice();
  }, []);

  // Получаем данные билета
  useEffect(() => {
    const fetchTicket = async () => {
      setLoading(true);
      try {
        addLog(`Запрос билета с ID: ${id}`);
        
        const { data, error } = await supabase
          .from("ar_lottery_tickets")
          .select("*")
          .eq("id", id)
          .single();

        if (error) throw error;
        
        setTicket(data);
        addLog(`Билет загружен: ${data.id} (выигрыш: ${data.is_win ? 'да' : 'нет'})`);

        // Отмечаем билет как просмотренный
        if (!data.viewed) {
          await supabase
            .from("ar_lottery_tickets")
            .update({ viewed: true })
            .eq("id", id);
        }
      } catch (err) {
        addLog(`Ошибка: ${err.message}`);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchTicket();
  }, [id]);

  // Создание и добавление сцены на страницу
  const setupScene = () => {
    if (!containerRef.current) {
      addLog("Контейнер для рендеринга не найден");
      return null;
    }

    // Очищаем контейнер перед добавлением нового канваса
    while (containerRef.current.firstChild) {
      containerRef.current.removeChild(containerRef.current.firstChild);
    }

    // Создаем сцену
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // Создаем камеру
    const camera = new THREE.PerspectiveCamera(
      70, 
      window.innerWidth / window.innerHeight, 
      0.01, 
      20
    );
    camera.position.set(0, 0, 0);
    cameraRef.current = camera;

    // Создаем WebGL рендерер
    const renderer = new THREE.WebGLRenderer({ 
      antialias: true,
      alpha: true,
      powerPreference: "high-performance" // Для лучшей производительности на мобильных устройствах
    });
    
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Ограничиваем pixelRatio для производительности 
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.setClearColor(0x000000, 0); // Прозрачный фон
    rendererRef.current = renderer;
    
    // Добавляем канвас на страницу и применяем стили
    const canvas = renderer.domElement;
    canvas.style.display = 'block';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.position = 'absolute';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.zIndex = '1';
    containerRef.current.appendChild(canvas);
    
    addLog("Рендерер создан и добавлен на страницу");
    
    // Добавляем обработчик изменения размера окна
    window.addEventListener("resize", handleResize);
    
    return () => {
      window.removeEventListener("resize", handleResize);
      
      if (rendererRef.current) {
        rendererRef.current.setAnimationLoop(null);
        rendererRef.current.dispose();
      }
      
      if (controlsRef.current) {
        controlsRef.current.dispose();
      }
    };
  };

  // Инициализация 3D сцены (общая для AR и fallback)
  const initScene = () => {
    if (!ticket) {
      setError("Билет не найден");
      return;
    }

    addLog("Инициализация 3D сцены");
    
    try {
      // Настраиваем базовую сцену
      const cleanup = setupScene();
      if (!cleanup) {
        throw new Error("Не удалось настроить сцену");
      }

      // Добавляем освещение
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
      sceneRef.current.add(ambientLight);
      
      const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
      directionalLight.position.set(0, 1, 1);
      sceneRef.current.add(directionalLight);
      
      // Загружаем модель сундука
      // Важно: убедитесь, что модели находятся в папке public/models/
      const loader = new GLTFLoader();
      let modelPath;
      
      // Проверяем пути к файлам моделей
      if (ticket.is_win) {
        modelPath = "/models/treasure_chest_win.glb";
        // Альтернативные пути, на случай если первый не работает
        const alternativePaths = [
          "./models/treasure_chest_win.glb",
          "../models/treasure_chest_win.glb",
          "models/treasure_chest_win.glb"
        ];
        
        // Проверка доступности файла модели
        fetch(modelPath).catch(() => {
          addLog(`Модель не найдена по пути ${modelPath}, пробуем альтернативные пути...`);
          // Если основной путь не работает, попробуем альтернативные
          modelPath = alternativePaths[0]; // установим первый альтернативный путь
        });
      } else {
        modelPath = "/models/treasure_chest_lose.glb";
        // Альтернативные пути
        const alternativePaths = [
          "./models/treasure_chest_lose.glb",
          "../models/treasure_chest_lose.glb",
          "models/treasure_chest_lose.glb"
        ];
        
        // Проверка доступности файла модели
        fetch(modelPath).catch(() => {
          addLog(`Модель не найдена по пути ${modelPath}, пробуем альтернативные пути...`);
          modelPath = alternativePaths[0];
        });
      }
      
      addLog(`Загрузка модели: ${modelPath}`);
      
      // Устанавливаем временную геометрию, которая будет отображаться до загрузки модели
      const tempGeometry = new THREE.BoxGeometry(0.2, 0.2, 0.2);
      const tempMaterial = new THREE.MeshBasicMaterial({ 
        color: ticket.is_win ? 0xffcc00 : 0x888888,
        wireframe: true
      });
      const tempBox = new THREE.Mesh(tempGeometry, tempMaterial);
      
      if (!arSupported) {
        tempBox.position.set(0, 0, -1);
      }
      
      tempBox.visible = !arSupported;
      sceneRef.current.add(tempBox);
      objectRef.current = tempBox; // временно используем как объект
      
      loader.load(
        modelPath,
        (gltf) => {
          addLog("Модель загружена успешно");
          
          // Удаляем временную геометрию
          sceneRef.current.remove(tempBox);
          
          // Настраиваем модель
          const model = gltf.scene;
          model.scale.set(0.15, 0.15, 0.15);
          
          // В режиме AR модель будет размещена позже
          if (!arSupported) {
            model.position.set(0, -0.3, -1); // Устанавливаем дальше от камеры, чтобы лучше видеть
          }
          
          // Скрываем модель, она будет показана после размещения в AR
          model.visible = !arSupported;
          
          sceneRef.current.add(model);
          objectRef.current = model;
          
          // Настраиваем анимации
          if (gltf.animations && gltf.animations.length > 0) {
            addLog(`Найдено анимаций: ${gltf.animations.length}`);
            mixerRef.current = new THREE.AnimationMixer(model);
            
            if (!arSupported) {
              // Сразу запускаем анимацию в режиме fallback
              const action = mixerRef.current.clipAction(gltf.animations[0]);
              action.clampWhenFinished = true;
              action.setLoop(THREE.LoopOnce);
              action.play();
            }
          }
          
          // Если не AR, добавляем OrbitControls
          if (!arSupported) {
            initOrbitControls();
          }
        },
        (progress) => {
          if (progress.total > 0) {
            const percent = Math.round((progress.loaded / progress.total) * 100);
            if (percent % 25 === 0) {
              addLog(`Загрузка модели: ${percent}%`);
            }
          }
        },
        (error) => {
          addLog(`Ошибка загрузки модели: ${error.message}`);
          
          // Используем временную геометрию как основную, если не удалось загрузить модель
          tempBox.visible = true;
          
          // Если не AR, добавляем OrbitControls
          if (!arSupported) {
            initOrbitControls();
          }
        }
      );

      return cleanup;
    } catch (err) {
      addLog(`Ошибка инициализации сцены: ${err.message}`);
      setError(`Не удалось инициализировать 3D сцену: ${err.message}`);
      return null;
    }
  };

  // Инициализация OrbitControls для режима fallback
  const initOrbitControls = () => {
    if (!cameraRef.current || !rendererRef.current) {
      addLog("Не удалось инициализировать OrbitControls: нет камеры или рендерера");
      return;
    }
    
    const controls = new OrbitControls(cameraRef.current, rendererRef.current.domElement);
    controls.target.set(0, 0, -1);
    controls.enableDamping = true;
    controls.dampingFactor = 0.1;
    controls.rotateSpeed = 0.5;
    controls.minDistance = 0.5;
    controls.maxDistance = 4;
    controls.maxPolarAngle = Math.PI * 0.8;
    controls.update();
    controlsRef.current = controls;
    
    // Настраиваем анимационный цикл для fallback режима
    const animate = () => {
      requestAnimationFrame(animate);
      
      if (controlsRef.current) {
        controlsRef.current.update();
      }
      
      if (mixerRef.current) {
        const delta = clock.current.getDelta();
        mixerRef.current.update(delta);
      }
      
      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
    };
    
    animate();
    addLog("Инициализирован режим fallback с OrbitControls");
  };

  // Инициализация AR сессии
  const initAR = async () => {
    if (!ticket) {
      setError("Билет не найден");
      return;
    }

    if (!arSupported) {
      addLog("Устройство не поддерживает AR, переключаемся на fallback режим");
      return initScene();
    }

    // Проверяем разрешение камеры перед запуском AR
    if (!permissionGranted) {
      const hasPermission = await checkCameraPermission();
      if (!hasPermission) {
        addLog("Нет разрешения на доступ к камере, переключаемся на fallback режим");
        return initScene();
      }
    }

    addLog("Запуск AR-режима");
    
    try {
      // Инициализируем базовую сцену
      const cleanup = initScene();
      if (!cleanup) {
        throw new Error("Не удалось инициализировать базовую сцену");
      }
      
      if (!rendererRef.current) {
        throw new Error("Рендерер не инициализирован");
      }

      // Проверяем, что WebXR доступен
      if (!navigator.xr) {
        throw new Error("WebXR не поддерживается в этом браузере");
      }

      // Включаем WebXR
      rendererRef.current.xr.enabled = true;
      
      // Создаем reticle для определения положения размещения объекта
      const reticleGeometry = new THREE.RingGeometry(0.15, 0.2, 32).rotateX(-Math.PI / 2);
      const reticleMaterial = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        opacity: 0.8,
        transparent: true
      });
      const reticle = new THREE.Mesh(reticleGeometry, reticleMaterial);
      reticle.matrixAutoUpdate = false;
      reticle.visible = false;
      sceneRef.current.add(reticle);

      // Настройка AR сессии
      const sessionInit = { 
        requiredFeatures: ['hit-test'],
        optionalFeatures: ['dom-overlay'],
        domOverlay: { root: document.body }
      };

      addLog("Запрашиваем AR сессию...");
      
      try {
        // Запрашиваем AR сессию
        const session = await navigator.xr.requestSession('immersive-ar', sessionInit);
        arSessionRef.current = session;
        setArActive(true);
        setArSessionEnded(false);
        
        addLog("AR сессия создана успешно");
        
        // Настраиваем XR reference space
        rendererRef.current.xr.setReferenceSpaceType('local');
        
        // Устанавливаем сессию для рендерера
        await rendererRef.current.xr.setSession(session);
        
        session.addEventListener('end', () => {
          addLog('AR сессия завершена');
          setArActive(false);
          setArSessionEnded(true);
          modelPlaced.current = false;
          hitTestSourceRef.current = null;
          hitTestSourceRequiredRef.current = true;
          
          // Возвращаемся к fallback режиму
          if (objectRef.current) {
            objectRef.current.visible = true;
            initOrbitControls();
          }
        });

        // Настраиваем обработчик выбора для размещения модели
        session.addEventListener('select', () => {
          if (reticle.visible && !modelPlaced.current && objectRef.current) {
            addLog("Позиция для размещения выбрана");
            
            // Сохраняем матрицу положения reticle
            const matrix = new THREE.Matrix4();
            matrix.fromArray(reticle.matrix.elements);
            
            // Устанавливаем позицию и поворот модели
            objectRef.current.position.setFromMatrixPosition(matrix);
            objectRef.current.visible = true;
            modelPlaced.current = true;
            reticle.visible = false;
            
            // Запускаем анимацию
            if (mixerRef.current && mixerRef.current._actions && mixerRef.current._actions.length > 0) {
              const action = mixerRef.current._actions[0];
              action.reset();
              action.clampWhenFinished = true;
              action.setLoop(THREE.LoopOnce);
              action.play();
              addLog("Анимация запущена");
            }
          }
        });

        // Настраиваем анимационный цикл для AR
        rendererRef.current.setAnimationLoop((timestamp, frame) => {
          if (!frame) return;
          
          // Обновляем анимацию сундука
          if (mixerRef.current) {
            const delta = clock.current.getDelta();
            mixerRef.current.update(delta);
          }
          
          // Обработка hit-test для определения поверхностей
          if (!modelPlaced.current) {
            if (hitTestSourceRequiredRef.current) {
              addLog("Запрашиваем hit-test source...");
              
              session.requestReferenceSpace('viewer')
                .then((viewerSpace) => {
                  session.requestHitTestSource({ space: viewerSpace })
                    .then((source) => {
                      hitTestSourceRef.current = source;
                      addLog("Hit test source создан");
                    })
                    .catch((error) => {
                      addLog(`Ошибка при создании hit test source: ${error.message}`);
                    });
                })
                .catch((error) => {
                  addLog(`Ошибка при запросе viewer space: ${error.message}`);
                });
              
              hitTestSourceRequiredRef.current = false;
            }
            
            if (hitTestSourceRef.current && frame) {
              const referenceSpace = rendererRef.current.xr.getReferenceSpace();
              if (referenceSpace) {
                const hitTestResults = frame.getHitTestResults(hitTestSourceRef.current);
                
                if (hitTestResults.length) {
                  const hit = hitTestResults[0];
                  const hitPose = hit.getPose(referenceSpace);
                  
                  if (hitPose) {
                    reticle.visible = true;
                    reticle.matrix.fromArray(hitPose.transform.matrix);
                  } else {
                    reticle.visible = false;
                  }
                } else {
                  reticle.visible = false;
                }
              }
            }
          }
          
          // Рендеринг сцены
          if (rendererRef.current && sceneRef.current && cameraRef.current) {
            rendererRef.current.render(sceneRef.current, cameraRef.current);
          }
        });
      } catch (err) {
        addLog(`Ошибка при создании AR сессии: ${err.message}`);
        setError(`Не удалось запустить AR сессию: ${err.message}. Проверьте, что ваш браузер имеет доступ к камере.`);
        // Если AR сессия не удалась, переходим к fallback режиму
        initOrbitControls();
        if (objectRef.current) {
          objectRef.current.visible = true;
        }
      }
    } catch (err) {
      addLog(`Ошибка инициализации AR: ${err.message}`);
      setError(`Не удалось инициализировать AR: ${err.message}`);
      initOrbitControls();
    }
  };

  // Обработчик для запуска AR или fallback режима
  const handleStartView = () => {
    addLog("Запуск просмотра");
    if (arSupported) {
      initAR();
    } else {
      initScene();
    }
    setViewStarted(true);
  };

  // Обработчик для принудительного перехода в fallback режим
  const handleFallbackMode = () => {
    addLog("Принудительный переход в fallback режим");
    setArSupported(false);
    initScene();
    setViewStarted(true);
  };

  // Обработчик для выхода из AR режима
  const handleExitAR = () => {
    addLog("Выход из AR режима");
    if (arSessionRef.current) {
      arSessionRef.current.end().catch(err => {
        addLog(`Ошибка при завершении AR сессии: ${err.message}`);
      });
    }
  };

  // Показываем индикатор загрузки
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 ar-page">
        <ClipLoader size={40} color="#000" />
      </div>
    );
  }

  // Показываем ошибку
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 ar-page">
        <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
          <h2 className="text-2xl font-bold text-black mb-4 text-center">Ошибка</h2>
          <p className="text-red-600 text-center">{error}</p>
          <div className="flex flex-col space-y-3 mt-4">
            {arSupported && (
              <button
                onClick={handleFallbackMode}
                className="w-full py-2 px-4 bg-blue-500 text-white font-semibold rounded-md hover:bg-blue-600"
              >
                Попробовать в 3D режиме
              </button>
            )}
            <button
              onClick={() => navigate("/dashboard")}
              className="w-full py-2 px-4 bg-yellow-500 text-black font-semibold rounded-md hover:bg-yellow-600"
            >
              Вернуться на главную
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Показываем сообщение, если билет не найден
  if (!ticket) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 ar-page">
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
    <div className="h-screen w-screen relative ar-page">
      {/* Контейнер для AR/3D сцены */}
      <div 
        ref={containerRef} 
        className="absolute inset-0 ar-container" 
        style={{ 
          background: arActive ? 'transparent' : 'linear-gradient(to bottom, #663399, #5B21B6)',
          zIndex: 0 
        }}
      />
      
      {/* Стартовый экран перед запуском просмотра */}
      {!viewStarted ? (
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
            
            <div className="mb-4 p-3 bg-blue-800 bg-opacity-40 rounded-lg text-sm">
              <p className="text-blue-200 mb-2">
                Устройство: {deviceInfo}
              </p>
              <p className="text-green-300">
                {arSupported 
                  ? "Поддержка AR: Да! Вы сможете разместить виртуальный сундук в реальном мире."
                  : "Поддержка AR: Нет. Будет использован 3D-режим."}
              </p>
              {arSupported && !permissionGranted && (
                <p className="text-yellow-300 mt-1">
                  Потребуется разрешение на доступ к камере
                </p>
              )}
            </div>
            
            <p className="mb-6">
              {arSupported 
                ? "Нажмите кнопку ниже, чтобы перейти в режим дополненной реальности. После запуска найдите плоскую поверхность и нажмите на нее, чтобы разместить сундук."
                : "Нажмите кнопку ниже, чтобы увидеть результат вашей лотереи в виде 3D сундука с сокровищами!"}
            </p>
            
            <div className="flex flex-col space-y-4">
              <button
                onClick={handleStartView}
                className={`w-full px-6 py-3 font-bold rounded-lg transition-colors duration-300 text-lg ${
                  arSupported 
                    ? "bg-green-500 text-white hover:bg-green-600" 
                    : "bg-yellow-500 text-black hover:bg-yellow-600"
                }`}
              >
                {arSupported ? "Запустить AR" : "Открыть 3D просмотр"}
              </button>
              
              {arSupported && (
                <button
                  onClick={handleFallbackMode}
                  className="px-6 py-3 bg-blue-500 text-white font-bold rounded-lg hover:bg-blue-600 transition-colors duration-300"
                >
                  Использовать 3D режим вместо AR
                </button>
              )}
            </div>
            
            <p className="mt-4 text-sm opacity-80">
              {arSupported 
                ? "В режиме AR вы сможете перемещаться вокруг объекта" 
                : "Вы сможете вращать сундук касанием или мышью"}
            </p>
          </div>
        </div>
      ) : (
        // Панель с информацией после запуска просмотра
        <AROverlay className="bottom-24 left-0 right-0 mx-auto max-w-md text-center">
          <h2 className="text-xl font-bold mb-4">
            {ticket.is_win
              ? `Поздравляем! Вы выиграли ${ticket.win_amount} ₽`
              : "К сожалению, сундук оказался пуст"}
          </h2>
          <div className="flex justify-center space-x-4">
            {arActive && (
              <button
                onClick={handleExitAR}
                className="px-6 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 text-base"
              >
                Выйти из AR
              </button>
            )}
            <button
              onClick={() => navigate("/dashboard")}
              className="px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 text-base"
            >
              На главную
            </button>
          </div>
        </AROverlay>
      )}
      
      {/* AR-инструкции для пользователя */}
      {viewStarted && arSupported && arActive && !modelPlaced.current && (
        <AROverlay className="top-0 left-0 right-0 mx-auto mt-10 max-w-md text-center">
          <p className="font-bold mb-1">Найдите плоскую поверхность</p>
          <p className="text-sm">Наведите камеру на пол или стол и нажмите, чтобы разместить сундук</p>
        </AROverlay>
      )}
      
      {/* Ошибка при работе с AR */}
      {viewStarted && arSupported && arSessionEnded && (
        <AROverlay className="top-0 left-0 right-0 mx-auto mt-24 max-w-md text-center">
          <p className="font-bold mb-1">Сессия AR завершена</p>
          <button
            onClick={handleStartView}
            className="mt-2 px-4 py-2 bg-green-500 text-white rounded-lg font-bold"
          >
            Перезапустить AR
          </button>
          <button
            onClick={handleFallbackMode}
            className="mt-2 px-4 py-2 bg-white text-gray-800 rounded-lg ml-2 font-bold"
          >
            Переключиться на 3D режим
          </button>
        </AROverlay>
      )}
      
      {/* Логи для отладки */}
      {debugMode && (
        <AROverlay className="top-4 left-4 right-4 max-h-40 overflow-y-auto">
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs font-bold">Отладка</span>
            <div>
              <span className="text-xs mr-2">Устройство: {deviceInfo}</span>
              <button 
                onClick={() => setDebugMode(false)} 
                className="text-xs bg-red-500 px-2 rounded"
              >
                Скрыть
              </button>
            </div>
          </div>
          {logs.map((log, index) => (
            <p key={index} className="text-xs">
              {log}
            </p>
          ))}
        </AROverlay>
      )}
    </div>
  );
};

export default ARLotteryView;