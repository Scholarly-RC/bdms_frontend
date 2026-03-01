import { logoutAction } from "@/app/_actions/auth";

import { Button } from "@/components/ui/button";

type AuthSignOutButtonProps = {
  className?: string;
};

export function AuthSignOutButton({ className }: AuthSignOutButtonProps) {
  return (
    <form action={logoutAction}>
      <Button className={className} type="submit">
        Sign out
      </Button>
    </form>
  );
}
