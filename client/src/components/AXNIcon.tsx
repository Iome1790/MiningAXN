interface AXNIconProps {
  size?: number;
  className?: string;
}

export function AXNIcon({ size = 20, className = "" }: AXNIconProps) {
  return (
    <span
      className={`flex-shrink-0 inline-block rounded-full overflow-hidden ${className}`}
      style={{
        width: size,
        height: size,
        minWidth: size,
        minHeight: size,
      }}
    >
      <img
        src="/axn-coin.jpg"
        alt="AXN"
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          objectPosition: "center",
          display: "block",
        }}
      />
    </span>
  );
}
