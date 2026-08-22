"use client";

import type { MarketingSettings } from "@fsw/db";
import { Loader2Icon, SaveIcon } from "lucide-react";
import { useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";

interface MarketingSettingsFormProps {
  settings: MarketingSettings | null;
  saveAction: (formData: FormData) => Promise<void>;
}

export function MarketingSettingsForm({ settings, saveAction }: MarketingSettingsFormProps) {
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      try {
        await saveAction(fd);
        toast.success("Configurações salvas.");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erro ao salvar.");
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-1">
        <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Meta / Facebook</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="metaPixelId">ID do Meta Pixel</Label>
        <Input
          id="metaPixelId"
          name="metaPixelId"
          placeholder="Ex: 1234567890123456"
          defaultValue={settings?.metaPixelId ?? ""}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="metaCapiToken">Token de API de Conversões (CAPI)</Label>
        <Input
          id="metaCapiToken"
          name="metaCapiToken"
          type="password"
          placeholder="EAAxxxx..."
          defaultValue={settings?.metaCapiToken ?? ""}
        />
      </div>

      <Separator />

      <div className="space-y-1">
        <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Google</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="ga4MeasurementId">ID do Google Analytics 4 (GA4)</Label>
        <Input
          id="ga4MeasurementId"
          name="ga4MeasurementId"
          placeholder="Ex: G-XXXXXXXXXX"
          defaultValue={settings?.ga4MeasurementId ?? ""}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="gtmContainerId">ID do Google Tag Manager (GTM)</Label>
        <Input
          id="gtmContainerId"
          name="gtmContainerId"
          placeholder="Ex: GTM-XXXXXXX"
          defaultValue={settings?.gtmContainerId ?? ""}
        />
      </div>

      <Separator />

      <div className="space-y-1">
        <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Carrinho Abandonado</p>
      </div>

      <div className="flex items-center justify-between">
        <Label htmlFor="abandonedCartEnabled">Ativar recuperação automática</Label>
        <Switch
          id="abandonedCartEnabled"
          name="abandonedCartEnabled"
          defaultChecked={settings?.abandonedCartEnabled ?? true}
          value="true"
        />
        <input type="hidden" name="abandonedCartEnabled" value="false" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="abandonedCartDelayMinutes">Aguardar (minutos)</Label>
          <Input
            id="abandonedCartDelayMinutes"
            name="abandonedCartDelayMinutes"
            type="number"
            min={30}
            max={1440}
            defaultValue={settings?.abandonedCartDelayMinutes ?? 120}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="abandonedCartCouponPercent">Desconto do cupom (%)</Label>
          <Input
            id="abandonedCartCouponPercent"
            name="abandonedCartCouponPercent"
            type="number"
            min={0}
            max={50}
            step={0.5}
            defaultValue={settings?.abandonedCartCouponPercent ?? 5}
          />
        </div>
      </div>

      <Button type="submit" disabled={isPending} className="w-full">
        {isPending ? (
          <>
            <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
            Salvando...
          </>
        ) : (
          <>
            <SaveIcon className="mr-2 h-4 w-4" />
            Salvar configurações
          </>
        )}
      </Button>
    </form>
  );
}
