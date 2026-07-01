import mongoose from 'mongoose';

export enum ProductStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  OUT_OF_STOCK = 'out_of_stock',
  DELETED = 'deleted',
}

export type OperationalProductStatus = ProductStatus.ACTIVE | ProductStatus.INACTIVE | ProductStatus.OUT_OF_STOCK;

export enum ProductCategory {
  FOOD = 'food',
  DRINK = 'drink',
  COMBO = 'combo',
  OTHER = 'other',

  // Vietnamese category values (operational in production)
  COM_DIA_TRUYEN_THONG = 'Cơm Đĩa Truyền Thống',
  GIAI_KHAT_TRANG_MIENG = 'Giải Khát & Tráng Miệng',
  GOC_HEALTHY_AN_KIENG = 'Góc Healthy & Ăn Kiêng',
  GOI_THEM_AN_KEM = 'Gọi Thêm Ăn Kèm',
  TRU_DANH_MON_NUOC = 'Trứ Danh Món Nước',
  DAC_SAN_BAN_CHAY = 'Đặc Sản & Bán Chạy',
}

export interface IProductRecipeItem {
  ingredientId: mongoose.Types.ObjectId;
  quantity: number;
  unit: string;
}

export interface IProductVariantOption {
  choice: string;
  extraPrice: number;
}

export interface IProductVariantGroup {
  name: string;
  required?: boolean;
  multiple?: boolean;
  maxChoices?: number;
  options: IProductVariantOption[];
}

export interface IProductStoreAvailability {
  storeId: mongoose.Types.ObjectId;
  status: OperationalProductStatus;
}

export interface IProduct extends mongoose.Document<mongoose.Types.ObjectId> {
  status?: ProductStatus;
  nameEmbedding?: string | null;
  imgEmbedding: string;
  name: string;
  description?: string;
  image?: string;
  price: number;
  category: ProductCategory;
  restaurant?: string;
  time?: string;
  rating?: number;
  reviewCount?: number;
  recipe: IProductRecipeItem[];
  allergenTags: string[];
  healthWarning?: string;
  healthTags?: string[];

  // camelCase fields
  isAvailable?: boolean;
  isCampaignRunning: boolean;
  variationIds: mongoose.Types.ObjectId[];
  storeAvailability?: IProductStoreAvailability[];
  tags?: string[];
  operationalNote?: string;
  createdAt: Date;
  updatedAt: Date;
}
