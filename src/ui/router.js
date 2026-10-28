let navigateImpl = null;

export function initRouter(navigate) {
  navigateImpl = navigate;
}

export function navigate(route, params = {}) {
  if (!navigateImpl) {
    throw new Error('Router belum diinisialisasi.');
  }
  navigateImpl(route, params);
}
