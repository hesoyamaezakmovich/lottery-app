// src/components/ARLotteryView.js
import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { ClipLoader } from "react-spinners";
import * as THREE from "three";
import { ARButton } from "three/examples/jsm/webxr/ARButton.js";

const ARLotteryView = () => {
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [ticket, setTicket] = useState(null);
  const [arStarted, setArStarted] = useState(false);

  const containerRef = useRef(null);
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const cameraRef = useRef(null);
  const reticleRef = useRef(null);
  const objectRef = useRef(null); // Для AR-объекта
  const hitTestSourceRef = useRef(null);
  const hitTestSourceRequested = useRef(false);
  const navigate = useNavigate();

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
        console.error("Ошибка при получении билета:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchTicket();
  }, [id]);

  // Инициализация AR
  const initAR = async () => {
    console.log("Инициализация AR начата");
    if (!("xr" in navigator)) {
      setError(
        "WebXR не поддерживается. Используйте совместимое устройство и браузер (Chrome 81+ или Safari 16+)."
      );
      return;
    }

    try {
      // Создаём сцену
      const scene = new THREE.Scene();
      sceneRef.current = scene;

      // Создаём камеру
      const camera = new THREE.PerspectiveCamera(
        70,
        window.innerWidth / window.innerHeight,
        0.01,
        20
      );
      cameraRef.current = camera;

      // Создаём рендерер
      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setPixelRatio(window.devicePixelRatio);
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.xr.enabled = true;
      rendererRef.current = renderer;
      containerRef.current.appendChild(renderer.domElement);

      // Освещение
      const light = new THREE.HemisphereLight(0xffffff, 0xbbbbff, 1);
      scene.add(light);

      // Создаём AR-объект (куб)
      const geometry = new THREE.BoxGeometry(0.2, 0.2, 0.2);
      const material = ticket?.is_win
        ? new THREE.MeshBasicMaterial({ color: 0xffd700 }) // Золотой
        : new THREE.MeshBasicMaterial({ color: 0x808080 }); // Серый
      const cube = new THREE.Mesh(geometry, material);
      cube.visible = false; // Скрываем до hit-test
      scene.add(cube);
      objectRef.current = cube;

      // Создаём ретикул для hit-test
      const reticle = new THREE.Mesh(
        new THREE.RingGeometry(0.15, 0.2, 32).rotateX(-Math.PI / 2),
        new THREE.MeshBasicMaterial({ color: 0xffffff })
      );
      reticle.matrixAutoUpdate = false;
      reticle.visible = false;
      scene.add(reticle);
      reticleRef.current = reticle;

      // Настройка ARButton
      const button = ARButton.createButton(renderer, {
        requiredFeatures: ["hit-test"],
        optionalFeatures: ["dom-overlay", "local-floor"],
        domOverlay: { root: document.body },
      });
      document.body.appendChild(button);
      console.log("ARButton добавлен");

      // Обработчики WebXR
      renderer.xr.addEventListener("sessionstart", async () => {
        console.log("WebXR сессия начата");
        const session = renderer.xr.getSession();
        try {
          const viewerReferenceSpace = await session.requestReferenceSpace("viewer");
          hitTestSourceRef.current = await session.requestHitTestSource({
            space: viewerReferenceSpace,
          });
          hitTestSourceRequested.current = true;
          console.log("Hit-test источник создан");
        } catch (err) {
          console.error("Ошибка настройки hit-test:", err);
          // Fallback: размещаем объект в фиксированной позиции
          objectRef.current.position.set(0, 0, -1); // 1 метр перед камерой
          objectRef.current.visible = true;
        }
      });

      renderer.xr.addEventListener("sessionend", () => {
        console.log("WebXR сессия завершена");
        hitTestSourceRequested.current = false;
        hitTestSourceRef.current = null;
        setArStarted(false);
      });

      // Обработчик выбора (нажатия)
      const onSelect = () => {
        if (reticleRef.current.visible && objectRef.current) {
          console.log("Объект размещён");
          objectRef.current.position.setFromMatrixPosition(reticleRef.current.matrix);
          objectRef.current.visible = true;
        }
      };

      const controller = renderer.xr.getController(0);
      controller.addEventListener("select", onSelect);
      scene.add(controller);

      // Анимация и рендеринг
      const animate = () => {
        renderer.setAnimationLoop((timestamp, frame) => {
          if (!frame) return;

          if (hitTestSourceRef.current && hitTestSourceRequested.current) {
            const hitTestResults = frame.getHitTestResults(hitTestSourceRef.current);
            if (hitTestResults.length) {
              const hit = hitTestResults[0];
              const hitPose = hit.getPose(renderer.xr.getReferenceSpace());
              reticleRef.current.visible = true;
              reticleRef.current.matrix.fromArray(hitPose.transform.matrix);
              console.log("Hit-test: ретикул видим");
            } else {
              reticleRef.current.visible = false;
              console.log("Hit-test: нет поверхности");
            }
          }

          if (objectRef.current) {
            objectRef.current.rotation.x += 0.01;
            objectRef.current.rotation.y += 0.01;
          }

          renderer.render(scene, camera);
        });
      };
      animate();

      setArStarted(true);
      console.log("AR-режим активирован");
    } catch (err) {
      console.error("Ошибка при запуске AR:", err);
      setError("Не удалось запустить AR. Проверьте консоль и попробуйте снова.");
    }
  };

  // Очистка ресурсов
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
          <h2 className="text-2xl font-bold text-black mb-4 text-center">
            Ошибка
          </h2>
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
          <h2 className="text-2xl font-bold text-black mb-4 text-center">
            Билет не найден
          </h2>
          <p className="text-gray-700 text-center">
            Билет AR лотереи не найден или был удален.
          </p>
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
      <div ref={containerRef} className="absolute inset-0 bg-black"></div>
      {!arStarted ? (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center text-white">
            <h2 className="text-2xl font-bold mb-6">Просмотр результата лотереи</h2>
            <p className="mb-8">
              {ticket.is_win
                ? `Поздравляем! Вы выиграли ${ticket.win_amount} ₽`
                : "К сожалению, вы не выиграли в этот раз"}
            </p>
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
            <h2 className="text-xl font-bold mb-4">AR Режим активирован</h2>
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
            <p className="text-sm mt-4">Направьте камеру на ровную поверхность</p>
          </div>
        </div>
      )}
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