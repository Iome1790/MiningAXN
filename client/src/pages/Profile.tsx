import Layout from "@/components/Layout";
import Header from "@/components/Header";
import { User } from "lucide-react";

export default function ProfilePage() {
  return (
    <Layout>
      <Header />
      <div className="flex flex-col items-center justify-center h-full pb-40 px-6 text-center">
        <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
          style={{ background: "rgba(59,130,246,0.12)", border: "1px solid rgba(59,130,246,0.25)" }}>
          <User style={{ width: 28, height: 28, color: "#3B82F6" }} />
        </div>
        <h2 className="text-white font-black text-xl mb-2">Profile</h2>
        <p className="text-white/40 text-sm">Coming soon</p>
      </div>
    </Layout>
  );
}
