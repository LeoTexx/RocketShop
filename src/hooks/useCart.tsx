import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { toast } from "react-toastify";
import { api } from "../services/api";
import { Product } from "../types";

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

  const prevCartRef = useRef<Product[]>();

  const addProduct = async (productId: number) => {
    try {
      const updatedCart = [...cart];

      const { data } = await api.get(`/stock/${productId}`);
      const findInCart = updatedCart.find((item) => item.id === productId);
      if (findInCart) {
        if (findInCart.amount >= data.amount) {
          toast.error("Quantidade solicitada fora de estoque");
          return;
        } else {
          findInCart.amount += 1;
        }
      } else {
        const product = await api.get(`/products/${productId}`);
        const newProduct = { ...product.data, amount: 1 };

        updatedCart.push(newProduct);
      }
      setCart(updatedCart);
    } catch {
      toast.error("Erro na adição do produto");
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const updatedCart = [...cart];
      const findInCart = updatedCart.findIndex((item) => item.id === productId);
      if (findInCart >= 0) {
        updatedCart.splice(findInCart, 1);
        setCart(updatedCart);
      } else {
        throw new Error();
      }
    } catch {
      toast.error("Erro na remoção do produto");
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount <= 0) {
        return;
      }

      const { data } = await api.get(`/stock/${productId}`);
      if (amount >= data.amount) {
        toast.error("Quantidade solicitada fora de estoque");
        return;
      }
      const updatedCart = [...cart];
      const findInCart = updatedCart.find((item) => item.id === productId);
      if (findInCart) {
        findInCart.amount = amount;
        setCart(updatedCart);
      } else {
        throw new Error();
      }
    } catch {
      toast.error("Erro na alteração de quantidade do produto");
    }
  };

  const cartPreviousValue = prevCartRef.current ?? cart;
  useEffect(() => {
    prevCartRef.current = cart;
  });
  useEffect(() => {
    if (cartPreviousValue !== cart) {
      localStorage.setItem("@RocketShoes:cart", JSON.stringify(cart));
    }
  }, [cart, cartPreviousValue]);

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
