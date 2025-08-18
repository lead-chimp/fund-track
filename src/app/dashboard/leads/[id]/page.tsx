import { LeadDetailView } from "@/components/dashboard/LeadDetailView";

interface LeadDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function LeadDetailPage({ params }: LeadDetailPageProps) {
  const { id } = await params;
  return <LeadDetailView leadId={parseInt(id)} />;
}
