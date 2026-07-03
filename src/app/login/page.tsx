import { AuthShell } from "@/components/auth-shell";
import { OtpForm } from "./otp-form";

export default function LoginPage() {
  return (
    <AuthShell>
      <OtpForm />
    </AuthShell>
  );
}
