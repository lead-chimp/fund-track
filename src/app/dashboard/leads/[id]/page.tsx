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
    <RoleGuard allowedRoles={["ADMIN" as UserRole, "USER" as UserRole, "SYSTEM_ADMIN" as UserRole]}>
      <LeadDetailView leadId={parseInt(id)} />
    </RoleGuard>
  );
}
