// A JSON request is not a CreateInvoiceInput. Only explicitly editable fields
// cross the public API boundary; snapshots, status and integration flags are internal.
export function publicOperationKey(data: Record<string, unknown>) {
  if (typeof data.operationKey !== "string" || !/^[a-zA-Z0-9:_-]{16,160}$/.test(data.operationKey)) throw new Error("Identificatorul unic al operațiunii lipsește sau este invalid. Reîncarcă formularul.");
  return data.operationKey;
}

export function publicInvoiceInput(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Date de facturare invalide.");
  const data = value as Record<string, unknown>;
  const text = (key: string, limit = 2000) => {
    const field = data[key];
    if (field == null) return "";
    if (typeof field !== "string" || field.length > limit || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(field)) throw new Error(`Câmp invalid: ${key}.`);
    return field.trim();
  };
  const numeric = (key: string, fallback?: number) => {
    const field = data[key];
    if (field == null && fallback !== undefined) return fallback;
    if (typeof field !== "number" || !Number.isFinite(field)) throw new Error(`Câmp numeric invalid: ${key}.`);
    return field;
  };
  const internal = ["invoiceType", "initialStatus", "sellerSnapshot", "clientSnapshot", "originalInvoiceId", "stornoReason", "integrationSource", "externalId", "autoEfactura"];
  if (internal.some(key => data[key] !== undefined)) throw new Error("Cererea conține câmpuri interne care nu pot fi modificate.");
  if (data.invoiceTypeCode !== undefined && data.invoiceTypeCode !== "380") throw new Error("Tipul facturii normale trebuie să fie 380.");
  if (data.paidOnSpot !== undefined && typeof data.paidOnSpot !== "boolean") throw new Error("Opțiune de încasare invalidă.");
  if (!Array.isArray(data.items) || data.items.length < 1 || data.items.length > 1000) throw new Error("Factura trebuie să conțină între 1 și 1000 de poziții.");
  const items = data.items.map((value, index) => {
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`Poziția ${index + 1} este invalidă.`);
    const item = value as Record<string, unknown>;
    const itemText = (key: string, fallback = "", limit = 1000) => {
      const field = item[key] ?? fallback;
      if (typeof field !== "string" || field.length > limit || /[\u0000-\u001f]/.test(field)) throw new Error(`Poziția ${index + 1}: câmp invalid ${key}.`);
      return field.trim();
    };
    for (const key of ["qty", "unitPrice", "vatRate"]) if (typeof item[key] !== "number" || !Number.isFinite(item[key])) throw new Error(`Poziția ${index + 1}: ${key} invalid.`);
    const productId = item.productId == null ? null : Number(item.productId);
    if (productId !== null && (!Number.isSafeInteger(productId) || productId <= 0)) throw new Error("Produs invalid.");
    return { productId, description: itemText("description"), um: itemText("um", "buc", 20), qty: item.qty as number, unitPrice: item.unitPrice as number, vatRate: item.vatRate as number, unitCode: itemText("unitCode", "H87", 10), vatCategoryCode: itemText("vatCategoryCode", Number(item.vatRate) === 0 ? "Z" : "S", 3), taxExemptionReasonCode: itemText("taxExemptionReasonCode", "", 100), taxExemptionReason: itemText("taxExemptionReason", "", 500) };
  });
  const userId = data.userId == null ? null : numeric("userId");
  if (userId !== null && (!Number.isSafeInteger(userId) || userId <= 0)) throw new Error("Emitent invalid.");
  return { issuanceKey: text("issuanceKey", 120), series: text("series", 20), ...(data.number === undefined ? {} : { number: numeric("number") }), clientId: numeric("clientId"), userId, issueDate: text("issueDate", 10), dueDate: text("dueDate", 10), taxPointDate: text("taxPointDate", 10), paymentMeansCode: text("paymentMeansCode", 10) || "30", paidOnSpot: data.paidOnSpot === true, cashier: text("cashier", 200), paymentTerms: text("paymentTerms"), buyerReference: text("buyerReference", 200), discountPercent: numeric("discountPercent", 0), currency: text("currency", 3) || "RON", exchangeRate: numeric("exchangeRate", 1), delegateName: text("delegateName", 200), delegateCI: text("delegateCI", 50), delegateCNP: text("delegateCNP", 20), vehiclePlate: text("vehiclePlate", 30), deliveryDate: text("deliveryDate", 10), deliveryTime: text("deliveryTime", 10), notes: text("notes"), items };
}
