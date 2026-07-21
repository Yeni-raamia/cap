/* Confettis légers, sans dépendance (Web Animations API).
   Respecte prefers-reduced-motion. À n'appeler que côté client. */
const COLORS = ["#10b981", "#34d399", "#0ea5e9", "#f59e0b", "#f43f5e", "#8b5cf6"];

export function fireConfetti(originX = 0.5, originY = 0.28): void {
  if (typeof window === "undefined") return;
  if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;

  const container = document.createElement("div");
  container.style.cssText = "position:fixed;inset:0;pointer-events:none;z-index:9999;overflow:hidden";
  document.body.appendChild(container);

  const cx = window.innerWidth * originX;
  const cy = window.innerHeight * originY;
  const N = 96;

  for (let i = 0; i < N; i++) {
    const p = document.createElement("div");
    const size = 6 + Math.random() * 7;
    const color = COLORS[i % COLORS.length];
    const round = Math.random() > 0.5;
    p.style.cssText =
      `position:absolute;left:${cx}px;top:${cy}px;width:${size}px;height:${size * (round ? 1 : 0.55)}px;` +
      `background:${color};border-radius:${round ? "50%" : "2px"};will-change:transform,opacity`;

    const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.1;
    const velocity = 260 + Math.random() * 340;
    const dx = Math.cos(angle) * velocity;
    const dyUp = Math.sin(angle) * velocity;
    const rot = Math.random() * 900 - 450;
    const dur = 1700 + Math.random() * 1100;

    p.animate(
      [
        { transform: "translate(0,0) rotate(0deg)", opacity: 1 },
        { transform: `translate(${dx * 0.5}px, ${dyUp * 0.5}px) rotate(${rot * 0.5}deg)`, opacity: 1, offset: 0.35 },
        { transform: `translate(${dx}px, ${dyUp + 640}px) rotate(${rot}deg)`, opacity: 0 },
      ],
      { duration: dur, easing: "cubic-bezier(.18,.7,.3,1)", fill: "forwards" }
    );
    container.appendChild(p);
  }

  window.setTimeout(() => container.remove(), 3000);
}
