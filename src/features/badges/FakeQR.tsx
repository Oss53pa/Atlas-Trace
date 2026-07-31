/**
 * Faux QR décoratif en SVG, déterministe à partir d'une chaîne.
 * Maquette uniquement : en production, remplacer par une vraie charge signée (chap. 12).
 */
export function FakeQR({ value, size = 84 }: { value: string; size?: number }) {
  const n = 21; // QR v1
  const grid = matrice(value, n);
  const cell = size / n;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} shapeRendering="crispEdges">
      <rect width={size} height={size} fill="#FFFFFF" />
      {grid.flatMap((ligne, r) =>
        ligne.map((on, c) =>
          on ? (
            <rect key={`${r}-${c}`} x={c * cell} y={r * cell} width={cell} height={cell} fill="#16281B" />
          ) : null,
        ),
      )}
    </svg>
  );
}

function matrice(seed: string, n: number): boolean[][] {
  const g: boolean[][] = Array.from({ length: n }, () => Array<boolean>(n).fill(false));

  // Motifs de repérage (finders) aux trois coins
  const finder = (r0: number, c0: number) => {
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 7; c++) {
        const bord = r === 0 || r === 6 || c === 0 || c === 6;
        const centre = r >= 2 && r <= 4 && c >= 2 && c <= 4;
        g[r0 + r][c0 + c] = bord || centre;
      }
    }
  };
  finder(0, 0);
  finder(0, n - 7);
  finder(n - 7, 0);

  const dansFinder = (r: number, c: number) =>
    (r < 8 && c < 8) || (r < 8 && c >= n - 8) || (r >= n - 8 && c < 8);

  // Empreinte simple, déterministe
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) & 0xffff;

  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (dansFinder(r, c)) continue;
      const v = (hash ^ ((r + 1) * 73)) ^ ((c + 1) * 151);
      g[r][c] = ((v >> ((r + c) % 7)) & 1) === 1;
    }
  }
  return g;
}
