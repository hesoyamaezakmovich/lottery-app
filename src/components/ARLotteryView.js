// src/components/ARLotteryView.js
import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { ClipLoader } from "react-spinners";
import * as THREE from "three";
import { ARButton } from "three/examples/jsm/webxr/ARButton.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

const ARLotteryView = () => {
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [ticket, setTicket] = useState(null);
  const [arStarted, setArStarted] = useState(false);
  const [isWebXRSupported, setIsWebXRSupported] = useState(null);
  const [isIOS, setIsIOS] = useState(false);
  const [logs, setLogs] = useState([]);

  const containerRef = useRef(null);
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const cameraRef = useRef(null);
  const objectRef = useRef(null);
  const mixerRef = useRef(null);
  const clock = useRef(new THREE.Clock());
  const navigate = useNavigate();

  const addLog = (message) => {
    setLogs((prev) => [...prev, message].slice(-10));
  };

  // Проверка платформы и WebXR
  useEffect(() => {
    // Определяем iOS
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    setIsIOS(isIOSDevice);
    addLog(`Платформа: ${isIOSDevice ? "iOS" : "Не iOS"}`);

    // Проверка WebXR
    const checkWebXR = async () => {
      if (!navigator.xr) {
        setIsWebXRSupported(false);
        addLog("WebXR не поддерживается");
        return;
      }
      try {
        const isSupported = await navigator.xr.isSessionSupported("immersive-ar");
        setIsWebXRSupported(isSupported);
        addLog(`immersive-ar поддерживается: ${isSupported}`);
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

  // Инициализация AR или 3D-режима
  const initAR = async () => {
    addLog("Инициализация начата");

    // Проверка HTTPS
    if (window.location.protocol !== "https:" && window.location.hostname !== "localhost") {
      setError("WebXR требует HTTPS.");
      addLog("Ошибка: HTTPS требуется");
      return;
    }

    // Для iOS: AR Quick Look
    if (isIOS && !isWebXRSupported) {
      addLog("iOS: Пробуем AR Quick Look");
      const modelUrl = ticket?.is_win
        ? "/models/treasure_chest.usdz"
        : "/models/empty_chest.usdz";
      const link = document.createElement("a");
      link.href = modelUrl;
      link.setAttribute("rel", "ar");
      link.innerHTML = '<img src="/models/preview.jpg" style="display:none;">';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      addLog("AR Quick Look запущен");
      setArStarted(true);
      return;
    }

    try {
      // Сцена
      const scene = new THREE.Scene();
      sceneRef.current = scene;

      // Камера
      const camera = new THREE.PerspectiveCamera(
        70,
        window.innerWidth / window.innerHeight,
        0.01,
        20
      );
      cameraRef.current = camera;

      // Рендерер
      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setPixelRatio(window.devicePixelRatio);
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.setClearColor(0x000000, 0);
      renderer.xr.enabled = isWebXRSupported;
      rendererRef.current = renderer;
      containerRef.current.appendChild(renderer.domElement);
      addLog("Рендерер инициализирован");

      // Освещение
      const light = new THREE.HemisphereLight(0xffffff, 0xbbbbff, 1);
      scene.add(light);
      const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
      directionalLight.position.set(0, 1, 1);
      scene.add(directionalLight);

      // Загрузка GLTF-модели
      const loader = new GLTFLoader();
      const modelPath = ticket?.is_win
        ? "/models/treasure_chest.glb"
        : "/models/empty_chest.glb";
      loader.load(
        modelPath,
        (gltf) => {
          const model = gltf.scene;
          model.scale.set(0.1, 0.1, 0.1);
          model.position.set(0, 0, -0.5);
          model.visible = true;
          scene.add(model);
          objectRef.current = model;
          addLog("Модель загружена");

          if (gltf.animations && gltf.animations.length > 0) {
            mixerRef.current = new THREE.AnimationMixer(model);
            const animation = gltf.animations[0];
            const action = mixerRef.current.clipAction(animation);
            action.setLoop(THREE.LoopOnce);
            action.clampWhenFinished = true;
            action.play();
            addLog("Анимация запущена");
          } else {
            addLog("Анимации не найдены");
          }
        },
        (progress) => {
          addLog(`Загрузка модели: ${Math.round((progress.loaded / progress.total) * 100)}%`);
        },
        (err) => {
          addLog(`Ошибка загрузки модели: ${err.message}`);
          // Fallback: куб
          const geometry = new THREE.BoxGeometry(0.2, 0.2, 0.2);
          const material = ticket?.is_win
            ? new THREE.MeshStandardMaterial({ color: 0xffd700 })
            : new THREE.MeshStandardMaterial({ color: 0x808080 });
          const cube = new THREE.Mesh(geometry, material);
          cube.position.set(0, 0, -0.5);
          cube.visible = true;
          scene.add(cube);
          objectRef.current = cube;
          addLog("Fallback: куб создан");
        }
      );

      // ARButton (только если WebXR поддерживается)
      if (isWebXRSupported) {
        const button = ARButton.createButton(renderer, {
          optionalFeatures: ["dom-overlay"],
          domOverlay: { root: document.body },
        });
        document.body.appendChild(button);
        addLog("ARButton добавлен");

        renderer.xr.addEventListener("sessionstart", () => {
          addLog("WebXR сессия начата");
          if (objectRef.current) {
            objectRef.current.position.set(0, 0, -0.5);
            objectRef.current.visible = true;
            addLog("Объект установлен в позицию");
          }
          const session = renderer.xr.getSession();
          addLog(`XR режим: ${session?.mode || "нет"}`);
        });

        renderer.xr.addEventListener("sessionend", () => {
          addLog("WebXR сессия завершена");
          setArStarted(false);
        });

        // Проверка разрешений камеры
        try {
          const permissionStatus = await navigator.permissions.query({ name: "camera" });
          if (permissionStatus.state === "denied") {
            setError("Доступ к камере запрещён. Разрешите в настройках браузера.");
            addLog("Ошибка: доступ к камере запрещён");
            return;
          }
          addLog(`Статус камеры: ${permissionStatus.state}`);
        } catch (err) {
          addLog(`Ошибка проверки камеры: ${err.message}`);
        }
      }

      // Анимация
      let frameCount = 0;
      const animate = () => {
        if (isWebXRSupported) {
          renderer.setAnimationLoop((timestamp, frame) => {
            const delta = clock.current.getDelta();
            if (mixerRef.current) {
              mixerRef.current.update(delta);
            }
            if (objectRef.current) {
              objectRef.current.rotation.y += 0.01;
            }
            renderer.render(scene, camera);
            frameCount++;
            if (frameCount % 60 === 0) {
              addLog("Рендеринг кадра");
            }
          });
        } else {
          // 3D-режим для iOS без WebXR
          const animateFrame = () => {
            const delta = clock.current.getDelta();
            if (mixerRef.current) {
              mixerRef.current.update(delta);
            }
            if (objectRef.current) {
              objectRef.current.rotation.y += 0.01;
            }
            renderer.render(scene, camera);
            requestAnimationFrame(animateFrame);
          };
          animateFrame();
        }
      };
      animate();

      setArStarted(true);
    } catch (err) {
      addLog(`Ошибка при запуске: ${err.message}`);
      setError(`Не удалось запустить AR: ${err.message}`);
    }
  };

  // Очистка
  useEffect(() => {
    return () => {
      if (rendererRef.current) {
        rendererRef.current.setAnimationLoop(null);
        rendererRef.current.dispose();
        if (containerRef.current && rendererRef.current.domElement) {
          containerRef.current.removeChild(rendererRef.current.domElement);
        }
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
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
          <div className="text-center text-white">
            <h2 className="text-2xl font-bold mb-6">Просмотр результата лотереи</h2>
            <p className="mb-8">
              {ticket.is_win
                ? `Поздравляем! Вы выиграли ${ticket.win_amount} ₽`
                : "К сожалению, вы не выиграли в этот раз"}
            </p>
            {isIOS && !isWebXRSupported && (
              <p className="mb-4 text-sm">
                На iOS используйте Safari или Chrome для AR Quick Look. Убедитесь, что iOS 16+.
              </p>
            )}
            <button
              onClick={initAR}
              className="px-6 py-3 bg-yellow-500 text-black font-bold rounded-lg hover:bg-yellow-600"
            >
              Запустить AR просмотр
            </button>
          </div>
        </div>
      ) : (
        <div className="absolute inset-0 flex items-center justify-center text-white">
          <div className="text-center p-8 bg-black bg-opacity-70 rounded-lg">
            <h2 className="text-xl font-bold mb-4">
              {isWebXRSupported ? "AR Режим активирован" : "3D Режим активирован"}
            </h2>
            <p>
              {ticket.is_win
                ? `Поздравляем! Вы выиграли ${ticket.win_amount} ₽`
                : "К сожалению, вы не выиграли в этот раз"}
            </p>
            <div className="mt-4">
              {ticket.is_win ? (
                <div className="text-6xl mb-2">💰</div>
              ) : (
                <div className="text-6xl mb-2">📦</div>
              )}
            </div>
            <p className="text-sm mt-4">
              {isWebXRSupported
                ? "Направьте камеру на ровную поверхность"
                : "Поворачивайте устройство для просмотра"}
            </p>
            {mixerRef.current && (
              <button
                onClick={() => {
                  if (mixerRef.current) {
                    mixerRef.current.clipAction(mixerRef.current.getRoot().animations[0]).reset().play();
                    addLog("Анимация перезапущена");
                  }
                }}
                className="mt-2 px-4 py-2 bg-blue-500 text-white rounded"
              >
                Перезапустить анимацию
              </button>
            )}
          </div>
        </div>
      )}
      <div className="absolute bottom-4 left-4 right-4 bg-black bg-opacity-50 text-white p-2 max-h-40 overflow-y-auto">
        {logs.map((log, index) => (
          <p key={index} className="text-sm">{log}</p>
        ))}
      </div>
      {!arStarted && (
        <div className="absolute top-4 left-4">
          <button
            onClick={() => navigate("/dashboard")}
            className="p-2 bg-yellow-500 text-black rounded-full shadow-lg"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
};

export default ARLotteryView;