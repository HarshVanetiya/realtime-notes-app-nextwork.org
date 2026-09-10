import { ForgotPasswordForm } from "@/components/forgot-password-form";

export default function ForgotPasswordPage() {
  return (
    <main className="relative min-h-screen flex items-center justify-center p-6 overflow-hidden bg-background">
      {/* No decorative blobs. They were hard-coded indigo/violet discs
          under a 64px blur — the one colour the accent setting exists
          to get rid of, and large blurred layers on a page whose only
          job is a form. The matte base carries it. */}
      <div className="relative w-full max-w-sm animate-scale-in">
        <ForgotPasswordForm />
      </div>
    </main>
  );
}
