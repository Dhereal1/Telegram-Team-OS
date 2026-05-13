import { Suspense } from "react";
import { LoginCard } from "@/components/telegram/login-card";

export default function LoginPage() {
  return (
    <div className="mx-auto w-full max-w-md">
      <Suspense fallback={null}>
        <LoginCard />
      </Suspense>
    </div>
  );
}
