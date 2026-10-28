export function DotMotif({
  dark,
  direction = "135deg",
}: {
  dark?: boolean;
  direction?: string;
}) {
  const c = dark ? "rgba(255,255,255,.16)" : "rgba(16,34,43,.11)";
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='40' height='40' viewBox='0 0 40 40'><g fill='none' stroke='${c}' stroke-width='1'><ellipse cx='20' cy='10' rx='5' ry='10'/><ellipse cx='20' cy='30' rx='5' ry='10'/><ellipse cx='10' cy='20' rx='10' ry='5'/><ellipse cx='30' cy='20' rx='10' ry='5'/></g></svg>`;
  const mask = `linear-gradient(${direction}, black 0%, transparent 70%)`;
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0"
      style={{
        backgroundImage: `url("data:image/svg+xml,${encodeURIComponent(svg)}")`,
        maskImage: mask,
        WebkitMaskImage: mask,
      }}
    />
  );
}
