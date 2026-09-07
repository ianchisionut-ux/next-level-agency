# Bookeasy → Signal billing API

Signal emite facturile Bookeasy cu emitentul configurat în `Facturare → Firmă` și seria fixă `BKE`.

## Configurare

În ambele proiecte Vercel se configurează aceeași valoare secretă, de minimum 32 de caractere:

- Signal: `BOOKEASY_BILLING_API_KEY`
- Bookeasy: `SIGNAL_BILLING_API_KEY`

Cheia se transmite doar server-to-server în headerul `Authorization: Bearer <cheie>`. Nu trebuie expusă niciodată în browser.

## Emitere

`POST https://www.nextlevel-agency.ro/api/integrations/bookeasy/invoices`

```json
{
  "externalId": "booking-or-order-unique-id",
  "issueDate": "2026-09-07",
  "dueDate": "2026-09-14",
  "currency": "RON",
  "notes": "Rezervare Bookeasy",
  "customer": {
    "externalId": "customer-unique-id",
    "type": "PF",
    "name": "Nume client",
    "address": "Strada Exemplu 1",
    "county": "Sălaj",
    "city": "Zalău",
    "countryCode": "RO",
    "postalCode": "450000",
    "email": "client@example.ro",
    "phone": "+40700000000"
  },
  "items": [
    {
      "description": "Serviciu Bookeasy",
      "um": "buc",
      "unitCode": "H87",
      "qty": 1,
      "unitPrice": 100,
      "vatRate": 21,
      "vatCategoryCode": "S"
    }
  ]
}
```

Pentru persoană juridică se trimit `type: "PJ"`, `cif` și, când există, `regCom`. Valorile fiscale ale pozițiilor trebuie să corespundă profilului TVA al emitentului din Signal.

`externalId` este cheia de idempotență: repetarea aceleiași cereri întoarce factura deja emisă și nu consumă un număr nou.

Răspunsul conține `id`, `reference`, `status`, `total`, `currency`, `pdfUrl` și `duplicate`. Factura este programată automat pentru protecția e-Factura din ziua următoare.

`pdfUrl` se apelează tot server-to-server, cu același header `Authorization`. Bookeasy poate transmite PDF-ul clientului, dar cheia secretă nu ajunge în browser.
