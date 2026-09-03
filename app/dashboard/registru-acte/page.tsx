import { redirect } from "next/navigation";
import "./document-register.css";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, isSuperAdmin } from "@/lib/session";
import { siteConfig } from "@/lib/data";
import { DocumentRegisterManager } from "@/app/components/document-register/document-register-manager";

export const dynamic = "force-dynamic";

export default async function DocumentRegisterPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!(await isSuperAdmin(user.userId))) redirect("/dashboard");

  const documents = await prisma.companyDocument.findMany({
    orderBy: [{ registrationNumber: "desc" }],
  });

  return (
    <DocumentRegisterManager
      company={{
        legalName: siteConfig.legalName,
        cui: siteConfig.cui,
        tradeRegistryNumber: siteConfig.tradeRegistryNumber,
      }}
      initialDocuments={documents.map((document) => ({
        id: document.id,
        registrationNumber: document.registrationNumber,
        registrationDate: document.registrationDate.toISOString(),
        direction: document.direction,
        documentType: document.documentType,
        documentNumber: document.documentNumber,
        documentDate: document.documentDate?.toISOString() ?? null,
        partnerName: document.partnerName,
        subject: document.subject,
        notes: document.notes,
        isCancelled: document.isCancelled,
        createdByName: document.createdByName,
        createdAt: document.createdAt.toISOString(),
        updatedAt: document.updatedAt.toISOString(),
      }))}
    />
  );
}
