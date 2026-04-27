type MascotaProps = {
  className?: string;
};

/**
 * Oso rosado mascota — SVG inline. Solo decorativo.
 * Pensado para acompañar el hero del landing de inversionista.
 */
export function Mascota({ className }: MascotaProps) {
  return (
    <svg
      viewBox="0 0 220 240"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Mascota MaxRent"
      className={className}
    >
      {/* Sombra suave bajo el oso */}
      <ellipse cx="110" cy="225" rx="70" ry="6" fill="rgba(0,0,0,0.18)" />

      {/* Cuerpo */}
      <ellipse cx="110" cy="180" rx="62" ry="48" fill="#FFB6C8" />
      <ellipse cx="110" cy="186" rx="40" ry="28" fill="#FFD6E0" />

      {/* Brazos */}
      <ellipse cx="55" cy="170" rx="18" ry="22" fill="#FFB6C8" transform="rotate(-15 55 170)" />
      <ellipse cx="165" cy="170" rx="18" ry="22" fill="#FFB6C8" transform="rotate(15 165 170)" />

      {/* Patas */}
      <ellipse cx="85" cy="220" rx="20" ry="14" fill="#FFB6C8" />
      <ellipse cx="135" cy="220" rx="20" ry="14" fill="#FFB6C8" />
      <ellipse cx="85" cy="222" rx="9" ry="6" fill="#FFD6E0" />
      <ellipse cx="135" cy="222" rx="9" ry="6" fill="#FFD6E0" />

      {/* Orejas exteriores */}
      <circle cx="58" cy="68" r="22" fill="#FFB6C8" />
      <circle cx="162" cy="68" r="22" fill="#FFB6C8" />
      {/* Orejas interiores */}
      <circle cx="58" cy="70" r="11" fill="#FF8FA8" />
      <circle cx="162" cy="70" r="11" fill="#FF8FA8" />

      {/* Cabeza */}
      <circle cx="110" cy="100" r="62" fill="#FFB6C8" />

      {/* Hocico */}
      <ellipse cx="110" cy="120" rx="32" ry="24" fill="#FFE8EE" />

      {/* Mejillas */}
      <circle cx="62" cy="118" r="9" fill="#FF8FA8" opacity="0.55" />
      <circle cx="158" cy="118" r="9" fill="#FF8FA8" opacity="0.55" />

      {/* Ojos */}
      <ellipse cx="86" cy="98" rx="6" ry="7.5" fill="#001F30" />
      <ellipse cx="134" cy="98" rx="6" ry="7.5" fill="#001F30" />
      {/* Brillito ojos */}
      <circle cx="88" cy="95" r="1.8" fill="#FFFFFF" />
      <circle cx="136" cy="95" r="1.8" fill="#FFFFFF" />

      {/* Nariz */}
      <ellipse cx="110" cy="115" rx="7" ry="5" fill="#001F30" />

      {/* Boca */}
      <path
        d="M 100 128 Q 110 138 120 128"
        stroke="#001F30"
        strokeWidth="2.4"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}
