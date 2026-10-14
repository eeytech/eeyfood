"use client";

import type { RestaurantComCategoriasEProdutos } from "@fsw/db";
import {
  ArrowRightIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CoinsIcon,
  ExternalLinkIcon,
  FlameIcon,
  SparklesIcon,
  TagIcon,
  TruckIcon,
} from "lucide-react";
import Image from "next/image";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { formatCurrency } from "@/helpers/format-currency";

interface PromotionalCarouselProps {
  restaurant: RestaurantComCategoriasEProdutos & {
    rating: number;
    ratingCount: number;
  };
  consumptionMethod?: "DINE_IN" | "TAKEAWAY" | "DELIVERY";
}

interface SlideItem {
  id: string;
  badge: string;
  badgeIcon: React.ReactNode;
  title: string;
  subtitle: string;
  buttonText: string;
  gradientClass: string;
  iconBgClass: string;
  cardIcon: React.ReactNode;
  imageUrl?: string;
  linkUrl?: string;
}

export default function PromotionalCarousel({
  restaurant,
  consumptionMethod,
}: PromotionalCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Monta os slides automáticos baseados nas regras reais e benefícios do restaurante
  const slides = useMemo<SlideItem[]>(() => {
    // Se a configuração no app de gestão estiver desativada, não exibe
    if (restaurant.showPromotionalBanners === false) {
      return [];
    }

    const list: SlideItem[] = [];

    // 1. Banners customizados cadastrados no app de gestão
    if (
      Array.isArray(restaurant.promotionalBanners) &&
      restaurant.promotionalBanners.length > 0
    ) {
      for (const custom of restaurant.promotionalBanners) {
        if (!custom.isActive) continue;

        let grad = "from-slate-900 via-slate-800 to-zinc-900";
        let iconBg = "bg-white/10 text-white";
        if (custom.gradient === "amber") {
          grad = "from-amber-600 via-amber-500 to-orange-500";
          iconBg = "bg-amber-400/20 text-amber-100";
        } else if (custom.gradient === "emerald") {
          grad = "from-emerald-600 via-teal-600 to-emerald-700";
          iconBg = "bg-emerald-400/20 text-emerald-100";
        } else if (custom.gradient === "violet") {
          grad = "from-violet-700 via-purple-600 to-indigo-600";
          iconBg = "bg-violet-400/20 text-violet-100";
        } else if (custom.gradient === "rose") {
          grad = "from-rose-600 via-pink-600 to-red-600";
          iconBg = "bg-rose-400/20 text-rose-100";
        } else if (custom.gradient === "blue") {
          grad = "from-blue-600 via-sky-600 to-indigo-700";
          iconBg = "bg-blue-400/20 text-blue-100";
        } else if (custom.gradient === "primary") {
          grad = "from-primary via-rose-600 to-amber-600";
          iconBg = "bg-white/20 text-white";
        }

        list.push({
          id: custom.id,
          badge: custom.tag || "DESTAQUE ESPECIAL",
          badgeIcon: <SparklesIcon size={13} className="text-amber-300" />,
          title: custom.title,
          subtitle: custom.subtitle || "Aproveite esta oferta exclusiva hoje no cardápio!",
          buttonText: custom.buttonText || "Aproveitar",
          gradientClass: grad,
          iconBgClass: iconBg,
          cardIcon: <SparklesIcon size={32} />,
          imageUrl: custom.imageUrl,
          linkUrl: custom.linkUrl,
        });
      }
    }

    // 2. Benefício: Cashback Ativo
    if (
      restaurant.isCashbackEnabled &&
      typeof restaurant.cashbackPercent === "number" &&
      restaurant.cashbackPercent > 0
    ) {
      list.push({
        id: "benefit-cashback",
        badge: "CASHBACK GARANTIDO",
        badgeIcon: <CoinsIcon size={13} className="text-amber-200" />,
        title: `Ganhe ${restaurant.cashbackPercent}% de volta no seu bolso`,
        subtitle: `Faça seu pedido agora e acumule saldo na carteira para economizar nas próximas compras!`,
        buttonText: "Aproveitar Cashback",
        gradientClass: "from-amber-600 via-orange-500 to-amber-500",
        iconBgClass: "bg-amber-400/20 text-amber-100",
        cardIcon: <CoinsIcon size={34} className="text-amber-200" />,
      });
    }

    // 3. Benefício: Frete Grátis ou Regras de Entrega
    const freeDeliveryThreshold = restaurant.freeDeliveryThreshold
      ? Number(restaurant.freeDeliveryThreshold)
      : null;

    if (
      (!consumptionMethod || consumptionMethod === "DELIVERY") &&
      freeDeliveryThreshold &&
      freeDeliveryThreshold > 0
    ) {
      list.push({
        id: "benefit-frete-gratis",
        badge: "FRETE GRÁTIS",
        badgeIcon: <TruckIcon size={13} className="text-emerald-200" />,
        title: `Entrega Grátis acima de ${formatCurrency(freeDeliveryThreshold)}`,
        subtitle: `Monte seu pedido com seus pratos e bebidas favoritos e ganhe entrega gratuita!`,
        buttonText: "Ver Cardápio",
        gradientClass: "from-emerald-700 via-teal-600 to-emerald-600",
        iconBgClass: "bg-emerald-400/20 text-emerald-100",
        cardIcon: <TruckIcon size={34} className="text-emerald-200" />,
      });
    }

    // 4. Benefício: Cupons de Desconto
    if (restaurant.isCouponsEnabled) {
      list.push({
        id: "benefit-cupons",
        badge: "ECONOMIZE MAIS",
        badgeIcon: <TagIcon size={13} className="text-violet-200" />,
        title: "Cupons de Desconto disponíveis",
        subtitle: "Aproveite cupons promocionais válidos e insira o código direto no checkout do app.",
        buttonText: "Escolher Itens",
        gradientClass: "from-violet-700 via-purple-600 to-indigo-600",
        iconBgClass: "bg-violet-400/20 text-violet-100",
        cardIcon: <TagIcon size={34} className="text-violet-200" />,
      });
    }

    // 5. Cardápio Artesanal & Destaque
    list.push({
      id: "benefit-qualidade",
      badge: "SABOR & QUALIDADE",
      badgeIcon: <FlameIcon size={13} className="text-rose-200" />,
      title: "Pratos preparados na hora para você",
      subtitle: "Ingredientes selecionados, embalagens seguras e entrega rápida para sua melhor experiência.",
      buttonText: "Explorar Cardápio",
      gradientClass: "from-rose-600 via-red-600 to-amber-600",
      iconBgClass: "bg-rose-400/20 text-rose-100",
      cardIcon: <FlameIcon size={34} className="text-rose-200" />,
    });

    return list;
  }, [
    consumptionMethod,
    restaurant.showPromotionalBanners,
    restaurant.promotionalBanners,
    restaurant.isCashbackEnabled,
    restaurant.cashbackPercent,
    restaurant.freeDeliveryThreshold,
    restaurant.isCouponsEnabled,
  ]);

  const totalSlides = slides.length;

  const scrollToSlide = useCallback((index: number) => {
    if (!scrollContainerRef.current) return;
    const container = scrollContainerRef.current;
    const targetScroll = container.clientWidth * index;
    container.scrollTo({
      left: targetScroll,
      behavior: "smooth",
    });
    setCurrentIndex(index);
  }, []);

  const handleNext = useCallback(() => {
    const next = (currentIndex + 1) % totalSlides;
    scrollToSlide(next);
  }, [currentIndex, totalSlides, scrollToSlide]);

  const handlePrev = useCallback(() => {
    const prev = (currentIndex - 1 + totalSlides) % totalSlides;
    scrollToSlide(prev);
  }, [currentIndex, totalSlides, scrollToSlide]);

  // Sincroniza o índice atual ao dar swipe no mobile
  const handleScroll = () => {
    if (!scrollContainerRef.current) return;
    const container = scrollContainerRef.current;
    const scrollLeft = container.scrollLeft;
    const width = container.clientWidth;
    if (width > 0) {
      const newIndex = Math.round(scrollLeft / width);
      if (newIndex !== currentIndex && newIndex >= 0 && newIndex < totalSlides) {
        setCurrentIndex(newIndex);
      }
    }
  };

  // Auto-play a cada 5 segundos quando não estiver pausado por hover ou toque
  useEffect(() => {
    if (isPaused || totalSlides <= 1) return;
    const interval = setInterval(() => {
      handleNext();
    }, 5000);
    return () => clearInterval(interval);
  }, [isPaused, totalSlides, handleNext]);

  const handleSlideAction = (slide: SlideItem) => {
    if (slide.linkUrl) {
      if (slide.linkUrl.startsWith("#")) {
        const el = document.querySelector(slide.linkUrl);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "start" });
          return;
        }
      } else if (slide.linkUrl.startsWith("http")) {
        window.open(slide.linkUrl, "_blank", "noopener,noreferrer");
        return;
      }
    }
    // Ação padrão: rolar suavemente até as categorias do cardápio
    const categoriesSection = document.getElementById("menu-categories-anchor");
    if (categoriesSection) {
      categoriesSection.scrollIntoView({ behavior: "smooth", block: "start" });
    } else {
      window.scrollBy({ top: 320, behavior: "smooth" });
    }
  };

  if (totalSlides === 0) {
    return null;
  }

  return (
    <section
      aria-label="Destaques e Promoções"
      className="group relative w-full overflow-hidden rounded-3xl shadow-sm transition-all duration-300"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={() => setIsPaused(true)}
      onTouchEnd={() => setIsPaused(false)}
    >
      {/* Container de scroll com CSS snap */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="no-scrollbar flex w-full overflow-x-auto scroll-smooth snap-x snap-mandatory"
        style={{ scrollSnapType: "x mandatory", WebkitOverflowScrolling: "touch" }}
      >
        {slides.map((slide) => (
          <div
            key={slide.id}
            className={`relative min-w-full flex-none snap-center overflow-hidden bg-gradient-to-r ${slide.gradientClass} p-5 text-white sm:p-6 lg:p-7 transition-all`}
          >
            {/* Imagem de fundo opcional caso configurada */}
            {slide.imageUrl && (
              <div className="absolute inset-0 z-0 opacity-25 mix-blend-overlay">
                <Image
                  src={slide.imageUrl}
                  alt={slide.title}
                  fill
                  className="object-cover"
                />
              </div>
            )}

            {/* Efeitos decorativos sutis em background (glass glow) */}
            <div
              className="pointer-events-none absolute -right-12 -top-12 h-56 w-56 rounded-full bg-white/10 blur-2xl"
              aria-hidden="true"
            />
            <div
              className="pointer-events-none absolute -bottom-10 right-20 h-40 w-40 rounded-full bg-black/10 blur-xl"
              aria-hidden="true"
            />

            <div className="relative z-10 flex items-center justify-between gap-4">
              {/* Conteúdo textual e ação */}
              <div className="flex-1 space-y-2 sm:space-y-3">
                {/* Badge de categoria/benefício */}
                <div className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/15 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-white backdrop-blur-md shadow-xs">
                  {slide.badgeIcon}
                  <span>{slide.badge}</span>
                </div>

                {/* Título */}
                <h3 className="font-display text-lg font-bold tracking-tight text-white sm:text-2xl lg:text-3xl drop-shadow-xs line-clamp-1 sm:line-clamp-2">
                  {slide.title}
                </h3>

                {/* Subtítulo */}
                <p className="text-xs text-white/90 sm:text-sm line-clamp-2 max-w-xl leading-relaxed drop-shadow-2xs">
                  {slide.subtitle}
                </p>

                {/* Botão de chamada para ação */}
                <div className="pt-1 sm:pt-2">
                  <button
                    type="button"
                    onClick={() => handleSlideAction(slide)}
                    className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs sm:text-sm font-bold text-slate-900 shadow-md transition-all hover:bg-white/95 hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-white/80"
                  >
                    <span>{slide.buttonText}</span>
                    {slide.linkUrl && slide.linkUrl.startsWith("http") ? (
                      <ExternalLinkIcon size={14} className="text-slate-600" />
                    ) : (
                      <ArrowRightIcon size={14} className="text-slate-600" />
                    )}
                  </button>
                </div>
              </div>

              {/* Ícone decorativo ou ilustração (desktop/tablet) */}
              <div
                className={`hidden sm:flex h-20 w-20 lg:h-24 lg:w-24 shrink-0 items-center justify-center rounded-2xl border border-white/25 shadow-inner backdrop-blur-md transition-transform duration-300 group-hover:scale-110 ${slide.iconBgClass}`}
                aria-hidden="true"
              >
                {slide.cardIcon}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Setas de navegação (visíveis no hover ou telas maiores) */}
      {totalSlides > 1 && (
        <>
          <button
            type="button"
            onClick={handlePrev}
            aria-label="Banner anterior"
            className="absolute left-3 top-1/2 -translate-y-1/2 z-20 flex h-8 w-8 items-center justify-center rounded-full bg-black/30 text-white backdrop-blur-md border border-white/20 opacity-0 group-hover:opacity-100 transition-all hover:bg-black/50 active:scale-90"
          >
            <ChevronLeftIcon size={18} />
          </button>
          <button
            type="button"
            onClick={handleNext}
            aria-label="Próximo banner"
            className="absolute right-3 top-1/2 -translate-y-1/2 z-20 flex h-8 w-8 items-center justify-center rounded-full bg-black/30 text-white backdrop-blur-md border border-white/20 opacity-0 group-hover:opacity-100 transition-all hover:bg-black/50 active:scale-90"
          >
            <ChevronRightIcon size={18} />
          </button>

          {/* Indicadores de bolinha / pílula na base do carrossel */}
          <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5">
            {slides.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => scrollToSlide(i)}
                aria-label={`Ir para banner ${i + 1}`}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === currentIndex
                    ? "w-6 bg-white shadow-xs"
                    : "w-2 bg-white/40 hover:bg-white/70"
                }`}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
