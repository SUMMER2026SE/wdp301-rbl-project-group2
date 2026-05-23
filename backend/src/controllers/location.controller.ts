import { Request, Response } from 'express';

export const receiveLocation = (req: Request, res: Response) => {

  const { lat, lng } = req.body;

  const latitude = Number(lat);
  const longitude = Number(lng);

  if (!lat || !lng || isNaN(latitude) || isNaN(longitude)) {
    return res.status(400).json({
      ok: false,
      message: "Thiếu hoặc tọa độ không hợp lệ",
    });
  }

  const isValid = isInDaNang(latitude, longitude);

  return res.json({
    ok: true,
    lat: latitude,
    lng: longitude,
    isValid,
    area: isValid ? "Đà Nẵng" : "Ngoài Đà Nẵng",
    message: isValid
      ? "Vị trí hợp lệ (trong khu vực Đà Nẵng)"
      : "Vị trí không hợp lệ (ngoài khu vực Đà Nẵng)",
  });
};

function isInDaNang(lat: number, lng: number): boolean {
  return (
    lat >= 15.85 &&
    lat <= 16.3 &&
    lng >= 107.75 &&
    lng <= 108.5
  );
}


