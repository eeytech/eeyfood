import Image from "next/image";
import { redirect } from "next/navigation";

import { buscarRestaurantePorSlug } from "@/lib/db";

import ConsumptionMethodOption from "./components/consumption-method-option";

interface RestaurantPageProps {
  params: Promise<{ slug: string }>;
}

const RestaurantPage = async ({ params }: RestaurantPageProps) => {
  const { slug } = await params;
  const restaurant = await buscarRestaurantePorSlug(slug);

  if (!restaurant) {
    return redirect("/?error=not_found");
  }

  const availableMethods = [
    restaurant.isDeliveryEnabled && { option: "DELIVERY" as const, buttonText: "Delivery", imageAlt: "Delivery", imageUrl: "/delivery.png" },
    restaurant.isTakeawayEnabled && { option: "TAKEAWAY" as const, buttonText: "Para levar", imageAlt: "Para levar", imageUrl: "/takeaway.png" },
    restaurant.isDineInEnabled && { option: "DINE_IN" as const, buttonText: "Para comer aqui", imageAlt: "Comer aqui", imageUrl: "/dine_in.png" },
  ].filter(Boolean) as { option: "DELIVERY" | "TAKEAWAY" | "DINE_IN"; buttonText: string; imageAlt: string; imageUrl: string }[];

  if (availableMethods.length === 1) {
    return redirect(`/${slug}/menu?consumptionMethod=${availableMethods[0].option}`);
  }

  return (
    <div className="mx-auto flex h-screen max-w-[1200px] flex-col items-center justify-center px-4 pt-8 sm:pt-20">
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

      <div className="max-w-2xl space-y-1.5 pt-12 text-center sm:pt-20">
        <h3 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Seja bem-vindo!
        </h3>
        <p className="text-base opacity-60">
          Escolha como prefere aproveitar sua refeição. Estamos aqui para
          oferecer praticidade e sabor em cada detalhe!
        </p>
      </div>

      <div
        className={`grid w-full gap-3 pt-10 sm:max-w-lg sm:gap-4 sm:pt-12 ${
          availableMethods.length === 2 ? "grid-cols-2" : "grid-cols-3"
        }`}
      >
        {availableMethods.map((method) => (
          <ConsumptionMethodOption
            key={method.option}
            slug={slug}
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
