"use server";

import { revalidatePath } from "next/cache";
import {
  and,
  asc,
  buscarRestaurantePorSlug,
  db,
  desc,
  employeesTable,
  employeePaymentsTable,
  eq,
  financialCategoriesTable,
  financialTransactionsTable,
  sql,
} from "@fsw/db";
import type { Employee, EmployeePayment } from "@fsw/db";

export interface FuncionarioMetricas {
  funcionario: Employee;
  totalPagoMesAtual: number;
  totalPagoHistorico: number;
  ultimoPagamento?: {
    amount: number;
    paidAt: Date;
    type: string;
  } | null;
}

export interface FuncionarioPagamentoItem {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeRole: string;
  employeePix?: string | null;
  amount: number;
  type: string;
  referenceMonth: string;
  paidAt: Date;
  paymentMethod: string;
  status: string;
  notes?: string | null;
  financialTransactionId?: string | null;
}

/**
 * Garante com segurança a criação das tabelas de Funcionários e Pagamentos
 * caso ainda não tenham sido criadas via migração automática.
 */
async function ensureEmployeesTablesExist() {
  try {
    await db.execute(sql`
      DO $$ BEGIN
        CREATE TYPE "EmployeeStatus" AS ENUM ('ACTIVE', 'INACTIVE');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;

      CREATE TABLE IF NOT EXISTS "Employee" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "restaurantId" uuid NOT NULL REFERENCES "Restaurant"("id") ON DELETE CASCADE,
        "name" text NOT NULL,
        "roleTitle" text NOT NULL,
        "cpf" text,
        "phone" text,
        "email" text,
        "contractType" text NOT NULL DEFAULT 'CLT',
        "paymentFrequency" text NOT NULL DEFAULT 'MONTHLY',
        "baseSalary" numeric(10, 2) NOT NULL DEFAULT 0,
        "pixType" text DEFAULT 'CPF',
        "pixKey" text,
        "bankName" text,
        "bankAgency" text,
        "bankAccount" text,
        "hireDate" date,
        "status" "EmployeeStatus" NOT NULL DEFAULT 'ACTIVE',
        "notes" text,
        "createdAt" timestamp DEFAULT now() NOT NULL,
        "updatedAt" timestamp DEFAULT now() NOT NULL
      );

      CREATE TABLE IF NOT EXISTS "EmployeePayment" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "restaurantId" uuid NOT NULL REFERENCES "Restaurant"("id") ON DELETE CASCADE,
        "employeeId" uuid NOT NULL REFERENCES "Employee"("id") ON DELETE CASCADE,
        "amount" numeric(10, 2) NOT NULL,
        "type" text NOT NULL DEFAULT 'SALARY',
        "referenceMonth" text NOT NULL,
        "paidAt" timestamp DEFAULT now() NOT NULL,
        "paymentMethod" text NOT NULL DEFAULT 'PIX',
        "status" text NOT NULL DEFAULT 'PAID',
        "financialTransactionId" uuid REFERENCES "FinancialTransaction"("id") ON DELETE SET NULL,
        "notes" text,
        "createdAt" timestamp DEFAULT now() NOT NULL,
        "updatedAt" timestamp DEFAULT now() NOT NULL
      );
    `);
  } catch (err) {
    console.error("[ensureEmployeesTablesExist] Erro ao garantir tabelas:", err);
  }
}

/**
 * Lista todos os funcionários de uma unidade com métricas de remuneração
 */
export async function listarFuncionariosAction(slug: string): Promise<{
  funcionarios: FuncionarioMetricas[];
  totalFolhaBase: number;
  totalAtivos: number;
}> {
  await ensureEmployeesTablesExist();

  const restaurant = await buscarRestaurantePorSlug(slug);
  if (!restaurant) {
    return { funcionarios: [], totalFolhaBase: 0, totalAtivos: 0 };
  }

  const list = await db
    .select()
    .from(employeesTable)
    .where(eq(employeesTable.restaurantId, restaurant.id))
    .orderBy(asc(employeesTable.name));

  const allPayments = await db
    .select()
    .from(employeePaymentsTable)
    .where(eq(employeePaymentsTable.restaurantId, restaurant.id))
    .orderBy(desc(employeePaymentsTable.paidAt));

  const now = new Date();
  const currentMonthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const paymentsByEmployee = new Map<string, EmployeePayment[]>();
  for (const p of allPayments) {
    const arr = paymentsByEmployee.get(p.employeeId) || [];
    arr.push(p);
    paymentsByEmployee.set(p.employeeId, arr);
  }

  let totalFolhaBase = 0;
  let totalAtivos = 0;

  const funcionarios: FuncionarioMetricas[] = list.map((f) => {
    if (f.status === "ACTIVE") {
      totalAtivos += 1;
      totalFolhaBase += Number(f.baseSalary || 0);
    }

    const payments = paymentsByEmployee.get(f.id) || [];
    const totalPagoHistorico = payments.reduce((acc, cur) => acc + Number(cur.amount || 0), 0);
    const totalPagoMesAtual = payments
      .filter((cur) => cur.referenceMonth === currentMonthPrefix || cur.paidAt.toISOString().startsWith(currentMonthPrefix))
      .reduce((acc, cur) => acc + Number(cur.amount || 0), 0);

    const ultimo = payments[0]
      ? {
          amount: Number(payments[0].amount || 0),
          paidAt: payments[0].paidAt,
          type: payments[0].type,
        }
      : null;

    return {
      funcionario: f,
      totalPagoMesAtual,
      totalPagoHistorico,
      ultimoPagamento: ultimo,
    };
  });

  return {
    funcionarios,
    totalFolhaBase,
    totalAtivos,
  };
}

/**
 * Cria ou edita um funcionário
 */
export async function criarOuEditarFuncionarioAction(
  slug: string,
  formData: FormData,
) {
  await ensureEmployeesTablesExist();

  const restaurant = await buscarRestaurantePorSlug(slug);
  if (!restaurant) throw new Error("Restaurante não encontrado.");

  const id = formData.get("id")?.toString();
  const name = formData.get("name")?.toString().trim();
  const roleTitle = formData.get("roleTitle")?.toString().trim();
  const cpf = formData.get("cpf")?.toString().trim() || null;
  const phone = formData.get("phone")?.toString().trim() || null;
  const email = formData.get("email")?.toString().trim() || null;
  const contractType = formData.get("contractType")?.toString() || "CLT";
  const paymentFrequency = formData.get("paymentFrequency")?.toString() || "MONTHLY";
  const baseSalaryRaw = formData.get("baseSalary")?.toString() || "0";
  const baseSalary = parseFloat(baseSalaryRaw.replace(",", ".")) || 0;
  const pixType = formData.get("pixType")?.toString() || "CPF";
  const pixKey = formData.get("pixKey")?.toString().trim() || null;
  const bankName = formData.get("bankName")?.toString().trim() || null;
  const bankAgency = formData.get("bankAgency")?.toString().trim() || null;
  const bankAccount = formData.get("bankAccount")?.toString().trim() || null;
  const hireDate = formData.get("hireDate")?.toString() || null;
  const notes = formData.get("notes")?.toString().trim() || null;
  const status = (formData.get("status")?.toString() === "INACTIVE" ? "INACTIVE" : "ACTIVE") as "ACTIVE" | "INACTIVE";

  if (!name) throw new Error("O nome do colaborador é obrigatório.");
  if (!roleTitle) throw new Error("O cargo / função é obrigatório.");

  if (id) {
    await db
      .update(employeesTable)
      .set({
        name,
        roleTitle,
        cpf,
        phone,
        email,
        contractType,
        paymentFrequency,
        baseSalary,
        pixType,
        pixKey,
        bankName,
        bankAgency,
        bankAccount,
        hireDate,
        status,
        notes,
        updatedAt: new Date(),
      })
      .where(and(eq(employeesTable.id, id), eq(employeesTable.restaurantId, restaurant.id)));
  } else {
    await db.insert(employeesTable).values({
      restaurantId: restaurant.id,
      name,
      roleTitle,
      cpf,
      phone,
      email,
      contractType,
      paymentFrequency,
      baseSalary,
      pixType,
      pixKey,
      bankName,
      bankAgency,
      bankAccount,
      hireDate,
      status,
      notes,
    });
  }

  revalidatePath(`/${slug}/configuracoes/usuarios`);
  revalidatePath(`/${slug}/financeiro`);
  return { success: true };
}

/**
 * Alterna status (Ativo/Inativo) de um funcionário
 */
export async function alternarStatusFuncionarioAction(
  slug: string,
  employeeId: string,
) {
  await ensureEmployeesTablesExist();

  const restaurant = await buscarRestaurantePorSlug(slug);
  if (!restaurant) throw new Error("Restaurante não encontrado.");

  const [found] = await db
    .select()
    .from(employeesTable)
    .where(and(eq(employeesTable.id, employeeId), eq(employeesTable.restaurantId, restaurant.id)))
    .limit(1);

  if (!found) throw new Error("Funcionário não encontrado.");

  const newStatus = found.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";

  await db
    .update(employeesTable)
    .set({ status: newStatus, updatedAt: new Date() })
    .where(eq(employeesTable.id, employeeId));

  revalidatePath(`/${slug}/configuracoes/usuarios`);
  revalidatePath(`/${slug}/financeiro`);
  return { success: true, status: newStatus };
}

/**
 * Exclui um funcionário
 */
export async function excluirFuncionarioAction(
  slug: string,
  employeeId: string,
) {
  await ensureEmployeesTablesExist();

  const restaurant = await buscarRestaurantePorSlug(slug);
  if (!restaurant) throw new Error("Restaurante não encontrado.");

  await db
    .delete(employeesTable)
    .where(and(eq(employeesTable.id, employeeId), eq(employeesTable.restaurantId, restaurant.id)));

  revalidatePath(`/${slug}/configuracoes/usuarios`);
  revalidatePath(`/${slug}/financeiro`);
  return { success: true };
}

/**
 * Lista o histórico de pagamentos de funcionários
 */
export async function listarPagamentosFuncionariosAction(
  slug: string,
): Promise<FuncionarioPagamentoItem[]> {
  await ensureEmployeesTablesExist();

  const restaurant = await buscarRestaurantePorSlug(slug);
  if (!restaurant) return [];

  const payments = await db
    .select({
      id: employeePaymentsTable.id,
      employeeId: employeePaymentsTable.employeeId,
      employeeName: employeesTable.name,
      employeeRole: employeesTable.roleTitle,
      employeePix: employeesTable.pixKey,
      amount: employeePaymentsTable.amount,
      type: employeePaymentsTable.type,
      referenceMonth: employeePaymentsTable.referenceMonth,
      paidAt: employeePaymentsTable.paidAt,
      paymentMethod: employeePaymentsTable.paymentMethod,
      status: employeePaymentsTable.status,
      notes: employeePaymentsTable.notes,
      financialTransactionId: employeePaymentsTable.financialTransactionId,
    })
    .from(employeePaymentsTable)
    .innerJoin(employeesTable, eq(employeePaymentsTable.employeeId, employeesTable.id))
    .where(eq(employeePaymentsTable.restaurantId, restaurant.id))
    .orderBy(desc(employeePaymentsTable.paidAt));

  return payments.map((p) => ({
    ...p,
    amount: Number(p.amount || 0),
  }));
}

/**
 * Registra o pagamento de um funcionário (com integração opcional a despesas financeiras)
 */
export async function registrarPagamentoFuncionarioAction(
  slug: string,
  formData: FormData,
) {
  await ensureEmployeesTablesExist();

  const restaurant = await buscarRestaurantePorSlug(slug);
  if (!restaurant) throw new Error("Restaurante não encontrado.");

  const employeeId = formData.get("employeeId")?.toString();
  const rawAmount = formData.get("amount")?.toString() || "0";
  const amount = parseFloat(rawAmount.replace(",", ".")) || 0;
  const type = formData.get("type")?.toString() || "SALARY";
  const referenceMonth = formData.get("referenceMonth")?.toString() || new Date().toISOString().slice(0, 7);
  const paymentMethod = formData.get("paymentMethod")?.toString() || "PIX";
  const paidAtStr = formData.get("paidAt")?.toString();
  const paidAt = paidAtStr ? new Date(paidAtStr) : new Date();
  const notes = formData.get("notes")?.toString().trim() || null;
  const launchExpense = formData.get("launchExpense") === "true";

  if (!employeeId) throw new Error("Selecione um funcionário.");
  if (amount <= 0) throw new Error("O valor deve ser maior que zero.");

  const [employee] = await db
    .select()
    .from(employeesTable)
    .where(and(eq(employeesTable.id, employeeId), eq(employeesTable.restaurantId, restaurant.id)))
    .limit(1);

  if (!employee) throw new Error("Funcionário não encontrado.");

  let financialTransactionId: string | null = null;

  if (launchExpense) {
    // Buscar ou criar categoria "Folha de Pagamento / Salários"
    let [category] = await db
      .select()
      .from(financialCategoriesTable)
      .where(
        and(
          eq(financialCategoriesTable.restaurantId, restaurant.id),
          eq(financialCategoriesTable.name, "Folha de Pagamento"),
        ),
      )
      .limit(1);

    if (!category) {
      const [newCat] = await db
        .insert(financialCategoriesTable)
        .values({
          restaurantId: restaurant.id,
          name: "Folha de Pagamento",
          type: "EXPENSE",
        })
        .returning();
      category = newCat;
    }

    const typeLabels: Record<string, string> = {
      SALARY: "Salário Mensal",
      ADVANCE: "Adiantamento Salarial / Vale",
      BONUS: "Bonificação / Premiação",
      DAILY: "Diária / Avulso",
      VACATION: "Férias",
      THIRTEENTH: "13º Salário",
      OTHER: "Pagamento Colaborador",
    };

    const description = `Pagamento ${typeLabels[type] || "Colaborador"} - ${employee.name} (${employee.roleTitle}) [Ref: ${referenceMonth}]`;

    const [tx] = await db
      .insert(financialTransactionsTable)
      .values({
        restaurantId: restaurant.id,
        description,
        amount,
        type: "EXPENSE",
        status: "PAID",
        dueDate: paidAt,
        paidAt,
        categoryId: category?.id ?? null,
      })
      .returning();

    financialTransactionId = tx ? tx.id : null;
  }

  await db.insert(employeePaymentsTable).values({
    restaurantId: restaurant.id,
    employeeId,
    amount,
    type,
    referenceMonth,
    paidAt,
    paymentMethod,
    status: "PAID",
    financialTransactionId,
    notes,
  });

  revalidatePath(`/${slug}/financeiro`);
  revalidatePath(`/${slug}/configuracoes/usuarios`);
  return { success: true };
}

/**
 * Exclui um pagamento de funcionário (e opcionalmente sua transação financeira correspondente)
 */
export async function excluirPagamentoFuncionarioAction(
  slug: string,
  paymentId: string,
) {
  await ensureEmployeesTablesExist();

  const restaurant = await buscarRestaurantePorSlug(slug);
  if (!restaurant) throw new Error("Restaurante não encontrado.");

  const [payment] = await db
    .select()
    .from(employeePaymentsTable)
    .where(and(eq(employeePaymentsTable.id, paymentId), eq(employeePaymentsTable.restaurantId, restaurant.id)))
    .limit(1);

  if (!payment) throw new Error("Pagamento não encontrado.");

  if (payment.financialTransactionId) {
    await db
      .delete(financialTransactionsTable)
      .where(eq(financialTransactionsTable.id, payment.financialTransactionId));
  }

  await db
    .delete(employeePaymentsTable)
    .where(eq(employeePaymentsTable.id, paymentId));

  revalidatePath(`/${slug}/financeiro`);
  revalidatePath(`/${slug}/configuracoes/usuarios`);
  return { success: true };
}
