"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";

import { formatCurrency } from "@/helpers/format-currency";
import type { Product } from "@/lib/db";

interface ProductsProps {
  products: Product[];
}

const Products = ({ products }: ProductsProps) => {
  const { slug } = useParams<{ slug: string }>();
  const searchParams = useSearchParams();
  const consumptionMethod = searchParams.get("consumptionMethod");

  if (products.length === 0) {
    return (
      <div className="rounded-[32px] border border-dashed bg-slate-50 px-6 py-12 text-center">
        <p className="text-lg font-medium text-slate-950">
          Nenhum produto disponível nesta categoria
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          Tente navegar para outra categoria do cardápio.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
      {products.map((product) => (
        <Link
          key={product.id}
          href={`/${slug}/menu/${product.id}?consumptionMethod=${consumptionMethod}`}
          className="group overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-200/80"
        >
          <div className="relative aspect-[16/10] overflow-hidden bg-slate-100">
            <Image
              src={product.imageUrl}
              alt={product.name}
              fill
              className="object-contain p-5 transition duration-300 group-hover:scale-[1.03]"
            />
          </div>

          <div className="flex h-full flex-col gap-4 p-5">
            <div className="space-y-2">
              <h3 className="text-base font-semibold tracking-tight text-slate-950">
                {product.name}
              </h3>
              <p className="line-clamp-3 text-sm leading-6 text-slate-600">
                {product.description}
              </p>
            </div>

            <div className="mt-auto flex items-end justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                  A partir de
                </p>
                <p className="text-lg font-semibold text-slate-950">
                  {formatCurrency(product.price)}
                </p>
              </div>
              <span className="rounded-full bg-slate-950 px-4 py-2 text-sm font-medium text-white transition group-hover:bg-primary">
                Ver produto
              </span>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
};

export default Products;
