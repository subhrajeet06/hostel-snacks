import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../utils/api';
import toast from 'react-hot-toast';

const CATEGORIES = ['chips','kurkure','biscuits','chocolates','noodles','other'];

const DEFAULT_IMAGE = 'https://via.placeholder.com/300x300?text=Product';

export default function SellerAddProduct() {
  const { id } = useParams(); // edit mode if id present
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(!!id);
  const [form, setForm] = useState({
    name: '', description: '', price: '', category: 'chips',
    image: '', stock: '', discount: 0, isAvailable: true, tags: '',
  });
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    if (id) {
      api.get(`/products/${id}`).then((res) => {
        const p = res.data.product;
        setForm({ name: p.name, description: p.description || '', price: p.price, category: p.category,
          image: p.image || '', stock: p.stock, discount: p.discount || 0, isAvailable: p.isAvailable, tags: p.tags?.join(', ') || '' });
      }).catch(() => toast.error('Product not found')).finally(() => setFetching(false));
    }
  }, [id]);

  const set = (field) => (e) => {
    setForm({ ...form, [field]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });
    if (field === 'image') setImageError(false);
  };

  // Calculate discounted price for preview
  const originalPrice = Number(form.price) || 0;
  const discountPercent = Number(form.discount) || 0;
  const discountedPrice = originalPrice - (originalPrice * discountPercent) / 100;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.price || !form.stock) return toast.error('Fill all required fields');
    setLoading(true);
    try {
      const body = {
        ...form,
        price: Number(form.price),
        stock: Number(form.stock),
        discount: Number(form.discount),
        image: form.image.trim() || DEFAULT_IMAGE,
        tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
      };
      if (id) {
        await api.put(`/products/${id}`, body);
        toast.success('Product updated!');
      } else {
        await api.post('/products', body);
        toast.success('Product added!');
      }
      navigate('/seller/products');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Save failed');
    } finally {
      setLoading(false);
    }
  };

  if (fetching) return <div className="flex justify-center py-16"><div className="spinner" /></div>;

  return (
    <div className="max-w-xl">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)} className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 text-xl">←</button>
        <h1 className="page-header mb-0">{id ? 'Edit Product ✏️' : 'Add Product +'}</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Image preview */}
        {form.image && !imageError && (
          <div className="card overflow-hidden h-40">
            <img src={form.image} alt="preview" className="w-full h-full object-cover"
              onError={() => setImageError(true)} />
          </div>
        )}
        {form.image && imageError && (
          <div className="card p-4 bg-red-50 border border-red-200 text-center">
            <p className="text-sm text-red-600 font-medium">⚠️ Image could not be loaded. Please check the URL.</p>
            <p className="text-xs text-red-400 mt-1">Make sure the link is a direct image URL (ends in .jpg, .png, .webp etc.)</p>
          </div>
        )}

        <div className="card p-5 space-y-4">
          <div>
            <label className="label">Product Name *</label>
            <input className="input" placeholder="e.g. Lays Classic Salted" value={form.name} onChange={set('name')} required />
          </div>

          <div>
            <label className="label">Description</label>
            <textarea className="input resize-none" rows={2} placeholder="Short description..." value={form.description} onChange={set('description')} />
          </div>

          <div>
            <label className="label">Tags</label>
            <input className="input" placeholder="spicy, crispy, sweet" value={form.tags} onChange={set('tags')} />
            <p className="text-xs text-gray-500 mt-1">Comma-separated tags to help users search (e.g., spicy, snack, party)</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Price (₹) *</label>
              <input className="input" type="number" min="0" step="0.5" placeholder="20" value={form.price} onChange={set('price')} required />
            </div>
            <div>
              <label className="label">Stock *</label>
              <input className="input" type="number" min="0" placeholder="50" value={form.stock} onChange={set('stock')} required />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Category *</label>
              <select className="input capitalize" value={form.category} onChange={set('category')}>
                {CATEGORIES.map((c) => <option key={c} value={c} className="capitalize">{c}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Discount (%)</label>
              <input className="input" type="number" min="0" max="100" placeholder="0" value={form.discount} onChange={set('discount')} />
            </div>
          </div>

          {/* Discount price preview */}
          {discountPercent > 0 && originalPrice > 0 && (
            <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl">
              <p className="text-sm text-green-700 dark:text-green-400 font-medium">
                💰 Discounted Price: <span className="font-bold text-lg">₹{discountedPrice.toFixed(0)}</span>
                <span className="text-xs text-gray-400 line-through ml-2">₹{originalPrice.toFixed(0)}</span>
                <span className="text-xs text-green-600 ml-1">({discountPercent}% off)</span>
              </p>
            </div>
          )}

          <div>
            <label className="label">Product Image URL</label>
            <input className="input" type="url" placeholder="https://example.com/image.jpg" value={form.image} onChange={set('image')} />
            <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
              <p className="text-xs font-semibold text-blue-700 dark:text-blue-400 mb-1">📷 Where to get image links:</p>
              <ul className="text-xs text-blue-600 dark:text-blue-300 space-y-0.5 list-disc ml-4">
                <li><strong>Google Images</strong> — Right-click image → "Copy image address"</li>
                <li><strong>ImgBB</strong> (imgbb.com) — Upload image → Copy "Direct link"</li>
                <li><strong>Imgur</strong> (imgur.com) — Upload image → Copy direct link</li>
                <li><strong>Postimages</strong> (postimages.org) — Upload → Copy "Direct link"</li>
                <li><strong>Amazon / Flipkart</strong> — Right-click product image → "Copy image address"</li>
                <li><strong>Any website</strong> — Right-click on any image → "Copy image address"</li>
              </ul>
              <p className="text-xs text-blue-500 mt-1.5">💡 Tip: The URL should end in <code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">.jpg</code>, <code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">.png</code>, or <code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">.webp</code> for best results.</p>
            </div>
          </div>

          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={form.isAvailable} onChange={set('isAvailable')} className="w-4 h-4 accent-orange-500" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Available for purchase</span>
          </label>
        </div>

        <div className="flex gap-3">
          <button type="button" onClick={() => navigate(-1)} className="btn-secondary flex-1">Cancel</button>
          <button type="submit" disabled={loading} className="btn-primary flex-1">
            {loading ? '⏳ Saving...' : id ? '✅ Update Product' : '+ Add Product'}
          </button>
        </div>
      </form>
    </div>
  );
}
