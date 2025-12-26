import { redirect } from "next/navigation";

// Government deployment: Sign-up is disabled
// Users can only join via workspace invites
export default function SignUpPage(): never {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return
  return redirect("/sign-in");
}
