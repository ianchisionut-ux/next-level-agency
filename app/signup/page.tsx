import { redirect } from "next/navigation";

// Inregistrarea publica a fost dezactivata. Signal foloseste doar conturile
// create manual prin scripts/seed-admins.js (super admin + admin Next Level).
export default function SignupPage() {
  redirect("/login");
}
