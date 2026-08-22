"use client";

import "leaflet/dist/leaflet.css";

import { Courier, Order, Restaurant } from "@fsw/db";
import L from "leaflet";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";

interface OrderTracking extends Order {
  restaurant: Restaurant;
  courier: Courier | null;
}

interface OrderMapProps {
  order: OrderTracking;
}

// Corrigir ícones do Leaflet que quebram no Next.js
const DefaultIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

const restaurantIcon = L.divIcon({
  html: '<div class="bg-primary p-2 rounded-full border-2 border-white shadow-lg text-white"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg></div>',
  className: "",
  iconSize: [36, 36],
  iconAnchor: [18, 18],
});

const courierIcon = L.divIcon({
  html: '<div class="bg-blue-600 p-2 rounded-full border-2 border-white shadow-lg text-white animate-bounce"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="3" width="15" height="13"></rect><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon><circle cx="5.5" cy="18.5" r="2.5"></circle><circle cx="18.5" cy="18.5" r="2.5"></circle></svg></div>',
  className: "",
  iconSize: [36, 36],
  iconAnchor: [18, 18],
});

const customerIcon = L.divIcon({
  html: '<div class="bg-emerald-600 p-2 rounded-full border-2 border-white shadow-lg text-white"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"></path><circle cx="12" cy="10" r="3"></circle></svg></div>',
  className: "",
  iconSize: [36, 36],
  iconAnchor: [18, 18],
});

const ChangeView = ({ center }: { center: [number, number] }) => {
  const map = useMap();
  map.setView(center);
  return null;
};

const OrderMap = ({ order }: OrderMapProps) => {
  const restaurantPos: [number, number] = [
    order.restaurant.latitude || -23.5505,
    order.restaurant.longitude || -46.6333,
  ];
  const courierPos: [number, number] | null =
    order.courier?.latitude && order.courier?.longitude
      ? [order.courier.latitude, order.courier.longitude]
      : null;
  const customerPos: [number, number] | null =
    order.deliveryLatitude && order.deliveryLongitude
      ? [order.deliveryLatitude, order.deliveryLongitude]
      : null;

  const centerPos = courierPos || restaurantPos;

  return (
    <MapContainer center={centerPos} zoom={15} className="h-full w-full">
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

      <Marker position={restaurantPos} icon={restaurantIcon}>
        <Popup>Restaurante: {order.restaurant.name}</Popup>
      </Marker>

      {customerPos && (
        <Marker position={customerPos} icon={customerIcon}>
          <Popup>Sua Localização</Popup>
        </Marker>
      )}

      {courierPos && (
        <Marker position={courierPos} icon={courierIcon}>
          <Popup>Entregador: {order.courier?.name}</Popup>
        </Marker>
      )}

      <ChangeView center={centerPos} />
    </MapContainer>
  );
};

export default OrderMap;
