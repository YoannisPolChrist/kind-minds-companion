export const HEADER_IMAGES = [
  "/images/HomeUi1.webp",
  "/images/HomeUi2.webp",
  "/images/HomeUi3.webp",
  "/images/HomeUi4.webp",
  "/images/HomeUi5.webp",
  "/images/HomeUi6.webp",
] as const;

export const getRandomHeaderImage = () =>
  HEADER_IMAGES[Math.floor(Math.random() * HEADER_IMAGES.length)];
