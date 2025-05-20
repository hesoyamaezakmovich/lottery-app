// Обновленный ARLotteryView.js для настоящей AR
import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { ClipLoader } from "react-spinners";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { ARButton } from "three/examples/jsm/webxr/ARButton.js";

const ARLotteryView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [ticket, setTicket] = useState(null);
  const [deviceInfo, setDeviceInfo] = useState("");
  const [arSupported, setArSupported] = useState(false);
  const [debugMode, setDebugMode] = useState(true);
  const [logs, setLogs] = useState([]);

  // Refs для Three.js и WebXR
  const containerRef = useRef(null);
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const cameraRef = useRef(null);
  const objectRef = useRef(null);
  const mixerRef = useRef(null);
  const clock = useRef(new THREE.Clock());
  const reticleRef = useRef(null);
  const modelPlaced = useRef(false);

  // Функция логирования
  const addLog = (message) => {
    if (debugMode) {
      const timestamp = new Date().toLocaleTimeString();
      setLogs((prev) => [...prev, `[${timestamp}] ${message}`].slice(-15));
    }
  };

  // Определяем тип устройства и поддержку AR
  useEffect(() => {
    const detectDevice = () => {
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
      
      // Проверяем поддержку WebXR
      if (navigator.xr) {
        navigator.xr.isSessionSupported('immersive-ar')
          .then((supported) => {
            setArSupported(supported);
            addLog(`Поддержка AR: ${supported ? 'Да' : 'Нет'}`);
          })
          .catch(err => {
            addLog(`Ошибка при проверке поддержки AR: ${err.message}`);
            setArSupported(false);
          });
      } else {
        addLog('WebXR API не поддерживается в этом браузере');
        setArSupported(false);
      }
      
      return { isIOS, isAndroid, isMobile, browser, deviceType };
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

  // Инициализация AR
  const initAR = async () => {
    if (!ticket) {
      setError("Билет не найден");
      return;
    }

    addLog("Инициализация AR");
    
    try {
      // Создаем Three.js сцену
      const scene = new THREE.Scene();
      sceneRef.current = scene;

      // Настраиваем камеру
      const camera = new THREE.PerspectiveCamera(
        70, 
        window.innerWidth / window.innerHeight, 
        0.01, 
        20
      );
      cameraRef.current = camera;

      // Создаем WebGL рендерер с поддержкой WebXR
      const renderer = new THREE.WebGLRenderer({ 
        antialias: true,
        alpha: true
      });
      
      renderer.setPixelRatio(window.devicePixelRatio);
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.outputEncoding = THREE.sRGBEncoding;
      renderer.xr.enabled = true;
      rendererRef.current = renderer;
      
      // Добавляем канвас в DOM
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
        containerRef.current.appendChild(renderer.domElement);
        addLog("Рендерер создан и добавлен на страницу");
        
        // Добавляем AR кнопку
        const arButton = ARButton.createButton(renderer, {
          requiredFeatures: ['hit-test'],
          optionalFeatures: ['dom-overlay'],
          domOverlay: { root: document.body }
        });
        
        containerRef.current.appendChild(arButton);
        addLog("Кнопка AR добавлена");
      }

      // Добавляем освещение
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
      scene.add(ambientLight);
      
      const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
      directionalLight.position.set(0, 1, 1);
      scene.add(directionalLight);
      
      // Создаем индикатор позиции размещения (reticle)
      const reticleGeometry = new THREE.RingGeometry(0.15, 0.2, 32).rotateX(-Math.PI / 2);
      const reticleMaterial = new THREE.MeshBasicMaterial();
      const reticle = new THREE.Mesh(reticleGeometry, reticleMaterial);
      reticle.matrixAutoUpdate = false;
      reticle.visible = false;
      scene.add(reticle);
      reticleRef.current = reticle;
      
      // Загружаем модель сундука
      const loader = new GLTFLoader();
      const modelPath = ticket.is_win 
        ? "/models/treasure_chest_win.glb" 
        : "/models/treasure_chest_lose.glb";
      
      addLog(`Загрузка модели: ${modelPath}`);
      
      let model = null;
      loader.load(
        modelPath,
        (gltf) => {
          addLog("Модель загружена успешно");
          
          // Настраиваем модель
          model = gltf.scene;
          model.scale.set(0.15, 0.15, 0.15);
          model.position.y = -0.3;
          model.visible = false;
          scene.add(model);
          objectRef.current = model;
          
          // Настраиваем анимации
          if (gltf.animations && gltf.animations.length > 0) {
            addLog(`Найдено анимаций: ${gltf.animations.length}`);
            mixerRef.current = new THREE.AnimationMixer(model);
            
            // Подготавливаем анимацию, но не запускаем её
            const action = mixerRef.current.clipAction(gltf.animations[0]);
            action.clampWhenFinished = true;
            action.setLoop(THREE.LoopOnce);
            // Анимация запустится при размещении объекта
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
          
          // Создаем упрощенную модель в случае ошибки
          const boxGeometry = new THREE.BoxGeometry(0.3, 0.2, 0.3);
          const boxMaterial = new THREE.MeshStandardMaterial({
            color: ticket.is_win ? 0xffd700 : 0x8b4513,
            roughness: 0.7,
            metalness: ticket.is_win ? 0.6 : 0.3
          });
          
          const box = new THREE.Mesh(boxGeometry, boxMaterial);
          box.visible = false;
          scene.add(box);
          objectRef.current = box;
        }
      );

      // Настройка WebXR сессии
      renderer.xr.addEventListener('sessionstart', () => {
        addLog('AR сессия началась');
      });
      
      renderer.xr.addEventListener('sessionend', () => {
        addLog('AR сессия завершена');
        modelPlaced.current = false;
      });
      
      // Создаем анимационный цикл
      renderer.setAnimationLoop((timestamp, frame) => {
        if (!frame) return;
        
        // Если нужно тестировать hit-test (поиск поверхностей)
        const referenceSpace = renderer.xr.getReferenceSpace();
        const session = renderer.xr.getSession();
        
        if (session && referenceSpace && !modelPlaced.current) {
          const hitTestSource = session.requestHitTestSource({ space: referenceSpace });
          
          if (hitTestSource) {
            session.requestHitTest(hitTestSource, frame)
              .then((hitTestResults) => {
                if (hitTestResults.length) {
                  const hit = hitTestResults[0];
                  reticleRef.current.visible = true;
                  reticleRef.current.matrix.fromArray(hit.getPose(referenceSpace).transform.matrix);
                  
                  // Обработка касания экрана для размещения объекта
                  session.addEventListener('select', () => {
                    if (!modelPlaced.current && objectRef.current) {
                      // Размещаем объект на поверхности
                      objectRef.current.position.setFromMatrixPosition(reticleRef.current.matrix);
                      objectRef.current.visible = true;
                      reticleRef.current.visible = false;
                      modelPlaced.current = true;
                      
                      // Запускаем анимацию
                      if (mixerRef.current && mixerRef.current._actions.length > 0) {
                        const action = mixerRef.current._actions[0];
                        action.reset();
                        action.play();
                        addLog("Анимация запущена");
                      }
                    }
                  }, { once: true });
                }
              });
          }
        }
        
        // Обновляем анимацию
        if (mixerRef.current && modelPlaced.current) {
          const delta = clock.current.getDelta();
          mixerRef.current.update(delta);
        }
        
        // Рендеринг сцены
        renderer.render(scene, camera);
      });
      
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
        renderer.setAnimationLoop(null);
      };
      
    } catch (err) {
      addLog(`Ошибка: ${err.message}`);
      setError(`Не удалось инициализировать AR: ${err.message}`);
    }
  };

  // Создаем компонент для режима fallback 3D
  const init3DView = () => {
    if (!ticket) {
      setError("Билет не найден");
      return;
    }

    addLog("Инициализация 3D просмотра (без AR)");
    // Здесь можно использовать код из предыдущей версии компонента
    // для создания 3D-просмотра без AR для устройств без поддержки WebXR
    // ...
  };

  // Показываем индикатор загрузки
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <ClipLoader size={40} color="#000" />
      </div>
    );
  }

  // Показываем ошибку
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

  // Показываем сообщение, если билет не найден
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
      {/* Контейнер для AR сцены */}
      <div ref={containerRef} className="absolute inset-0" style={{ zIndex: 0 }}></div>
      
      {/* Верхний информационный слой */}
      <div className="absolute top-0 left-0 right-0 p-4 bg-black bg-opacity-50 text-white z-30">
        <div className="text-center max-w-md mx-auto">
          <h2 className="text-xl font-bold mb-2">AR Лотерея</h2>
          <p className="mb-2">
            {arSupported 
              ? "Нажмите кнопку ниже чтобы начать AR"
              : "К сожалению, ваше устройство не поддерживает AR"}
          </p>
          <div className="text-sm">
            {ticket.is_win 
              ? `Вы выиграли ${ticket.win_amount} ₽` 
              : "К сожалению, вы не выиграли в этот раз"}
          </div>
        </div>
      </div>
      
      {/* Кнопки управления */}
      <div className="absolute bottom-4 left-0 right-0 flex justify-center z-40 p-4">
        {!arSupported ? (
          // Кнопка для запуска обычного 3D просмотра на устройствах без AR
          <button
            onClick={init3DView}
            className="px-6 py-3 bg-yellow-500 text-black font-bold rounded-lg shadow-lg"
          >
            Открыть 3D просмотр
          </button>
        ) : (
          // AR инициализируется через кнопку, добавляемую ARButton.createButton
          <button
            onClick={initAR}
            className="px-6 py-3 bg-yellow-500 text-black font-bold rounded-lg shadow-lg"
          >
            Запустить AR
          </button>
        )}
      </div>
      
      {/* Отладочные логи */}
      {debugMode && (
        <div
          className="absolute top-20 left-4 right-4 bg-black bg-opacity-50 text-white p-2 max-h-40 overflow-y-auto z-30"
          style={{ fontSize: "10px" }}
        >
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs font-bold">Отладка</span>
            <button 
              onClick={() => setDebugMode(false)} 
              className="text-xs bg-red-500 px-2 rounded"
            >
              Скрыть
            </button>
          </div>
          {logs.map((log, index) => (
            <p key={index} className="text-xs">{log}</p>
          ))}
        </div>
      )}
    </div>
  );
};

export default ARLotteryView;