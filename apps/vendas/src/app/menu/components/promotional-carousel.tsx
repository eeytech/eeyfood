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
  textColor?: string;
  align?: "left" | "center";
  categoryId?: string;
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
        } else if (custom.gradient === "dark") {
          grad = "from-slate-950 via-slate-900 to-zinc-900";
          iconBg = "bg-white/15 text-white";
        }

        list.push({
          id: custom.id,
          badge: custom.tag || "DESTAQUE ESPECIAL",
          badgeIcon: <SparklesIcon size={13} className="text-amber-300 shrink-0" />,
          title: custom.title,
          subtitle: custom.subtitle || "Aproveite esta oferta exclusiva hoje no cardápio!",
          buttonText: custom.buttonText || "Aproveitar",
          gradientClass: grad,
          iconBgClass: iconBg,
          cardIcon: <SparklesIcon size={32} />,
          imageUrl: custom.imageUrl,
          linkUrl: custom.linkUrl,
          textColor: custom.textColor || "white",
          align: (custom.align as "left" | "center") || "left",
          categoryId: custom.categoryId,
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
        badgeIcon: <CoinsIcon size={13} className="text-amber-200 shrink-0" />,
        title: `Ganhe ${restaurant.cashbackPercent}% de volta no seu bolso`,
        subtitle: `Faça seu pedido agora e acumule saldo na carteira para economizar nas próximas compras!`,
        buttonText: "Aproveitar Cashback",
        gradientClass: "from-amber-600 via-orange-500 to-amber-500",
        iconBgClass: "bg-amber-400/20 text-amber-100",
        cardIcon: <CoinsIcon size={34} className="text-amber-200" />,
        textColor: "white",
        align: "left",
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
        badgeIcon: <TruckIcon size={13} className="text-emerald-200 shrink-0" />,
        title: `Entrega Grátis acima de ${formatCurrency(freeDeliveryThreshold)}`,
        subtitle: `Monte seu pedido com seus pratos e bebidas favoritos e ganhe entrega gratuita!`,
        buttonText: "Ver Cardápio",
        gradientClass: "from-emerald-700 via-teal-600 to-emerald-600",
        iconBgClass: "bg-emerald-400/20 text-emerald-100",
        cardIcon: <TruckIcon size={34} className="text-emerald-200" />,
        textColor: "white",
        align: "left",
      });
    }

    // 4. Benefício: Cupons de Desconto
    if (restaurant.isCouponsEnabled) {
      list.push({
        id: "benefit-cupons",
        badge: "CUPONS DE DESCONTO",
        badgeIcon: <TagIcon size={13} className="text-violet-200 shrink-0" />,
        title: "Cupons Promocionais disponíveis",
        subtitle: "Aproveite cupons de desconto válidos e insira o código direto no checkout do app.",
        buttonText: "Escolher Itens",
        gradientClass: "from-violet-700 via-purple-600 to-indigo-600",
        iconBgClass: "bg-violet-400/20 text-violet-100",
        cardIcon: <TagIcon size={34} className="text-violet-200" />,
        textColor: "white",
        align: "left",
      });
    }

    // 5. Benefício: Combos & Ofertas (se existir categoria de combos / promoções no cardápio)
    const comboCategory = restaurant.menuCategories?.find((c) => {
      const name = c.name.toLowerCase();
      return (
        name.includes("combo") ||
        name.includes("promo") ||
        name.includes("oferta") ||
        name.includes("especial")
      );
    });

    if (comboCategory) {
      list.push({
        id: "benefit-combos",
        badge: "COMBOS EM OFERTA",
        badgeIcon: <FlameIcon size={13} className="text-amber-200 shrink-0" />,
        title: `Combos & Ofertas Especiais`,
        subtitle: `Economize pedindo nossos combos completos com acompanhamentos e bebidas inclusas!`,
        buttonText: `Ver ${comboCategory.name}`,
        gradientClass: "from-rose-600 via-orange-600 to-amber-600",
        iconBgClass: "bg-amber-400/20 text-amber-100",
        cardIcon: <FlameIcon size={34} className="text-amber-200" />,
        linkUrl: `#category-${comboCategory.id}`,
        imageUrl: comboCategory.imageUrl || comboCategory.products?.find((p) => p.imageUrl)?.imageUrl || undefined,
        categoryId: comboCategory.id,
        textColor: "white",
        align: "left",
      });
    }

    return list;
  }, [
    consumptionMethod,
    restaurant.showPromotionalBanners,
    restaurant.promotionalBanners,
    restaurant.isCashbackEnabled,
    restaurant.cashbackPercent,
    restaurant.freeDeliveryThreshold,
    restaurant.isCouponsEnabled,
    restaurant.menuCategories,
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
    if (totalSlides <= 1) return;
    const next = (currentIndex + 1) % totalSlides;
    scrollToSlide(next);
  }, [currentIndex, totalSlides, scrollToSlide]);

  const handlePrev = useCallback(() => {
    if (totalSlides <= 1) return;
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
    // 1. Link externo (http/https)
    if (slide.linkUrl) {
      if (slide.linkUrl.startsWith("http://") || slide.linkUrl.startsWith("https://")) {
        window.open(slide.linkUrl, "_blank", "noopener,noreferrer");
        return;
      }

      // 2. Âncora direta para elemento (#category-xxx ou category-xxx)
      const targetId = slide.linkUrl.startsWith("#")
        ? slide.linkUrl.slice(1)
        : slide.linkUrl;

      const el =
        document.getElementById(targetId) ||
        document.getElementById(`category-${targetId}`) ||
        (targetId ? document.querySelector(slide.linkUrl) : null);

      if (el) {
        const stickyNavHeight = 90;
        const rect = el.getBoundingClientRect();
        const targetTop = rect.top + window.pageYOffset - stickyNavHeight;
        window.scrollTo({ top: Math.max(0, targetTop), behavior: "smooth" });

        const categoryId = targetId.startsWith("category-")
          ? targetId.replace("category-", "")
          : targetId;
        const mobileBtn = document.getElementById(`mobile-category-btn-${categoryId}`);
        if (mobileBtn) {
          mobileBtn.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
        }
        return;
      }
    }

    // 3. Vínculo direto de categoria
    if (slide.categoryId) {
      const el = document.getElementById(`category-${slide.categoryId}`);
      if (el) {
        const stickyNavHeight = 90;
        const rect = el.getBoundingClientRect();
        const targetTop = rect.top + window.pageYOffset - stickyNavHeight;
        window.scrollTo({ top: Math.max(0, targetTop), behavior: "smooth" });

        const mobileBtn = document.getElementById(`mobile-category-btn-${slide.categoryId}`);
        if (mobileBtn) {
          mobileBtn.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
        }
        return;
      }
    }

    // 4. Ação padrão: rolar suavemente até o início das categorias do cardápio
    const categoriesSection =
      document.getElementById("menu-categories-anchor") ||
      document.getElementById("menu-categories");
    if (categoriesSection) {
      const rect = categoriesSection.getBoundingClientRect();
      const targetTop = rect.top + window.pageYOffset - 80;
      window.scrollTo({ top: Math.max(0, targetTop), behavior: "smooth" });
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
        {slides.map((slide) => {
          const isCentered = slide.align === "center";
          const isDarkText = slide.textColor === "dark";
          const isAmberText = slide.textColor === "amber";

          return (
            <div
              key={slide.id}
              className={`relative min-w-full flex-none snap-center overflow-hidden bg-gradient-to-r ${slide.gradientClass} p-4 sm:p-6 lg:p-7 pb-8 sm:pb-6 transition-all min-h-[160px] sm:min-h-[185px] flex flex-col justify-center`}
            >
              {/* Imagem de fundo opcional caso configurada */}
              {slide.imageUrl && (
                <>
                  <div className="absolute inset-0 z-0">
                    <Image
                      src={slide.imageUrl}
                      alt={slide.title}
                      fill
                      className="object-cover object-center"
                      sizes="(max-width: 768px) 100vw, 1200px"
                    />
                  </div>
                  {/* Overlay gradiente com alto contraste para garantir 100% de legibilidade no mobile */}
                  <div
                    className={
                      isCentered
                        ? "absolute inset-0 z-0 bg-black/65 backdrop-blur-[1px]"
                        : "absolute inset-0 z-0 bg-gradient-to-r from-black/90 via-black/75 to-black/35 sm:to-black/20"
                    }
                  />
                </>
              )}

              {/* Efeitos decorativos sutis em background (glass glow) */}
              <div
                className="pointer-events-none absolute -right-12 -top-12 h-56 w-56 rounded-full bg-white/10 blur-2xl"
                aria-hidden="true"
              />
              <div
                className="pointer-events-none absolute -bottom-10 right-20 h-40 w-40 rounded-full bg-black/15 blur-xl"
                aria-hidden="true"
              />

              <div
                className={`relative z-10 flex ${
                  isCentered
                    ? "flex-col items-center text-center justify-center"
                    : "items-center justify-between gap-3 sm:gap-4"
                } w-full`}
              >
                {/* Conteúdo textual e ação com alta responsividade */}
                <div
                  className={`flex-1 space-y-1.5 sm:space-y-2.5 max-w-full ${
                    isCentered
                      ? "flex flex-col items-center text-center"
                      : "text-left"
                  }`}
                >
                  {/* Badge de categoria/benefício */}
                  <div
                    className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 sm:px-3 sm:py-1 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider backdrop-blur-md shadow-xs ${
                      isDarkText
                        ? "border-slate-900/20 bg-slate-900/10 text-slate-900"
                        : isAmberText
                        ? "border-amber-400/30 bg-amber-400/20 text-amber-200"
                        : "border-white/25 bg-white/20 text-white"
                    }`}
                  >
                    {slide.badgeIcon}
                    <span className="truncate max-w-[220px] sm:max-w-none">{slide.badge}</span>
                  </div>

                  {/* Título responsivo sem corte agressivo */}
                  <h3
                    className={`font-display text-base sm:text-xl md:text-2xl lg:text-3xl font-extrabold tracking-tight leading-tight sm:leading-snug break-words ${
                      isDarkText
                        ? "text-slate-950"
                        : isAmberText
                        ? "text-amber-100"
                        : "text-white drop-shadow-xs"
                    }`}
                  >
                    {slide.title}
                  </h3>

                  {/* Subtítulo nítido */}
                  {slide.subtitle && (
                    <p
                      className={`text-xs sm:text-sm leading-relaxed max-w-xl break-words line-clamp-3 sm:line-clamp-none ${
                        isDarkText
                          ? "text-slate-800"
                          : isAmberText
                          ? "text-amber-200/90"
                          : "text-white/95 drop-shadow-2xs"
                      }`}
                    >
                      {slide.subtitle}
                    </p>
                  )}

                  {/* Botão de chamada para ação */}
                  <div className={`pt-1 sm:pt-1.5 ${isCentered ? "w-auto" : ""}`}>
                    <button
                      type="button"
                      onClick={() => handleSlideAction(slide)}
                      className={`inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-bold shadow-md transition-all active:scale-95 focus:outline-none focus:ring-2 ${
                        isDarkText
                          ? "bg-slate-950 text-white hover:bg-slate-800 focus:ring-slate-900"
                          : "bg-white text-slate-900 hover:bg-white/95 focus:ring-white/80"
                      }`}
                    >
                      <span>{slide.buttonText}</span>
                      {slide.linkUrl && slide.linkUrl.startsWith("http") ? (
                        <ExternalLinkIcon size={14} className={isDarkText ? "text-slate-300" : "text-slate-700"} />
                      ) : (
                        <ArrowRightIcon size={14} className={isDarkText ? "text-slate-300" : "text-slate-700"} />
                      )}
                    </button>
                  </div>
                </div>

                {/* Elemento visual decorativo ou thumbnail de produto (se não centralizado) */}
                {!isCentered && (
                  <div className="shrink-0 flex items-center justify-center">
                    {slide.imageUrl ? (
                      <div className="relative h-16 w-16 sm:h-20 sm:w-20 lg:h-24 lg:w-24 rounded-2xl overflow-hidden border-2 border-white/30 shadow-lg shrink-0 bg-black/20">
                        <Image
                          src={slide.imageUrl}
                          alt={slide.title}
                          fill
                          className="object-cover"
                        />
                      </div>
                    ) : (
                      <div
                        className={`hidden sm:flex h-16 w-16 sm:h-20 sm:w-20 lg:h-24 lg:w-24 shrink-0 items-center justify-center rounded-2xl border border-white/25 shadow-inner backdrop-blur-md transition-transform duration-300 group-hover:scale-105 ${slide.iconBgClass}`}
                        aria-hidden="true"
                      >
                        {slide.cardIcon}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Setas de navegação (visíveis no hover ou telas maiores) */}
      {totalSlides > 1 && (
        <>
          <button
            type="button"
            onClick={handlePrev}
            aria-label="Banner anterior"
            className="absolute left-3 top-1/2 -translate-y-1/2 z-20 flex h-8 w-8 items-center justify-center rounded-full bg-black/35 text-white backdrop-blur-md border border-white/20 opacity-0 group-hover:opacity-100 transition-all hover:bg-black/55 active:scale-90"
          >
            <ChevronLeftIcon size={18} />
          </button>
          <button
            type="button"
            onClick={handleNext}
            aria-label="Próximo banner"
            className="absolute right-3 top-1/2 -translate-y-1/2 z-20 flex h-8 w-8 items-center justify-center rounded-full bg-black/35 text-white backdrop-blur-md border border-white/20 opacity-0 group-hover:opacity-100 transition-all hover:bg-black/55 active:scale-90"
          >
            <ChevronRightIcon size={18} />
          </button>

          {/* Indicadores de bolinha na base do carrossel */}
          <div className="absolute bottom-2 sm:bottom-2.5 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5">
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
