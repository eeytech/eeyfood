import Image from "next/image";
import { redirect } from "next/navigation";

import { buscarRestaurantePorSlug, buscarRestauranteUnico } from "@/lib/db";

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
