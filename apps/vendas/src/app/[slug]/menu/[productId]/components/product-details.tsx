"use client";

import type { ProductComRestaurante } from "@/lib/db";

import ProductDetailsContent from "../../components/product-details-content";

interface ProductDetailsProps {
  product: ProductComRestaurante;
}

const ProductDetails = ({ product }: ProductDetailsProps) => {
  return (
    <div className="flex-auto overflow-hidden bg-white mt-[-1.5rem] rounded-t-3xl relative z-50">
      <ProductDetailsContent product={product} showImage={false} />
    </div>
  );
};

export default ProductDetails;
