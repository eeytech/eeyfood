import { redirect } from "next/navigation";

import { buscarProdutoDoRestaurante } from "@/lib/db";

import ProductDetails from "./components/product-details";
import ProductHeader from "./components/product-header";

interface ProductPageProps {
  params: Promise<{ slug: string; productId: string }>;
}

const ProductPage = async ({ params }: ProductPageProps) => {
  const { slug, productId } = await params;
  const product = await buscarProdutoDoRestaurante({ slug, productId });

  if (!product) {
    return redirect("/?error=not_found");
  }

  return (
    <div className="mx-auto flex h-full max-w-[1200px] flex-col lg:h-auto lg:p-10">
      <div className="flex flex-col overflow-hidden lg:flex-row lg:rounded-[48px] lg:border lg:bg-white lg:shadow-2xl lg:shadow-slate-200/50">
        <div className="lg:w-1/2">
          <ProductHeader product={product} />
        </div>
        <div className="lg:w-1/2">
          <ProductDetails product={product} />
        </div>
      </div>
    </div>
  );
};

export default ProductPage;
