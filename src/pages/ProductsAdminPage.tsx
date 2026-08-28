import {
  ArrowLeft,
  Plus,
  ImagePlus,
  Package,
  FolderPlus,
  X,
  Check,
} from 'lucide-react';

import {
  useEffect,
  useState,
} from 'react';

import type { User } from '../lib/auth';

interface ProductsAdminPageProps {
  user: User;
  onBack: () => void;
}

interface Category {
  id: string;
  name: string;
  sortOrder: number;
  isActive: boolean;
}

interface Product {
  id: string;
  name: string;
  imagePath: string | null;
  tokenPrice: number;
  categoryId: string;
  categoryName: string;
  isActive: boolean;
}

export function ProductsAdminPage({
  user,
  onBack,
}: ProductsAdminPageProps) {
  const [categories, setCategories] =
    useState<Category[]>([]);

  const [products, setProducts] =
    useState<Product[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState<string | null>(null);

  const [productName, setProductName] =
    useState('');

  const [tokenPrice, setTokenPrice] =
    useState('');

  const [categoryId, setCategoryId] =
    useState('');

  const [imagePath, setImagePath] =
    useState<string | null>(null);

  const [uploadingImage, setUploadingImage] =
    useState(false);

  const [savingProduct, setSavingProduct] =
    useState(false);

  const [categoryName, setCategoryName] =
    useState('');

  const [savingCategory, setSavingCategory] =
    useState(false);

  const [showCategoryForm, setShowCategoryForm] =
    useState(false);

  const [message, setMessage] =
    useState<string | null>(null);

  useEffect(() => {
    void loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      setError(null);

      const [
        categoriesResponse,
        productsResponse,
      ] = await Promise.all([
        fetch(
          '/api/products/categories',
          {
            credentials: 'include',
          },
        ),
        fetch(
          '/api/products/products',
          {
            credentials: 'include',
          },
        ),
      ]);

      const categoriesData =
        await categoriesResponse.json();

      const productsData =
        await productsResponse.json();

      if (!categoriesResponse.ok) {
        throw new Error(
          categoriesData.message ??
            'A kategóriák betöltése sikertelen.',
        );
      }

      if (!productsResponse.ok) {
        throw new Error(
          productsData.message ??
            'A termékek betöltése sikertelen.',
        );
      }

      setCategories(
        categoriesData.categories ?? [],
      );

      setProducts(
        productsData.products ?? [],
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Az adatok betöltése sikertelen.',
      );
    } finally {
      setLoading(false);
    }
  }

  async function uploadImage(
    file: File,
  ) {
    try {
      setUploadingImage(true);
      setMessage(null);
      setError(null);

      const formData =
        new FormData();

      formData.append(
        'file',
        file,
      );

      const response =
        await fetch(
          '/api/products/upload-image',
          {
            method: 'POST',
            credentials: 'include',
            body: formData,
          },
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ??
            'A kép feltöltése sikertelen.',
        );
      }

      setImagePath(
        data.imagePath,
      );

      setMessage(
        'A kép feltöltve.',
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'A kép feltöltése sikertelen.',
      );
    } finally {
      setUploadingImage(false);
    }
  }

  async function createCategory(
    event: React.FormEvent,
  ) {
    event.preventDefault();

    const name =
      categoryName.trim();

    if (!name) {
      return;
    }

    try {
      setSavingCategory(true);
      setError(null);
      setMessage(null);

      const response =
        await fetch(
          '/api/products/categories',
          {
            method: 'POST',
            headers: {
              'Content-Type':
                'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({
              name,
            }),
          },
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ??
            'A kategória létrehozása sikertelen.',
        );
      }

      setCategoryName('');
      setShowCategoryForm(false);

      setMessage(
        'Kategória létrehozva.',
      );

      await loadData();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'A kategória létrehozása sikertelen.',
      );
    } finally {
      setSavingCategory(false);
    }
  }

  async function createProduct(
    event: React.FormEvent,
  ) {
    event.preventDefault();

    const name =
      productName.trim();

    const price =
      Number(tokenPrice);

    if (!name) {
      setError(
        'Add meg a termék nevét.',
      );
      return;
    }

    if (
      !Number.isInteger(price) ||
      price <= 0
    ) {
      setError(
        'Az ár pozitív egész szám legyen.',
      );
      return;
    }

    if (!categoryId) {
      setError(
        'Válassz kategóriát.',
      );
      return;
    }

    try {
      setSavingProduct(true);
      setError(null);
      setMessage(null);

      const response =
        await fetch(
          '/api/products/products',
          {
            method: 'POST',
            headers: {
              'Content-Type':
                'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({
              name,
              tokenPrice: price,
              categoryId,
              imagePath,
            }),
          },
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ??
            'A termék létrehozása sikertelen.',
        );
      }

      setProductName('');
      setTokenPrice('');
      setCategoryId('');
      setImagePath(null);

      setMessage(
        'Termék létrehozva.',
      );

      await loadData();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'A termék létrehozása sikertelen.',
      );
    } finally {
      setSavingProduct(false);
    }
  }

  async function toggleProduct(
    product: Product,
  ) {
    try {
      setError(null);

      const response =
        await fetch(
          `/api/products/products/${product.id}`,
          {
            method: 'PATCH',
            headers: {
              'Content-Type':
                'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({
              isActive:
                !product.isActive,
            }),
          },
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ??
            'A termék módosítása sikertelen.',
        );
      }

      await loadData();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'A termék módosítása sikertelen.',
      );
    }
  }

  if (user.role !== 'admin') {
    return (
      <main className="app-shell">
        <div className="app-container">
          <h1>Nincs hozzáférés</h1>

          <button
            className="button button-secondary"
            type="button"
            onClick={onBack}
          >
            Vissza
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <div className="app-container page-enter">
        <header className="products-admin-header">
          <button
            className="button button-icon"
            type="button"
            onClick={onBack}
          >
            <ArrowLeft size={19} />
          </button>

          <div>
            <span>
              ADMIN
            </span>

            <h1>
              Termékek kezelése
            </h1>
          </div>
        </header>

        <div className="products-admin-user">
          Admin: {user.name}
        </div>

        {error && (
          <div className="products-admin-message error">
            {error}
          </div>
        )}

        {message && (
          <div className="products-admin-message">
            <Check size={17} />
            {message}
          </div>
        )}

        <section className="products-admin-section">
          <div className="products-admin-section-header">
            <div>
              <span>
                KATEGÓRIÁK
              </span>

              <h2>
                Termékkategóriák
              </h2>
            </div>

            <button
              className="button button-icon"
              type="button"
              onClick={() =>
                setShowCategoryForm(
                  (value) => !value,
                )
              }
            >
              {showCategoryForm ? (
                <X size={17} />
              ) : (
                <FolderPlus size={17} />
              )}

              {showCategoryForm
                ? 'Mégse'
                : 'Új kategória'}
            </button>
          </div>

          {showCategoryForm && (
            <form
              className="products-admin-category-form"
              onSubmit={
                createCategory
              }
            >
              <input className="form-control"
                type="text"
                placeholder="Kategória neve"
                value={categoryName}
                onChange={(event) =>
                  setCategoryName(
                    event.target.value,
                  )
                }
                maxLength={100}
              />

              <button
                type="submit"
                disabled={
                  savingCategory
                }
              >
                {savingCategory
                  ? 'Mentés...'
                  : 'Létrehozás'}
              </button>
            </form>
          )}

          <div className="products-admin-categories">
            {categories.length ===
            0 ? (
              <p>
                Még nincs kategória.
              </p>
            ) : (
              categories.map(
                (category) => (
                  <div
                    className={`products-admin-category ${
                      category.isActive
                        ? ''
                        : 'inactive'
                    }`}
                    key={category.id}
                  >
                    <span>
                      {category.name}
                    </span>

                    {!category.isActive && (
                      <small>
                        Inaktív
                      </small>
                    )}
                  </div>
                ),
              )
            )}
          </div>
        </section>

        <section className="products-admin-section">
          <div className="products-admin-section-header">
            <div>
              <span>
                ÚJ TERMÉK
              </span>

              <h2>
                Termék létrehozása
              </h2>
            </div>

            <Package size={21} />
          </div>

          <form
            className="products-admin-form"
            onSubmit={createProduct}
          >
            <label>
              <span>
                TERMÉK NEVE
              </span>

              <input className="form-control"
                type="text"
                placeholder="Pl. Coca-Cola"
                value={productName}
                onChange={(event) =>
                  setProductName(
                    event.target.value,
                  )
                }
                maxLength={150}
              />
            </label>

            <label>
              <span>
                TOKEN ÁR
              </span>

              <input className="form-control"
                type="number"
                min="1"
                step="1"
                placeholder="Pl. 2"
                value={tokenPrice}
                onChange={(event) =>
                  setTokenPrice(
                    event.target.value,
                  )
                }
              />
            </label>

            <label>
              <span>
                KATEGÓRIA
              </span>

              <select className="form-control"
                value={categoryId}
                onChange={(event) =>
                  setCategoryId(
                    event.target.value,
                  )
                }
              >
                <option value="">
                  Válassz kategóriát
                </option>

                {categories
                  .filter(
                    (category) =>
                      category.isActive,
                  )
                  .map(
                    (category) => (
                      <option
                        key={
                          category.id
                        }
                        value={
                          category.id
                        }
                      >
                        {category.name}
                      </option>
                    ),
                  )}
              </select>
            </label>

            <div className="products-admin-upload">
              <span>
                TERMÉKKÉP
              </span>

              <label className="button button-secondary button-wide">
                <ImagePlus
                  size={20}
                />

                <span>
                  {uploadingImage
                    ? 'Feltöltés...'
                    : imagePath
                      ? 'Kép lecserélése'
                      : 'Kép feltöltése'}
                </span>

                <input className="form-control"
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  disabled={
                    uploadingImage
                  }
                  onChange={(event) => {
                    const file =
                      event.target
                        .files?.[0];

                    if (file) {
                      void uploadImage(
                        file,
                      );
                    }

                    event.target.value =
                      '';
                  }}
                />
              </label>

              {imagePath && (
                <div className="products-admin-image-preview">
                  <img
                    src={imagePath}
                    alt="Termék előnézet"
                  />

                  <button
                    className="button button-icon"
                    type="button"
                    onClick={() =>
                      setImagePath(
                        null,
                      )
                    }
                  >
                    <X size={15} />
                  </button>
                </div>
              )}
            </div>

            <button
              className="button button-primary"
              type="submit"
              disabled={
                savingProduct ||
                uploadingImage
              }
            >
              <Plus size={19} />

              {savingProduct
                ? 'Mentés...'
                : 'Termék létrehozása'}
            </button>
          </form>
        </section>

        <section className="products-admin-section">
          <div className="products-admin-section-header">
            <div>
              <span>
                TERMÉKEK
              </span>

              <h2>
                Meglévő termékek
              </h2>
            </div>

            <strong>
              {products.length}
            </strong>
          </div>

          {loading ? (
            <p>
              Betöltés...
            </p>
          ) : products.length ===
            0 ? (
            <p>
              Még nincs létrehozott
              termék.
            </p>
          ) : (
            <div className="products-admin-list">
              {products.map(
                (product) => (
                  <article
                    className={`products-admin-product ${
                      product.isActive
                        ? ''
                        : 'inactive'
                    }`}
                    key={product.id}
                  >
                    <div className="products-admin-product-image">
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
                        <Package
                          size={25}
                        />
                      )}
                    </div>

                    <div className="products-admin-product-info">
                      <strong>
                        {product.name}
                      </strong>

                      <span>
                        {
                          product.categoryName
                        }
                      </span>
                    </div>

                    <strong className="products-admin-product-price">
                      {
                        product.tokenPrice
                      }{' '}
                      T
                    </strong>

                    <button
                      type="button"
                      onClick={() =>
                        void toggleProduct(
                          product,
                        )
                      }
                    >
                      {product.isActive
                        ? 'Aktív'
                        : 'Inaktív'}
                    </button>
                  </article>
                ),
              )}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}