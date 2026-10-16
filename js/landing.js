const counters = [...document.querySelectorAll('.stat-num[data-target]')];

if (counters.length) {
  const countObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const counter = entry.target;
      const target = Number(counter.dataset.target);
      const startedAt = performance.now();
      const duration = 1000;
      const update = (now) => {
        const progress = Math.min((now - startedAt) / duration, 1);
        counter.textContent = Math.round(target * (1 - Math.pow(1 - progress, 3))).toLocaleString();
        if (progress < 1) requestAnimationFrame(update);
      };
      requestAnimationFrame(update);
      observer.unobserve(counter);
    });
  }, { threshold: 0.5 });
  counters.forEach((counter) => countObserver.observe(counter));
}

const canvas = document.getElementById('particleCanvas');
const context = canvas?.getContext('2d');
if (canvas && context) {
  let particles = [];
  let frameId;
  const resize = () => {
    const bounds = canvas.getBoundingClientRect();
    const scale = window.devicePixelRatio || 1;
    canvas.width = bounds.width * scale;
    canvas.height = bounds.height * scale;
    context.setTransform(scale, 0, 0, scale, 0, 0);
    particles = Array.from({ length: Math.min(70, Math.floor(bounds.width / 16)) }, () => ({
      x: Math.random() * bounds.width,
      y: Math.random() * bounds.height,
      radius: Math.random() * 1.5 + 0.5,
      speed: Math.random() * 0.18 + 0.06,
      opacity: Math.random() * 0.34 + 0.12
    }));
  };
  const draw = () => {
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    context.clearRect(0, 0, width, height);
    particles.forEach((particle) => {
      particle.y -= particle.speed;
      if (particle.y < 0) particle.y = height;
      context.beginPath();
      context.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
      context.fillStyle = `rgba(151, 221, 190, ${particle.opacity})`;
      context.fill();
    });
    frameId = requestAnimationFrame(draw);
  };
  resize();
  draw();
  window.addEventListener('resize', resize, { passive: true });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) cancelAnimationFrame(frameId);
    else draw();
  });
}
