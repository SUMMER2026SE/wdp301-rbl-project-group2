import IProduct from './product.type';
import IUser from './user.type';

export interface ICartVariation {
  name: string;
  choice: string;
  extra_price: number;
}

export interface ICartItem {
  product_id: IProduct['_id'];
  quantity: number;
  price: number;
  variations: ICartVariation[];
}

export default interface ICart {
  user_id: IUser['_id'];
  items: ICartItem[];
  note: string;
}
