import { SignUpForm } from "@/components/sign-up-form";

export default function SignUpPage() {
  return (
    <main className="relative min-h-screen flex items-center justify-center p-6 overflow-hidden bg-background">
      {/* No decorative blobs. They were three hard-coded indigo/violet
          discs under a 64px blur — the one colour the accent setting
          exists to get rid of, and three large blurred layers on a
          page whose only job is a form. The matte base and the panel
          below carry it. */}
      <div className="relative w-full max-w-sm animate-scale-in">
        <SignUpForm />
      </div>
    </main>
  );
}
