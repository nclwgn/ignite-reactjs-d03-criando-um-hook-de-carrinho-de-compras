import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

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
    const storedCart = localStorage.getItem("@RocketShoes:cart");

    if (storedCart) {
      return JSON.parse(storedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      let cartProduct = cart.find(product => product.id === productId);

      if (!await hasAvailableStock(productId, cartProduct ? cartProduct.amount + 1 : 1)) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      let newCart: Product[];

      if (!cartProduct) {
        // Fetches the product
        const databaseProduct = await api.get<Product>(`products/${productId}`);

        cartProduct = {
          ...databaseProduct.data,
          amount: 1
        };

        newCart = [...cart, cartProduct]
      }
      else
      {
        const index = cart.indexOf(cartProduct);

        newCart = [
          ...cart.slice(0, index),
          { ...cartProduct, amount: cartProduct.amount + 1 },
          ...cart.slice(index + 1)
        ];
      }

      updateLocalStorage(newCart);
      setCart(newCart);
    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      if (!cart.some(product => product.id === productId))
        throw new Error();

      const newCart = cart.filter(product => product.id !== productId);

      updateLocalStorage(newCart);
      setCart(newCart);
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount <= 0)
        return;

      if (!await hasAvailableStock(productId, amount)) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      const index = cart.findIndex(product => product.id === productId);

      if (index < 0)
        throw new Error();

      let newCart = [
        ...cart.slice(0, index),
        { ...cart[index], amount },
        ...cart.slice(index + 1, 0)
      ];

      updateLocalStorage(newCart);
      setCart(newCart);
    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  const hasAvailableStock = async (productId: number, amount: number) => {
    const stock = await api.get<Stock>(`stock/${productId}`);

    return stock.data.amount >= amount;
  }

  const updateLocalStorage = (updatedProductList: Product[]) => {
    localStorage.setItem("@RocketShoes:cart", JSON.stringify(updatedProductList));
  }

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
