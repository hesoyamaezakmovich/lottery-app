// src/components/ARLotteryView.js
import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { ClipLoader } from "react-spinners";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { QRCodeCanvas } from "qrcode.react";

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
  const [debugMode, setDebugMode] = useState(true);
  const [logs, setLogs] = useState([]);

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

  const addLog = (message) => {
    if (debugMode) {
      const timestamp = new Date().toLocaleTimeString();
      setLogs((prev) => [...prev, `[${timestamp}] ${message}`].slice(-15));
    }
    console.log(`[AR] ${message}`);
  };

  useEffect(() => {
    console.log("useEffect: Проверка устройства и поддержки AR");
    const detectDevice = () => {
      const ua = navigator.userAgent;
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

      if ('xr' in navigator) {
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

  useEffect(() => {
    console.log("useEffect: Загрузка билета с ID:", id);
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

  const initScene = () => {
    console.log("initScene: Инициализация 3D сцены");
    if (!ticket) {
      setError("Билет не найден");
      return;
    }

    addLog("Инициализация 3D сцены");

    try {
      const scene = new THREE.Scene();
      sceneRef.current = scene;

      const camera = new THREE.PerspectiveCamera(
        70,
        window.innerWidth / window.innerHeight,
        0.01,
        20
      );
      cameraRef.current = camera;

      const renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true
      });

      renderer.setPixelRatio(window.devicePixelRatio);
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.outputEncoding = THREE.sRGBEncoding;
      rendererRef.current = renderer;

      if (containerRef.current) {
        while (containerRef.current.firstChild) {
          containerRef.current.removeChild(containerRef.current.firstChild);
        }
        containerRef.current.appendChild(renderer.domElement);
        addLog("Рендерер создан и добавлен на страницу");
      } else {
        throw new Error("Контейнер для рендеринга не найден");
      }

      const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
      scene.add(ambientLight);

      const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
      directionalLight.position.set(0, 1, 1);
      scene.add(directionalLight);

      const loader = new GLTFLoader();
      const modelPath = ticket.is_win
        ? "/models/treasure_chest_win.glb"
        : "/models/treasure_chest_lose.glb";

      addLog(`Загрузка модели: ${modelPath}`);

      loader.load(
        modelPath,
        (gltf) => {
          addLog("Модель загружена успешно");

          const model = gltf.scene;
          model.scale.set(0.15, 0.15, 0.15);

          if (!arSupported) {
            model.position.set(0, -0.3, -0.3);
          }

          model.visible = !arSupported;

          scene.add(model);
          objectRef.current = model;

          if (gltf.animations && gltf.animations.length > 0) {
            addLog(`Найдено анимаций: ${gltf.animations.length}`);
            mixerRef.current = new THREE.AnimationMixer(model);

            if (!arSupported) {
              const action = mixerRef.current.clipAction(gltf.animations[0]);
              action.clampWhenFinished = true;
              action.setLoop(THREE.LoopOnce);
              action.play();
            }
          }

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

          const boxGeometry = new THREE.BoxGeometry(0.3, 0.2, 0.3);
          const boxMaterial = new THREE.MeshStandardMaterial({
            color: ticket.is_win ? 0xffd700 : 0x8b4513,
            roughness: 0.7,
            metalness: ticket.is_win ? 0.6 : 0.3
          });

          const box = new THREE.Mesh(boxGeometry, boxMaterial);
          if (!arSupported) {
            box.position.set(0, -0.4, -0.3);
          }

          box.visible = !arSupported;

          scene.add(box);
          objectRef.current = box;
        }
      );

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

        if (rendererRef.current) {
          rendererRef.current.setAnimationLoop(null);
          rendererRef.current.dispose();
        }

        if (controlsRef.current) {
          controlsRef.current.dispose();
        }
      };
    } catch (err) {
      addLog(`Ошибка инициализации сцены: ${err.message}`);
      setError(`Не удалось инициализировать 3D сцену: ${err.message}`);
      return null;
    }
  };

  const initOrbitControls = () => {
    console.log("initOrbitControls: Инициализация OrbitControls");
    if (!cameraRef.current || !rendererRef.current) {
      addLog("Не удалось инициализировать OrbitControls: нет камеры или рендерера");
      return;
    }

    const controls = new OrbitControls(cameraRef.current, rendererRef.current.domElement);
    controls.target.set(0, 0, 0);
    controls.enableDamping = true;
    controls.dampingFactor = 0.1;
    controls.rotateSpeed = 0.5;
    controls.minDistance = 0.5;
    controls.maxDistance = 4;
    controls.maxPolarAngle = Math.PI * 0.8;
    controls.update();
    controlsRef.current = controls;

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

  const initAR = async () => {
    console.log("initAR: Запуск AR-режима");
    if (!ticket) {
      setError("Билет не найден");
      return;
    }

    if (!arSupported) {
      addLog("Устройство не поддерживает AR, переключаемся на fallback режим");
      return initScene();
    }

    addLog("Запуск AR-режима");

    try {
      const cleanup = initScene();
      if (!cleanup) {
        throw new Error("Не удалось инициализировать базовую сцену");
      }

      if (!rendererRef.current) {
        throw new Error("Рендерер не инициализирован");
      }

      rendererRef.current.xr.enabled = true;

      const sessionInit = {
        requiredFeatures: ['hit-test'],
        optionalFeatures: ['dom-overlay'],
        domOverlay: { root: document.body }
      };

      const reticleGeometry = new THREE.RingGeometry(0.15, 0.2, 32).rotateX(-Math.PI / 2);
      const reticleMaterial = new THREE.MeshBasicMaterial();
      const reticle = new THREE.Mesh(reticleGeometry, reticleMaterial);
      reticle.matrixAutoUpdate = false;
      reticle.visible = false;
      sceneRef.current.add(reticle);

      try {
        const session = await navigator.xr.requestSession('immersive-ar', sessionInit);
        arSessionRef.current = session;
        setArActive(true);
        addLog("AR сессия создана успешно");

        rendererRef.current.xr.setReferenceSpaceType('local');
        await rendererRef.current.xr.setSession(session);

        session.addEventListener('end', () => {
          addLog('AR сессия завершена');
          setArActive(false);
          modelPlaced.current = false;

          if (objectRef.current) {
            objectRef.current.visible = true;
            initOrbitControls();
          }
        });

        session.addEventListener('select', () => {
          if (reticle.visible && !modelPlaced.current && objectRef.current) {
            addLog("Позиция для размещения выбрана");

            const matrix = new THREE.Matrix4();
            matrix.fromArray(reticle.matrix.elements);

            objectRef.current.position.setFromMatrixPosition(matrix);
            objectRef.current.visible = true;
            modelPlaced.current = true;
            reticle.visible = false;

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

        rendererRef.current.setAnimationLoop((timestamp, frame) => {
          if (!frame) return;

          if (mixerRef.current) {
            const delta = clock.current.getDelta();
            mixerRef.current.update(delta);
          }

          if (!modelPlaced.current) {
            if (hitTestSourceRequiredRef.current) {
              const referenceSpace = rendererRef.current.xr.getReferenceSpace();

              session.requestReferenceSpace('viewer').then((viewerSpace) => {
                session.requestHitTestSource({ space: viewerSpace }).then((source) => {
                  hitTestSourceRef.current = source;
                  addLog("Hit test source создан");
                });
              });

              hitTestSourceRequiredRef.current = false;
            }

            if (hitTestSourceRef.current) {
              const referenceSpace = rendererRef.current.xr.getReferenceSpace();
              const hitTestResults = frame.getHitTestResults(hitTestSourceRef.current);

              if (hitTestResults.length) {
                const hit = hitTestResults[0];
                reticle.visible = true;
                reticle.matrix.fromArray(hit.getPose(referenceSpace).transform.matrix);
              } else {
                reticle.visible = false;
              }
            }
          }

          if (rendererRef.current && sceneRef.current && cameraRef.current) {
            rendererRef.current.render(sceneRef.current, cameraRef.current);
          }
        });

      } catch (err) {
        addLog(`Ошибка при создании AR сессии: ${err.message}`);
        initOrbitControls();
        if (objectRef.current) {
          objectRef.current.visible = true;
        }
      }

    } catch (err) {
      addLog(`Ошибка инициализации AR: ${err.message}`);
      setError(`Не удалось инициализировать AR: ${err.message}`);
    }
  };

  const handleStartView = () => {
    console.log("handleStartView: Кнопка 'Играть' нажата, ticket:", ticket);
    if (!ticket) {
      addLog("Ошибка: Билет не загружен");
      setError("Билет не загружен");
      return;
    }
    addLog("Запуск просмотра");
    if (arSupported) {
      console.log("Запуск AR-режима");
      initAR();
    } else {
      console.log("Запуск 3D-режима");
      initScene();
    }
    setViewStarted(true);
  };

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
                  : "Поддержка AR: Нет. Отсканируйте QR-код с мобильного устройства для AR-режима или используйте 3D-режим."}
              </p>
            </div>

            {!arSupported && (
              <div className="mb-6 flex justify-center p-4 bg-white" style={{ zIndex: 20 }}>
                <QRCodeCanvas
                  value={`${window.location.origin}/ar-lottery/view/${id}`}
                  size={200}
                  bgColor="#ffffff"
                  fgColor="#000000"
                  level="H"
                />
              </div>
            )}

            <p className="mb-6">
              {arSupported
                ? "Нажмите кнопку, чтобы перейти в режим дополненной реальности. Найдите плоскую поверхность и нажмите на нее, чтобы разместить сундук."
                : "Отсканируйте QR-код с мобильного устройства для AR-режима или нажмите кнопку для 3D-режима."}
            </p>
            <button
              onClick={handleStartView}
              className={`w-full px-6 py-3 font-bold rounded-lg transition-colors duration-300 text-lg ${arSupported ? "bg-green-500 text-white hover:bg-green-600" : "bg-yellow-500 text-black hover:bg-yellow-600"}`}
            >
              {arSupported ? "Запустить AR" : "Открыть 3D просмотр"}
            </button>
            <p className="mt-4 text-sm opacity-80">
              {arSupported
                ? "В режиме AR вы сможете перемещаться вокруг объекта"
                : "Вы сможете вращать сундук касанием или мышью"}
            </p>
          </div>
        </div>
      ) : (
        <div
          className="absolute bottom-24 left-0 right-0 p-6 bg-black bg-opacity-70 text-white z-30"
          style={{ pointerEvents: "auto" }}
        >
          <div className="text-center">
            <h2 className="text-xl font-bold mb-4">
              {ticket.is_win
                ? `Поздравляем! Вы выиграли ${ticket.win_amount} ₽`
                : "К сожалению, сундук оказался пуст"}
            </h2>
            <button
              onClick={() => navigate("/dashboard")}
              className="px-8 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 text-lg"
              style={{ pointerEvents: "auto" }}
            >
              Вернуться на главную
            </button>
          </div>
        </div>
      )}

      {viewStarted && arSupported && !modelPlaced.current && (
        <div className="absolute top-0 left-0 right-0 p-4 bg-black bg-opacity-50 text-white z-40 text-center">
          <p className="font-bold mb-1">Найдите плоскую поверхность</p>
          <p className="text-sm">Наведите камеру на пол или стол и нажмите, чтобы разместить сундук</p>
        </div>
      )}

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