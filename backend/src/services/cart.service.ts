import CartModel from '@/models/cart.model';
import ProductModel from '@/models/product.model';
import mongoose from 'mongoose';
import { AddToCartInput } from '@/validators/cart.validator';

type InputVariation = { name: string; choice: string };
type CartVariation = { name: string; choice: string; extra_price: number };

const normalizeVariations = (vars: { name: string; choice: string }[]) =>
  (vars || [])
    .map(v => ({ name: v.name.trim(), choice: v.choice.trim() }))
    .sort((a, b) => (a.name + a.choice).localeCompare(b.name + b.choice));

const sameVariations = (a: any[], b: any[]) =>
  JSON.stringify(normalizeVariations(a || [])) === JSON.stringify(normalizeVariations(b || []));

const findVariantExtraPrice = (product: any, name: string, choice: string) => {
  const group = product.variants?.find((g: any) => g.name === name);
  if (!group) return null;

  const option = group.options?.find((o: any) => o.choice === choice);
  if (!option) return null;

  return Number(option.extra_price ?? 0);
};

export const addToCart = async (userId: mongoose.Types.ObjectId, input: AddToCartInput) => {
  const { product_id, quantity, variations = [] } = input;

  if (!userId) throw new Error('Unauthorized');
  if (!mongoose.Types.ObjectId.isValid(product_id)) throw new Error('Invalid product_id');

  const product: any = await ProductModel.findById(product_id).lean();
  if (!product) throw new Error('Product not found');
  if (product.isAvailable === false) throw new Error('Product is not available');

  const mappedVariations: CartVariation[] = (variations as InputVariation[]).map(v => {
    const extra = findVariantExtraPrice(product, v.name, v.choice);
    if (extra === null) throw new Error(`Invalid variation ${v.name}:${v.choice}`);

    return { name: v.name, choice: v.choice, extra_price: extra };
  });

  const basePrice = Number(product.price ?? 0);
  const extraPrice = mappedVariations.reduce((sum, v) => sum + Number(v.extra_price ?? 0), 0);
  const unitPrice = basePrice + extraPrice;

  const cart =
    (await CartModel.findOne({ user_id: userId })) ??
    (await CartModel.create({ user_id: userId, items: [] }));

  const existed = cart.items.find((it: any) => {
    const sameProduct = String(it.product_id) === String(product_id);
    return sameProduct && sameVariations(it.variations || [], mappedVariations);
  });

  if (existed) {
    existed.quantity += quantity;
    existed.price = unitPrice;
    existed.variations = mappedVariations as any;
  } else {
    cart.items.push({
      product_id,
      quantity,
      price: unitPrice,
      variations: mappedVariations,
    } as any);
  }

  await cart.save();
  return cart;
};

export const getCart = async (userId: mongoose.Types.ObjectId) => {
  if (!userId) throw new Error('Unauthorized');
  
  const cart = await CartModel.findOne({ user_id: userId })
    .populate({
      path: 'items.product_id',
      select: 'name image price isAvailable variants',
    });
    
  return cart || { user_id: userId, items: [] };
};

export const clearCart = async (userId: mongoose.Types.ObjectId) => {
  if (!userId) throw new Error('Unauthorized');
  const cart = await CartModel.findOne({ user_id: userId });
  if (cart) {
    cart.items = [];
    await cart.save();
  }
  return { success: true };
};

export const mergeCart = async (userId: mongoose.Types.ObjectId, guestItems: any[]) => {
  if (!userId) throw new Error('Unauthorized');

  let cart = await CartModel.findOne({ user_id: userId });
  if (!cart) {
    cart = await CartModel.create({ user_id: userId, items: [] });
  }

  for (const guestItem of guestItems) {
    const { product_id, quantity, variations = [] } = guestItem;

    const product: any = await ProductModel.findById(product_id).lean();
    if (!product || product.isAvailable === false) continue;

    const mappedVariations: CartVariation[] = variations.map((v: any) => {
      const extra = findVariantExtraPrice(product, v.name, v.choice);
      return { name: v.name, choice: v.choice, extra_price: extra ?? 0 };
    });

    const basePrice = Number(product.price ?? 0);
    const extraPrice = mappedVariations.reduce((sum, v) => sum + Number(v.extra_price ?? 0), 0);
    const unitPrice = basePrice + extraPrice;

    const existed = cart.items.find((it: any) => {
      const sameProduct = String(it.product_id) === String(product_id);
      return sameProduct && sameVariations(it.variations || [], mappedVariations);
    });

    if (existed) {
      existed.quantity += quantity;
      existed.price = unitPrice;
      existed.variations = mappedVariations as any;
    } else {
      cart.items.push({
        product_id: new mongoose.Types.ObjectId(product_id),
        quantity,
        price: unitPrice,
        variations: mappedVariations,
      } as any);
    }
  }

  await cart.save();
  return cart;
};

export const updateItemQuantity = async (
  userId: mongoose.Types.ObjectId,
  product_id: string,
  variations: any[],
  quantity: number
) => {
  if (!userId) throw new Error('Unauthorized');
  const cart = await CartModel.findOne({ user_id: userId });
  if (!cart) throw new Error('Cart not found');

  const item = cart.items.find((it: any) => {
    const sameProduct = String(it.product_id) === String(product_id);
    return sameProduct && sameVariations(it.variations || [], variations);
  });

  if (item) {
    if (quantity <= 0) {
      cart.items = cart.items.filter((it: any) => it !== item) as any;
    } else {
      item.quantity = quantity;
    }
    await cart.save();
  }
  return cart;
};

export const removeItem = async (
  userId: mongoose.Types.ObjectId,
  product_id: string,
  variations: any[]
) => {
  if (!userId) throw new Error('Unauthorized');
  const cart = await CartModel.findOne({ user_id: userId });
  if (!cart) throw new Error('Cart not found');

  cart.items = cart.items.filter((it: any) => {
    const sameProduct = String(it.product_id) === String(product_id);
    const sameVars = sameVariations(it.variations || [], variations);
    return !(sameProduct && sameVars);
  }) as any;

  await cart.save();
  return cart;
};

