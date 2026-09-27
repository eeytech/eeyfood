import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRightIcon, MapPinIcon, StoreIcon } from "lucide-react";

import {
  buscarRestaurantePorSlug,
  buscarRestauranteUnico,
  db,
  restaurantsTable,
} from "@/lib/db";

import ConsumptionMethodOption from "./components/consumption-method-option";

export const dynamic = "force-dynamic";

interface RestaurantPageProps {
  searchParams?: Promise<{ slug?: string; restaurant?: string; tableId?: string }>;
}

const RestaurantPage = async ({ searchParams }: RestaurantPageProps) => {
  const sp = searchParams ? await searchParams : undefined;
  const targetSlug = sp?.slug || sp?.restaurant;

  if (sp?.tableId) {
    const slugQuery = targetSlug ? `&slug=${encodeURIComponent(targetSlug)}` : "";
    redirect(`/menu?consumptionMethod=DINE_IN&tableId=${encodeURIComponent(sp.tableId)}${slugQuery}`);
  }

  // Se não foi informado slug nem mesa, verifica se existem múltiplas unidades cadastradas
  if (!targetSlug) {
    const allRestaurants = await db
      .select({
        id: restaurantsTable.id,
        name: restaurantsTable.name,
        slug: restaurantsTable.slug,
        description: restaurantsTable.description,
        avatarImageUrl: restaurantsTable.avatarImageUrl,
        coverImageUrl: restaurantsTable.coverImageUrl,
      })
      .from(restaurantsTable);

    if (allRestaurants.length > 1) {
      return (
        <div className="mx-auto flex min-h-screen max-w-[1000px] flex-col items-center justify-center px-4 py-12 sm:px-6">
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary border border-primary/20 shadow-xs">
              <StoreIcon size={28} />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Nossas Unidades
            </h1>
            <p className="max-w-md text-sm text-slate-500">
              Escolha a unidade mais próxima de você para conferir o cardápio, fazer seu pedido ou retirar no balcão.
            </p>
          </div>

          <div className="mt-8 grid w-full gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {allRestaurants.map((branch) => (
              <Link
                key={branch.id}
                href={`/?slug=${encodeURIComponent(branch.slug)}`}
                className="group relative flex flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs transition-all duration-200 hover:-translate-y-1 hover:border-primary/50 hover:shadow-md"
              >
                <div className="flex items-center gap-3">
                  <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-slate-100 bg-slate-50">
                    <Image
                      src={branch.avatarImageUrl}
                      alt={branch.name}
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-base font-bold text-slate-900 group-hover:text-primary transition-colors">
                      {branch.name}
                    </h3>
                    <div className="flex items-center gap-1 text-xs text-slate-500">
                      <MapPinIcon size={12} className="shrink-0 text-slate-400" />
                      <span className="truncate">
                        {branch.description || "Restaurante & Delivery"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-xs font-semibold text-primary">
                  <span>Acessar cardápio</span>
                  <ArrowRightIcon size={14} className="transition-transform group-hover:translate-x-1" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      );
    }
  }

  const restaurant = targetSlug
    ? await buscarRestaurantePorSlug(targetSlug)
    : await buscarRestauranteUnico();

  if (!restaurant) {
    return (
      <div className="mx-auto flex min-h-screen max-w-[600px] flex-col items-center justify-center px-4 text-center">
        <h2 className="text-2xl font-bold tracking-tight">Restaurante não encontrado</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Não foi possível carregar os dados do restaurante. Por favor, verifique as configurações do sistema ou tente novamente mais tarde.
        </p>
      </div>
    );
  }

  const availableMethods = [
    restaurant.isDeliveryEnabled && {
      option: "DELIVERY" as const,
      buttonText: "Delivery",
      imageAlt: "Delivery",
      imageUrl: "/delivery.png",
    },
    restaurant.isTakeawayEnabled && {
      option: "TAKEAWAY" as const,
      buttonText: "Para retirada",
      imageAlt: "Para retirada",
      imageUrl: "/takeaway.png",
    },
    restaurant.isDineInEnabled && {
      option: "DINE_IN" as const,
      buttonText: "Consumo no local",
      imageAlt: "Consumo no local",
      imageUrl: "/dine_in.png",
    },
  ].filter(Boolean) as {
    option: "DELIVERY" | "TAKEAWAY" | "DINE_IN";
    buttonText: string;
    imageAlt: string;
    imageUrl: string;
  }[];

  const methods =
    availableMethods.length > 0
      ? availableMethods
      : [
          {
            option: "DELIVERY" as const,
            buttonText: "Delivery",
            imageAlt: "Delivery",
            imageUrl: "/delivery.png",
          },
          {
            option: "TAKEAWAY" as const,
            buttonText: "Para retirada",
            imageAlt: "Para retirada",
            imageUrl: "/takeaway.png",
          },
          {
            option: "DINE_IN" as const,
            buttonText: "Consumo no local",
            imageAlt: "Consumo no local",
            imageUrl: "/dine_in.png",
          },
        ];

  return (
    <div className="mx-auto flex min-h-screen max-w-[1200px] flex-col items-center justify-center px-3 py-8 sm:px-4 sm:py-16">
      <div className="flex flex-col items-center gap-2">
        <Image
          src={restaurant.avatarImageUrl}
          alt={restaurant.name}
          width={72}
          height={72}
          className="rounded-2xl"
        />
        <h2 className="text-lg font-bold tracking-tight">{restaurant.name}</h2>
      </div>

      <div className="max-w-2xl space-y-1.5 pt-8 text-center sm:pt-14">
        <h3 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Seja bem-vindo!
        </h3>
        <p className="text-sm opacity-60 sm:text-base">
          Escolha como prefere aproveitar sua refeição. Estamos aqui para
          oferecer praticidade e sabor em cada detalhe!
        </p>
      </div>

      <div
        className={`grid w-full gap-2 pt-8 sm:max-w-lg sm:gap-4 sm:pt-10 ${
          methods.length === 1
            ? "grid-cols-1"
            : methods.length === 2
            ? "grid-cols-2"
            : "grid-cols-3"
        }`}
      >
        {methods.map((method) => (
          <ConsumptionMethodOption
            key={method.option}
            option={method.option}
            buttonText={method.buttonText}
            imageAlt={method.imageAlt}
            imageUrl={method.imageUrl}
          />
        ))}
      </div>
    </div>
  );
};

export default RestaurantPage;
