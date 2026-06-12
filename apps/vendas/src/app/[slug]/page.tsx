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

      <div className="grid w-full grid-cols-2 gap-3 pt-10 sm:max-w-lg sm:gap-4 sm:pt-12">
        <ConsumptionMethodOption
          slug={slug}
          option="DINE_IN"
          buttonText="Para comer aqui"
          imageAlt="Comer aqui"
          imageUrl="/dine_in.png"
        />
        <ConsumptionMethodOption
          slug={slug}
          option="TAKEAWAY"
          buttonText="Para levar"
          imageAlt="Para levar"
          imageUrl="/takeaway.png"
        />
      </div>
    </div>
  );
};

export default RestaurantPage;
