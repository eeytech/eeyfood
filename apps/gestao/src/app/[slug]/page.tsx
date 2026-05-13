import { redirect } from "next/navigation";

interface GestaoRedirectPageProps {
  params: Promise<{ slug: string }>;
}

const GestaoRedirectPage = async ({ params }: GestaoRedirectPageProps) => {
  const { slug } = await params;

  redirect(`/${slug}/pedidos`);
};

export default GestaoRedirectPage;
