import { NextResponse } from "next/server";

// Inregistrarea publica este dezactivata - Signal foloseste doar conturile
// seedate manual (vezi scripts/seed-admins.js). Endpointul ramane definit
// (in loc de sters) ca sa returneze un mesaj clar in caz ca ceva incearca
// vechiul flux, in loc de un 404 fara context.
export async function POST() {
  return NextResponse.json(
    { error: "Înregistrarea publică este dezactivată. Contactează administratorul pentru acces." },
    { status: 403 }
  );
}
