import { StoreModel } from '@/models';
import { catchErrors } from '@/utils/async-handler';
import { OK } from '@/constants/http';

export const getStoresHandler = catchErrors(async (req, res) => {
  const stores = await StoreModel.find({ isActive: true }).sort({ name: 1 }).lean();
  return res.success(OK, {
    data: stores,
  });
});
