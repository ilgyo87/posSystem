import { ServiceCategory } from '../types';

// Default services for a dry cleaning business
export const defaultServices = [
  {
    name: 'Dry Cleaning',
    description: 'Professional dry cleaning services',
    basePrice: 15.0,
    estimatedDuration: 60,
    category: 'DRY_CLEANING' as ServiceCategory
  },
  {
    name: 'Washing',
    description: 'Wash, dry, and fold services',
    basePrice: 10.0,
    estimatedDuration: 45,
    category: 'LAUNDRY' as ServiceCategory
  },
  {
    name: 'Alterations',
    description: 'Clothing alterations and repairs',
    basePrice: 20.0,
    estimatedDuration: 90,
    category: 'ALTERATIONS' as ServiceCategory
  }
];

// Default products by service category
export const defaultProducts = {
  DRY_CLEANING: [
    { 
      name: 'Pants', 
      description: 'Pants dry cleaning', 
      price: 12.0, 
      imageUrl: 'https://images.unsplash.com/photo-1542272604-787c3835535d?ixlib=rb-1.2.1&auto=format&fit=crop&w=300&q=80',
      inventory: 999,
      isActive: true
    },
    { 
      name: 'Shirt', 
      description: 'Shirt dry cleaning', 
      price: 8.0, 
      imageUrl: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?ixlib=rb-1.2.1&auto=format&fit=crop&w=300&q=80',
      inventory: 999,
      isActive: true
    },
    { 
      name: 'Blouse', 
      description: 'Blouse dry cleaning', 
      price: 10.0, 
      imageUrl: 'https://images.unsplash.com/photo-1551163943-3f7fb0f951a4?ixlib=rb-1.2.1&auto=format&fit=crop&w=300&q=80',
      inventory: 999,
      isActive: true
    },
    { 
      name: 'Dress', 
      description: 'Dress dry cleaning', 
      price: 18.0, 
      imageUrl: 'https://images.unsplash.com/photo-1502716119720-b23a93e5fe1b?ixlib=rb-1.2.1&auto=format&fit=crop&w=300&q=80',
      inventory: 999,
      isActive: true
    },
    { 
      name: 'Coat', 
      description: 'Coat dry cleaning', 
      price: 30.0, 
      imageUrl: 'https://images.unsplash.com/photo-1544923246-77307dd654cb?ixlib=rb-1.2.1&auto=format&fit=crop&w=300&q=80',
      inventory: 999,
      isActive: true
    },
    { 
      name: 'Suit', 
      description: 'Full suit dry cleaning', 
      price: 25.0, 
      imageUrl: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?ixlib=rb-1.2.1&auto=format&fit=crop&w=300&q=80',
      inventory: 999,
      isActive: true
    }
  ],
  LAUNDRY: [
    { 
      name: 'Shirt', 
      description: 'Wash and press shirt', 
      price: 5.0, 
      imageUrl: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?ixlib=rb-1.2.1&auto=format&fit=crop&w=300&q=80',
      inventory: 999,
      isActive: true
    },
    { 
      name: 'Pants', 
      description: 'Wash and press pants', 
      price: 6.0, 
      imageUrl: 'https://images.unsplash.com/photo-1542272604-787c3835535d?ixlib=rb-1.2.1&auto=format&fit=crop&w=300&q=80',
      inventory: 999,
      isActive: true
    }
  ],
  ALTERATIONS: [
    { 
      name: 'Pants', 
      description: 'Pants alterations', 
      price: 15.0, 
      imageUrl: 'https://images.unsplash.com/photo-1594750852563-5ed8d0b44ed1?ixlib=rb-1.2.1&auto=format&fit=crop&w=300&q=80',
      inventory: 999,
      isActive: true
    },
    { 
      name: 'Jacket', 
      description: 'Jacket alterations', 
      price: 25.0, 
      imageUrl: 'https://images.unsplash.com/photo-1544923246-77307dd654cb?ixlib=rb-1.2.1&auto=format&fit=crop&w=300&q=80',
      inventory: 999,
      isActive: true
    },
    { 
      name: 'Shirt', 
      description: 'Shirt alterations', 
      price: 12.0, 
      imageUrl: 'https://images.unsplash.com/photo-1598032895397-b9472444bf93?ixlib=rb-1.2.1&auto=format&fit=crop&w=300&q=80',
      inventory: 999,
      isActive: true
    }
  ]
};
