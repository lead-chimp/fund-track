import { LeadDetailView } from "@/components/dashboard/LeadDetailView"

interface LeadDetailPageProps {
  params: {
    id: string
  }
}

export default function LeadDetailPage({ params }: LeadDetailPageProps) {
  return <LeadDetailView leadId={parseInt(params.id)} />
}