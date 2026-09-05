(function () {
  window.BirthdaySite = window.BirthdaySite || {};

  function createGlowTexture(colorStops) {
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext("2d");
    const gradient = ctx.createRadialGradient(128, 128, 10, 128, 128, 120);
    colorStops.forEach(([stop, color]) => gradient.addColorStop(stop, color));
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 256, 256);
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }

  function createStarShape(points, innerRadius, outerRadius) {
    const shape = new THREE.Shape();
    const step = Math.PI / points;
    for (let i = 0; i < points * 2; i += 1) {
      const radius = i % 2 === 0 ? outerRadius : innerRadius;
      const angle = -Math.PI / 2 + i * step;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      if (i === 0) shape.moveTo(x, y);
      else shape.lineTo(x, y);
    }
    shape.closePath();
    return shape;
  }

  window.BirthdaySite.createCakeScene = function createCakeScene(options) {
    const container = options.container;
    const fallback = options.fallback;
    if (!container || !window.THREE) {
      if (fallback) fallback.classList.add("is-visible");
      return {
        show() {},
        reveal() {},
        hide() {},
        resize() {},
      };
    }

    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x140b13, 12, 26);

    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
    camera.position.set(0, 3.4, 11.2);
    camera.lookAt(0, 1.6, 0);

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(container.clientWidth || 320, container.clientHeight || 240, false);
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.9;
    renderer.setClearColor(0x000000, 0);
    renderer.domElement.className = "cake-canvas";
    container.appendChild(renderer.domElement);

    if (fallback) fallback.classList.add("is-hidden");

    const glowTexture = createGlowTexture([
      [0, "rgba(255,255,255,0.96)"],
      [0.16, "rgba(255,229,241,0.86)"],
      [0.42, "rgba(255,140,190,0.5)"],
      [1, "rgba(255,140,190,0)"],
    ]);
    const warmGlowTexture = createGlowTexture([
      [0, "rgba(255,255,240,0.96)"],
      [0.2, "rgba(255,225,160,0.82)"],
      [0.48, "rgba(255,164,86,0.44)"],
      [1, "rgba(255,164,86,0)"],
    ]);

    const lights = [];
    const root = new THREE.Group();
    root.position.set(0, -1.65, 0);
    scene.add(root);

    const ambient = new THREE.AmbientLight(0xffcde0, 1.18);
    scene.add(ambient);

    const fill = new THREE.PointLight(0xff78b3, 1.45, 60, 2);
    fill.position.set(-4, 5, 8);
    scene.add(fill);
    lights.push(fill);

    const rim = new THREE.PointLight(0xffba72, 1.1, 50, 2);
    rim.position.set(5, 3, 4);
    scene.add(rim);
    lights.push(rim);

    const topLight = new THREE.DirectionalLight(0xffffff, 0.82);
    topLight.position.set(-1.5, 6, 5);
    scene.add(topLight);

    const basePlate = new THREE.Mesh(
      new THREE.CylinderGeometry(5.8, 6.1, 0.4, 64),
      new THREE.MeshPhysicalMaterial({
        color: 0x3a1220,
        roughness: 0.28,
        metalness: 0.1,
        clearcoat: 0.4,
      })
    );
    basePlate.position.y = -1.16;
    root.add(basePlate);

    const plateGlow = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: glowTexture,
        color: 0xff89bf,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      })
    );
    plateGlow.scale.set(11, 11, 1);
    plateGlow.position.y = 0.4;
    root.add(plateGlow);

    function addCakeLayer(radius, height, y, color, emissive) {
      const layer = new THREE.Mesh(
        new THREE.CylinderGeometry(radius * 1.01, radius, height, 64, 1, false),
        new THREE.MeshPhysicalMaterial({
          color,
          roughness: 0.28,
          metalness: 0.08,
          clearcoat: 0.62,
          clearcoatRoughness: 0.18,
          emissive,
          emissiveIntensity: 0.22,
        })
      );
      layer.position.y = y;
      root.add(layer);

      const icing = new THREE.Mesh(
        new THREE.CylinderGeometry(radius * 1.03, radius * 0.98, Math.max(height * 0.22, 0.18), 64, 1, false),
        new THREE.MeshPhysicalMaterial({
          color: 0xffeff6,
          roughness: 0.22,
          metalness: 0.05,
          clearcoat: 0.82,
          emissive: 0xff85b9,
          emissiveIntensity: 0.24,
        })
      );
      icing.position.y = y + height * 0.55 - 0.08;
      root.add(icing);

      return layer;
    }

    addCakeLayer(3.45, 1.02, -0.1, 0xff8eb5, 0x7d123c);
    addCakeLayer(2.95, 1.08, 0.86, 0xff5e96, 0x4d0e2f);
    addCakeLayer(2.3, 0.96, 1.86, 0xffe1ec, 0x8e3360);

    const ribbon = new THREE.Mesh(
      new THREE.TorusGeometry(2.38, 0.12, 24, 80),
      new THREE.MeshPhysicalMaterial({
        color: 0xff7db0,
        roughness: 0.16,
        metalness: 0.12,
        emissive: 0xff488f,
        emissiveIntensity: 0.25,
      })
    );
    ribbon.rotation.x = Math.PI / 2;
    ribbon.position.y = 2.34;
    root.add(ribbon);

    const starMaterial = new THREE.MeshBasicMaterial({
      color: 0xffd7eb,
      transparent: true,
      opacity: 0.95,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const starShape = createStarShape(5, 0.18, 0.38);
    const starGeo = new THREE.ExtrudeGeometry(starShape, {
      depth: 0.08,
      bevelEnabled: true,
      bevelThickness: 0.02,
      bevelSize: 0.015,
      bevelSegments: 2,
    });
    const crown = new THREE.Mesh(starGeo, starMaterial);
    crown.rotation.x = Math.PI / 2.1;
    crown.position.set(0, 3.58, 0);
    root.add(crown);

    const candleColors = [0xfff1df, 0xff8fbc, 0xffde8d, 0xffb7d8, 0xffffff];
    const candleGroup = new THREE.Group();
    candleGroup.position.y = 2.44;
    root.add(candleGroup);

    const candlePositions = [
      [0, 0],
      [1.28, 0.38],
      [-1.28, 0.36],
      [0.58, -1.08],
      [-0.7, -0.86],
      [0.02, 1.16],
    ];

    const flames = [];
    candlePositions.forEach((pair, index) => {
      const [x, z] = pair;
      const candleHeight = index === 0 ? 1.46 : 1.22;
      const candle = new THREE.Mesh(
        new THREE.CylinderGeometry(0.08, 0.1, candleHeight, 18),
        new THREE.MeshPhysicalMaterial({
          color: candleColors[index % candleColors.length],
          roughness: 0.22,
          metalness: 0.05,
          clearcoat: 0.76,
          emissive: 0xff8fbc,
          emissiveIntensity: 0.12,
        })
      );
      candle.position.set(x, candleHeight * 0.5 + 0.56, z);
      candleGroup.add(candle);

      const flame = new THREE.Mesh(
        new THREE.SphereGeometry(index === 0 ? 0.18 : 0.15, 16, 16),
        new THREE.MeshBasicMaterial({
          map: warmGlowTexture,
          color: index % 2 === 0 ? 0xfff3cb : 0xffc2df,
          transparent: true,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        })
      );
      flame.position.set(x, candleHeight + 0.36, z);
      flame.scale.set(0.68, 1.1, 0.68);
      candleGroup.add(flame);

      const light = new THREE.PointLight(index % 2 === 0 ? 0xffc16d : 0xff91c1, 0.65, 6, 2);
      light.position.set(x, candleHeight + 0.3, z);
      candleGroup.add(light);
      lights.push(light);

      flames.push({
        mesh: flame,
        baseY: flame.position.y,
        seed: Math.random() * Math.PI * 2,
      });
    });

    const pearlGroup = new THREE.Group();
    pearlGroup.position.y = 2.12;
    root.add(pearlGroup);
    const pearlColors = [0xfff6f1, 0xffd4ea, 0xffc77a, 0xffffff];
    for (let i = 0; i < 18; i += 1) {
      const angle = (i / 18) * Math.PI * 2;
      const pearl = new THREE.Mesh(
        new THREE.SphereGeometry(0.08 + (i % 3) * 0.015, 14, 14),
        new THREE.MeshPhysicalMaterial({
          color: pearlColors[i % pearlColors.length],
          roughness: 0.1,
          metalness: 0.08,
          clearcoat: 0.95,
          emissive: 0xff8db8,
          emissiveIntensity: 0.08,
        })
      );
      pearl.position.set(Math.cos(angle) * 2.42, 0.05 * Math.sin(i), Math.sin(angle) * 2.42);
      pearlGroup.add(pearl);
    }

    const sparkleGeo = new THREE.BufferGeometry();
    const sparkleCount = 88;
    const sparklePositions = new Float32Array(sparkleCount * 3);
    const sparklePhases = new Float32Array(sparkleCount);
    for (let i = 0; i < sparkleCount; i += 1) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 2.8 + Math.random() * 1.8;
      sparklePositions[i * 3] = Math.cos(angle) * radius;
      sparklePositions[i * 3 + 1] = 0.2 + Math.random() * 4.8;
      sparklePositions[i * 3 + 2] = Math.sin(angle) * radius;
      sparklePhases[i] = Math.random() * Math.PI * 2;
    }
    sparkleGeo.setAttribute("position", new THREE.BufferAttribute(sparklePositions, 3));
    const sparkles = new THREE.Points(
      sparkleGeo,
      new THREE.PointsMaterial({
        color: 0xff9ad0,
        size: 0.09,
        transparent: true,
        opacity: 0.82,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        sizeAttenuation: true,
      })
    );
    root.add(sparkles);

    const halo = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: glowTexture,
        color: 0xff82b4,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      })
    );
    halo.position.set(0, 1.8, -1.8);
    halo.scale.set(12, 12, 1);
    root.add(halo);

    const pointer = { x: 0, y: 0 };
    let targetX = 0;
    let targetY = 0;
    let baseY = -1.62;
    let running = true;
    let visible = false;
    let revealed = false;
    let raf = 0;

    function resize() {
      const width = container.clientWidth || 1;
      const height = container.clientHeight || 1;
      const compact = width < 560;
      container.classList.toggle("is-compact", compact);
      baseY = compact ? -0.92 : -1.62;
      root.scale.setScalar(compact ? 0.56 : 1);
      camera.fov = compact ? 48 : 42;
      camera.position.set(0, compact ? 3.9 : 3.4, compact ? 14.5 : 11.2);
      camera.lookAt(0, compact ? 1.4 : 1.6, 0);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    }

    function setVisible(nextVisible, nextRevealed) {
      visible = nextVisible;
      revealed = nextRevealed;
      container.classList.toggle("is-visible", visible);
      container.classList.toggle("is-revealed", revealed);
    }

    function show() {
      setVisible(true, false);
    }

    function reveal() {
      setVisible(true, true);
    }

    function hide() {
      setVisible(false, false);
    }

    function onPointerMove(event) {
      const rect = container.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / Math.max(rect.width, 1)) * 2 - 1;
      pointer.y = ((event.clientY - rect.top) / Math.max(rect.height, 1)) * 2 - 1;
    }

    function onPointerLeave() {
      pointer.x = 0;
      pointer.y = 0;
    }

    function loop(time) {
      if (!running) return;
      const t = time * 0.001;
      targetX += (pointer.x - targetX) * 0.06;
      targetY += (pointer.y - targetY) * 0.06;

      root.rotation.y = targetX * 0.55 + Math.sin(t * 0.35) * 0.06;
      root.rotation.x = -targetY * 0.18 + Math.cos(t * 0.24) * 0.02;
      root.position.y = baseY + Math.sin(t * 1.05) * 0.08;
      ribbon.rotation.z = Math.sin(t * 0.7) * 0.03;
      crown.rotation.z = Math.sin(t * 0.9) * 0.05;
      pearlGroup.rotation.y = t * 0.24;
      sparkles.rotation.y = t * 0.16;
      sparkles.rotation.x = Math.sin(t * 0.2) * 0.05;

      sparkles.material.opacity = visible ? (revealed ? 0.94 : 0.74) : 0.45;
      halo.material.opacity = revealed ? 0.8 : 0.45;
      plateGlow.material.opacity = revealed ? 0.85 : 0.52;

      flames.forEach((flame) => {
        const pulse = 1 + Math.sin(t * 4.6 + flame.seed) * 0.08;
        flame.mesh.scale.set(0.72 * pulse, 1.1 * pulse, 0.72 * pulse);
        flame.mesh.position.y = flame.baseY + Math.sin(t * 5.3 + flame.seed) * 0.04;
      });

      lights.forEach((light, index) => {
        light.intensity = 0.76 + Math.sin(t * 2.4 + index) * 0.12 + (revealed ? 0.18 : 0);
      });

      renderer.render(scene, camera);
      raf = window.requestAnimationFrame(loop);
    }

    container.addEventListener("pointermove", onPointerMove);
    container.addEventListener("pointerleave", onPointerLeave);

    resize();
    raf = window.requestAnimationFrame(loop);

    return {
      show,
      reveal,
      hide,
      resize,
      destroy() {
        running = false;
        window.cancelAnimationFrame(raf);
        container.removeEventListener("pointermove", onPointerMove);
        container.removeEventListener("pointerleave", onPointerLeave);
        renderer.dispose();
      },
    };
  };
})();
