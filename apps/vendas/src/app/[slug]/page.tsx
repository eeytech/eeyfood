import Image from "next/image";
import { notFound } from "next/navigation";

import { buscarRestaurantePorSlug } from "@/lib/db";

import ConsumptionMethodOption from "./components/consumption-method-option";

interface RestaurantPageProps {
  params: Promise<{ slug: string }>;
}

const RestaurantPage = async ({ params }: RestaurantPageProps) => {
  const { slug } = await params;
  const restaurant = await buscarRestaurantePorSlug(slug);

  if (!restaurant) {
    return notFound();
  }

  return (
    <div className="mx-auto flex h-screen max-w-[1200px] flex-col items-center justify-center px-6 pt-10 sm:pt-24">
      <div className="flex flex-col items-center gap-2">
        <Image
          src={restaurant.avatarImageUrl}
          alt={restaurant.name}
          width={82}
          height={82}
          className="rounded-2xl"
        />
        <h2 className="text-xl font-bold tracking-tight">{restaurant.name}</h2>
      </div>

      <div className="max-w-2xl space-y-2 pt-16 text-center sm:pt-24">
        <h3 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Seja bem-vindo!
        </h3>
        <p className="text-lg opacity-60">
          Escolha como prefere aproveitar sua refeição. Estamos aqui para
          oferecer praticidade e sabor em cada detalhe!
        </p>
      </div>

      <div className="grid w-full grid-cols-2 gap-4 pt-12 sm:max-w-xl sm:gap-6 sm:pt-14">
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
