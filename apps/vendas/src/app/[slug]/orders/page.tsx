import { buscarPedidosPorTelefone } from "@/lib/db";

import { isValidPhoneNumber, normalizePhoneNumber } from "../menu/helpers/phone";
import OrderList from "./components/order-list";
import PhoneForm from "./components/phone-form";

interface OrdersPageProps {
  searchParams: Promise<{ phone: string }>;
}

const OrdersPage = async ({ searchParams }: OrdersPageProps) => {
  const { phone } = await searchParams;

  if (!phone) {
    return <PhoneForm />;
  }

  if (!isValidPhoneNumber(phone)) {
    return <PhoneForm />;
  }

  const orders = await buscarPedidosPorTelefone(normalizePhoneNumber(phone));
  return <OrderList orders={orders} />;
};

export default OrdersPage;
