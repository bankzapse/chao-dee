import { AuthShell } from "@/components/auth-shell";
import { OtpForm } from "@/app/login/otp-form";

export default function SignupPage() {
  return (
    <AuthShell>
      <OtpForm signup />
    </AuthShell>
  );
}
