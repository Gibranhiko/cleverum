"use client";

import React, { useEffect, useState } from "react";
import Navbar from "../components/navbar";
import Modal from "../components/modal";
import { useAppContext } from "../context/AppContext";
import OrdersTable from "./orders-table";
import { IOrder } from "../api/orders/models/Order";
import ColumnConfig from "../interfaces/Column";
import { orderFields } from "../utils/constants";

export default function OrdersPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMessage, setModalMessage] = useState("");
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const { state, setState } = useAppContext();
  const [columnsConfig, setColumnsConfig] = useState<ColumnConfig[]>([]);

  const currentOrders = state.orders.filter((order) => order.status === false);
  const deliveryOrders = currentOrders.filter(
    (order) => order.deliveryType === "domicilio"
  );
  const pickupOrders = currentOrders.filter(
    (order) => order.deliveryType === "recoger"
  );

  useEffect(() => {
    setColumnsConfig(orderFields);
  }, []);

  const handleStatusClick = (orderId: string) => {
    setModalMessage("¿Confirma que la orden ha sido entregada?");
    setSelectedOrderId(orderId);
    setIsModalOpen(true);
  };

  const handleAccept = async () => {
    if (selectedOrderId) {
      try {
        const response = await fetch("/api/orders", {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ id: selectedOrderId }),
        });

        if (!response.ok) {
          throw new Error("Failed to update status");
        }

        setState((prevState) => ({
          ...prevState,
          orders: prevState.orders.map((order) =>
            order._id === selectedOrderId ? { ...order, status: true } : order
          ) as IOrder[],
        }));

        setIsModalOpen(false);
      } catch (error) {
        console.error("Error updating status:", error);
      }
    }
  };

  const handleCancel = () => {
    setIsModalOpen(false);
  };

  return (
    <>
      <Navbar />
      <div className="container mx-auto px-4 mt-2">
        <h1 className="text-2xl font-bold mb-4">Pedidos</h1>

        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-2">Envios a Domicilio</h2>
          <OrdersTable
            orders={deliveryOrders}
            onStatusClick={handleStatusClick}
            columnsConfig={columnsConfig}
          />
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-2">Recoger en Tienda</h2>
          <OrdersTable
            orders={pickupOrders}
            onStatusClick={handleStatusClick}
            columnsConfig={columnsConfig}
          />
        </div>
      </div>

      <Modal isOpen={isModalOpen} onClose={handleCancel}>
        <p className="mb-4">{modalMessage}</p>
        <div className="flex justify-end gap-4">
          <button
            onClick={handleCancel}
            className="px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400"
          >
            Cancelar
          </button>
          <button
            onClick={handleAccept}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Aceptar
          </button>
        </div>
      </Modal>
    </>
  );
}
