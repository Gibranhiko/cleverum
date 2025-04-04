import { addKeyword, EVENTS } from "@builderbot/bot";
import { clearHistory } from "../../utils/handleHistory";
import { format } from "date-fns";

const flowConfirm = addKeyword(EVENTS.ACTION)
  .addAction(async (_, { flowDynamic }) => {
    await flowDynamic("Ok, voy a pedirte unos datos para iniciar tu pedido");
    await flowDynamic("¿Cual es tu nombre?");
  })
  .addAction(
    { capture: true },
    async (ctx, { state, flowDynamic, endFlow }) => {
      await state.update({ name: ctx.body });

      if (ctx.body.toLocaleLowerCase().includes("cancelar")) {
        clearHistory(state);
        return endFlow(`¿Como puedo ayudarte?`);
      }

      await flowDynamic(`Y por último cuál es tu teléfono?`);
    }
  )
  .addAction({ capture: true }, async (ctx, { state, flowDynamic }) => {
    await state.update({ phone: ctx.body });

    const orderData = {
      nombre: state.get("name"),
      orden: state.get("order"),
      telefono: state.get("phone"),
      fecha: format(new Date(), "yyyy-MM-dd HH:mm"),
      status: false,
    };

    console.log("Order data:", orderData);

    try {
      const response = await fetch(`${process.env.PUBLIC_URL}:${process.env.WEB_PORT}/api/orders`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(orderData),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      await flowDynamic(
        "Listo! tu orden esta en proceso, te contactaremos para confirmar el tiempo de entrega"
      );
    } catch (error) {
      console.log("Error creating order:", error.response);
      await flowDynamic(
        "Hubo un problema al procesar tu pedido. Por favor intenta nuevamente."
      );
    }
    clearHistory(state);
  });

export { flowConfirm };

