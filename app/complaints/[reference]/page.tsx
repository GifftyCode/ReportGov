import { ComplaintDetail } from "./ComplaintDetail";

// Server component: in Next.js 15+, params is a Promise.
export default async function ComplaintPage({ params }: { params: Promise<{ reference: string }> }) {
  const { reference } = await params;
  return <ComplaintDetail reference={reference} />;
}
