import { createContext, ReactNode, useContext, useState } from "react";
import { toast } from "react-toastify";
import { api } from "../services/api";
import { Product, Stock } from "../types";

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem("@RocketShoes:cart");
    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const { data: productStock } = await api.get<Stock>(
        `http://localhost:3333/stock/${productId}`
      );

      let newCart = [...cart];

      let product = newCart.find((p) => p.id === productId);

      if (
        productStock.amount <= 0 ||
        (product && product.amount + 1 > productStock.amount)
      ) {
        toast.error("Quantidade solicitada fora de estoque");
        return;
      }

      if (!product) {
        product = (
          await api.get<Product>(`http://localhost:3333/products/${productId}`)
        ).data;

        if (!product) throw new Error();

        product.amount = 1;

        newCart.push(product);
      } else {
        product.amount += 1;
      }

      setCart(newCart);
      localStorage.setItem("@RocketShoes:cart", JSON.stringify(newCart));
    } catch {
      toast.error("Erro na adição do produto");
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const cartCopy = [...cart];
      const productIndex = cartCopy.findIndex((p) => p.id === productId);

      if (productIndex < 0) throw new Error();

      cartCopy.splice(productIndex, 1);

      setCart(cartCopy);
      localStorage.setItem("@RocketShoes:cart", JSON.stringify(cartCopy));
    } catch {
      toast.error("Erro na remoção do produto");
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount < 1) return;

      const newCart = [...cart];
      const product = newCart.find((p) => p.id === productId);

      if (!product) throw new Error();

      const { data: productStock } = await api.get<Stock>(
        `http://localhost:3333/stock/${productId}`
      );

      if (amount > productStock.amount) {
        toast.error("Quantidade solicitada fora de estoque");
        return;
      }

      product.amount = amount;

      setCart(newCart);
      localStorage.setItem("@RocketShoes:cart", JSON.stringify(newCart));
    } catch {
      toast.error("Erro na alteração de quantidade do produto");
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
