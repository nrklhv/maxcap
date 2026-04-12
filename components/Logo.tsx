type LogoSize = "sm" | "md" | "lg";

const sizes: Record<LogoSize, { w: number; h: number }> = {
  sm: { w: 140, h: 30 },
  md: { w: 160, h: 34 },
  lg: { w: 200, h: 44 },
};

export function Logo({
  size = "sm",
  className = "",
}: {
  size?: LogoSize;
  className?: string;
}) {
  const { w, h } = sizes[size];
  return (
    <svg
      width={w}
      height={h}
      viewBox="0 0 140 30"
      fill="none"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      aria-label="MaxRent"
    >
      <title>MaxRent</title>
      <polyline
        points="16.3,3.6 2.8,15.0 16.3,26.4"
        stroke="#FF6701"
        strokeWidth="3"
        strokeLinecap="square"
        fill="none"
      />
      <polyline
        points="27.5,3.6 14.0,15.0 27.5,26.4"
        stroke="#CC4A28"
        strokeWidth="3"
        strokeLinecap="square"
        fill="none"
      />
      <text
        x="36"
        y="21.6"
        fontFamily="'DM Sans',system-ui,sans-serif"
        fontSize="15.4"
        fontWeight="300"
        letterSpacing="2"
        fill="#EDE0CC"
      >
        MAXRENT
      </text>
    </svg>
  );
}
