const packs = {
  enterprise: {
    colour: "#d1bc88",
    count: 36,
    reach: 170,
    ease: "power3.out",
    shape: "diamond",
  },
  medieval: {
    colour: "#c5a46b",
    count: 24,
    reach: 145,
    ease: "power2.out",
    shape: "line",
  },
  kittens: {
    colour: "#e6aac6",
    count: 28,
    reach: 155,
    ease: "back.out(1.4)",
    shape: "paw",
  },
  retro: {
    colour: "#e3ab60",
    count: 38,
    reach: 185,
    ease: "power2.out",
    shape: "line",
  },
  space: {
    colour: "#80d6eb",
    count: 42,
    reach: 210,
    ease: "expo.out",
    shape: "diamond",
  },
  savanna: {
    colour: "#c2b187",
    count: 24,
    reach: 160,
    ease: "sine.out",
    shape: "line",
  },
};
let current;
export function celebrate(skin, { preview = false } = {}) {
  const plane = document.getElementById("L4");
  current?.kill();
  plane.replaceChildren();
  if (matchMedia("(prefers-reduced-motion: reduce)").matches || !window.gsap) {
    document.getElementById("message").textContent = preview
      ? "Skin motion preview · reduced motion: static highlight."
      : "Vault unlocked.";
    return;
  }
  const pack = packs[skin] || packs.enterprise;
  const ns = "http://www.w3.org/2000/svg";
  const nodes = [];
  for (let i = 0; i < pack.count; i++) {
    const a = (2 * Math.PI * i) / pack.count;
    const g = document.createElementNS(ns, "g");
    g.setAttribute("transform", "translate(600 365)");
    const p = document.createElementNS(ns, "path");
    p.style.opacity = "0";
    p.setAttribute(
      "d",
      pack.shape === "diamond"
        ? "M0 -4 2.5 0 0 4 -2.5 0Z"
        : pack.shape === "paw"
          ? "M-3 1Q0 -2 3 1L2 4H-2ZM-4 -3A1 1 0 1 0 -2 -3A1 1 0 1 0 -4 -3M0 -4A1 1 0 1 0 2 -4A1 1 0 1 0 0 -4"
          : "M-8 0H8",
    );
    p.setAttribute("fill", pack.shape === "line" ? "none" : pack.colour);
    p.setAttribute("stroke", pack.colour);
    p.setAttribute("stroke-width", ".8");
    g.append(p);
    plane.append(g);
    nodes.push({
      node: p,
      x: Math.cos(a) * (pack.reach + (i % 3) * 26),
      y: Math.sin(a) * (pack.reach + (i % 3) * 26),
    });
  }
  current = gsap.timeline({ onComplete: () => plane.replaceChildren() });
  for (const p of nodes) {
    current
      .to(
        p.node,
        {
          x: p.x,
          y: p.y,
          rotation: p.x / 5,
          opacity: 0.85,
          duration: 0.9,
          ease: pack.ease,
        },
        0,
      )
      .to(p.node, { opacity: 0, duration: 0.65 }, 0.7);
  }
  // This is presentation only: no request/session/permission is changed here.
  return current;
}
