import { Button } from "@/components/ui/button";

// Social sign-in affordances. Google/Facebook OAuth is NOT in the MVP
// scope — the client has not confirmed provider setup yet (ui-context.md),
// so these render as clearly-disabled buttons with a "coming soon"
// tooltip instead of silently stubbed flows.

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1Z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84Z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06L5.84 9.9C6.71 7.31 9.14 5.38 12 5.38Z"
      />
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden="true">
      <path
        fill="#1877F2"
        d="M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.1 10.13 24v-8.44H7.08v-3.49h3.04V9.41c0-3.02 1.8-4.7 4.55-4.7 1.31 0 2.68.24 2.68.24v2.97h-1.5c-1.5 0-1.96.93-1.96 1.89v2.26h3.32l-.53 3.49h-2.8V24C19.62 23.1 24 18.1 24 12.07Z"
      />
    </svg>
  );
}

export function SocialButtons() {
  return (
    <div className="grid gap-2.5">
      <Button
        type="button"
        variant="outline"
        disabled
        title="Google sign-in is coming soon"
        className="w-full justify-center gap-2.5 disabled:opacity-60"
      >
        <GoogleIcon />
        Continue with Google
        <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
          soon
        </span>
      </Button>
      <Button
        type="button"
        variant="outline"
        disabled
        title="Facebook sign-in is coming soon"
        className="w-full justify-center gap-2.5 disabled:opacity-60"
      >
        <FacebookIcon />
        Continue with Facebook
        <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
          soon
        </span>
      </Button>
    </div>
  );
}
