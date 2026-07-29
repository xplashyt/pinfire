export default function DiamondIcon({ className = "", glow = false }: { className?: string; glow?: boolean }) {
  return (
    <svg
      viewBox="0 0 48 48"
      className={`${className} ${glow ? "animate-facet-glow" : ""}`}
      aria-hidden="true"
    >
      <polygon points="24,4 40,18 24,44 8,18" fill="#F5B942" opacity="0.95" />
      <polygon points="24,4 40,18 24,20 8,18" fill="#FBD98A" />
      <polygon points="8,18 24,20 24,44" fill="#D99A22" />
      <polygon points="40,18 24,20 24,44" fill="#E8AC33" />
    </svg>
  );
}
