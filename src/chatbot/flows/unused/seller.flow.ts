import {
  clearHistory,
  getHistoryParse,
  handleHistory,
} from "../../utils/handleHistory";
import AIClass from "../../services/ai";
import * as path from "path";
import fs from "fs";
import { addKeyword, EVENTS } from "@builderbot/bot";
import { flowConfirm } from "./confirm.flow";
import { validateOrder } from "../../utils/order";

const sellerDataPath = path.join("src/chatbot/prompts", "/prompt-seller.txt");
const sellerData = fs.readFileSync(sellerDataPath, "utf-8");

const PROMPT_SELLER = sellerData;

export const generatePromptSeller = (history) => {
  return PROMPT_SELLER.replace("{HISTORY}", history);
};

const validProducts = [
  "pollo",
  "costillas",
  "carne asada",
  "alitas",
  "boneless",
  "nuggets",
  "tenders",
  "coca cola",
  "coca cola light",
  "agua de sabor",
  "paquete 1",
  "paquete 2",
];

const flowSeller = addKeyword(EVENTS.ACTION)
  .addAction(async (_, { extensions, state, flowDynamic, endFlow }) => {
    const assiMsgOrder = "Claro, vamos a tomar tu pedido...";
    await flowDynamic(assiMsgOrder);
    await handleHistory({ content: assiMsgOrder, role: "assistant" }, state);
    const ai = extensions.ai as AIClass;
    const history = getHistoryParse(state);
    const promptInfo = generatePromptSeller(history);

    const { order } = await ai.determineOrderFn(
      [
        {
          role: "system",
          content: promptInfo,
        },
      ],
      "gpt-3.5-turbo"
    );

    console.log(order);

    if (!validateOrder(order, validProducts)) {
      const notGetOrderMsg =
        "Te sugiero los siguientes productos: pollo, costillas, carne asada, alitas, boneless, nuggets, tenders, coca cola, coca cola light, agua de sabor, paquete 1, paquete 2";
      await flowDynamic(notGetOrderMsg);
      await clearHistory(state);
      return endFlow();
    } else if (validateOrder(order, validProducts) === "missing-quantity") {
      const notGetOrderMsg =
        "Una disculpa no pude entender tu orden, si quieres ver el menú, solo dime *menú*";
      await flowDynamic(notGetOrderMsg);
      await clearHistory(state);
      return endFlow();
    }

    const previousOrder = state.get("orderData") || [];

    let newOrder;

    if (previousOrder.length > 0) {
      newOrder = order.filter(
        (newItem) => !previousOrder.some(
          (prevItem) => prevItem.producto === newItem.producto
        )
      );
    } else {
      newOrder = order;
    }

    const updatedOrder = previousOrder.concat(newOrder);
    await state.update({ orderData: updatedOrder });

    const formattedOrder = updatedOrder
      .map((item) => `${item.cantidad ?? item.peso} ${item.producto}`)
      .join(", ");

    const formattedOrderMsg = `Tu orden de (${formattedOrder}) ¿Está completa? Escribe *SI* o *NO*`;
    await flowDynamic(formattedOrderMsg);
    await handleHistory(
      { content: formattedOrderMsg, role: "assistant" },
      state
    );
    await state.update({ order: formattedOrder });
  })
  .addAction({ capture: true }, async ({ body }, { gotoFlow, flowDynamic }) => {
    if (body.toLowerCase().includes("si")) {
      return gotoFlow(flowConfirm);
    } else if (body.toLowerCase().includes("no")) {
      await flowDynamic(
        "Ok, vamos a agregar más productos. ¿Qué te gustaría pedir?"
      );
      return;
    } else {
      await flowDynamic(
        "No entendí tu respuesta. Por favor escribe *SI* o *NO*."
      );
    }
  });

export { flowSeller };
