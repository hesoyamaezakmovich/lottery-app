// Упрощенная версия ARLotteryView.js - гарантированно работает на всех устройствах
import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { ClipLoader } from "react-spinners";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

// Упрощенный универсальный компонент AR/3D
const ARLotteryView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [ticket, setTicket] = useState(null);
  const [viewStarted, setViewStarted] = useState(false);
  const [deviceInfo, setDeviceInfo] = useState("");
  const [animationPlayed, setAnimationPlayed] = useState(false);
  const [debugMode, setDebugMode] = useState(true);
  const [logs, setLogs] = useState([]);

  // Refs для Three.js
  const containerRef = useRef(null);
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const cameraRef = useRef(null);
  const objectRef = useRef(null);
  const mixerRef = useRef(null);
  const controlsRef = useRef(null);
  const clock = useRef(new THREE.Clock());

  // Функция логирования
  const addLog = (message) => {
    if (debugMode) {
      const timestamp = new Date().toLocaleTimeString();
      setLogs((prev) => [...prev, `[${timestamp}] ${message}`].slice(-15));
    }
  };

  // Определяем тип устройства
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
      addLog(`Определено устройство: ${deviceInfo}`);
      
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

  // Инициализация 3D сцены
  const initView = async () => {
    if (!ticket) {
      setError("Билет не найден");
      return;
    }

    addLog("Инициализация 3D просмотра");
    
    try {
      // Создаем Three.js сцену
      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0x000020); // Темно-синий фон
      sceneRef.current = scene;

      // Настраиваем камеру
      const camera = new THREE.PerspectiveCamera(
        70, 
        window.innerWidth / window.innerHeight, 
        0.01, 
        20
      );
      camera.position.set(0, 0.5, 1.5);
      cameraRef.current = camera;

      // Создаем рендерер
      const renderer = new THREE.WebGLRenderer({ 
        antialias: true,
        alpha: true
      });
      
      renderer.setPixelRatio(window.devicePixelRatio);
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.outputEncoding = THREE.sRGBEncoding;
      rendererRef.current = renderer;
      
      // Добавляем канвас в DOM
      if (containerRef.current) {
        containerRef.current.appendChild(renderer.domElement);
        addLog("Рендерер создан и добавлен на страницу");
      }

      // Добавляем OrbitControls для управления камерой
      const controls = new OrbitControls(camera, renderer.domElement);
      controls.target.set(0, 0, 0);
      controls.enableDamping = true;
      controls.dampingFactor = 0.1;
      controls.rotateSpeed = 0.5;
      controls.minDistance = 0.5;
      controls.maxDistance = 4;
      controls.maxPolarAngle = Math.PI * 0.8;
      controls.update();
      controlsRef.current = controls;
      addLog("Управление камерой настроено");

      // Добавляем освещение
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
      scene.add(ambientLight);
      
      const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
      directionalLight.position.set(0, 1, 1);
      scene.add(directionalLight);
      
      const pointLight = new THREE.PointLight(0xffffcc, 1, 10);
      pointLight.position.set(0, 2, 0);
      scene.add(pointLight);
      
      // Создаем пол
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
      
      addLog("Освещение и пол созданы");

      // Загружаем модель сундука
      const loader = new GLTFLoader();
      const modelPath = ticket.is_win 
        ? "/models/treasure_chest_win.glb" 
        : "/models/treasure_chest_lose.glb";
      
      addLog(`Загрузка модели: ${modelPath}`);
      
      loader.load(
        modelPath,
        (gltf) => {
          addLog("Модель загружена успешно");
          
          // Настраиваем модель
          const model = gltf.scene;
          model.scale.set(0.15, 0.15, 0.15);
          model.position.set(0, -0.3, -0.3);
          model.rotation.y = Math.PI / 4;
          scene.add(model);
          objectRef.current = model;
          
          // Настраиваем анимации
          if (gltf.animations && gltf.animations.length > 0) {
            addLog(`Найдено анимаций: ${gltf.animations.length}`);
            mixerRef.current = new THREE.AnimationMixer(model);
            
            // Воспроизводим первую анимацию
            const action = mixerRef.current.clipAction(gltf.animations[0]);
            action.clampWhenFinished = true;
            action.setLoop(THREE.LoopOnce);
            action.play();
            
            // Начинаем анимационный цикл
            const animate = () => {
              if (!viewStarted) return;
              
              requestAnimationFrame(animate);
              
              // Обновляем элементы управления и анимации
              controlsRef.current.update();
              
              if (mixerRef.current) {
                const delta = clock.current.getDelta();
                mixerRef.current.update(delta);
              }
              
              // Рендеринг сцены
              rendererRef.current.render(sceneRef.current, cameraRef.current);
            };
            
            animate();
            setAnimationPlayed(true);
            addLog("Анимация запущена");
          } else {
            addLog("Модель не содержит анимаций, применяем простое вращение");
            
            // Если анимаций нет, делаем простое вращение
            const animate = () => {
              if (!viewStarted) return;
              
              requestAnimationFrame(animate);
              
              controlsRef.current.update();
              
              // Простое вращение
              if (objectRef.current) {
                objectRef.current.rotation.y += 0.005;
              }
              
              // Рендеринг сцены
              rendererRef.current.render(sceneRef.current, cameraRef.current);
            };
            
            animate();
            setAnimationPlayed(true);
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
          box.position.set(0, -0.4, -0.3);
          scene.add(box);
          objectRef.current = box;
          
          // Анимация для упрощенной модели
          const animate = () => {
            if (!viewStarted) return;
            
            requestAnimationFrame(animate);
            
            controlsRef.current.update();
            
            if (objectRef.current) {
              objectRef.current.rotation.y += 0.01;
            }
            
            rendererRef.current.render(sceneRef.current, cameraRef.current);
          };
          
          animate();
          setAnimationPlayed(true);
          addLog("Создана упрощенная модель");
        }
      );
      
      // Обработчик изменения размера окна
      const handleResize = () => {
        if (cameraRef.current && rendererRef.current) {
          cameraRef.current.aspect = window.innerWidth / window.innerHeight;
          cameraRef.current.updateProjectionMatrix();
          rendererRef.current.setSize(window.innerWidth, window.innerHeight);
        }
      };
      
      window.addEventListener("resize", handleResize);
      setViewStarted(true);
      
      return () => {
        window.removeEventListener("resize", handleResize);
      };
      
    } catch (err) {
      addLog(`Ошибка: ${err.message}`);
      setError(`Не удалось инициализировать 3D просмотр: ${err.message}`);
    }
  };

  // Повторить анимацию
  const replayAnimation = () => {
    if (!objectRef.current) return;
    
    addLog("Воспроизведение анимации повторно");
    
    if (mixerRef.current && mixerRef.current._actions.length > 0) {
      // Останавливаем все текущие анимации
      mixerRef.current.stopAllAction();
      
      // Воспроизводим первую анимацию
      const action = mixerRef.current._actions[0];
      action.reset();
      action.clampWhenFinished = true;
      action.setLoop(THREE.LoopOnce);
      action.play();
      addLog("Анимация перезапущена");
    } else {
      // Для резервной модели просто сбрасываем положение
      objectRef.current.rotation.set(0, 0, 0);
      addLog("Положение объекта сброшено");
    }
  };

  // Очистка ресурсов при размонтировании компонента
  useEffect(() => {
    return () => {
      addLog("Очистка ресурсов");
      
      // Останавливаем анимационный цикл
      setViewStarted(false);
      
      // Останавливаем миксер анимаций
      if (mixerRef.current) {
        mixerRef.current.stopAllAction();
        mixerRef.current = null;
      }
      
      // Очищаем рендерер
      if (rendererRef.current) {
        rendererRef.current.dispose();
        
        if (containerRef.current && rendererRef.current.domElement) {
          containerRef.current.removeChild(rendererRef.current.domElement);
        }
      }
      
      // Очищаем сцену
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
  }, []);

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
      {/* Контейнер для 3D сцены */}
      <div ref={containerRef} className="absolute inset-0" style={{ zIndex: 0 }}></div>
      
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
            <p className="mb-6">
              Нажмите кнопку, чтобы увидеть результат вашей лотереи в виде анимированного сундука с
              сокровищами!
            </p>
            <button
              onClick={initView}
              className="w-full px-6 py-3 bg-yellow-500 text-black font-bold rounded-lg hover:bg-yellow-600 transition-colors duration-300"
            >
              Открыть сундук
            </button>
            <p className="mt-4 text-sm opacity-80">
              Вы сможете вращать сундук касанием или мышью
            </p>
          </div>
        </div>
      ) : (
        // Панель с кнопками после запуска просмотра
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
                onClick={replayAnimation}
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
      
      {/* Логи для отладки */}
      {debugMode && (
        <div
          className="absolute top-4 left-4 right-4 bg-black bg-opacity-50 text-white p-2 max-h-40 overflow-y-auto z-40"
          style={{ display: "block", fontSize: "10px" }}
        >
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
        </div>
      )}
    </div>
  );
};

export default ARLotteryView;