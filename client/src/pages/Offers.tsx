import { useQuery } from "@tanstack/react-query";

export default function Offers() {
  const { data: user } = useQuery<any>({ queryKey: ["/api/auth/user"] });
  const initials = (user?.username ?? user?.first_name ?? "U").slice(0, 2).toUpperCase();

  return (
    <div style={{ minHeight: "100vh", background: "#111111", display: "flex", flexDirection: "column", paddingBottom: 72 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", padding: "16px 16px 14px" }}>
        <div style={{ width: 34, height: 34, borderRadius: "50%", background: "linear-gradient(135deg,#4f46e5,#7c3aed)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span style={{ color: "white", fontSize: 12, fontWeight: 800 }}>{initials}</span>
        </div>
      </div>
    </div>
  );
}
