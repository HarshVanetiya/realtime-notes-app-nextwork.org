"use client";

import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { useState } from "react";
import { NotebookPen, Loader2, Mail, CheckCircle2 } from "lucide-react";

export function ForgotPasswordForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = createClient();
    setIsLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/update-password`,
      });
      if (error) throw error;
      setSuccess(true);
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      {/* Brand */}
      <div className="flex flex-col items-center gap-3 mb-2">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-glow-sm">
          <NotebookPen size={22} className="text-white" />
        </div>
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground">
            {success ? "Check your inbox" : "Reset your password"}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {success
              ? "A reset link has been sent to your email"
              : "We'll send you a link to reset your password"}
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-border/60 bg-card shadow-card-dark p-6 space-y-5">
        {success ? (
          <div className="flex flex-col items-center gap-4 py-4">
            <div className="w-14 h-14 rounded-2xl bg-green-500/10 flex items-center justify-center">
              <CheckCircle2 size={28} className="text-green-500" />
            </div>
            <p className="text-sm text-muted-foreground text-center max-w-xs">
              If you registered with <span className="text-foreground font-medium">{email}</span>, you&apos;ll receive a password reset email shortly.
            </p>
            <Link
              href="/auth/login"
              className="text-sm text-primary font-medium hover:text-primary/80 transition-colors"
            >
              Back to sign in
            </Link>
          </div>
        ) : (
          <form onSubmit={handleForgotPassword} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Email
              </Label>
              <div className="relative">
                <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-9 bg-muted/30 border-border/50 focus:border-primary/60 rounded-xl h-11"
                />
              </div>
            </div>

            {error && (
              <div className="rounded-xl bg-destructive/10 border border-destructive/20 px-4 py-3">
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-11 rounded-xl bg-primary hover:opacity-90 text-primary-foreground font-semibold shadow-glow-sm transition-all"
            >
              {isLoading ? (
                <><Loader2 size={16} className="animate-spin mr-2" />Sending...</>
              ) : (
                "Send reset email"
              )}
            </Button>

            <div className="text-center text-sm text-muted-foreground">
              Remember your password?{" "}
              <Link href="/auth/login" className="text-primary font-medium hover:text-primary/80 transition-colors">
                Sign in
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
