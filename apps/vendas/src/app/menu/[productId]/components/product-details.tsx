"use client";

import type { ProductComRestaurante, ProductOption, ProductOptionGroup } from "@/lib/db";

import ProductDetailsContent from "../../components/product-details-content";

interface ProductDetailsProps {
  product: ProductComRestaurante & { optionGroups: (ProductOptionGroup & { options: ProductOption[] })[] };
}

const ProductDetails = ({ product }: ProductDetailsProps) => {
  return (
    <div className="relative z-50 flex-auto overflow-hidden bg-white lg:mt-0 lg:rounded-none">
      <ProductDetailsContent product={product} showImage={false} />
    </div>
  );
};

export default ProductDetails;
