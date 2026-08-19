import { NextRequest, NextResponse } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { getCurrentUser } from "@/lib/session";

/**
 * Genereaza doar un TOKEN de autorizare pentru upload - fisierul propriu-zis
 * NU mai trece prin aceasta ruta (nu mai trece prin server deloc), ci merge
 * direct din browser catre Vercel Blob. Asta evita limita de ~4.5MB pe care
 * Vercel o impune cererilor catre functiile serverless - esentiala pentru
 * video-uri, care oricum sunt mult mai mari decat o poza.
 */
export async function POST(req: NextRequest) {
  const body = (await req.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async () => {
        const user = await getCurrentUser();
        if (!user) throw new Error("Neautentificat");

        return {
          allowedContentTypes: [
            "image/jpeg",
            "image/png",
            "image/webp",
            "video/mp4",
            "video/quicktime",
          ],
          addRandomSuffix: true,
          maximumSizeInBytes: 500 * 1024 * 1024, // 500MB - suficient pentru video lung
        };
      },
      onUploadCompleted: async () => {
        // Nu e nevoie sa facem nimic aici - URL-ul e deja returnat clientului
        // prin raspunsul de mai sus si folosit direct in compose.
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Eroare la generarea token-ului de upload" },
      { status: 400 }
    );
  }
}
