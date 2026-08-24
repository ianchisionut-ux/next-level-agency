import './accounting.css'
import { requireAccountingPage } from '@/lib/accounting/access'
import { AccountingNav } from '@/components/accounting/AccountingNav'

export const dynamic = 'force-dynamic'

export default async function AccountingLayout({ children }: { children: React.ReactNode }) {
  await requireAccountingPage()
  return (
    <div className="accounting-root">
      <div className="accounting-heading">
        <span>NEXT LEVEL · Administrare financiară</span>
        <h1>Facturare</h1>
        <p>Facturi, încasări, clienți și rapoarte într-un singur loc.</p>
      </div>
      <AccountingNav />
      <div className="accounting-content">{children}</div>
    </div>
  )
}
