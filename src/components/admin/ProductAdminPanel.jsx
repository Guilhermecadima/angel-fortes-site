import { useEffect, useMemo, useState } from 'react';
import storeLogo from '../../assets/images/tudo-de-compras.png';
import {
  createProduct,
  deleteProduct,
  listAdminProducts,
  updateProduct,
  uploadProductImage,
} from '../../services/products';
import { formatCurrency } from '../../utils/currency';
import ProductFormModal from './ProductFormModal';

export default function ProductAdminPanel() {
  const [products, setProducts] = useState([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);

  const load = async () => {
    setLoading(true);
    setError('');

    try {
      setProducts(await listAdminProducts());
    } catch (err) {
      console.error(err);
      setError('Não foi possível carregar os produtos. Confirma as policies do Supabase.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filteredProducts = useMemo(() => {
    const normalized = query.trim().toLowerCase();

    if (!normalized) return products;

    return products.filter((product) => (
      product.name.toLowerCase().includes(normalized)
      || (product.category || '').toLowerCase().includes(normalized)
    ));
  }, [products, query]);

  const openCreate = () => {
    setEditingProduct(null);
    setModalOpen(true);
  };

  const openEdit = (product) => {
    setEditingProduct(product);
    setModalOpen(true);
  };

  const handleSave = async (values) => {
    setSaving(true);
    setError('');

    try {
      let imageUrl = values.image_url || null;

      if (values.imageFile) {
        imageUrl = await uploadProductImage(values.imageFile);
      }

      const payload = {
        ...values,
        image_url: imageUrl,
      };

      delete payload.imageFile;

      if (editingProduct) {
        await updateProduct(editingProduct.id, payload);
      } else {
        await createProduct(payload);
      }

      setModalOpen(false);
      setEditingProduct(null);

      await load();
    } catch (err) {
      console.error(err);
      setError(err.message || 'Não foi possível guardar o produto.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (product) => {
    if (!window.confirm(`Eliminar "${product.name}"? Esta ação não pode ser anulada.`)) {
      return;
    }

    setError('');

    try {
      await deleteProduct(product.id);
      setProducts((current) => current.filter((item) => item.id !== product.id));
    } catch (err) {
      console.error(err);
      setError('Não foi possível eliminar o produto.');
    }
  };

  return (
    <section className="admin-products-panel">
      <div className="admin-products-top">
        <div>
          <p className="admin-kicker">Tudo de Compras</p>
          <h2>Produtos</h2>
          <p className="admin-note">
            Adiciona produtos, altera preços, stock, imagens e decide o que aparece na loja.
          </p>
        </div>

        <button className="btn btn-dark" type="button" onClick={openCreate}>
          + Adicionar produto
        </button>
      </div>

      <div className="admin-product-toolbar">
        <label>
          <span>Pesquisar produto</span>
          <input
            type="search"
            placeholder="Nome ou categoria..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>

        <div className="admin-product-stats">
          <div><strong>{products.length}</strong><span>Total</span></div>
          <div><strong>{products.filter((product) => product.active).length}</strong><span>Ativos</span></div>
          <div><strong>{products.filter((product) => product.stock <= 3).length}</strong><span>Stock baixo</span></div>
        </div>
      </div>

      {error && <div className="admin-alert error">{error}</div>}

      {loading ? (
        <div className="admin-loading">A carregar produtos...</div>
      ) : filteredProducts.length === 0 ? (
        <div className="admin-empty">Ainda não existem produtos com este filtro.</div>
      ) : (
        <div className="admin-product-grid">
          {filteredProducts.map((product) => (
            <article className="admin-product-card" key={product.id}>
              <div className="admin-product-image">
                <img src={product.image_url || storeLogo} alt={product.name} />

                {!product.active && <span className="admin-status hidden">Oculto</span>}
                {product.featured && <span className="admin-status featured">Destaque</span>}
              </div>

              <div className="admin-product-card-body">
                <span>{product.category || 'Outros'}</span>
                <h3>{product.name}</h3>

                <div className="admin-product-meta">
                  <strong>{formatCurrency(product.price)}</strong>
                  <span className={product.stock <= 3 ? 'low-stock' : ''}>
                    Stock: {product.stock}
                  </span>
                </div>

                <div className="admin-product-actions">
                  <button type="button" onClick={() => openEdit(product)}>Editar</button>
                  <button
                    type="button"
                    className="danger"
                    onClick={() => handleDelete(product)}
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      <ProductFormModal
        open={modalOpen}
        product={editingProduct}
        onClose={() => {
          if (!saving) {
            setModalOpen(false);
            setEditingProduct(null);
          }
        }}
        onSave={handleSave}
        saving={saving}
      />
    </section>
  );
}
