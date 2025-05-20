import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { ClipLoader } from 'react-spinners';

// Минимальный AR-компонент с фокусом только на запуске AR
function MinimalARLotteryView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [ticket, setTicket] = useState(null);
  const [debugLog, setDebugLog] = useState([]);
  const [ar3DMode, setAr3DMode] = useState('none'); // 'none', 'ar', '3d'
  
  // Refs для Three.js и WebXR
  const containerRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const rendererRef = useRef(null);
  const xrSessionRef = useRef(null);
  const objectRef = useRef(null);
  const reticleRef = useRef(null);
  
  // Функция логирования для отладки
  const addLog = (message) => {
    console.log(`[AR] ${message}`);
    setDebugLog(prev => [...prev, `${message}`].slice(-10));
  };
  
  // Получаем данные билета
  useEffect(() => {
    const fetchTicket = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from("ar_lottery_tickets")
          .select("*")
          .eq("id", id)
          .single();
          
        if (error) throw error;
        setTicket(data);
        addLog(`Билет загружен: ID ${id}, выигрыш: ${data.is_win ? 'да' : 'нет'}`);
      } catch (err) {
        setError(`Ошибка при загрузке билета: ${err.message}`);
        addLog(`Ошибка: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };
    
    fetchTicket();
  }, [id]);

  // Очистка ресурсов при размонтировании
  useEffect(() => {
    return () => {
      if (xrSessionRef.current) {
        xrSessionRef.current.end().catch(console.error);
      }
      
      if (rendererRef.current) {
        rendererRef.current.dispose();
      }
      
      document.documentElement.style.backgroundColor = '';
      document.body.style.backgroundColor = '';
    };
  }, []);
  
  // Инициализация базовой 3D сцены (без AR)
  const init3DScene = () => {
    if (!containerRef.current) return;
    addLog('Инициализация 3D режима');
    
    try {
      // Очистка контейнера
      while (containerRef.current.firstChild) {
        containerRef.current.removeChild(containerRef.current.firstChild);
      }
      
      // Создаем сцену
      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0x6633aa); // Фиолетовый фон для 3D режима
      sceneRef.current = scene;
      
      // Создаем камеру
      const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
      camera.position.z = 3;
      cameraRef.current = camera;
      
      // Создаем рендерер
      const renderer = new THREE.WebGLRenderer({ antialias: true });
      renderer.setSize(window.innerWidth, window.innerHeight);
      rendererRef.current = renderer;
      
      // Добавляем канвас на страницу
      containerRef.current.appendChild(renderer.domElement);
      
      // Добавляем свет
      const light = new THREE.AmbientLight(0xffffff, 1);
      scene.add(light);
      
      // Создаем простой куб
      const geometry = new THREE.BoxGeometry(1, 1, 1);
      const material = new THREE.MeshStandardMaterial({ 
        color: ticket && ticket.is_win ? 0xffcc00 : 0xcccccc 
      });
      const cube = new THREE.Mesh(geometry, material);
      scene.add(cube);
      objectRef.current = cube;
      
      // Анимация вращения
      const animate = () => {
        requestAnimationFrame(animate);
        if (objectRef.current) {
          objectRef.current.rotation.x += 0.01;
          objectRef.current.rotation.y += 0.01;
        }
        rendererRef.current.render(scene, camera);
      };
      
      animate();
      addLog('3D сцена инициализирована успешно');
      
    } catch (err) {
      addLog(`Ошибка при инициализации 3D: ${err.message}`);
      setError(`Ошибка 3D: ${err.message}`);
    }
  };
  
  // Инициализация AR
  const initAR = async () => {
    if (!containerRef.current) return;
    addLog('Инициализация AR режима');
    
    try {
      // Запрашиваем доступ к камере явно перед запуском AR
      try {
        addLog('Запрос разрешения на доступ к камере...');
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        stream.getTracks().forEach(track => track.stop());
        addLog('Разрешение на доступ к камере получено');
      } catch (err) {
        addLog(`Ошибка доступа к камере: ${err.message}`);
        throw new Error(`Необходим доступ к камере для AR. ${err.message}`);
      }
      
      // Проверяем поддержку WebXR
      if (!navigator.xr) {
        throw new Error('WebXR не поддерживается в этом браузере');
      }
      
      const isArSupported = await navigator.xr.isSessionSupported('immersive-ar');
      if (!isArSupported) {
        throw new Error('Ваше устройство не поддерживает AR');
      }
      
      // Очистка контейнера
      while (containerRef.current.firstChild) {
        containerRef.current.removeChild(containerRef.current.firstChild);
      }
      
      // Удаляем все фоновые цвета на время AR сессии
      document.documentElement.style.backgroundColor = 'transparent';
      document.body.style.backgroundColor = 'transparent';
      
      // Создаем сцену
      const scene = new THREE.Scene();
      sceneRef.current = scene;
      
      // Создаем камеру
      const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 100);
      cameraRef.current = camera;
      
      // Создаем рендерер с прозрачным фоном для AR
      const renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: true,
        logarithmicDepthBuffer: true
      });
      renderer.setPixelRatio(window.devicePixelRatio);
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.xr.enabled = true;
      renderer.setClearColor(0x000000, 0); // Полностью прозрачный фон
      rendererRef.current = renderer;
      
      // Добавляем канвас на страницу с правильными стилями
      const canvas = renderer.domElement;
      canvas.style.position = 'absolute';
      canvas.style.top = '0';
      canvas.style.left = '0';
      canvas.style.width = '100%';
      canvas.style.height = '100%';
      canvas.style.zIndex = '10000';
      canvas.style.background = 'transparent';
      containerRef.current.appendChild(canvas);
      
      // Добавляем свет
      const light = new THREE.AmbientLight(0xffffff, 1);
      scene.add(light);
      
      // Создаем простой куб
      const geometry = new THREE.BoxGeometry(0.15, 0.15, 0.15);
      const material = new THREE.MeshStandardMaterial({
        color: ticket && ticket.is_win ? 0xffdd00 : 0xcccccc,
        roughness: 0.3,
        metalness: 0.8
      });
      const cube = new THREE.Mesh(geometry, material);
      scene.add(cube);
      cube.visible = false; // Сначала скрываем, покажем после размещения
      objectRef.current = cube;
      
      // Создаем маркер-прицел для размещения
      const reticle = new THREE.Mesh(
        new THREE.RingGeometry(0.15, 0.2, 32).rotateX(-Math.PI / 2),
        new THREE.MeshBasicMaterial({ color: 0xffffff })
      );
      reticle.matrixAutoUpdate = false;
      reticle.visible = false;
      scene.add(reticle);
      reticleRef.current = reticle;
      
      // Настройка и запуск AR сессии
      addLog('Запрос AR сессии...');
      const session = await navigator.xr.requestSession('immersive-ar', {
        requiredFeatures: ['hit-test'],
        optionalFeatures: ['dom-overlay'],
        domOverlay: { root: document.body }
      });
      
      xrSessionRef.current = session;
      addLog('AR сессия создана');
      
      await renderer.xr.setSession(session);
      
      let hitTestSource = null;
      const hitTestSourceRequested = false;
      
      // Обработчик нажатия для размещения объекта
      session.addEventListener('select', () => {
        if (reticleRef.current.visible) {
          // Копируем позицию маркера
          objectRef.current.position.setFromMatrixPosition(reticleRef.current.matrix);
          objectRef.current.visible = true;
          reticleRef.current.visible = false;
          addLog('Объект размещен');
        }
      });
      
      // Обработка закрытия сессии
      session.addEventListener('end', () => {
        xrSessionRef.current = null;
        addLog('AR сессия завершена');
        if (rendererRef.current) {
          rendererRef.current.setAnimationLoop(null);
        }
        setAr3DMode('none');
      });
      
      // Анимационный цикл для AR
      renderer.setAnimationLoop((timestamp, frame) => {
        if (!frame) return;
        
        // Обработка hit-test для поиска поверхностей
        if (!objectRef.current.visible) {
          if (!hitTestSource && !hitTestSourceRequested) {
            // Запрашиваем hitTestSource только один раз
            session.requestReferenceSpace('viewer').then((viewerSpace) => {
              session.requestHitTestSource({ space: viewerSpace }).then((source) => {
                hitTestSource = source;
                addLog('Hit test source создан');
              });
            });
            
            hitTestSourceRequested = true;
          }
          
          if (hitTestSource && frame) {
            const referenceSpace = renderer.xr.getReferenceSpace();
            const hitTestResults = frame.getHitTestResults(hitTestSource);
            
            if (hitTestResults.length > 0) {
              const hit = hitTestResults[0];
              const hitPose = hit.getPose(referenceSpace);
              
              if (hitPose) {
                reticleRef.current.visible = true;
                reticleRef.current.matrix.fromArray(hitPose.transform.matrix);
              }
            } else {
              reticleRef.current.visible = false;
            }
          }
        }
        
        // Обновляем сцену
        if (objectRef.current.visible) {
          objectRef.current.rotation.y += 0.01;
        }
        
        // Рендер сцены
        renderer.render(scene, camera);
      });
      
      addLog('AR инициализирован успешно');
      
    } catch (err) {
      addLog(`Ошибка при инициализации AR: ${err.message}`);
      setError(`Ошибка AR: ${err.message}`);
      // Переключаемся на fallback 3D режим при ошибке AR
      setAr3DMode('3d');
    }
  };
  
  // Запуск AR или 3D режима при выборе пользователя
  useEffect(() => {
    if (ar3DMode === 'ar') {
      initAR();
    } else if (ar3DMode === '3d') {
      init3DScene();
    }
  }, [ar3DMode]);

  // Обработчик для выхода из AR сессии
  const handleExitAR = () => {
    if (xrSessionRef.current) {
      xrSessionRef.current.end().catch(console.error);
    }
  };

  // Показываем загрузку
  if (loading) {
    return (
      <div style={{ 
        height: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        background: 'black'
      }}>
        <ClipLoader color="#fff" size={50} />
      </div>
    );
  }

  // Показываем ошибку
  if (error && ar3DMode === 'none') {
    return (
      <div style={{ 
        height: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        flexDirection: 'column',
        padding: '20px',
        background: 'black',
        color: 'white'
      }}>
        <h2 style={{ color: 'red', marginBottom: '20px' }}>Ошибка</h2>
        <p style={{ marginBottom: '20px', textAlign: 'center' }}>{error}</p>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button 
            onClick={() => setAr3DMode('3d')}
            style={{
              padding: '10px 20px',
              background: 'blue',
              color: 'white',
              border: 'none',
              borderRadius: '5px'
            }}
          >
            Попробовать 3D режим
          </button>
          <button 
            onClick={() => navigate('/dashboard')}
            style={{
              padding: '10px 20px',
              background: 'gray',
              color: 'white',
              border: 'none',
              borderRadius: '5px'
            }}
          >
            Вернуться
          </button>
        </div>
      </div>
    );
  }

  // Основной интерфейс выбора режима (AR или 3D)
  if (ar3DMode === 'none') {
    return (
      <div style={{ 
        height: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        flexDirection: 'column',
        padding: '20px',
        background: 'black',
        color: 'white'
      }}>
        <h2 style={{ marginBottom: '20px', fontSize: '24px' }}>Сундук с сокровищами</h2>
        
        {ticket && (
          <div style={{ textAlign: 'center', marginBottom: '30px' }}>
            {ticket.is_win ? (
              <>
                <div style={{ fontSize: '48px', marginBottom: '10px' }}>💰</div>
                <p style={{ color: 'gold', fontWeight: 'bold', fontSize: '20px' }}>
                  Поздравляем! Вы выиграли {ticket.win_amount} ₽
                </p>
              </>
            ) : (
              <>
                <div style={{ fontSize: '48px', marginBottom: '10px' }}>📦</div>
                <p style={{ color: 'silver', fontSize: '20px' }}>
                  К сожалению, вы не выиграли в этот раз
                </p>
              </>
            )}
          </div>
        )}
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', width: '100%', maxWidth: '300px' }}>
          <button 
            onClick={() => setAr3DMode('ar')}
            style={{
              padding: '15px',
              backgroundColor: 'green',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '18px',
              fontWeight: 'bold'
            }}
          >
            Запустить AR
          </button>
          
          <button 
            onClick={() => setAr3DMode('3d')}
            style={{
              padding: '15px',
              backgroundColor: 'blue',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '18px',
              fontWeight: 'bold'
            }}
          >
            3D Просмотр (без AR)
          </button>
          
          <button 
            onClick={() => navigate('/dashboard')}
            style={{
              padding: '15px',
              backgroundColor: 'gray',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '18px'
            }}
          >
            Вернуться на главную
          </button>
        </div>
        
        <div style={{ marginTop: '30px', fontSize: '14px', color: '#aaa' }}>
          AR требует разрешения на доступ к камере и работает только на поддерживаемых устройствах
        </div>
      </div>
    );
  }

  // 3D или AR режим активен
  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh' }}>
      {/* Контейнер для Three.js / AR */}
      <div 
        ref={containerRef} 
        style={{ 
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          background: ar3DMode === 'ar' ? 'transparent' : '#6633aa'
        }}
      />
      
      {/* Интерфейс поверх сцены */}
      <div style={{
        position: 'absolute',
        bottom: '40px',
        left: 0,
        right: 0,
        display: 'flex',
        justifyContent: 'center',
        zIndex: 10001
      }}>
        <div style={{
          background: 'rgba(0,0,0,0.7)',
          color: 'white',
          padding: '15px',
          borderRadius: '8px',
          textAlign: 'center'
        }}>
          <p style={{ marginBottom: '15px', fontWeight: 'bold' }}>
            {ticket && ticket.is_win 
              ? `Поздравляем! Вы выиграли ${ticket.win_amount} ₽` 
              : "К сожалению, сундук оказался пуст"}
          </p>
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
            {ar3DMode === 'ar' && (
              <button
                onClick={handleExitAR}
                style={{
                  padding: '8px 16px',
                  background: 'red',
                  color: 'white',
                  border: 'none',
                  borderRadius: '5px'
                }}
              >
                Выйти из AR
              </button>
            )}
            <button
              onClick={() => navigate('/dashboard')}
              style={{
                padding: '8px 16px',
                background: 'gray',
                color: 'white',
                border: 'none',
                borderRadius: '5px'
              }}
            >
              На главную
            </button>
          </div>
        </div>
      </div>
      
      {/* Инструкции для AR */}
      {ar3DMode === 'ar' && (
        <div style={{
          position: 'absolute',
          top: '40px',
          left: 0,
          right: 0,
          display: 'flex',
          justifyContent: 'center',
          zIndex: 10001
        }}>
          <div style={{
            background: 'rgba(0,0,0,0.7)',
            color: 'white',
            padding: '15px',
            borderRadius: '8px',
            textAlign: 'center'
          }}>
            <p>Найдите плоскую поверхность и нажмите, чтобы разместить сундук</p>
          </div>
        </div>
      )}
      
      {/* Отладочные логи */}
      <div style={{
        position: 'absolute',
        top: '10px',
        left: '10px',
        background: 'rgba(0,0,0,0.7)',
        color: 'white',
        padding: '10px',
        borderRadius: '5px',
        fontSize: '12px',
        maxWidth: '80%',
        zIndex: 10001,
        maxHeight: '200px',
        overflowY: 'auto'
      }}>
        <p style={{ fontWeight: 'bold', marginBottom: '5px' }}>Отладка:</p>
        {debugLog.map((log, index) => (
          <div key={index}>{log}</div>
        ))}
      </div>
    </div>
  );
}

export default MinimalARLotteryView;