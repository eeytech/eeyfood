import { z } from "zod";

import { isValidPhoneNumber } from "../helpers/phone";

export const formSchema = z
  .object({
    name: z.string().trim().min(1, {
      message: "O nome é obrigatório.",
    }),
    phone: z
      .string()
      .trim()
      .min(1, {
        message: "O celular é obrigatório.",
      })
      .refine((value) => isValidPhoneNumber(value), {
        message: "Celular inválido.",
      }),
    couponCode: z
      .string()
      .trim()
      .max(40, {
        message: "O cupom deve ter no máximo 40 caracteres.",
      })
      .optional(),
    fulfillmentTiming: z.enum(["ASAP", "SCHEDULED"]),
    scheduledFor: z.string().trim().optional(),
    paymentMethod: z.enum([
      "MERCADO_PAGO",
      "DINHEIRO",
      "CARTAO_PRESENCIAL",
    ]),
    changeFor: z.string().trim().optional(),
  })
  .superRefine((values, context) => {
    if (values.paymentMethod === "DINHEIRO" && values.changeFor) {
      const parsedValue = Number(values.changeFor.replace(",", "."));

      if (Number.isNaN(parsedValue) || parsedValue <= 0) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["changeFor"],
          message: "Informe um valor de troco válido.",
        });
      }
    }

    if (values.fulfillmentTiming !== "SCHEDULED") {
      return;
    }

    if (!values.scheduledFor) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["scheduledFor"],
        message: "Selecione a data e hora do agendamento.",
      });
      return;
    }

    const scheduledFor = new Date(values.scheduledFor);

    if (Number.isNaN(scheduledFor.getTime())) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["scheduledFor"],
        message: "Data e hora de agendamento inválidas.",
      });
      return;
    }

    if (scheduledFor.getTime() < Date.now() + 15 * 60 * 1000) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["scheduledFor"],
        message: "Agende com pelo menos 15 minutos de antecedência.",
      });
    }
  });

export type FormSchema = z.infer<typeof formSchema>;
