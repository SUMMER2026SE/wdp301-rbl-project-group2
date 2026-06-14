import UserModel from './user.model';
import RefreshTokenModel from './refresh-token.model';
import VerificationModel from './verification-code.model';
import FileModel from './file.model';
import ProductModel from './product.model';
import CartModel, { CartItemModel, CartItemVariationModel } from './cart.model';
import VoucherModel from './voucher.model';
import OrderModel, { OrderItemModel, OrderItemVariationModel } from './order.model';
import ReviewModel from './review.model';
import NotificationModel from './notification.model';
import AuditLogModel from './audit-log.model';
import PointTransactionModel from './point-transaction.model';
import { SupportConversationModel, SupportMessageModel } from './support-chat.model';
import { SupportSettingsModel } from './support-settings.model';
import SettingsModel from './settings.model';

// New models matching DBML tables
import UserAllergyModel from './user-allergy.model';
import { StoreModel, StoreSettingsModel } from './store.model';
import { IngredientModel, ProductRecipeModel } from './ingredient.model';
import { CampaignModel, CampaignProductModel } from './campaign.model';
import { ConversationModel, MessageModel } from './conversation.model';
import { VariationModel, VariationOptionModel } from './variation.model';
import UserVoucherModel from './user-voucher.model';

import StaffRequestModel from './staff-request.model';

export {
  UserModel,
  RefreshTokenModel,
  VerificationModel,
  FileModel,
  ProductModel,
  CartModel,
  CartItemModel,
  CartItemVariationModel,
  VoucherModel,
  OrderModel,
  OrderItemModel,
  OrderItemVariationModel,
  ReviewModel,
  NotificationModel,
  AuditLogModel,
  PointTransactionModel,
  SupportConversationModel,
  SupportMessageModel,
  SupportSettingsModel,
  SettingsModel,

  // New DBML models
  UserAllergyModel,
  StoreModel,
  StoreSettingsModel,
  IngredientModel,
  ProductRecipeModel,
  CampaignModel,
  CampaignProductModel,
  ConversationModel,
  MessageModel,
  VariationModel,
  VariationOptionModel,
  UserVoucherModel,
  StaffRequestModel,
};
