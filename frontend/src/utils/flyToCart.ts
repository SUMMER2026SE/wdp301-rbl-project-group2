const FLY_DURATION_MS = 650;

export function flyToCart(sourceElement: HTMLElement, imageUrl: string): void {
    const cartIcon = document.querySelector<HTMLElement>('[data-cart-icon]');
    if (!cartIcon) return;

    const sourceRect = sourceElement.getBoundingClientRect();
    const cartRect = cartIcon.getBoundingClientRect();

    const size = 52;
    const startX = sourceRect.left + sourceRect.width / 2 - size / 2;
    const startY = sourceRect.top + sourceRect.height / 2 - size / 2;
    const endX = cartRect.left + cartRect.width / 2 - size / 2;
    const endY = cartRect.top + cartRect.height / 2 - size / 2;

    const flyer = document.createElement('div');
    flyer.className = 'fly-to-cart-item';
    flyer.style.left = `${startX}px`;
    flyer.style.top = `${startY}px`;
    flyer.style.width = `${size}px`;
    flyer.style.height = `${size}px`;

    const img = document.createElement('img');
    img.src = imageUrl;
    img.alt = '';
    img.draggable = false;
    flyer.appendChild(img);

    document.body.appendChild(flyer);

    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            flyer.style.transform = `translate(${endX - startX}px, ${endY - startY}px) scale(0.2)`;
            flyer.style.opacity = '0.35';
        });
    });

    cartIcon.classList.add('cart-icon-bump');
    setTimeout(() => cartIcon.classList.remove('cart-icon-bump'), 450);

    setTimeout(() => flyer.remove(), FLY_DURATION_MS);
}

export function showAddToCartFeedback(
    sourceElement: HTMLElement | null | undefined,
    imageUrl?: string,
    _message?: string,
): void {
    if (sourceElement && imageUrl) {
        flyToCart(sourceElement, imageUrl);
    }
}
