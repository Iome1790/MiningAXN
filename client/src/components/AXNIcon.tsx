interface AXNIconProps {
  size?: number;
  className?: string;
}

export function AXNIcon({ size = 20, className = "" }: AXNIconProps) {
  return (
    <span
      className={`flex-shrink-0 inline-block ${className}`}
      style={{
        width: size,
        height: size,
        minWidth: size,
        minHeight: size,
        borderRadius: '50%',
        overflow: 'hidden',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <img
        src="/axn-icon.png"
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
