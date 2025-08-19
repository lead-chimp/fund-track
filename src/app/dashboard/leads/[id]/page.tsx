import { LeadDetailView } from "@/components/dashboard/LeadDetailView";
import { RoleGuard } from "@/components/auth/RoleGuard";
import { UserRole } from "@prisma/client";

interface LeadDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function LeadDetailPage({ params }: LeadDetailPageProps) {
  const { id } = await params;
  return (
    <RoleGuard allowedRoles={[UserRole.ADMIN, UserRole.USER]}>
      <LeadDetailView leadId={parseInt(id)} />
    </RoleGuard>
  );
}
