import mongoose from 'mongoose';
import IUser from './user.type';
import IOrder from './order.type';
import IFile from './file.type';
import IProduct from './product.type';

export default interface IReview extends mongoose.Document<mongoose.Types.ObjectId> {
  user_id: IUser['_id'];
  order_id: IOrder['_id'];
  product_id: IProduct['_id'];
  rating: number | null;
  comment: string | null;
  images: IFile['_id'][] | null;
  parent_reply: IReview['_id'] | null;
  isAnonymous: boolean;
}
