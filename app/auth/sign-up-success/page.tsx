import Link from "next/link";
import { NotebookPen, MailCheck } from "lucide-react";

export default function SignUpSuccessPage() {
  return (
    <div className="relative min-h-screen flex items-center justify-center p-6 overflow-hidden bg-background">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-violet-500/10 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-indigo-500/10 blur-3xl" />
      </div>
      <div className="relative w-full max-w-sm animate-scale-in">
        <div className="flex flex-col gap-6">
          {/* Brand */}
          <div className="flex flex-col items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-glow-sm">
              <NotebookPen size={22} className="text-white" />
            </div>
          </div>

          {/* Card */}
          <div className="rounded-2xl border border-border/60 bg-card shadow-card-dark p-8 flex flex-col items-center gap-4 text-center">
            <div className="w-16 h-16 rounded-2xl bg-green-500/10 flex items-center justify-center">
              <MailCheck size={30} className="text-green-500" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground mb-2">Check your email</h1>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Thanks for signing up! We&apos;ve sent you a confirmation email. Please check your inbox and click the link to activate your account.
              </p>
            </div>
            <Link
              href="/auth/login"
              className="mt-2 px-6 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-all shadow-glow-sm"
            >
              Back to sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
