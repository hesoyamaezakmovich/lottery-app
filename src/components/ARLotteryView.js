// Готовый ARLotteryView.js с внутренней генерацией моделей
import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { ClipLoader } from "react-spinners";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

const ARLotteryView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [ticket, setTicket] = useState(null);
  const [viewMode, setViewMode] = useState("loading"); // loading, ready, playing
  const [debugMode, setDebugMode] = useState(false);
  const [logs, setLogs] = useState([]);

  // Refs для Three.js
  const containerRef = useRef(null);
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const cameraRef = useRef(null);
  const modelRef = useRef(null);
  const mixerRef = useRef(null);
  const controlsRef = useRef(null);
  const clockRef = useRef(new THREE.Clock());
  const animationFrameIdRef = useRef(null);
  const playAnimationRef = useRef(null);

  // Функция логирования
  const addLog = (message) => {
    if (debugMode) {
      const timestamp = new Date().toLocaleTimeString();
      setLogs((prev) => [...prev, `[${timestamp}] ${message}`].slice(-10));
    }
    console.log(`[AR] ${message}`);
  };

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
        addLog(`Билет загружен: ${data.id} (выигрыш: ${data.is_win ? 'да' : 'нет'})`);

        // Отмечаем билет как просмотренный
        if (!data.viewed) {
          await supabase
            .from("ar_lottery_tickets")
            .update({ viewed: true })
            .eq("id", id);
        }
        
        setLoading(false);
      } catch (err) {
        addLog(`Ошибка: ${err.message}`);
        setError(err.message);
        setLoading(false);
      }
    };

    fetchTicket();
  }, [id]);

  // Инициализация 3D сцены
  const init3DScene = () => {
    // Создаем сцену
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000015);
    sceneRef.current = scene;

    // Создаем камеру
    const camera = new THREE.PerspectiveCamera(
      60, 
      window.innerWidth / window.innerHeight, 
      0.1, 
      1000
    );
    camera.position.set(0, 0.5, 2);
    cameraRef.current = camera;

    // Создаем рендерер
    const renderer = new THREE.WebGLRenderer({ 
      antialias: true,
      alpha: true
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.outputEncoding = THREE.sRGBEncoding;
    rendererRef.current = renderer;

    // Добавляем канвас на страницу
    containerRef.current.appendChild(renderer.domElement);

    // Добавляем освещение
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(1, 1, 1);
    scene.add(directionalLight);

    // Добавляем точечный свет для лучшего освещения
    const pointLight = new THREE.PointLight(0xffffcc, 0.8, 10);
    pointLight.position.set(0, 2, 1);
    scene.add(pointLight);

    // Добавляем пол
    const floorGeometry = new THREE.PlaneGeometry(10, 10);
    const floorMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x333333,
      roughness: 0.8,
      metalness: 0.2
    });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.5;
    scene.add(floor);

    // Добавляем OrbitControls для вращения камеры
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 0, 0);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controlsRef.current = controls;

    // Обработчик изменения размера окна
    const handleResize = () => {
      if (cameraRef.current && rendererRef.current) {
        cameraRef.current.aspect = window.innerWidth / window.innerHeight;
        cameraRef.current.updateProjectionMatrix();
        rendererRef.current.setSize(window.innerWidth, window.innerHeight);
      }
    };
    window.addEventListener("resize", handleResize);

    // Функция очистки
    return () => {
      window.removeEventListener("resize", handleResize);
      if (containerRef.current && rendererRef.current && rendererRef.current.domElement) {
        containerRef.current.removeChild(rendererRef.current.domElement);
      }
      
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
      }
    };
  };

  // Попытка загрузки внешней модели
  const loadModel = async (isWin) => {
    if (!sceneRef.current) return null;
    
    const loader = new GLTFLoader();
    
    // Пути к моделям - эти модели нужно будет загрузить в ваш проект
    const modelPath = isWin 
      ? "/models/treasure_chest_win.glb"  // Сундук с сокровищами
      : "/models/empty_chest.glb";        // Пустой сундук
    
    try {
      addLog(`Загрузка модели: ${modelPath}`);
      const gltf = await new Promise((resolve, reject) => {
        loader.load(
          modelPath,
          resolve,
          (xhr) => {
            const percent = Math.round((xhr.loaded / xhr.total) * 100);
            if (percent % 25 === 0) {
              addLog(`Загрузка: ${percent}%`);
            }
          },
          reject
        );
      });
      
      addLog("Модель загружена успешно");
      
      // Настройка модели
      const model = gltf.scene;
      model.scale.set(0.5, 0.5, 0.5);
      model.position.set(0, -0.25, 0);
      sceneRef.current.add(model);
      modelRef.current = model;
      
      // Настройка анимаций
      if (gltf.animations && gltf.animations.length > 0) {
        addLog(`Найдено ${gltf.animations.length} анимаций`);
        
        // Выводим список анимаций в модели
        gltf.animations.forEach((anim, index) => {
          addLog(`Анимация ${index}: ${anim.name}`);
        });
        
        mixerRef.current = new THREE.AnimationMixer(model);
        
        // Ищем нужную анимацию
        const animationName = isWin ? "Win.003" : "Lose";
        let targetAnimation = null;
        
        for (let i = 0; i < gltf.animations.length; i++) {
          if (gltf.animations[i].name === animationName) {
            targetAnimation = gltf.animations[i];
            addLog(`Найдена целевая анимация: ${animationName}`);
            break;
          }
        }
        
        // Если не нашли точное совпадение, ищем частичное
        if (!targetAnimation) {
          for (let i = 0; i < gltf.animations.length; i++) {
            if (isWin && gltf.animations[i].name.includes("Win")) {
              targetAnimation = gltf.animations[i];
              addLog(`Найдена альтернативная анимация для выигрыша: ${gltf.animations[i].name}`);
              break;
            } else if (!isWin && gltf.animations[i].name.includes("Lose")) {
              targetAnimation = gltf.animations[i];
              addLog(`Найдена альтернативная анимация для проигрыша: ${gltf.animations[i].name}`);
              break;
            }
          }
        }
        
        // Если все еще не нашли, используем первую доступную анимацию
        if (!targetAnimation && gltf.animations.length > 0) {
          targetAnimation = gltf.animations[0];
          addLog(`Используем первую доступную анимацию: ${targetAnimation.name}`);
        }
        
        // Создаем action для воспроизведения анимации
        if (targetAnimation) {
          return () => {
            const action = mixerRef.current.clipAction(targetAnimation);
            action.clampWhenFinished = true;
            action.setLoop(THREE.LoopOnce);
            action.reset();
            action.play();
            addLog(`Воспроизведение анимации: ${targetAnimation.name}`);
          };
        }
      }
      
      addLog("В модели нет анимаций");
      return null;
    } catch (error) {
      addLog(`Ошибка загрузки модели: ${error.message}`);
      throw error;
    }
  };

  // Создание простого сундука с анимацией
  const createSimpleChest = (isWin) => {
    if (!sceneRef.current) return null;
    
    addLog(`Создание простого сундука (выигрыш: ${isWin})`);
    
    // Создаем группу для сундука
    const chestGroup = new THREE.Group();
    
    // Материалы
    const baseMaterial = new THREE.MeshStandardMaterial({
      color: isWin ? 0xcd9035 : 0x8b4513,  // Золотой для выигрыша, коричневый для проигрыша
      roughness: 0.6,
      metalness: isWin ? 0.7 : 0.2,
    });
    
    const detailsMaterial = new THREE.MeshStandardMaterial({
      color: isWin ? 0xffd700 : 0x654321,  // Ярко-золотой для выигрыша, темно-коричневый для проигрыша
      roughness: 0.3,
      metalness: isWin ? 0.9 : 0.4,
    });
    
    // Основание сундука
    const baseGeometry = new THREE.BoxGeometry(0.8, 0.5, 0.6);
    const base = new THREE.Mesh(baseGeometry, baseMaterial);
    base.position.y = 0.25;
    chestGroup.add(base);
    
    // Крышка сундука
    const lidGeometry = new THREE.BoxGeometry(0.8, 0.2, 0.64);
    const lid = new THREE.Mesh(lidGeometry, baseMaterial);
    lid.position.y = 0.6;
    lid.position.z = -0.02; // Немного смещаем для лучшего вида
    chestGroup.add(lid);
    
    // Добавляем детали (замок, петли)
    const lockGeometry = new THREE.BoxGeometry(0.12, 0.12, 0.04);
    const lock = new THREE.Mesh(lockGeometry, detailsMaterial);
    lock.position.set(0, 0.5, 0.32);
    chestGroup.add(lock);
    
    // Добавляем петли
    const hingeGeometry = new THREE.CylinderGeometry(0.04, 0.04, 0.8, 8);
    const hinge = new THREE.Mesh(hingeGeometry, detailsMaterial);
    hinge.rotation.z = Math.PI / 2;
    hinge.position.set(0, 0.6, -0.3);
    chestGroup.add(hinge);
    
    // Если это выигрышный сундук, добавляем содержимое
    if (isWin) {
      // Создаем монеты
      const coins = new THREE.Group();
      const coinGeometry = new THREE.CylinderGeometry(0.06, 0.06, 0.02, 16);
      const coinMaterial = new THREE.MeshStandardMaterial({
        color: 0xffd700,
        roughness: 0.2,
        metalness: 1.0,
        emissive: 0x553300,
        emissiveIntensity: 0.2
      });
      
      // Создаем несколько монет
      for (let i = 0; i < 20; i++) {
        const coin = new THREE.Mesh(coinGeometry, coinMaterial);
        
        // Случайное положение внутри сундука
        coin.position.x = (Math.random() - 0.5) * 0.6;
        coin.position.y = 0.3 + Math.random() * 0.2;
        coin.position.z = (Math.random() - 0.5) * 0.4;
        
        // Случайный поворот
        coin.rotation.x = Math.random() * Math.PI;
        coin.rotation.z = Math.random() * Math.PI;
        
        coins.add(coin);
      }
      
      // Добавляем монеты в сундук
      chestGroup.add(coins);
      
      // Добавляем драгоценные камни
      const gemGeometry = new THREE.IcosahedronGeometry(0.07);
      const gemMaterials = [
        new THREE.MeshStandardMaterial({ 
          color: 0xff0000, 
          emissive: 0x330000, 
          emissiveIntensity: 0.3,
          roughness: 0.1, 
          metalness: 0.8 
        }), // Рубин
        new THREE.MeshStandardMaterial({ 
          color: 0x0000ff, 
          emissive: 0x000033, 
          emissiveIntensity: 0.3,
          roughness: 0.1, 
          metalness: 0.8 
        }), // Сапфир
        new THREE.MeshStandardMaterial({ 
          color: 0x00ff00, 
          emissive: 0x003300, 
          emissiveIntensity: 0.3,
          roughness: 0.1, 
          metalness: 0.8 
        })  // Изумруд
      ];
      
      // Создаем несколько драгоценных камней
      for (let i = 0; i < 5; i++) {
        const gem = new THREE.Mesh(gemGeometry, gemMaterials[i % gemMaterials.length]);
        
        // Случайное положение поверх монет
        gem.position.x = (Math.random() - 0.5) * 0.5;
        gem.position.y = 0.4 + Math.random() * 0.1;
        gem.position.z = (Math.random() - 0.5) * 0.3;
        
        // Случайный поворот
        gem.rotation.x = Math.random() * Math.PI;
        gem.rotation.y = Math.random() * Math.PI;
        gem.rotation.z = Math.random() * Math.PI;
        
        chestGroup.add(gem);
      }
      
      // Добавляем свечение
      const glowGeometry = new THREE.SphereGeometry(0.2);
      const glowMaterial = new THREE.MeshBasicMaterial({
        color: 0xffcc00,
        transparent: true,
        opacity: 0.15,
        side: THREE.BackSide
      });
      
      const glow = new THREE.Mesh(glowGeometry, glowMaterial);
      glow.position.set(0, 0.4, 0);
      glow.scale.set(2, 1, 1);
      chestGroup.add(glow);
    }
    
    // Помечаем крышку для анимации
    lid.userData.isLid = true;
    
    // Добавляем сундук на сцену
    sceneRef.current.add(chestGroup);
    modelRef.current = chestGroup;
    
    // Создаем функцию анимации открытия крышки
    const animateOpeningChest = () => {
      let lidPart = null;
      
      // Находим крышку
      chestGroup.traverse((child) => {
        if (child.userData && child.userData.isLid) {
          lidPart = child;
        }
      });
      
      if (!lidPart) {
        addLog("Крышка не найдена");
        return;
      }
      
      // Начальное положение крышки
      const initialRotation = lidPart.rotation.x;
      
      // Создаем анимацию открытия крышки
      const startTime = Date.now();
      const openDuration = 1500; // 1.5 секунды на открытие
      const glowDuration = 2000; // 2 секунды на свечение
      
      // Функция анимации
      const animateFrame = () => {
        const elapsed = Date.now() - startTime;
        
        // Анимация открытия крышки
        if (elapsed < openDuration) {
          const progress = Math.min(elapsed / openDuration, 1);
          const easedProgress = 1 - Math.pow(1 - progress, 3); // Cubic easing out
          
          // Открываем крышку
          lidPart.rotation.x = initialRotation - easedProgress * Math.PI * 0.7;
          
          requestAnimationFrame(animateFrame);
        } else if (isWin && elapsed < openDuration + glowDuration) {
          // Для выигрыша добавляем анимацию свечения
          const glowProgress = Math.min((elapsed - openDuration) / glowDuration, 1);
          
          // Пульсирующее свечение
          chestGroup.traverse((child) => {
            if (child.material && child.material.emissive) {
              const intensity = 0.2 + Math.sin(glowProgress * Math.PI * 4) * 0.3;
              child.material.emissiveIntensity = intensity;
            }
          });
          
          // Увеличиваем интенсивность свечения
          const glowMesh = chestGroup.children.find(child => 
            child.material && child.material.transparent && child.material.opacity < 0.2
          );
          
          if (glowMesh) {
            glowMesh.material.opacity = 0.1 + Math.sin(glowProgress * Math.PI * 4) * 0.1;
          }
          
          requestAnimationFrame(animateFrame);
        }
      };
      
      // Запускаем анимацию
      animateFrame();
      
      addLog("Анимация открытия крышки запущена");
    };
    
    return animateOpeningChest;
  };

  // Загрузка модели или создание простого сундука
  const loadOrCreateModel = async (isWin) => {
    if (!sceneRef.current) return null;
    
    try {
      // Сначала пытаемся загрузить внешнюю модель
      const animateFunction = await loadModel(isWin);
      if (animateFunction) {
        return animateFunction;
      }
      addLog("Внешняя модель не содержит анимаций");
    } catch (error) {
      addLog(`Не удалось загрузить модель: ${error.message}`);
    }
    
    // Если загрузка не удалась, создаем простой сундук
    addLog("Создаем собственную модель сундука");
    const animateChest = createSimpleChest(isWin);
    return animateChest;
  };

  // Создание эффекта частиц (сверкающие монеты для выигрыша)
  const createTreasureEffect = () => {
    if (!sceneRef.current || !modelRef.current) return;
    
    addLog("Создание эффекта частиц");
    
    // Создаем геометрию для частиц
    const particlesCount = 30;
    const particleGeometry = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(particlesCount * 3);
    
    // Получаем позицию сундука
    const chestPosition = new THREE.Vector3();
    modelRef.current.getWorldPosition(chestPosition);
    
    // Задаем начальные позиции частиц
    for (let i = 0; i < particlesCount; i++) {
      particlePositions[i * 3] = chestPosition.x + (Math.random() - 0.5) * 0.3;
      particlePositions[i * 3 + 1] = chestPosition.y + Math.random() * 0.3;
      particlePositions[i * 3 + 2] = chestPosition.z + (Math.random() - 0.5) * 0.3;
    }
    
    particleGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    
    // Создаем материал для частиц
    const particleMaterial = new THREE.PointsMaterial({
      color: 0xffcc00,
      size: 0.05,
      blending: THREE.AdditiveBlending,
      transparent: true,
      opacity: 0.8
    });
    
    // Создаем систему частиц
    const particles = new THREE.Points(particleGeometry, particleMaterial);
    sceneRef.current.add(particles);
    
    // Анимация частиц
    const startTime = Date.now();
    const duration = 2000; // 2 секунды
    
    const animateParticles = () => {
      const elapsedTime = Date.now() - startTime;
      if (elapsedTime < duration) {
        const positions = particleGeometry.attributes.position.array;
        
        for (let i = 0; i < particlesCount; i++) {
          // Движение вверх
          positions[i * 3 + 1] += 0.005;
          
          // Случайное движение в стороны
          positions[i * 3] += (Math.random() - 0.5) * 0.01;
          positions[i * 3 + 2] += (Math.random() - 0.5) * 0.01;
        }
        
        particleGeometry.attributes.position.needsUpdate = true;
        
        // Уменьшаем прозрачность со временем
        particleMaterial.opacity = 0.8 * (1 - elapsedTime / duration);
        
        requestAnimationFrame(animateParticles);
      } else {
        // Удаляем частицы по окончании анимации
        sceneRef.current.remove(particles);
      }
    };
    
    animateParticles();
  };

  // Анимационный цикл
  const animate = () => {
    if (!sceneRef.current || !cameraRef.current || !rendererRef.current) return;
    
    animationFrameIdRef.current = requestAnimationFrame(animate);
    
    // Обновляем controls
    if (controlsRef.current) {
      controlsRef.current.update();
    }
    
    // Обновляем анимацию
    if (mixerRef.current) {
      const delta = clockRef.current.getDelta();
      mixerRef.current.update(delta);
    }
    
    // Рендеринг сцены
    rendererRef.current.render(sceneRef.current, cameraRef.current);
  };

  // Запуск просмотра
  const startView = async () => {
    try {
      addLog("Запуск просмотра");
      
      // Инициализируем сцену
      const cleanup = init3DScene();
      
      // Загружаем модель или создаем простую
      const animateFunction = await loadOrCreateModel(ticket.is_win);
      
      // Запускаем анимационный цикл
      animate();
      
      // Сохраняем функцию анимации
      if (typeof animateFunction === "function") {
        playAnimationRef.current = animateFunction;
      }
      
      // Устанавливаем режим готовности
      setViewMode("ready");
      
      return () => {
        if (cleanup) cleanup();
      };
    } catch (err) {
      addLog(`Ошибка инициализации: ${err.message}`);
      setError(`Не удалось запустить просмотр: ${err.message}`);
    }
  };

  // Воспроизведение анимации
  const playAnimation = () => {
    addLog("Воспроизведение анимации");
    
    if (playAnimationRef.current) {
      // Запускаем кастомную анимацию
      playAnimationRef.current();
    } else {
      addLog("Нет доступных анимаций для воспроизведения");
    }
    
    setViewMode("playing");
    
    // Добавляем эффекты для выигрыша
    if (ticket.is_win) {
      // Создаем частицы для эффекта сокровищ
      setTimeout(() => {
        createTreasureEffect();
      }, 800);
    }
  };

  // Эффект инициализации при загрузке билета
  useEffect(() => {
    if (ticket && viewMode === "loading") {
      const cleanupFn = startView();
      return () => {
        if (cleanupFn) cleanupFn();
      };
    }
  }, [ticket, viewMode]);

  // Показываем индикатор загрузки
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <ClipLoader size={40} color="#fff" />
        <p className="text-white ml-4">Загрузка...</p>
      </div>
    );
  }

  // Показываем ошибку
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="bg-gray-800 p-8 rounded-lg shadow-md w-full max-w-md text-white">
          <h2 className="text-2xl font-bold mb-4 text-center">Ошибка</h2>
          <p className="text-red-400 text-center">{error}</p>
          <button
            onClick={() => navigate("/dashboard")}
            className="mt-6 w-full py-2 px-4 bg-yellow-500 text-black font-semibold rounded-md hover:bg-yellow-600"
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
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="bg-gray-800 p-8 rounded-lg shadow-md w-full max-w-md text-white">
          <h2 className="text-2xl font-bold mb-4 text-center">Билет не найден</h2>
          <p className="text-center">Билет AR лотереи не найден или был удален.</p>
          <button
            onClick={() => navigate("/dashboard")}
            className="mt-6 w-full py-2 px-4 bg-yellow-500 text-black font-semibold rounded-md hover:bg-yellow-600"
          >
            Вернуться на главную
          </button>
        </div>
      </div>
    );
  }

  // Основной интерфейс
  return (
    <div className="h-screen relative bg-gray-900">
      {/* Контейнер для 3D сцены */}
      <div 
        ref={containerRef} 
        className="absolute inset-0 z-0"
        style={{ touchAction: "none" }}
      ></div>
      
      {/* Верхняя панель */}
      <div className="absolute top-0 left-0 right-0 p-4 bg-black bg-opacity-50 z-10">
        <h2 className="text-xl font-bold text-white text-center">
          {ticket.is_win 
            ? `Выигрыш: ${ticket.win_amount} ₽!` 
            : "К сожалению, не выигрыш"}
        </h2>
      </div>
      
      {/* Кнопка воспроизведения анимации */}
      {viewMode === "ready" && (
        <div className="absolute inset-0 flex items-center justify-center z-20">
          <button
            onClick={playAnimation}
            className="px-8 py-4 bg-yellow-500 text-black font-bold text-xl rounded-lg hover:bg-yellow-600 transform hover:scale-105 transition-all"
          >
            Открыть сундук
          </button>
        </div>
      )}
      
      {/* Кнопка возврата */}
      <div className="absolute bottom-6 left-0 right-0 flex justify-center z-10">
        <button
          onClick={() => navigate("/dashboard")}
          className="px-6 py-3 bg-gray-800 text-white rounded-lg hover:bg-gray-700"
        >
          Вернуться на главную
        </button>
      </div>
      
      {/* Отладочная кнопка */}
      <div className="absolute top-4 right-4 z-10">
        <button 
          onClick={() => setDebugMode(!debugMode)} 
          className="bg-gray-800 px-3 py-1 text-xs text-white rounded"
        >
          {debugMode ? "Скрыть отладку" : "Отладка"}
        </button>
      </div>
      
      {/* Отладочная информация */}
      {debugMode && (
        <div className="absolute top-16 left-4 right-4 bg-black bg-opacity-70 text-white p-2 rounded-md z-30 text-xs">
          <div className="mt-1">
            {logs.map((log, index) => (
              <p key={index}>{log}</p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ARLotteryView;