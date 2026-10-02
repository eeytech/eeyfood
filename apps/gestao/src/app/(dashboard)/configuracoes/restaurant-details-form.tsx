"use client";

import { Loader2Icon, MapPinIcon, SaveIcon, SearchIcon, StoreIcon, UploadIcon } from "lucide-react";
import Image from "next/image";
import { useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";

import { updateRestaurantDetailsAction } from "@/app/(dashboard)/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { buildFullAddress, formatCep, parseAddress, type ParsedAddress } from "@/lib/address-utils";

interface RestaurantDetailsFormProps {
  slug: string;
  initialValues: {
    name: string;
    description: string;
    cnpj: string | null;
    phone: string | null;
    address: string | null;
    avatarImageUrl: string;
    coverImageUrl: string;
  };
}

const formatPhone = (v: string) => {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 6) return d.replace(/^(\d{2})(\d+)/, "($1) $2");
  if (d.length <= 10) return d.replace(/^(\d{2})(\d{4})(\d+)/, "($1) $2-$3");
  return d.replace(/^(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
};

const formatCnpj = (v: string) => {
  const d = v.replace(/\D/g, "").slice(0, 14);
  if (d.length <= 2) return d;
  if (d.length <= 5) return d.replace(/^(\d{2})(\d+)/, "$1.$2");
  if (d.length <= 8) return d.replace(/^(\d{2})(\d{3})(\d+)/, "$1.$2.$3");
  if (d.length <= 12) return d.replace(/^(\d{2})(\d{3})(\d{3})(\d+)/, "$1.$2.$3/$4");
  return d.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{1,2})/, "$1.$2.$3/$4-$5");
};

export const RestaurantDetailsForm = ({
  slug,
  initialValues,
}: RestaurantDetailsFormProps) => {
  const [isPending, startTransition] = useTransition();
  const [avatarPreview, setAvatarPreview] = useState<string>(initialValues.avatarImageUrl);
  const [coverPreview, setCoverPreview] = useState<string>(initialValues.coverImageUrl);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  // Campos com máscara
  const [phone, setPhone] = useState(formatPhone(initialValues.phone ?? ""));
  const [cnpj, setCnpj] = useState(formatCnpj(initialValues.cnpj ?? ""));

  // Campos de endereço desmembrado
  const initialAddress = parseAddress(initialValues.address);
  const [cep, setCep] = useState(initialAddress.cep);
  const [logradouro, setLogradouro] = useState(initialAddress.logradouro);
  const [numero, setNumero] = useState(initialAddress.numero);
  const [complemento, setComplemento] = useState(initialAddress.complemento);
  const [bairro, setBairro] = useState(initialAddress.bairro);
  const [cidade, setCidade] = useState(initialAddress.cidade);
  const [estado, setEstado] = useState(initialAddress.estado);
  const [isSearchingCep, setIsSearchingCep] = useState(false);

  useEffect(() => {
    const parsed = parseAddress(initialValues.address);
    setCep(parsed.cep);
    setLogradouro(parsed.logradouro);
    setNumero(parsed.numero);
    setComplemento(parsed.complemento);
    setBairro(parsed.bairro);
    setCidade(parsed.cidade);
    setEstado(parsed.estado);
  }, [initialValues.address]);

  useEffect(() => {
    setPhone(formatPhone(initialValues.phone ?? ""));
  }, [initialValues.phone]);

  useEffect(() => {
    setCnpj(formatCnpj(initialValues.cnpj ?? ""));
  }, [initialValues.cnpj]);

  useEffect(() => {
    setAvatarPreview(initialValues.avatarImageUrl);
  }, [initialValues.avatarImageUrl]);

  useEffect(() => {
    setCoverPreview(initialValues.coverImageUrl);
  }, [initialValues.coverImageUrl]);

  const fetchViaCep = async (cepValue: string) => {
    const digits = cepValue.replace(/\D/g, "");
    if (digits.length !== 8) return;

    setIsSearchingCep(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
      const data = await res.json();
      if (!data.erro) {
        if (data.logradouro) setLogradouro(data.logradouro);
        if (data.bairro) setBairro(data.bairro);
        if (data.localidade) setCidade(data.localidade);
        if (data.uf) setEstado(data.uf);
        toast.success("Endereço localizado via CEP!");
      } else {
        toast.error("CEP não localizado.");
      }
    } catch {
      // Falha silenciosa de rede
    } finally {
      setIsSearchingCep(false);
    }
  };

  const handleCepChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCep(e.target.value);
    setCep(formatted);
    const digits = formatted.replace(/\D/g, "");
    if (digits.length === 8) {
      fetchViaCep(digits);
    }
  };

  const handleCepBlur = () => {
    const digits = cep.replace(/\D/g, "");
    if (digits.length === 8) {
      fetchViaCep(digits);
    }
  };

  const handleImageChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    setPreview: (url: string) => void,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    const compiledAddress = buildFullAddress({
      cep,
      logradouro,
      numero,
      complemento,
      bairro,
      cidade,
      estado,
    });

    formData.set("address", compiledAddress);
    formData.set("phone", phone);
    formData.set("cnpj", cnpj);
    formData.set("cep", cep);
    formData.set("logradouro", logradouro);
    formData.set("numero", numero);
    formData.set("complemento", complemento);
    formData.set("bairro", bairro);
    formData.set("cidade", cidade);
    formData.set("estado", estado);

    startTransition(async () => {
      try {
        await updateRestaurantDetailsAction(slug, formData);
        toast.success("Dados do estabelecimento atualizados!");
      } catch (err) {
        const message = err instanceof Error ? err.message : "Erro ao salvar os dados.";
        toast.error(message);
      }
    });
  };

  return (
    <Card className="border-slate-200/80 bg-white shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-display text-lg text-slate-900">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
            <StoreIcon size={18} />
          </div>
          Dados do Estabelecimento
        </CardTitle>
        <CardDescription className="text-sm text-slate-500">
          Informações públicas e de identificação visíveis para clientes e comprovantes de venda.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} encType="multipart/form-data" className="space-y-6">
          {/* ── Dados Básicos e Contato ─────────────────────── */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="name" className="text-xs font-semibold text-slate-700">
                Nome do Estabelecimento
              </Label>
              <Input
                id="name"
                name="name"
                defaultValue={initialValues.name}
                placeholder="Ex: Burger House"
                className="h-10 rounded-xl border-slate-200 bg-white text-sm text-slate-900 focus:border-slate-400"
                disabled={isPending}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="phone" className="text-xs font-semibold text-slate-700">
                Telefone / WhatsApp
              </Label>
              <Input
                id="phone"
                name="phone"
                value={phone}
                onChange={(e) => setPhone(formatPhone(e.target.value))}
                placeholder="(11) 99999-9999"
                className="h-10 rounded-xl border-slate-200 bg-white text-sm text-slate-900 focus:border-slate-400"
                disabled={isPending}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="cnpj" className="text-xs font-semibold text-slate-700">
                CNPJ
              </Label>
              <Input
                id="cnpj"
                name="cnpj"
                value={cnpj}
                onChange={(e) => setCnpj(formatCnpj(e.target.value))}
                placeholder="00.000.000/0001-00"
                className="h-10 rounded-xl border-slate-200 bg-white text-sm text-slate-900 focus:border-slate-400"
                disabled={isPending}
              />
            </div>
          </div>

          {/* ── Endereço Desmembrado ───────────────────────── */}
          <div className="rounded-2xl border border-slate-200/80 bg-slate-50/50 p-4 space-y-4">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200/60 pb-3">
              <div className="flex items-center gap-2">
                <MapPinIcon size={16} className="text-slate-600 shrink-0" />
                <h3 className="text-sm font-semibold text-slate-800">Endereço do Estabelecimento</h3>
              </div>
              <span className="text-[11px] text-slate-500">
                Digite o CEP para buscar o endereço automaticamente
              </span>
            </div>

            <div className="grid gap-3 sm:grid-cols-6">
              {/* CEP */}
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="cep" className="text-xs font-semibold text-slate-700">
                  CEP
                </Label>
                <div className="relative">
                  <Input
                    id="cep"
                    name="cep"
                    value={cep}
                    onChange={handleCepChange}
                    onBlur={handleCepBlur}
                    placeholder="00000-000"
                    maxLength={9}
                    className="h-10 rounded-xl border-slate-200 bg-white pr-9 text-sm text-slate-900 focus:border-slate-400"
                    disabled={isPending}
                  />
                  <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                    {isSearchingCep ? (
                      <Loader2Icon size={15} className="animate-spin text-blue-600" />
                    ) : (
                      <SearchIcon size={15} />
                    )}
                  </div>
                </div>
              </div>

              {/* Logradouro */}
              <div className="space-y-1.5 sm:col-span-4">
                <Label htmlFor="logradouro" className="text-xs font-semibold text-slate-700">
                  Logradouro / Rua
                </Label>
                <Input
                  id="logradouro"
                  name="logradouro"
                  value={logradouro}
                  onChange={(e) => setLogradouro(e.target.value)}
                  placeholder="Ex: Av. Paulista, Rua das Flores"
                  className="h-10 rounded-xl border-slate-200 bg-white text-sm text-slate-900 focus:border-slate-400"
                  disabled={isPending}
                />
              </div>

              {/* Número */}
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="numero" className="text-xs font-semibold text-slate-700">
                  Número
                </Label>
                <Input
                  id="numero"
                  name="numero"
                  value={numero}
                  onChange={(e) => setNumero(e.target.value)}
                  placeholder="Ex: 123 ou S/N"
                  className="h-10 rounded-xl border-slate-200 bg-white text-sm text-slate-900 focus:border-slate-400"
                  disabled={isPending}
                />
              </div>

              {/* Complemento */}
              <div className="space-y-1.5 sm:col-span-4">
                <Label htmlFor="complemento" className="text-xs font-semibold text-slate-700">
                  Complemento
                </Label>
                <Input
                  id="complemento"
                  name="complemento"
                  value={complemento}
                  onChange={(e) => setComplemento(e.target.value)}
                  placeholder="Ex: Sala 12, Bloco B, Apto 102 (opcional)"
                  className="h-10 rounded-xl border-slate-200 bg-white text-sm text-slate-900 focus:border-slate-400"
                  disabled={isPending}
                />
              </div>

              {/* Bairro */}
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="bairro" className="text-xs font-semibold text-slate-700">
                  Bairro
                </Label>
                <Input
                  id="bairro"
                  name="bairro"
                  value={bairro}
                  onChange={(e) => setBairro(e.target.value)}
                  placeholder="Ex: Centro"
                  className="h-10 rounded-xl border-slate-200 bg-white text-sm text-slate-900 focus:border-slate-400"
                  disabled={isPending}
                />
              </div>

              {/* Cidade */}
              <div className="space-y-1.5 sm:col-span-3">
                <Label htmlFor="cidade" className="text-xs font-semibold text-slate-700">
                  Cidade
                </Label>
                <Input
                  id="cidade"
                  name="cidade"
                  value={cidade}
                  onChange={(e) => setCidade(e.target.value)}
                  placeholder="Ex: São Paulo"
                  className="h-10 rounded-xl border-slate-200 bg-white text-sm text-slate-900 focus:border-slate-400"
                  disabled={isPending}
                />
              </div>

              {/* Estado / UF */}
              <div className="space-y-1.5 sm:col-span-1">
                <Label htmlFor="estado" className="text-xs font-semibold text-slate-700">
                  UF
                </Label>
                <Input
                  id="estado"
                  name="estado"
                  value={estado}
                  onChange={(e) => setEstado(e.target.value.toUpperCase().slice(0, 2))}
                  placeholder="SP"
                  maxLength={2}
                  className="h-10 rounded-xl border-slate-200 bg-white text-center font-semibold text-sm uppercase text-slate-900 focus:border-slate-400"
                  disabled={isPending}
                />
              </div>
            </div>
          </div>

          {/* ── Descrição / Slogan ──────────────────────────── */}
          <div className="space-y-1.5">
            <Label htmlFor="description" className="text-xs font-semibold text-slate-700">
              Descrição / Slogan
            </Label>
            <Textarea
              id="description"
              name="description"
              defaultValue={initialValues.description}
              placeholder="Uma breve apresentação exibida para seus clientes no topo do cardápio."
              rows={3}
              className="rounded-xl border-slate-200 bg-white text-sm text-slate-900 focus:border-slate-400 resize-none"
              disabled={isPending}
              required
            />
          </div>

          {/* ── Imagens e Mídia ────────────────────────────── */}
          <div className="grid gap-5 sm:grid-cols-2 pt-1">
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-slate-700">
                Logo do Restaurante
              </Label>
              <div
                className="relative flex aspect-square w-32 cursor-pointer flex-col items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 transition hover:border-slate-300 hover:bg-slate-100"
                onClick={() => avatarInputRef.current?.click()}
              >
                {avatarPreview ? (
                  <Image
                    src={avatarPreview}
                    alt="Preview do logo"
                    fill
                    className="object-cover"
                    unoptimized
                  />
                ) : (
                  <UploadIcon size={20} className="text-slate-400" />
                )}
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition hover:opacity-100">
                  <UploadIcon size={20} className="text-white" />
                </div>
              </div>
              <p className="text-[11px] text-slate-500">Formatos JPG, PNG ou WEBP. Máx. 2 MB.</p>
              <input
                ref={avatarInputRef}
                id="avatarFile"
                name="avatarFile"
                type="file"
                accept="image/*"
                className="hidden"
                disabled={isPending}
                onChange={(e) => handleImageChange(e, setAvatarPreview)}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold text-slate-700">
                Banner de Capa
              </Label>
              <div
                className="relative flex h-32 w-full cursor-pointer flex-col items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 transition hover:border-slate-300 hover:bg-slate-100"
                onClick={() => coverInputRef.current?.click()}
              >
                {coverPreview ? (
                  <Image
                    src={coverPreview}
                    alt="Preview da capa"
                    fill
                    className="object-cover"
                    unoptimized
                  />
                ) : (
                  <UploadIcon size={20} className="text-slate-400" />
                )}
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition hover:opacity-100">
                  <UploadIcon size={20} className="text-white" />
                </div>
              </div>
              <p className="text-[11px] text-slate-500">Imagem panorâmica para topo do cardápio digital.</p>
              <input
                ref={coverInputRef}
                id="coverFile"
                name="coverFile"
                type="file"
                accept="image/*"
                className="hidden"
                disabled={isPending}
                onChange={(e) => handleImageChange(e, setCoverPreview)}
              />
            </div>
          </div>

          <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-slate-500">
              As alterações são sincronizadas imediatamente com o cardápio digital.
            </p>
            <Button
              type="submit"
              className="h-10 gap-2 rounded-xl bg-slate-900 px-5 text-xs font-semibold text-white shadow-xs hover:bg-slate-800 disabled:opacity-50 transition w-full sm:w-auto"
              disabled={isPending}
            >
              {isPending ? (
                <>
                  <Loader2Icon size={15} className="animate-spin" />
                  <span>Salvando alterações...</span>
                </>
              ) : (
                <>
                  <SaveIcon size={15} />
                  <span>Salvar Dados do Estabelecimento</span>
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};
