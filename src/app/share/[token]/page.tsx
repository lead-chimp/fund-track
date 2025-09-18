import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ShareView } from "@/components/share/ShareView";

interface SharePageProps {
  params: Promise<{
    token: string;
  }>;
}

export default async function SharePage({ params }: SharePageProps) {
  const { token } = await params;

  // Validate and fetch the share link
  const shareLink = await prisma.leadShareLink.findUnique({
    where: {
      token: token,
      isActive: true,
      expiresAt: {
        gt: new Date()
      }
    },
    include: {
      lead: {
        include: {
          documents: {
            orderBy: {
              uploadedAt: 'desc'
            }
          },
          statusHistory: {
            orderBy: {
              createdAt: 'desc'
            },
            take: 5,
            include: {
              user: {
                select: {
                  email: true
                }
              }
            }
          }
        }
      }
    }
  });

  if (!shareLink) {
    notFound();
  }

  // Update access tracking
  await prisma.leadShareLink.update({
    where: { id: shareLink.id },
    data: {
      accessedAt: new Date(),
      accessCount: {
        increment: 1
      }
    }
  });

  return <ShareView shareLink={shareLink} />;
}

export async function generateMetadata({ params }: SharePageProps) {
  const { token } = await params;
  
  const shareLink = await prisma.leadShareLink.findUnique({
    where: {
      token: token,
      isActive: true,
      expiresAt: {
        gt: new Date()
      }
    },
    include: {
      lead: {
        select: {
          firstName: true,
          lastName: true,
          businessName: true
        }
      }
    }
  });

  if (!shareLink) {
    return {
      title: "Lead Not Found - Fund Track"
    };
  }

  const leadName = shareLink.lead.firstName && shareLink.lead.lastName 
    ? `${shareLink.lead.firstName} ${shareLink.lead.lastName}`
    : shareLink.lead.businessName || "Lead";

  return {
    title: `${leadName} - Lead Details - Fund Track`,
    description: "Secure lead information and documents",
    robots: "noindex, nofollow" // Prevent search engine indexing
  };
}