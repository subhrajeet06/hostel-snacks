export const formatCurrency = (amount) =>
  `₹${Number(amount || 0).toFixed(0)}`;

export const formatDate = (dateStr) =>
  new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });

export const statusLabel = {
  pending:          'Pending',
  accepted:         'Accepted',
  preparing:        'Preparing',
  out_for_delivery: 'Out for Delivery',
  delivered:        'Delivered',
  cancelled:        'Cancelled',
};

export const statusColor = {
  pending:          'bg-yellow-100 text-yellow-800',
  accepted:         'bg-blue-100 text-blue-800',
  preparing:        'bg-purple-100 text-purple-800',
  out_for_delivery: 'bg-indigo-100 text-indigo-800',
  delivered:        'bg-green-100 text-green-800',
  cancelled:        'bg-red-100 text-red-800',
};

export const categoryLabel = {
  chips:      '🥔 Chips',
  kurkure:    '🌶️ Kurkure',
  biscuits:   '🍪 Biscuits',
  chocolates: '🍫 Chocolates',
  noodles:    '🍜 Noodles',
  other:      '🛍️ Other',
};

export const categoryIcon = {
  chips:      '🥔',
  kurkure:    '🌶️',
  biscuits:   '🍪',
  chocolates: '🍫',
  noodles:    '🍜',
  other:      '🛍️',
};

export const orderStatusSteps = [
  { key: 'pending',          label: 'Order Placed',      icon: '📋' },
  { key: 'accepted',         label: 'Accepted',          icon: '✅' },
  { key: 'preparing',        label: 'Preparing',         icon: '👨‍🍳' },
  { key: 'out_for_delivery', label: 'Out for Delivery',  icon: '🚴' },
  { key: 'delivered',        label: 'Delivered',         icon: '🎉' },
];

export const getStepIndex = (status) => orderStatusSteps.findIndex((s) => s.key === status);
