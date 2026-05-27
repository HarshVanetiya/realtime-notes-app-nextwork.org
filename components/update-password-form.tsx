"use client";

import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { NotebookPen, Loader2, Lock } from "lucide-react";

export function UpdatePasswordForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = createClient();
    setIsLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      router.push("/notes");
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
        <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center">
          <NotebookPen size={22} className="text-white" />
        </div>
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground">Set new password</h1>
          <p className="text-sm text-muted-foreground mt-1">Choose a strong password for your account</p>
        </div>
      </div>

      <div className="rounded-2xl border border-border/60 bg-card shadow-sm p-6 space-y-5">
        <form onSubmit={handleUpdatePassword} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="password" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              New Password
            </Label>
            <div className="relative">
              <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
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
            className="w-full h-11 rounded-xl bg-primary hover:opacity-90 text-primary-foreground font-semibold transition-all"
          >
            {isLoading ? (
              <><Loader2 size={16} className="animate-spin mr-2" />Updating...</>
            ) : (
              "Update password"
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
