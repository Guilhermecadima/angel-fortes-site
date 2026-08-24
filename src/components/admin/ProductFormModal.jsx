import { useEffect, useMemo, useState } from 'react';

const EMPTY_FORM = {
  name: '',
  description: '',
  price: '',
  stock: '0',
  category: '',
  image_url: '',
  active: true,
  featured: false,
};

export default function ProductFormModal({
  open,
  product,
  onClose,
  onSave,
  saving,
}) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [imageFile, setImageFile] = useState(null);
  const [localError, setLocalError] = useState('');

  useEffect(() => {
    if (!open) return;

    if (product) {
      setForm({
        name: product.name || '',
        description: product.description || '',
        price: String(product.price ?? ''),
        stock: String(product.stock ?? 0),
        category: product.category || '',
        image_url: product.image_url || '',
        active: Boolean(product.active),
        featured: Boolean(product.featured),
      });
    } else {
      setForm(EMPTY_FORM);
    }

    setImageFile(null);
    setLocalError('');
  }, [open, product]);

  const previewUrl = useMemo(
    () => (imageFile ? URL.createObjectURL(imageFile) : form.image_url),
    [imageFile, form.image_url],
  );

  useEffect(() => {
    return () => {
      if (previewUrl?.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  if (!open) return null;

  const submit = async (event) => {
    event.preventDefault();
    setLocalError('');

    if (!form.name.trim()) {
      setLocalError('O nome do produto é obrigatório.');
      return;
    }

    if (Number(form.price) < 0 || Number.isNaN(Number(form.price))) {
      setLocalError('Indica um preço válido.');
      return;
    }

    if (Number(form.stock) < 0 || !Number.isInteger(Number(form.stock))) {
      setLocalError('O stock tem de ser um número inteiro igual ou superior a zero.');
      return;
    }

    await onSave({
      ...form,
      price: Number(form.price),
      stock: Number(form.stock),
      imageFile,
    });
  };

  return (
    <div
      className="admin-modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !saving) onClose();
      }}
    >
      <form className="admin-product-modal" onSubmit={submit}>
        <div className="admin-modal-head">
          <div>
            <p className="admin-kicker">{product ? 'Editar' : 'Novo produto'}</p>
            <h2>{product ? product.name : 'Adicionar produto'}</h2>
          </div>

          <button type="button" className="close-btn" onClick={onClose} disabled={saving}>
            ×
          </button>
        </div>

        <div className="admin-product-fields">
          <label className="wide">
            <span>Nome</span>
            <input
              type="text"
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
              placeholder="Ex.: Pomada Matte"
              required
            />
          </label>

          <label className="wide">
            <span>Descrição</span>
            <textarea
              rows="4"
              value={form.description}
              onChange={(event) => setForm({ ...form, description: event.target.value })}
              placeholder="Descrição curta do produto"
            />
          </label>

          <label>
            <span>Preço (€)</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.price}
              onChange={(event) => setForm({ ...form, price: event.target.value })}
              required
            />
          </label>

          <label>
            <span>Stock</span>
            <input
              type="number"
              min="0"
              step="1"
              value={form.stock}
              onChange={(event) => setForm({ ...form, stock: event.target.value })}
              required
            />
          </label>

          <label className="wide">
            <span>Categoria</span>
            <input
              type="text"
              value={form.category}
              onChange={(event) => setForm({ ...form, category: event.target.value })}
              placeholder="Cabelo, Barba, Styling..."
            />
          </label>

          <label className="wide">
            <span>Fotografia</span>
            <input
              type="file"
              accept="image/*"
              onChange={(event) => setImageFile(event.target.files?.[0] || null)}
            />
            <small>JPG, PNG ou WEBP até 5 MB.</small>
          </label>

          {previewUrl && (
            <div className="admin-image-preview wide">
              <img src={previewUrl} alt="Pré-visualização" />
            </div>
          )}

          <label className="admin-check">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(event) => setForm({ ...form, active: event.target.checked })}
            />
            <span>Produto visível na loja</span>
          </label>

          <label className="admin-check">
            <input
              type="checkbox"
              checked={form.featured}
              onChange={(event) => setForm({ ...form, featured: event.target.checked })}
            />
            <span>Produto em destaque</span>
          </label>
        </div>

        {localError && <p className="admin-form-error">{localError}</p>}

        <div className="admin-modal-actions">
          <button type="button" className="btn btn-outline" onClick={onClose} disabled={saving}>
            Cancelar
          </button>

          <button type="submit" className="btn btn-dark" disabled={saving}>
            {saving ? 'A guardar...' : 'Guardar produto'}
          </button>
        </div>
      </form>
    </div>
  );
}
