import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getMenu } from "@/lib/storage";
import { DigitalMenu } from "@/components/menu/digital-menu";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const doc = await getMenu(slug);
  return { title: doc ? `منيو ${doc.venue.name}` : "المنيو غير موجود" };
}

export default async function PublicMenuPage({ params }: Props) {
  const { slug } = await params;
  const doc = await getMenu(slug);
  if (!doc) notFound();
  return <DigitalMenu doc={doc} />;
}
