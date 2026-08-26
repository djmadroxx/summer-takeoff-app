import {
  ArrowLeft,
  Search,
  Settings,
  ShoppingCart,
  Minus,
  Plus,
  X,
  QrCode,
  UserRound,
  Coins,
  CheckCircle2,
  ScanLine,
} from 'lucide-react';

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { Html5Qrcode } from 'html5-qrcode';

import { notify } from '../lib/notifications';

import type { User } from '../lib/auth';

interface ShopPageProps {
  user: User;
  onBack: () => void;
  onOpenProductsAdmin: () => void;
}

interface Product {
  id: string;
  name: string;
  imagePath: string | null;
  tokenPrice: number;
  categoryId: string;
  categoryName: string;
}

interface CartItem {
  product: Product;
  quantity: number;
}

interface ScannedCustomer {
  id: string;
  email: string;
  username: string;
  name: string;
  memberId: string;
  role: string;
  isActive: boolean;
  token: number;
}

type CustomerStep =
  | 'idle'
  | 'scanning'
  | 'loading'
  | 'selected';

export function ShopPage({
  user,
  onBack,
  onOpenProductsAdmin,
}: ShopPageProps) {
  const [products, setProducts] = useState<
    Product[]
  >([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState<string | null>(null);

  const [selectedCategory, setSelectedCategory] =
    useState<string>('all');

  const [search, setSearch] =
    useState('');

  const [cart, setCart] =
    useState<CartItem[]>([]);

  const [cartOpen, setCartOpen] =
    useState(false);

  const [customerStep, setCustomerStep] =
    useState<CustomerStep>('idle');


  const [customer, setCustomer] =
    useState<ScannedCustomer | null>(null);

  const [customerError, setCustomerError] =
    useState<string | null>(null);

  const [shopScanning, setShopScanning] =
    useState(false);

  const [shopCameraError, setShopCameraError] =
    useState('');

  const [paymentLoading, setPaymentLoading] =
    useState(false);

  const shopScannerRef =
    useRef<Html5Qrcode | null>(null);

  const shopScannerStartedRef =
    useRef(false);

  const shopScannerStoppingRef =
    useRef(false);

  const shopScannerProcessingRef =
    useRef(false);

  const isAdmin =
    user.role === 'admin';

  const isStaff =
    user.role === 'pultos';

  /*
   * TERMÉKEK BETÖLTÉSE
   */
  useEffect(() => {
    let cancelled = false;

    async function loadProducts() {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(
          '/api/products/products',
          {
            credentials: 'include',
          },
        );

        const data =
          await response.json();

        if (!response.ok) {
          throw new Error(
            data.message ??
              'A termékek betöltése sikertelen.',
          );
        }

        if (!cancelled) {
          setProducts(
            data.products ?? [],
          );
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : 'A termékek betöltése sikertelen.',
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadProducts();

    return () => {
      cancelled = true;
    };
  }, []);

  /*
   * KOMPONENS ELHAGYÁSAKOR
   * kamera leállítása
   */
  useEffect(() => {
    return () => {
      void stopShopScanner();
    };
  }, []);

  const categories = useMemo(() => {
    return Array.from(
      new Set(
        products.map(
          (product) =>
            product.categoryName,
        ),
      ),
    );
  }, [products]);

  const filteredProducts =
    useMemo(() => {
      const query = search
        .trim()
        .toLowerCase();

      return products.filter(
        (product) => {
          const categoryMatch =
            selectedCategory === 'all' ||
            product.categoryName ===
              selectedCategory;

          const searchMatch =
            !query ||
            product.name
              .toLowerCase()
              .includes(query);

          return (
            categoryMatch &&
            searchMatch
          );
        },
      );
    }, [
      products,
      selectedCategory,
      search,
    ]);

  const cartCount = useMemo(() => {
    return cart.reduce(
      (total, item) =>
        total + item.quantity,
      0,
    );
  }, [cart]);

  const cartTotal = useMemo(() => {
    return cart.reduce(
      (total, item) =>
        total +
        item.product.tokenPrice *
          item.quantity,
      0,
    );
  }, [cart]);

  /*
   * KOSÁR
   */
  function addToCart(
    product: Product,
  ) {
    setCart((currentCart) => {
      const existingItem =
        currentCart.find(
          (item) =>
            item.product.id ===
            product.id,
        );

      if (existingItem) {
        return currentCart.map(
          (item) =>
            item.product.id ===
            product.id
              ? {
                  ...item,
                  quantity:
                    item.quantity + 1,
                }
              : item,
        );
      }

      return [
        ...currentCart,
        {
          product,
          quantity: 1,
        },
      ];
    });
  }

  function changeQuantity(
    productId: string,
    change: number,
  ) {
    setCart((currentCart) =>
      currentCart
        .map((item) =>
          item.product.id ===
          productId
            ? {
                ...item,
                quantity:
                  item.quantity +
                  change,
              }
            : item,
        )
        .filter(
          (item) =>
            item.quantity > 0,
        ),
    );
  }

  function removeFromCart(
    productId: string,
  ) {
    setCart((currentCart) =>
      currentCart.filter(
        (item) =>
          item.product.id !==
          productId,
      ),
    );
  }

  /*
   * VENDÉG AZONOSÍTÁS
   */
  function openCustomerScanner() {
    setCustomerError(null);
    setShopCameraError('');
    setCustomerStep('scanning');

    /*
     * A DOM elem csak akkor létezik,
     * amikor az overlay már renderelődött,
     * ezért a kamera indítását a következő
     * event loop körre tesszük.
     */
    window.setTimeout(() => {
      void startShopScanner();
    }, 0);
  }

  async function closeCustomerScanner() {
    await stopShopScanner();

    setCustomerStep(
      customer
        ? 'selected'
        : 'idle',
    );

    setCustomerError(null);
    setShopCameraError('');
  }

  async function lookupCustomer(
    token: string,
  ) {
    const trimmedToken =
      token.trim();

    if (!trimmedToken) {
      setCustomerError(
        'QR-kód beolvasása szükséges.',
      );
      return;
    }

    try {
      setCustomerStep('loading');
      setCustomerError(null);

      const response =
        await fetch(
          '/api/scanner/lookup',
          {
            method: 'POST',
            headers: {
              'Content-Type':
                'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({
              qrToken:
                trimmedToken,
            }),
          },
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ??
            'A vendég nem található.',
        );
      }

      const scannedUser =
        data.user as ScannedCustomer;

      if (!scannedUser.isActive) {
        throw new Error(
          'Ez a felhasználó inaktív.',
        );
      }

      setCustomer(scannedUser);
      setCustomerStep('selected');

      setCustomerError(null);
    } catch (err) {
      setCustomerStep('scanning');

      setCustomerError(
        err instanceof Error
          ? err.message
          : 'A vendég keresése sikertelen.',
      );
    }
  }


  function clearCustomer() {
    void stopShopScanner();

    setCustomer(null);
    setCustomerStep('idle');
    setCustomerError(null);

    setShopCameraError('');
  }

  /*
   * SHOP QR SCANNER LEÁLLÍTÁSA
   */
  async function stopShopScanner() {
    const scanner =
      shopScannerRef.current;

    if (
      !scanner ||
      !shopScannerStartedRef.current ||
      shopScannerStoppingRef.current
    ) {
      return;
    }

    shopScannerStoppingRef.current =
      true;

    try {
      await scanner.stop();
    } catch {
      // A scanner már leállhatott.
    } finally {
      shopScannerStartedRef.current =
        false;

      shopScannerStoppingRef.current =
        false;

      shopScannerRef.current =
        null;

      setShopScanning(false);
    }
  }

  /*
   * SHOP QR SCANNER INDÍTÁSA
   */
  async function startShopScanner() {
    if (
      shopScannerStartedRef.current
    ) {
      return;
    }

    try {
      setShopCameraError('');
      setCustomerError('');

      const scanner =
        new Html5Qrcode(
          'shop-qr-reader',
        );

      shopScannerRef.current =
        scanner;

      shopScannerProcessingRef.current =
        false;

      await scanner.start(
        {
          facingMode:
            'environment',
        },
        {
          fps: 10,
          qrbox: {
            width: 250,
            height: 250,
          },
          aspectRatio: 1,
        },
        async (decodedText) => {
          if (
            shopScannerProcessingRef.current
          ) {
            return;
          }

          shopScannerProcessingRef.current =
            true;

          try {
            await stopShopScanner();


            await lookupCustomer(
              decodedText,
            );
          } catch (error) {
            notify(
              'error',
              error instanceof Error
                ? error.message
                : 'A QR-kód feldolgozása sikertelen.',
            );
          } finally {
            shopScannerProcessingRef.current =
              false;
          }
        },
        () => {
          /*
           * Normál scanning callback.
           * A sikertelen frame-eket nem
           * jelezzük hibaként.
           */
        },
      );

      shopScannerStartedRef.current =
        true;

      setShopScanning(true);
    } catch (error) {
      shopScannerStartedRef.current =
        false;

      shopScannerRef.current =
        null;

      setShopScanning(false);

      setShopCameraError(
        error instanceof Error
          ? error.message
          : 'Nem sikerült elindítani a kamerát. Engedélyezd a kamera használatát.',
      );
    }
  }

  /*
   * FIZETÉS
   */
  async function handlePayment() {
    if (
      !customer ||
      cart.length === 0 ||
      paymentLoading
    ) {
      return;
    }

    if (
      customer.token <
      cartTotal
    ) {
      notify(
        'error',
        'A vendégnek nincs elegendő tokenje.',
      );

      return;
    }

    try {
      setPaymentLoading(true);

      const response =
        await fetch(
          '/api/products/purchase',
          {
            method: 'POST',
            headers: {
              'Content-Type':
                'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({
              userId:
                customer.id,
              items: cart.map(
                (item) => ({
                  productId:
                    item.product.id,
                  quantity:
                    item.quantity,
                }),
              ),
            }),
          },
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ??
            'A fizetés sikertelen.',
        );
      }

      setCart([]);
      setCustomer(null);
      setCustomerStep('idle');
      setCartOpen(false);
      setCustomerError(null);

      notify(
        'success',
        `Sikeres fizetés: ${data.totalToken} token. Maradt: ${data.remainingToken} token.`,
      );
    } catch (error) {
      notify(
        'error',
        error instanceof Error
          ? error.message
          : 'A fizetés sikertelen.',
      );
    } finally {
      setPaymentLoading(false);
    }
  }

  return (
    <main className="app-shell">
      <div className="app-container page-enter">
        <header className="shop-header">
          <button
            className="shop-back-button"
            type="button"
            onClick={onBack}
          >
            <ArrowLeft size={19} />
          </button>

          <div className="shop-title">
            <span>
              SUMMER TAKEOFF
            </span>

            <h1>Shop</h1>
          </div>

          {isStaff ? (
            <button
              className="shop-cart-button"
              type="button"
              onClick={() =>
                setCartOpen(true)
              }
            >
              <ShoppingCart
                size={19}
              />

              {cartCount > 0 && (
                <span>
                  {cartCount}
                </span>
              )}
            </button>
          ) : isAdmin ? (
            <button
              className="shop-admin-button"
              type="button"
              onClick={
                onOpenProductsAdmin
              }
            >
              <Settings
                size={18}
              />

              <span>
                Termékek szerkesztése
              </span>
            </button>
          ) : (
            <div className="shop-header-spacer" />
          )}
        </header>

        {isStaff && (
          <div className="shop-staff-banner">
            <ShoppingCart
              size={18}
            />

            <span>
              Pultos értékesítési felület
            </span>
          </div>
        )}

        {!loading &&
          !error &&
          products.length > 0 && (
            <>
              <div className="shop-search">
                <Search size={19} />

                <input
                  type="search"
                  placeholder="Termék keresése..."
                  value={search}
                  onChange={(event) =>
                    setSearch(
                      event.target.value,
                    )
                  }
                />
              </div>

              <div className="shop-categories">
                <button
                  className={
                    selectedCategory ===
                    'all'
                      ? 'active'
                      : ''
                  }
                  type="button"
                  onClick={() =>
                    setSelectedCategory(
                      'all',
                    )
                  }
                >
                  Összes
                </button>

                {categories.map(
                  (category) => (
                    <button
                      className={
                        selectedCategory ===
                        category
                          ? 'active'
                          : ''
                      }
                      key={category}
                      type="button"
                      onClick={() =>
                        setSelectedCategory(
                          category,
                        )
                      }
                    >
                      {category}
                    </button>
                  ),
                )}
              </div>
            </>
          )}

        {loading && (
          <div className="shop-state">
            <p>
              Termékek betöltése...
            </p>
          </div>
        )}

        {!loading && error && (
          <div className="shop-state">
            <p>{error}</p>

            <button
              type="button"
              onClick={() =>
                window.location.reload()
              }
            >
              Újrapróbálás
            </button>
          </div>
        )}

        {!loading &&
          !error &&
          products.length === 0 && (
            <div className="shop-state">
              <p>
                Jelenleg nincs elérhető
                termék.
              </p>
            </div>
          )}

        {!loading &&
          !error &&
          filteredProducts.length ===
            0 &&
          products.length > 0 && (
            <div className="shop-state">
              <p>
                Nincs a keresésnek
                megfelelő termék.
              </p>
            </div>
          )}

        {!loading &&
          !error &&
          filteredProducts.length >
            0 && (
            <div className="shop-grid">
              {filteredProducts.map(
                (product) => (
                  <article
                    className="shop-product-card"
                    key={product.id}
                  >
                    <div className="shop-product-image">
                      {product.imagePath ? (
                        <img
                          src={
                            product.imagePath
                          }
                          alt={
                            product.name
                          }
                        />
                      ) : (
                        <div className="shop-product-no-image">
                          <ShoppingCart
                            size={30}
                          />
                        </div>
                      )}
                    </div>

                    <div className="shop-product-info">
                      <span className="shop-product-category">
                        {
                          product.categoryName
                        }
                      </span>

                      <h2>
                        {product.name}
                      </h2>

                      <div className="shop-product-bottom">
                        <strong>
                          {
                            product.tokenPrice
                          }

                          <span>
                            TOKEN
                          </span>
                        </strong>

                        {isStaff && (
                          <button
                            className="shop-add-button"
                            type="button"
                            onClick={() =>
                              addToCart(
                                product,
                              )
                            }
                          >
                            <Plus
                              size={17}
                            />

                            Kosárba
                          </button>
                        )}
                      </div>
                    </div>
                  </article>
                ),
              )}
            </div>
          )}
      </div>

      {isStaff &&
        cartOpen && (
          <div
            className="shop-cart-overlay"
            onClick={() =>
              setCartOpen(false)
            }
          >
            <aside
              className="shop-cart"
              onClick={(event) =>
                event.stopPropagation()
              }
            >
              <header className="shop-cart-header">
                <div>
                  <span>
                    PULT
                  </span>

                  <h2>
                    Kosár
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setCartOpen(false)
                  }
                >
                  <X size={20} />
                </button>
              </header>

              {cart.length === 0 ? (
                <div className="shop-cart-empty">
                  <ShoppingCart
                    size={32}
                  />

                  <p>
                    A kosár üres.
                  </p>
                </div>
              ) : (
                <>
                  <div className="shop-cart-items">
                    {cart.map(
                      (item) => (
                        <div
                          className="shop-cart-item"
                          key={
                            item.product.id
                          }
                        >
                          <div className="shop-cart-item-info">
                            <strong>
                              {
                                item
                                  .product
                                  .name
                              }
                            </strong>

                            <span>
                              {
                                item
                                  .product
                                  .tokenPrice
                              }{' '}
                              token / db
                            </span>
                          </div>

                          <div className="shop-cart-item-actions">
                            <button
                              type="button"
                              onClick={() =>
                                changeQuantity(
                                  item
                                    .product
                                    .id,
                                  -1,
                                )
                              }
                            >
                              <Minus
                                size={15}
                              />
                            </button>

                            <strong>
                              {
                                item.quantity
                              }
                            </strong>

                            <button
                              type="button"
                              onClick={() =>
                                changeQuantity(
                                  item
                                    .product
                                    .id,
                                  1,
                                )
                              }
                            >
                              <Plus
                                size={15}
                              />
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                removeFromCart(
                                  item
                                    .product
                                    .id,
                                )
                              }
                            >
                              <X
                                size={15}
                              />
                            </button>
                          </div>
                        </div>
                      ),
                    )}
                  </div>

                  <div className="shop-cart-footer">
                    <div>
                      <span>
                        ÖSSZESEN
                      </span>

                      <strong>
                        {cartTotal}{' '}
                        TOKEN
                      </strong>
                    </div>

                    {customer ? (
                      <div className="shop-selected-customer">
                        <div>
                          <UserRound
                            size={18}
                          />

                          <div>
                            <strong>
                              {
                                customer.name
                              }
                            </strong>

                            <span>
                              {
                                customer.memberId
                              }
                            </span>
                          </div>
                        </div>

                        <div className="shop-customer-token">
                          <Coins
                            size={16}
                          />

                          <strong>
                            {
                              customer.token
                            }
                          </strong>

                          <span>
                            token
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={
                            clearCustomer
                          }
                        >
                          Másik vendég
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={
                          openCustomerScanner
                        }
                      >
                        <QrCode
                          size={18}
                        />

                        QR KÓD BEOLVASÁSA
                      </button>
                    )}

                    {customer &&
                      customer.token >=
                        cartTotal && (
                        <div className="shop-payment-ready">
                          <button
                            className="shop-payment-button"
                            type="button"
                            onClick={() =>
                              void handlePayment()
                            }
                            disabled={
                              paymentLoading
                            }
                          >
                            <CheckCircle2
                              size={18}
                            />

                            {paymentLoading
                              ? 'Fizetés folyamatban...'
                              : `Fizetés — ${cartTotal} token`}
                          </button>
                        </div>
                      )}

                    {customer &&
                      customer.token <
                        cartTotal && (
                        <div className="shop-payment-error">
                          <button
                            className="shop-payment-button"
                            type="button"
                            disabled
                          >
                            Hiányzik{' '}
                            {cartTotal -
                              customer.token}{' '}
                            token.
                          </button>
                        </div>
                      )}
                  </div>
                </>
              )}
            </aside>
          </div>
        )}

      {isStaff &&
        customerStep !== 'idle' &&
        customerStep !== 'selected' && (
          <div className="shop-scanner-overlay">
            <section className="shop-scanner-modal">
              <header>
                <div>
                  <span>
                    VENDÉG AZONOSÍTÁSA
                  </span>

                  <h2>
                    QR-kód beolvasása
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    void closeCustomerScanner()
                  }
                >
                  <X size={20} />
                </button>
              </header>

              <div className="shop-scanner-icon">
                {shopScanning ? (
                  <ScanLine size={42} />
                ) : (
                  <QrCode size={42} />
                )}
              </div>

              <p>
                Olvasd be a vendég QR-kódját,
                majd ellenőrizzük az
                egyenlegét.
              </p>

              <div
                id="shop-qr-reader"
                className="shop-qr-reader"
              />

              {shopScanning && (
                <div className="shop-qr-status">
                </div>
              )}

              {shopCameraError && (
                <div className="shop-scanner-error">
                  {shopCameraError}
                </div>
              )}

              {customerError && (
                <div className="shop-scanner-error">
                  {customerError}
                </div>
              )}
            </section>
          </div>
        )}
    </main>
  );
}